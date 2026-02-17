#!/bin/bash
# تشغيل بوت التلجرام في الخلفية
python telegram_bot.py &
# تشغيل تطبيق الويب (Gunicorn) في الواجهة الأمامية
gunicorn app:app
