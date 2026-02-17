import os
from app import app
from database import db
from models import User, TrainingData, TrainingFile
import re

def process_text_content(content, user_id, filename):
    # Arabic: س: ... ج: ...
    arabic_pattern = re.compile(r'س:(.*?)(?=س:|Q:|Question:|$)', re.DOTALL | re.IGNORECASE)
    
    data_count = 0
    for match in arabic_pattern.finditer(content):
        chunk = match.group(1).strip()
        if 'ج:' in chunk:
            parts = chunk.split('ج:', 1)
            question = parts[0].strip()
            answer = parts[1].strip()
            if question and answer:
                training_data = TrainingData(
                    user_id=user_id,
                    question=question,
                    answer=answer,
                    source_type='file',
                    source_name=filename
                )
                db.session.add(training_data)
                data_count += 1
    return data_count

def setup():
    with app.app_context():
        print("Initializing database...")
        db.create_all()
        
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            print("Creating admin user...")
            admin = User(username='admin', email='admin@example.com')
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
        
        # Check if data already exists
        if True: # Force reload for new institution
            print("Cleaning old data...")
            TrainingData.query.delete()
            print("Loading initial data from alhabib_medical_data.txt...")
            data_file = 'alhabib_medical_data.txt'
            if os.path.exists(data_file):
                with open(data_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                count = process_text_content(content, admin.id, data_file)
                db.session.commit()
                print(f"Loaded {count} entries.")
            else:
                print("Data file not found!")
        else:
            print("Database already contains data.")

if __name__ == "__main__":
    setup()
