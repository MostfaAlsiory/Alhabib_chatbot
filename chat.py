import logging
import json
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_required, current_user
from models import Conversation, Message, TelegramUser, TelegramMessage, AppSetting
from database import db
from ai_engine import generate_ai_response

chat_bp = Blueprint('chat', __name__)
logger = logging.getLogger(__name__)

@chat_bp.route('/dashboard')
@login_required
def dashboard():
    # Basic stats for dashboard
    telegram_users_count = TelegramUser.query.count()
    total_messages = TelegramMessage.query.count()
    return render_template('dashboard.html', 
                         telegram_users_count=telegram_users_count, 
                         total_messages=total_messages)

@chat_bp.route('/admin/telegram')
@login_required
def telegram_admin():
    users = TelegramUser.query.order_by(TelegramUser.created_at.desc()).all()
    admin_id = AppSetting.get_setting("admin_telegram_id", "")
    return render_template('telegram_admin.html', users=users, admin_id=admin_id)

@chat_bp.route('/admin/telegram/user/<int:user_id>')
@login_required
def telegram_user_messages(user_id):
    user = TelegramUser.query.get_or_404(user_id)
    messages = TelegramMessage.query.filter_by(telegram_user_id=user.id).order_by(TelegramMessage.created_at.asc()).all()
    return render_template('telegram_messages.html', user=user, messages=messages)

@chat_bp.route('/admin/telegram/settings', methods=['POST'])
@login_required
def update_telegram_settings():
    admin_id = request.form.get('admin_telegram_id')
    setting = AppSetting.query.filter_by(key="admin_telegram_id").first()
    if not setting:
        setting = AppSetting(key="admin_telegram_id", value=admin_id, description="Admin Telegram ID for notifications")
        db.session.add(setting)
    else:
        setting.value = admin_id
    db.session.commit()
    flash('تم تحديث إعدادات المدير بنجاح', 'success')
    return redirect(url_for('chat.telegram_admin'))

@chat_bp.route('/chat')
@login_required
def chat_page():
    conversation_id = request.args.get('id')
    
    if conversation_id:
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first_or_404()
        return render_template('chat.html', conversation=conversation)
    else:
        # Create a new conversation
        new_conversation = Conversation(user_id=current_user.id)
        db.session.add(new_conversation)
        db.session.commit()
        return redirect(url_for('chat.chat_page', id=new_conversation.id))

@chat_bp.route('/api/conversations', methods=['GET'])
@login_required
def get_conversations():
    conversations = Conversation.query.filter_by(
        user_id=current_user.id
    ).order_by(Conversation.updated_at.desc()).all()
    
    result = [{
        'id': conv.id,
        'title': conv.title,
        'created_at': conv.created_at.isoformat(),
        'updated_at': conv.updated_at.isoformat(),
        'message_count': conv.messages.count()
    } for conv in conversations]
    
    return jsonify(result)

@chat_bp.route('/api/conversations/<int:conversation_id>/rename', methods=['POST'])
@login_required
def rename_conversation(conversation_id):
    conversation = Conversation.query.filter_by(
        id=conversation_id, user_id=current_user.id
    ).first_or_404()
    
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'error': 'Title is required'}), 400
    
    conversation.title = data['title']
    db.session.commit()
    
    return jsonify({'success': True})

@chat_bp.route('/api/conversations/<int:conversation_id>', methods=['DELETE'])
@login_required
def delete_conversation(conversation_id):
    conversation = Conversation.query.filter_by(
        id=conversation_id, user_id=current_user.id
    ).first_or_404()
    
    db.session.delete(conversation)
    db.session.commit()
    
    return jsonify({'success': True})

@chat_bp.route('/api/conversations/<int:conversation_id>/messages', methods=['GET'])
@login_required
def get_messages(conversation_id):
    conversation = Conversation.query.filter_by(
        id=conversation_id, user_id=current_user.id
    ).first_or_404()
    
    messages = Message.query.filter_by(
        conversation_id=conversation.id
    ).order_by(Message.created_at).all()
    
    result = [{
        'id': msg.id,
        'role': msg.role,
        'content': msg.content,
        'created_at': msg.created_at.isoformat()
    } for msg in messages]
    
    return jsonify(result)

@chat_bp.route('/api/conversations/<int:conversation_id>/messages', methods=['POST'])
@login_required
def send_message(conversation_id):
    conversation = Conversation.query.filter_by(
        id=conversation_id, user_id=current_user.id
    ).first_or_404()
    
    data = request.get_json()
    logger.debug(f"Received message request: {data}")
    if not data or 'message' not in data:
        logger.warning("Message missing in request data")
        return jsonify({'error': 'Message is required'}), 400
    
    # Create user message
    user_message = Message(
        conversation_id=conversation.id,
        role='user',
        content=data['message']
    )
    db.session.add(user_message)
    
    # Update conversation title if it's still the default
    if conversation.title == 'New Conversation':
        # Use the first 40 chars of the message as the title for better context
        title = data['message'][:40].strip()
        if len(data['message']) > 40:
            title += '...'
        conversation.title = title or "Conversation"
    
    # Generate AI response
    try:
        # Get conversation history for context
        history_messages = Message.query.filter_by(conversation_id=conversation.id).order_by(Message.created_at.asc()).all()
        history = [{"role": msg.role, "content": msg.content} for msg in history_messages]

        logger.info(f"Generating AI response for message: {data['message'][:50]} with history of {len(history)} messages...")
        ai_response = generate_ai_response(data['message'], history=history)
        logger.info("AI response generated successfully")
        
        # Create assistant message
        assistant_message = Message(
            conversation_id=conversation.id,
            role='assistant',
            content=ai_response
        )
        db.session.add(assistant_message)
        
        # Update conversation timestamp
        conversation.updated_at = db.func.now()
        
        db.session.commit()
        
        return jsonify({
            'user_message': {
                'id': user_message.id,
                'role': user_message.role,
                'content': user_message.content,
                'created_at': user_message.created_at.isoformat()
            },
            'assistant_message': {
                'id': assistant_message.id,
                'role': assistant_message.role,
                'content': assistant_message.content,
                'created_at': assistant_message.created_at.isoformat()
            }
        })
    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to generate AI response'}), 500
