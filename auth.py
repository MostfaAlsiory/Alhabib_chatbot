import logging
from flask import Blueprint, render_template, redirect, url_for, request, flash
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from database import db

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    from models import User
    if current_user.is_authenticated:
        return redirect(url_for('chat.dashboard'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        remember = True if request.form.get('remember') else False
        
        user = User.query.filter_by(email=email).first()
        
        # Check if user exists and password is correct
        if not user or not user.check_password(password):
            flash('Please check your login details and try again.', 'danger')
            return redirect(url_for('auth.login'))
            
        # If the user exists and password is correct, log them in
        login_user(user, remember=remember)
        next_page = request.args.get('next')
        if next_page:
            return redirect(next_page)
        return redirect(url_for('chat.dashboard'))
        
    return render_template('login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    from models import User
    if current_user.is_authenticated:
        return redirect(url_for('chat.dashboard'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Check if email already exists
        user = User.query.filter_by(email=email).first()
        if user:
            flash('Email address already exists', 'danger')
            return redirect(url_for('auth.register'))
            
        # Check if username already exists
        user = User.query.filter_by(username=username).first()
        if user:
            flash('Username already exists', 'danger')
            return redirect(url_for('auth.register'))
            
        # Create new user
        new_user = User(email=email, username=username)
        new_user.set_password(password)
        
        try:
            db.session.add(new_user)
            db.session.commit()
            flash('Account created successfully! You can now log in.', 'success')
            return redirect(url_for('auth.login'))
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            db.session.rollback()
            flash('An error occurred. Please try again.', 'danger')
            
    return render_template('register.html')

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@auth_bp.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    from models import AppSetting, User
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'update_app_settings':
            app_name = request.form.get('app_name')
            welcome_msg = request.form.get('welcome_msg')
            
            # Update or create app_name
            setting_name = AppSetting.query.filter_by(key='app_name').first()
            if not setting_name:
                setting_name = AppSetting(key='app_name', value=app_name, description='Application Name')
                db.session.add(setting_name)
            else:
                setting_name.value = app_name
                
            # Update or create welcome_msg
            setting_welcome = AppSetting.query.filter_by(key='welcome_msg').first()
            if not setting_welcome:
                setting_welcome = AppSetting(key='welcome_msg', value=welcome_msg, description='Welcome Message')
                db.session.add(setting_welcome)
            else:
                setting_welcome.value = welcome_msg
                
            db.session.commit()
            flash('App settings updated successfully!', 'success')
            return redirect(url_for('auth.settings'))

        if action == 'update_profile':
            username = request.form.get('username')
            
            # Check if username already exists
            user_check = User.query.filter_by(username=username).first()
            if user_check and user_check.id != current_user.id:
                flash('Username already exists', 'danger')
                return redirect(url_for('auth.settings'))
                
            current_user.username = username
            db.session.commit()
            flash('Profile updated successfully!', 'success')
            
        elif action == 'change_password':
            current_password = request.form.get('current_password')
            new_password = request.form.get('new_password')
            confirm_password = request.form.get('confirm_password')
            
            # Verify current password
            if not current_user.check_password(current_password):
                flash('Current password is incorrect', 'danger')
                return redirect(url_for('auth.settings'))
                
            # Check if new passwords match
            if new_password != confirm_password:
                flash('New passwords do not match', 'danger')
                return redirect(url_for('auth.settings'))
                
            # Update password
            current_user.set_password(new_password)
            db.session.commit()
            flash('Password updated successfully!', 'success')
            
    app_name = AppSetting.get_setting('app_name', 'Bank AI Assistant')
    welcome_msg = AppSetting.get_setting('welcome_msg', 'How can I help you today?')
    return render_template('settings.html', app_name=app_name, welcome_msg=welcome_msg)

@auth_bp.app_context_processor
def inject_settings():
    from models import AppSetting
    return {
        'get_setting': AppSetting.get_setting
    }
