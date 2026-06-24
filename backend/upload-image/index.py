import base64
import json
import os
import re
import urllib.request
import uuid

import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
}


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
    # Jina AI Reader — рендерит JS/SPA и отдаёт чистый текст
    jina_url = f'https://r.jina.ai/{url}'
    try:
        req = urllib.request.Request(
            jina_url,
            headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'text/plain', 'X-Return-Format': 'text'},
        )
        with urllib.request.urlopen(req, timeout=25) as resp:
            text = resp.read().decode('utf-8', errors='ignore')
        text = re.sub(r'\s+', ' ', text).strip()
        print(f'[fetch_url] jina {url} -> {len(text)} chars')
        return f'--- {url} ---\n{text[:6000]}'
    except Exception as e:
        print(f'[fetch_url] jina ERROR {url}: {e}')
        # Fallback: прямой запрос (для обычных сайтов)
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

    # TXT и DOC как текст
    try:
        raw = base64.b64decode(b64).decode('utf-8', errors='ignore')
        text = re.sub(r'\s+', ' ', raw).strip()[:6000]
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

Текст:
{pages_text}

JSON для заполнения:
{{
  "name": "",
  "city": "",
  "site": [],
  "telegram": "",
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


# ── Router ────────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """Единая функция: action=upload — загрузка фото, action=ai-fill — автозаполнение анкеты."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', 'upload')

    if action == 'ai-fill':
        return handle_ai_fill(body)
    return handle_upload(body)