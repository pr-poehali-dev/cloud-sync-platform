import base64
import json
import os
import uuid

import boto3


def handler(event: dict, context) -> dict:
    """Загружает изображение в S3 и возвращает публичный CDN-URL."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    body = json.loads(event.get('body') or '{}')
    data_url: str = body.get('image', '')

    if not data_url:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'image is required'}),
        }

    # data:image/png;base64,<data>
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

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'url': cdn_url}),
    }
