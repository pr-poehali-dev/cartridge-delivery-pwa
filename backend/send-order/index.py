import json
import os
import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def generate_order_number():
    return ''.join(random.choices(string.digits, k=5))


def handler(event: dict, context) -> dict:
    """Принимает данные заказа картриджа и отправляет письмо на почту менеджера."""

    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers, 'body': ''}

    body = json.loads(event.get('body') or '{}')

    name = body.get('name', '')
    phone = body.get('phone', '')
    email = body.get('email', '')
    cartridge_name = body.get('cartridgeName', '')
    cartridge_brand = body.get('cartridgeBrand', '')
    cartridge_color = body.get('cartridgeColor', '')
    cartridge_price = body.get('cartridgePrice', 0)
    quantity = body.get('quantity', 1)
    delivery_name = body.get('deliveryName', '')
    delivery_days = body.get('deliveryDays', '')
    delivery_price = body.get('deliveryPrice', 0)
    address = body.get('address', '')
    comment = body.get('comment', '')
    total_price = body.get('totalPrice', 0)

    order_number = f"CS-{generate_order_number()}"

    smtp_host = os.environ['SMTP_HOST']
    smtp_port = int(os.environ['SMTP_PORT'])
    smtp_user = os.environ['SMTP_USER']
    smtp_password = os.environ['SMTP_PASSWORD']
    notify_email = os.environ['NOTIFY_EMAIL']

    # HTML письмо менеджеру
    html_manager = f"""
    <html><body style="font-family: Arial, sans-serif; color: #222; background: #f5f7fa; padding: 0; margin: 0;">
    <div style="max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <div style="background: #0a0f1e; padding: 24px 32px;">
        <h1 style="color: #2b7fff; margin: 0; font-size: 20px;">КартриджСервис</h1>
        <p style="color: #8ba3be; margin: 4px 0 0; font-size: 14px;">Новый заказ #{order_number}</p>
      </div>
      <div style="padding: 28px 32px;">
        <h2 style="font-size: 16px; color: #0a0f1e; margin-top: 0;">Данные клиента</h2>
        <table style="width:100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #666; width: 140px;">Имя:</td><td style="padding: 6px 0; font-weight: 600;">{name}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Телефон:</td><td style="padding: 6px 0; font-weight: 600;">{phone}</td></tr>
          {'<tr><td style="padding: 6px 0; color: #666;">Email:</td><td style="padding: 6px 0;">' + email + '</td></tr>' if email else ''}
        </table>

        <h2 style="font-size: 16px; color: #0a0f1e; margin-top: 24px;">Заказ</h2>
        <table style="width:100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #666; width: 140px;">Картридж:</td><td style="padding: 6px 0; font-weight: 600;">{cartridge_name}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Бренд:</td><td style="padding: 6px 0;">{cartridge_brand}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Цвет:</td><td style="padding: 6px 0;">{cartridge_color}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Цена за шт.:</td><td style="padding: 6px 0;">{cartridge_price:,} ₽</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Количество:</td><td style="padding: 6px 0; font-weight: 600;">{quantity} шт.</td></tr>
        </table>

        <h2 style="font-size: 16px; color: #0a0f1e; margin-top: 24px;">Доставка</h2>
        <table style="width:100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #666; width: 140px;">Способ:</td><td style="padding: 6px 0; font-weight: 600;">{delivery_name}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Срок:</td><td style="padding: 6px 0;">{delivery_days}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Стоимость:</td><td style="padding: 6px 0;">{'Бесплатно' if delivery_price == 0 else str(delivery_price) + ' ₽'}</td></tr>
          {'<tr><td style="padding: 6px 0; color: #666;">Адрес:</td><td style="padding: 6px 0;">' + address + '</td></tr>' if address else ''}
          {'<tr><td style="padding: 6px 0; color: #666;">Комментарий:</td><td style="padding: 6px 0;">' + comment + '</td></tr>' if comment else ''}
        </table>

        <div style="background: #f0f6ff; border-left: 4px solid #2b7fff; padding: 16px 20px; margin-top: 24px; border-radius: 0 6px 6px 0;">
          <div style="font-size: 13px; color: #555;">Итого к оплате</div>
          <div style="font-size: 28px; font-weight: 700; color: #2b7fff; margin-top: 4px;">{total_price:,} ₽</div>
        </div>
      </div>
      <div style="background: #f5f7fa; padding: 16px 32px; font-size: 12px; color: #999; text-align: center;">
        КартриджСервис · Заказ #{order_number}
      </div>
    </div>
    </body></html>
    """

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'Новый заказ #{order_number} — {name} — {cartridge_name}'
    msg['From'] = smtp_user
    msg['To'] = notify_email
    msg.attach(MIMEText(html_manager, 'html', 'utf-8'))

    with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, notify_email, msg.as_string())

    # Если клиент указал email — отправляем подтверждение
    if email:
        html_client = f"""
        <html><body style="font-family: Arial, sans-serif; color: #222; background: #f5f7fa; padding: 0; margin: 0;">
        <div style="max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #0a0f1e; padding: 24px 32px;">
            <h1 style="color: #2b7fff; margin: 0; font-size: 20px;">КартриджСервис</h1>
            <p style="color: #8ba3be; margin: 4px 0 0; font-size: 14px;">Подтверждение заказа</p>
          </div>
          <div style="padding: 28px 32px;">
            <p style="font-size: 16px;">Здравствуйте, {name}!</p>
            <p style="color: #555; font-size: 14px;">Ваш заказ <strong>#{order_number}</strong> принят. Мы свяжемся с вами по номеру <strong>{phone}</strong> в течение 15 минут.</p>
            <div style="background: #f0f6ff; border-left: 4px solid #2b7fff; padding: 16px 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
              <div style="font-size: 14px; font-weight: 600; color: #0a0f1e;">{cartridge_name}</div>
              <div style="font-size: 13px; color: #666; margin-top: 4px;">{quantity} шт. · {delivery_name} · {delivery_days}</div>
              <div style="font-size: 22px; font-weight: 700; color: #2b7fff; margin-top: 8px;">{total_price:,} ₽</div>
            </div>
            <p style="font-size: 13px; color: #999;">Если у вас есть вопросы — звоните: +7 (495) 123-45-67</p>
          </div>
        </div>
        </body></html>
        """
        msg_client = MIMEMultipart('alternative')
        msg_client['Subject'] = f'Ваш заказ #{order_number} принят — КартриджСервис'
        msg_client['From'] = smtp_user
        msg_client['To'] = email
        msg_client.attach(MIMEText(html_client, 'html', 'utf-8'))

        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, email, msg_client.as_string())

    return {
        'statusCode': 200,
        'headers': {**cors_headers, 'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True, 'orderNumber': order_number}),
    }
