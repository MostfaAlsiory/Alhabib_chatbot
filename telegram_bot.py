import logging
import time
import requests
import os
from app import app, db
from models import TelegramUser, TelegramMessage, AppSetting

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Telegram Bot Token
TELEGRAM_TOKEN = "6571793763:AAFJlDbgGEnOeD_ctbIrujAdYgLb7ObMo7A"
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

def get_updates(offset=None):
    url = f"{TELEGRAM_API_URL}/getUpdates?timeout=30"
    if offset:
        url += f"&offset={offset}"
    try:
        response = requests.get(url, timeout=35)
        return response.json()
    except Exception as e:
        logger.error(f"Error getting updates: {e}")
        return None

def send_chat_action(chat_id, action="typing"):
    url = f"{TELEGRAM_API_URL}/sendChatAction"
    payload = {
        "chat_id": chat_id,
        "action": action
    }
    try:
        requests.post(url, json=payload)
    except Exception as e:
        logger.error(f"Error sending chat action: {e}")

def send_message(chat_id, text, reply_markup=None):
    url = f"{TELEGRAM_API_URL}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
        
    try:
        response = requests.post(url, json=payload)
        if not response.ok:
            logger.warning(f"Failed to send message with HTML, trying plain text: {response.text}")
            # If HTML fails, try plain text
            payload.pop("parse_mode")
            requests.post(url, json=payload)
    except Exception as e:
        logger.error(f"Error sending message: {e}")

def get_or_create_user(chat_data):
    chat_id = str(chat_data["id"])
    user = TelegramUser.query.filter_by(chat_id=chat_id).first()
    if not user:
        user = TelegramUser(
            chat_id=chat_id,
            first_name=chat_data.get("first_name"),
            last_name=chat_data.get("last_name"),
            username=chat_data.get("username")
        )
        db.session.add(user)
        db.session.commit()
        logger.info(f"New Telegram user created: {chat_id}")
    return user

def save_message(user_id, role, content):
    msg = TelegramMessage(telegram_user_id=user_id, role=role, content=content)
    db.session.add(msg)
    db.session.commit()

def handle_updates(updates):
    if not updates or "result" not in updates:
        return None
    
    last_update_id = None
    for update in updates["result"]:
        last_update_id = update["update_id"]
        
        # Handle messages
        if "message" in update:
            message = update["message"]
            chat_id = message["chat"]["id"]
            
            with app.app_context():
                user = get_or_create_user(message["chat"])
                
                # Handle contact/phone number
                if "contact" in message:
                    contact = message["contact"]
                    if str(contact["user_id"]) == str(chat_id):
                        user.phone_number = contact["phone_number"]
                        db.session.commit()
                        send_message(chat_id, "شكراً لك، تم حفظ رقم هاتفك بنجاح. كيف يمكنني مساعدتك الآن؟", reply_markup={"remove_keyboard": True})
                    continue

                if "text" in message:
                    user_text = message["text"]
                    logger.info(f"Received message from {chat_id}: {user_text}")
                    
                    # Save user message
                    save_message(user.id, "user", user_text)
                    
                    if user_text.startswith("/start"):
                        welcome_msg = "<b>مرحباً بك في بوت مؤسسة الحبيب الطبية.</b>\n\nأنا مساعدك الذكي، يمكنني الإجابة على استفساراتك حول خدماتنا الطبية، المستلزمات، الوكالات المعتمدة، وغيرها.\n\nيرجى تزويدنا برقم هاتفك للتواصل الأفضل:"
                        
                        keyboard = {
                            "keyboard": [[{"text": "مشاركة رقم الهاتف", "request_contact": True}]],
                            "resize_keyboard": True,
                            "one_time_keyboard": True
                        }
                        send_message(chat_id, welcome_msg, reply_markup=keyboard)
                        continue

                    # Show "typing" status while generating response
                    send_chat_action(chat_id)
                    
                    try:
                        from ai_engine import generate_ai_response
                        
                        # Get telegram history
                        history_msgs = TelegramMessage.query.filter_by(telegram_user_id=user.id).order_by(TelegramMessage.created_at.asc()).limit(10).all()
                        history = [{"role": m.role, "content": m.content} for m in history_msgs]
                        
                        response_text = generate_ai_response(user_text, history=history)
                        
                        # Save assistant message
                        save_message(user.id, "assistant", response_text)
                        
                        send_message(chat_id, response_text)
                        
                        # Check if admin notification is needed (e.g., specific keywords)
                        admin_id = AppSetting.get_setting("admin_telegram_id")
                        if admin_id:
                            admin_notify = f"🔔 *رسالة جديدة*\n👤 العميل: {user.first_name} {user.last_name or ''}\n📱 الهاتف: {user.phone_number or 'غير متوفر'}\n💬 الرسالة: {user_text}"
                            send_message(admin_id, admin_notify)
                            
                    except Exception as e:
                        logger.error(f"Error generating/sending AI response: {e}")
                        send_message(chat_id, "عذراً، واجهت مشكلة في معالجة طلبك. يرجى المحاولة لاحقاً.")
            
    return last_update_id

def main():
    logger.info("Starting Telegram Bot with Admin Control Features...")
    with app.app_context():
        db.create_all()
        
    offset = None
    while True:
        try:
            updates = get_updates(offset)
            if updates and updates.get("ok"):
                last_id = handle_updates(updates)
                if last_id:
                    offset = last_id + 1
            else:
                if updates:
                    logger.warning(f"Telegram API returned not OK: {updates}")
        except Exception as e:
            logger.error(f"Main loop error: {e}")
        
        time.sleep(0.5)

if __name__ == "__main__":
    main()
