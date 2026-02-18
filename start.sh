#!/bin/bash

# تشغيل بوت التلجرام في الخلفية
echo "Starting Telegram Bot..."
python telegram_bot.py &

# تشغيل تطبيق الويب (Gunicorn) في الواجهة الأمامية
# نستخدم $PORT الذي يوفره Render تلقائياً
echo "Starting Web App on port $PORT..."
gunicorn app:app --bind 0.0.0.0:$PORT
