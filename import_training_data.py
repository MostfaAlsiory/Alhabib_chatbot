import os
import re
from app import create_app
from database import db
from models import TrainingData, User

def parse_training_data(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Match Question and Answer pairs
    # Pattern: **سؤال: ...** \n **إجابة:** ...
    pattern = r'\*\*سؤال:\s*(.*?)\*\*\s*\n\s*\*\*إجابة:\*\*\s*(.*?)(?=\n\s*\*\*سؤال:|\n\s*---|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    data = []
    for q, a in matches:
        data.append({
            'question': q.strip(),
            'answer': a.strip()
        })
    return data

def import_data():
    app = create_app()
    with app.app_context():
        # Get the first user (admin)
        user = User.query.first()
        if not user:
            print("No user found. Please create a user first.")
            return
        
        file_path = '/home/ubuntu/upload/alhabib_training_data_extensive.txt'
        training_items = parse_training_data(file_path)
        
        print(f"Found {len(training_items)} training items.")
        
        for item in training_items:
            # Check if already exists to avoid duplicates
            exists = TrainingData.query.filter_by(
                user_id=user.id, 
                question=item['question']
            ).first()
            
            if not exists:
                new_data = TrainingData(
                    user_id=user.id,
                    question=item['question'],
                    answer=item['answer'],
                    source_type='file',
                    source_name='alhabib_training_data_extensive.txt'
                )
                db.session.add(new_data)
        
        db.session.commit()
        print("Successfully imported training data.")

if __name__ == "__main__":
    import_data()
