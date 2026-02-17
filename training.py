import os
import logging
import uuid
import datetime
import re
from werkzeug.utils import secure_filename
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash, current_app
from flask_login import login_required, current_user
from models import TrainingData, TrainingFile
from database import db

training_bp = Blueprint('training', __name__)
logger = logging.getLogger(__name__)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx', 'csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@training_bp.route('/training')
@login_required
def training_page():
    return render_template('training.html')

@training_bp.route('/data')
@login_required
def data_page():
    return render_template('data.html')

@training_bp.route('/api/training/manual', methods=['POST'])
@login_required
def add_manual_training():
    data = request.get_json()
    if not data or 'question' not in data or 'answer' not in data:
        return jsonify({'error': 'Question and answer are required'}), 400
    
    question = data['question'].strip()
    answer = data['answer'].strip()
    
    if not question or not answer:
        return jsonify({'error': 'Question and answer cannot be empty'}), 400
    
    # Create training data entry
    training_data = TrainingData(
        user_id=current_user.id,
        question=question,
        answer=answer,
        source_type='manual'
    )
    
    try:
        db.session.add(training_data)
        db.session.commit()
        return jsonify({
            'id': training_data.id,
            'question': training_data.question,
            'answer': training_data.answer,
            'created_at': training_data.created_at.isoformat()
        })
    except Exception as e:
        logger.error(f"Error adding manual training data: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to add training data'}), 500

@training_bp.route('/api/training/file', methods=['POST'])
@login_required
def upload_training_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
        
        training_file = TrainingFile(
            user_id=current_user.id,
            filename=unique_filename,
            original_filename=original_filename,
            file_size=0,
            file_type=file.content_type if hasattr(file, 'content_type') else 'application/octet-stream',
            status='processing'
        )
        
        try:
            upload_dir = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            os.makedirs(upload_dir, exist_ok=True)
            
            file_path = os.path.join(upload_dir, unique_filename)
            file.save(file_path)
            
            training_file.file_size = os.path.getsize(file_path)
            db.session.add(training_file)
            db.session.commit()
            
            # Process immediately
            success = process_training_file(training_file.id)
            
            # Refresh to get updated status
            db.session.refresh(training_file)
            
            return jsonify({
                'id': training_file.id,
                'filename': training_file.original_filename,
                'status': training_file.status,
                'created_at': training_file.created_at.isoformat(),
                'success': success
            })
        except Exception as e:
            logger.error(f"Error uploading training file: {str(e)}")
            db.session.rollback()
            return jsonify({'error': f'Failed to upload file: {str(e)}'}), 500
    
    return jsonify({'error': 'File type not allowed'}), 400

def process_training_file(file_id):
    """Process an uploaded training file with enhanced extraction logic."""
    training_file = TrainingFile.query.get(file_id)
    if not training_file:
        return False
    
    try:
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], training_file.filename)
        
        if training_file.filename.endswith('.txt'):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Use Regex to find Q&A pairs in both Arabic and English
            # Arabic: س: ... ج: ...
            # English: Q: ... A: ... or Question: ... Answer: ...
            
            # Pattern for Arabic Q&A
            arabic_pattern = re.compile(r'س:(.*?)(?=س:|Q:|Question:|$)', re.DOTALL | re.IGNORECASE)
            english_pattern = re.compile(r'(?:Q:|Question:)(.*?)(?=س:|Q:|Question:|$)', re.DOTALL | re.IGNORECASE)
            
            data_count = 0
            
            # Process Arabic matches
            for match in arabic_pattern.finditer(content):
                chunk = match.group(1).strip()
                if 'ج:' in chunk:
                    parts = chunk.split('ج:', 1)
                    question = parts[0].strip()
                    answer = parts[1].strip()
                    if question and answer:
                        training_data = TrainingData(
                            user_id=training_file.user_id,
                            question=question,
                            answer=answer,
                            source_type='file',
                            source_name=training_file.original_filename
                        )
                        db.session.add(training_data)
                        data_count += 1

            # Process English matches
            for match in english_pattern.finditer(content):
                chunk = match.group(1).strip()
                if 'A:' in chunk or 'Answer:' in chunk:
                    delimiter = 'A:' if 'A:' in chunk else 'Answer:'
                    parts = chunk.split(delimiter, 1)
                    question = parts[0].strip()
                    answer = parts[1].strip()
                    if question and answer:
                        training_data = TrainingData(
                            user_id=training_file.user_id,
                            question=question,
                            answer=answer,
                            source_type='file',
                            source_name=training_file.original_filename
                        )
                        db.session.add(training_data)
                        data_count += 1
            
            # Fallback for simple line-by-line if no patterns found
            if data_count == 0:
                lines = [l.strip() for l in content.split('\n') if l.strip()]
                for i in range(0, len(lines) - 1, 2):
                    q = lines[i]
                    a = lines[i+1]
                    # Simple heuristic: if q starts with Q or س and a starts with A or ج
                    q_clean = re.sub(r'^[سQ]:\s*', '', q)
                    a_clean = re.sub(r'^[جA]:\s*', '', a)
                    training_data = TrainingData(
                        user_id=training_file.user_id,
                        question=q_clean,
                        answer=a_clean,
                        source_type='file',
                        source_name=training_file.original_filename
                    )
                    db.session.add(training_data)
                    data_count += 1

            training_file.status = 'completed'
            training_file.processed_at = datetime.datetime.utcnow()
            db.session.commit()
            return True
            
        training_file.status = 'completed' # Mark as completed even if not txt for now
        db.session.commit()
        return True
    except Exception as e:
        logger.error(f"Error processing training file: {str(e)}")
        training_file.status = 'failed'
        db.session.commit()
        return False

@training_bp.route('/api/training/data', methods=['GET'])
@login_required
def get_training_data():
    training_data = TrainingData.query.filter_by(
        user_id=current_user.id
    ).order_by(TrainingData.created_at.desc()).all()
    
    result = [{
        'id': data.id,
        'question': data.question,
        'answer': data.answer,
        'source_type': data.source_type,
        'source_name': data.source_name,
        'created_at': data.created_at.isoformat()
    } for data in training_data]
    
    return jsonify(result)

@training_bp.route('/api/training/data/<int:data_id>', methods=['DELETE'])
@login_required
def delete_training_data(data_id):
    training_data = TrainingData.query.filter_by(
        id=data_id, user_id=current_user.id
    ).first_or_404()
    
    try:
        db.session.delete(training_data)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error deleting training data: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to delete training data'}), 500

@training_bp.route('/api/training/data/<int:data_id>', methods=['PUT'])
@login_required
def update_training_data(data_id):
    training_data = TrainingData.query.filter_by(
        id=data_id, user_id=current_user.id
    ).first_or_404()
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'question' in data:
        training_data.question = data['question']
    
    if 'answer' in data:
        training_data.answer = data['answer']
    
    try:
        db.session.commit()
        return jsonify({
            'id': training_data.id,
            'question': training_data.question,
            'answer': training_data.answer,
            'source_type': training_data.source_type,
            'source_name': training_data.source_name,
            'created_at': training_data.created_at.isoformat()
        })
    except Exception as e:
        logger.error(f"Error updating training data: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update training data'}), 500

@training_bp.route('/api/training/files', methods=['GET'])
@login_required
def get_training_files():
    training_files = TrainingFile.query.filter_by(
        user_id=current_user.id
    ).order_by(TrainingFile.created_at.desc()).all()
    
    result = [{
        'id': file.id,
        'filename': file.original_filename,
        'file_size': file.file_size,
        'file_type': file.file_type,
        'status': file.status,
        'created_at': file.created_at.isoformat(),
        'processed_at': file.processed_at.isoformat() if file.processed_at else None
    } for file in training_files]
    
    return jsonify(result)
