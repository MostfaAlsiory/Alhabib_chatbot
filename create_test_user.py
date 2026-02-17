
from app import app
from database import db
from models import User, TrainingData

def setup():
    with app.app_context():
        # Create user if not exists
        user = User.query.filter_by(username='admin').first()
        if not user:
            user = User(username='admin', email='admin@example.com')
            user.set_password('admin123')
            db.session.add(user)
            db.session.commit()
            print("Test user 'admin' created with password 'admin123'")
        else:
            print("User 'admin' already exists.")

        # Ensure some training data exists
        if TrainingData.query.count() == 0:
            sample = TrainingData(
                user_id=user.id,
                question="ما هي مؤسسة الحبيب الطبية؟", 
                answer="مؤسسة الحبيب الطبية هي مؤسسة رائدة في تقديم الخدمات والمستلزمات الطبية، وتعتبر وكيل معتمد للعديد من الشركات العالمية المتخصصة في الأجهزة والمعدات الطبية.",
                source_type="manual"
            )
            db.session.add(sample)
            db.session.commit()
            print("Sample training data added.")

if __name__ == "__main__":
    setup()
