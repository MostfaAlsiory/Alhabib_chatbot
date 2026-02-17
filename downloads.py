import os
import logging
import zipfile
import tempfile
import shutil
from datetime import datetime
from flask import Blueprint, send_file, abort, flash, redirect, url_for, current_app
from flask_login import login_required, current_user

downloads_bp = Blueprint('downloads', __name__)
logger = logging.getLogger(__name__)

# List of files and directories to include in the download
# We'll exclude some items like __pycache__, .env, etc.
EXCLUDED_ITEMS = {
    '__pycache__',
    '.git',
    '.env',
    '.replit',
    '.gitignore',
    '.idea',
    '.vscode',
    'tmp',
    '*.pyc',
    '*.pyo',
    '*.pyd',
    '.DS_Store',
    '*.db',
    '*.sqlite',
    '*.zip',  # Exclude any zip files
}

def should_include_item(item_name):
    """Check if an item should be included in the download"""
    if item_name in EXCLUDED_ITEMS:
        return False
    
    for pattern in EXCLUDED_ITEMS:
        if '*' in pattern:
            prefix, suffix = pattern.split('*', 1)
            if item_name.startswith(prefix) and item_name.endswith(suffix):
                return False
    
    return True

@downloads_bp.route('/download-project')
@login_required
def download_project():
    """Generate a ZIP file of the project and send it to the client for download"""
    try:
        # Create a temporary directory for the zip file
        temp_dir = os.path.join(current_app.config['TMP_FOLDER'], f'ai_assistant_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        os.makedirs(temp_dir, exist_ok=True)
        
        # Path for the zip file
        zip_filename = os.path.join(temp_dir, 'ai_assistant_project.zip')
        
        # Get the root directory of the project
        root_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Create a temp project directory with copies of all files
        temp_project_dir = os.path.join(temp_dir, 'project')
        os.makedirs(temp_project_dir, exist_ok=True)
        
        # Copy all important files to temp directory first
        for dir_path, dir_names, file_names in os.walk(root_dir):
            # Skip excluded directories
            dir_names[:] = [d for d in dir_names if should_include_item(d)]
            
            # Calculate the relative path
            rel_path = os.path.relpath(dir_path, root_dir)
            if rel_path == '.':
                rel_path = ''
            
            # Create subdirectory in temp location if needed
            if rel_path:
                os.makedirs(os.path.join(temp_project_dir, rel_path), exist_ok=True)
            
            # Copy files
            for file_name in file_names:
                if should_include_item(file_name):
                    # Skip temporary files
                    if dir_path.startswith(os.path.join(root_dir, 'tmp')):
                        continue
                    
                    try:
                        src_file = os.path.join(dir_path, file_name)
                        dst_file = os.path.join(temp_project_dir, rel_path, file_name)
                        shutil.copy2(src_file, dst_file)
                    except Exception as copy_err:
                        logger.warning(f"Error copying file {file_name}: {str(copy_err)}")
        
        # Create zip from the temporary project directory
        shutil.make_archive(
            os.path.join(temp_dir, 'ai_assistant_project'),  # base name without extension
            'zip',                                           # format
            temp_project_dir                                 # root directory to zip
        )
        
        # Send the file to the client
        return send_file(
            zip_filename,
            mimetype='application/zip',
            as_attachment=True,
            download_name='ai_assistant_project.zip'
        )
    
    except Exception as e:
        logger.error(f"Error creating download: {str(e)}")
        flash('An error occurred while preparing the download.', 'danger')
        return redirect(url_for('chat.dashboard'))