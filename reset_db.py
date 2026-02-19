import os
from app import create_app
from database import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("جاري حذف جميع الجداول من قاعدة البيانات السحابية...")
    # حذف جميع الجداول
    db.drop_all()
    print("تم حذف جميع الجداول بنجاح.")
    
    print("جاري إعادة إنشاء الجداول الجديدة...")
    # إعادة إنشاء الجداول
    db.create_all()
    print("تم إعادة إنشاء الجداول بنجاح.")
    
    print("قاعدة البيانات الآن جاهزة وفارغة.")
