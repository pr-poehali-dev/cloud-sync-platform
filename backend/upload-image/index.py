import base64
import json
import os
import re
import urllib.request
import uuid

import boto3
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Access-Control-Max-Age': '86400',
}

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN', 'leader-ai-admin-2024')


def ok(data):
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(data, ensure_ascii=False)}


def err(msg, code=400):
    return {'statusCode': code, 'headers': CORS, 'body': json.dumps({'error': msg})}


# ── /upload ──────────────────────────────────────────────────────────────────

def handle_upload(body: dict) -> dict:
    """Загружает изображение в S3 и возвращает публичный CDN-URL."""
    data_url: str = body.get('image', '')
    if not data_url:
        return err('image is required')

    header, encoded = data_url.split(',', 1)
    content_type = header.split(';')[0].replace('data:', '')
    ext = content_type.split('/')[-1]
    if ext == 'jpeg':
        ext = 'jpg'

    image_bytes = base64.b64decode(encoded)
    key = f'portfolio/{uuid.uuid4().hex}.{ext}'

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=image_bytes, ContentType=content_type)
    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    return ok({'url': cdn_url})


# ── /ai-fill ─────────────────────────────────────────────────────────────────

def fetch_url(url: str) -> str:
    from urllib.parse import urlencode
    sb_key = os.environ.get('SCRAPINGBEE_API_KEY', '')

    # ScrapingBee — headless Chrome, читает React/SPA
    if sb_key:
        try:
            params = urlencode({'api_key': sb_key, 'url': url, 'render_js': 'true', 'wait': '3000', 'block_ads': 'true'})
            req = urllib.request.Request(f'https://app.scrapingbee.com/api/v1/?{params}')
            with urllib.request.urlopen(req, timeout=30) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
            html = re.sub(r'<(script|style)[^>]*>.*?</(script|style)>', '', html, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<[^>]+>', ' ', html)
            text = re.sub(r'\s+', ' ', text).strip()
            print(f'[fetch_url] scrapingbee {url} -> {len(text)} chars')
            return f'--- {url} ---\n{text[:6000]}'
        except Exception as e:
            print(f'[fetch_url] scrapingbee ERROR {url}: {e}')

    # Fallback: прямой запрос (для обычных серверных сайтов)
    try:
        req2 = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req2, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        html = re.sub(r'<(script|style)[^>]*>.*?</(script|style)>', '', html, flags=re.DOTALL | re.IGNORECASE)
        text2 = re.sub(r'<[^>]+>', ' ', html)
        text2 = re.sub(r'\s+', ' ', text2).strip()
        print(f'[fetch_url] direct {url} -> {len(text2)} chars')
        return f'--- {url} ---\n{text2[:6000]}'
    except Exception as e2:
        return f'[Ошибка загрузки {url}: {e2}]'


def gpt_request(prompt: str, api_key: str) -> str:
    payload = json.dumps({
        'model': 'mistral-small-latest',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.2,
        'max_tokens': 3000,
    }).encode()
    req = urllib.request.Request(
        'https://api.mistral.ai/v1/chat/completions',
        data=payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    return data['choices'][0]['message']['content']


def extract_pdf_text(b64: str) -> str:
    """Извлекает текст из PDF через pypdf (без C-зависимостей)."""
    try:
        import io
        from pypdf import PdfReader
        data = base64.b64decode(b64)
        reader = PdfReader(io.BytesIO(data))
        text = ' '.join(page.extract_text() or '' for page in reader.pages)
        return re.sub(r'\s+', ' ', text).strip()[:6000]
    except Exception as e:
        return f'[Ошибка чтения PDF: {e}]'


def extract_file_text(file: dict) -> str:
    """Извлекает текст из загруженного файла по типу."""
    mime = file.get('type', '')
    b64 = file.get('b64', '')
    name = file.get('name', 'файл')

    if 'pdf' in mime:
        return f'--- {name} (PDF) ---\n{extract_pdf_text(b64)}'

    raw_bytes = base64.b64decode(b64)

    # RTF (.doc часто экспортируется как RTF)
    raw_str = raw_bytes.decode('utf-8', errors='ignore')
    if raw_str.lstrip().startswith('{\\rtf'):
        try:
            # Убираем RTF-теги, оставляем текст
            text = re.sub(r'\{[^{}]*\}', ' ', raw_str)  # вложенные группы
            text = re.sub(r'\\[a-z]+\d*\s?', ' ', text)  # команды \word
            text = re.sub(r'[{}\\]', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()
            print(f'[extract_file] RTF {name} -> {len(text)} chars, preview: {text[:200]}')
            return f'--- {name} ---\n{text[:6000]}'
        except Exception as e:
            print(f'[extract_file] RTF ERROR: {e}')

    # TXT как текст
    try:
        text = re.sub(r'\s+', ' ', raw_str).strip()[:6000]
        return f'--- {name} ---\n{text}'
    except Exception as e:
        return f'[Ошибка чтения {name}: {e}]'


def handle_ai_fill(body: dict) -> dict:
    """Принимает список URL и/или файлы, парсит и заполняет анкету ИИ-специалиста через GPT."""
    urls: list = body.get('urls', [])
    files: list = body.get('files', [])

    if not urls and not files:
        return err('urls or files required')

    api_key = os.environ.get('MISTRAL_API_KEY', '')
    if not api_key:
        return err('MISTRAL_API_KEY not set', 500)

    pages_text = ''
    for url in urls[:3]:
        pages_text += f'\n\n{fetch_url(url)}'

    for file in files[:3]:
        pages_text += f'\n\n{extract_file_text(file)}'

    prompt = f"""Извлеки данные о специалисте из текста ниже и верни ТОЛЬКО валидный JSON без markdown.

Правила:
- Заполняй поле ТОЛЬКО если информация явно присутствует в тексте
- Не домысливай и не угадывай — лучше пустая строка
- categories и niches — строго из разрешённых значений
- Для name: используй имя человека или название компании (не домен сайта)
- Для telegram: заполняй ТОЛЬКО если в тексте есть явная ссылка t.me/username или написано @username. Путь сайта (например /LB в URL) — НЕ является Telegram-ником

Текст:
{pages_text}

JSON для заполнения:
{{
  "name": "",
  "city": "",
  "site": [],
  "telegram": "только если явно указан t.me/username или @username в тексте, НЕ брать из URL сайта",
  "email": "",
  "type": "",
  "categories": [],
  "niches": [],
  "tools": "",
  "pitch": "",
  "projectsCount": "",
  "cases": [],
  "pricingType": [],
  "priceFrom": "",
  "workFormat": [],
  "terms": "",
  "portfolio": "",
  "reviews": ""
}}

Разрешённые значения для type (выбери одно): Специалист-фрилансер, Агентство / команда

Разрешённые значения для categories (выбери только подходящие, максимум 3):
Внедрение ИИ в бизнес, Чат-боты и ассистенты, ИИ-агенты и автоматизация, Обучение команды, Маркетинг и контент, Аналитика и ML, HR и рекрутинг, Разработка и интеграции

Разрешённые значения для niches (выбери только если прямо упомянуто в тексте):
Франчайзинг, Ритейл, Медицина, HoReCa, HR / рекрутинг, Финансы, Производство, Другое

Разрешённые значения для pricingType: Фиксированная сумма проекта, Почасовая оплата, По запросу / индивидуально
Разрешённые значения для workFormat: Удалённо, Выезд к клиенту, Онлайн + выезд

Для cases — массив объектов, каждый найденный кейс/проект отдельно (максимум 5):
{{"client": "", "task": "", "done": "", "result": "", "contact": ""}}"""

    print('[ai-fill] pages_text length:', len(pages_text))
    print('[ai-fill] pages_text preview:', pages_text[:500])

    raw = gpt_request(prompt, api_key)
    print('[ai-fill] GPT raw response:', raw[:2000])

    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not match:
        return err('GPT не вернул JSON', 500)

    result = json.loads(match.group())
    print('[ai-fill] parsed result:', json.dumps(result, ensure_ascii=False)[:1000])
    return ok(result)


# ── /submit ───────────────────────────────────────────────────────────────────

def handle_submit(body: dict) -> dict:
    """Сохраняет или обновляет анкету в БД (автосохранение)."""
    data = body.get('data', {})
    existing_id = body.get('id')
    if not data:
        return err('data is required')
    fields = (data.get('name',''), data.get('city',''), data.get('telegram',''), data.get('email',''), data.get('type',''), json.dumps(data, ensure_ascii=False))
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    if existing_id:
        cur.execute(
            f'UPDATE {SCHEMA}.submissions SET name=%s, city=%s, telegram=%s, email=%s, type=%s, data=%s WHERE id=%s RETURNING id',
            (*fields, existing_id)
        )
        row = cur.fetchone()
        record_id = row[0] if row else existing_id
    else:
        cur.execute(
            f'INSERT INTO {SCHEMA}.submissions (name, city, telegram, email, type, data) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id',
            fields
        )
        row = cur.fetchone()
        record_id = row[0]
    conn.commit(); cur.close(); conn.close()
    return ok({'id': record_id, 'ok': True})


def handle_admin(event: dict) -> dict:
    """Возвращает список всех анкет (только с токеном)."""
    token = (event.get('headers') or {}).get('X-Admin-Token', '')
    if token != ADMIN_TOKEN:
        return err('Unauthorized', 401)
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute(f'SELECT id, created_at, name, city, telegram, email, type, data FROM {SCHEMA}.submissions ORDER BY created_at DESC')
    rows = cur.fetchall()
    cur.close(); conn.close()
    return ok({'submissions': [
        {'id': r[0], 'created_at': str(r[1]), 'name': r[2], 'city': r[3], 'telegram': r[4], 'email': r[5], 'type': r[6], 'data': r[7]}
        for r in rows
    ]})


# ── Router ────────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """Единая функция: upload, ai-fill, submit, admin."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'POST')

    if method == 'GET':
        return handle_admin(event)

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', 'upload')

    if action == 'ai-fill':
        return handle_ai_fill(body)
    if action == 'submit':
        return handle_submit(body)
    return handle_upload(body)