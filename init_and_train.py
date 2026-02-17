import os
import sys
from app import app, db
from models import User, TrainingData, TrainingFile
from training import process_training_file
import shutil

def init_and_train():
    with app.app_context():
        # 1. Create tables
        print("Creating database tables...")
        db.create_all()
        
        # 2. Create a default user if not exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            print("Creating admin user...")
            admin = User(username='admin', email='admin@example.com')
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("Admin user created.")
        else:
            print("Admin user already exists.")
            
        # 3. Prepare the training file
        # The file is in the project directory
        source_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'alhabib_medical_data.txt')
        if not os.path.exists(source_file):
            print(f"Error: Source file not found at {source_file}")
            return

        upload_folder = app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        
        unique_filename = "alhabib_medical_data_v1.txt"
        dest_path = os.path.join(upload_folder, unique_filename)
        shutil.copy(source_file, dest_path)
        
        # 4. Create TrainingFile record
        # Check if already exists to avoid duplicates
        existing_file = TrainingFile.query.filter_by(original_filename='alhabib_medical_data.txt').first()
        if not existing_file:
            training_file = TrainingFile(
                user_id=admin.id,
                filename=unique_filename,
                original_filename='alhabib_medical_data.txt',
                file_size=os.path.getsize(dest_path),
                file_type='text/plain',
                status='processing'
            )
            db.session.add(training_file)
            db.session.commit()
            print(f"Training file record created with ID: {training_file.id}")
            file_id = training_file.id
        else:
            print("Training file record already exists.")
            file_id = existing_file.id
        
        # 5. Process the file
        print("Processing training file...")
        success = process_training_file(file_id)
        
        if success:
            count = TrainingData.query.filter_by(source_name='alhabib_medical_data.txt').count()
            print(f"Successfully trained with {count} Q&A pairs about Al-Habib Medical Institution.")
        else:
            print("Failed to process training file.")

if __name__ == "__main__":
    init_and_train()
