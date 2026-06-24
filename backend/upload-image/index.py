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
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        html = re.sub(r'<(script|style)[^>]*>.*?</(script|style)>', '', html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', html)
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:5000]
    except Exception as e:
        return f'[Ошибка загрузки {url}: {e}]'


def gpt_request(prompt: str, api_key: str) -> str:
    payload = json.dumps({
        'model': 'mistral-small-latest',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.2,
        'max_tokens': 1500,
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
    for url in urls[:5]:
        pages_text += f'\n\n--- {url} ---\n{fetch_url(url)}'

    for file in files[:3]:
        pages_text += f'\n\n{extract_file_text(file)}'

    prompt = f"""Ты помогаешь заполнить анкету ИИ-специалиста для каталога.
Вот содержимое сайтов/профилей специалиста:
{pages_text}

На основе этой информации заполни поля анкеты. Отвечай ТОЛЬКО валидным JSON без markdown и пояснений.

{{
  "name": "Имя Фамилия или название компании",
  "city": "Город",
  "site": ["ссылка1"],
  "telegram": "@username или пусто",
  "email": "email или пусто",
  "type": "Специалист-фрилансер или Агентство / команда",
  "categories": ["категория1"],
  "niches": ["ниша1"],
  "tools": "инструменты через запятую",
  "pitch": "2-4 предложения: кто вы, для кого, что делаете, какой результат",
  "projectsCount": "число если есть",
  "priceFrom": "стоимость если указана",
  "pricingType": [],
  "workFormat": []
}}

Категории: Внедрение ИИ в бизнес, Чат-боты и ассистенты, ИИ-агенты и автоматизация, Обучение команды, Маркетинг и контент, Аналитика и ML, HR и рекрутинг, Разработка и интеграции.
Ниши: Франчайзинг, Ритейл, Медицина, HoReCa, HR / рекрутинг, Финансы, Производство, Другое.
Форматы: Удалённо, Выезд к клиенту, Онлайн + выезд.
Стоимость: Фиксированная сумма проекта, Почасовая оплата, По запросу / индивидуально."""

    raw = gpt_request(prompt, api_key)
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not match:
        return err('GPT не вернул JSON', 500)

    return ok(json.loads(match.group()))


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