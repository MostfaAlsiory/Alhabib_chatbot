/**
 * Training functionality for AI Assistant Platform
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const manualTrainingForm = document.getElementById('manual-training-form');
    const fileUploadForm = document.getElementById('file-upload-form');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const trainingDataContainer = document.getElementById('training-data-container');
    const trainingFilesContainer = document.getElementById('training-files-container');
    
    // Initialize
    if (trainingDataContainer) {
        loadTrainingData();
    }
    
    if (trainingFilesContainer) {
        loadTrainingFiles();
    }
    
    // Event listeners
    if (manualTrainingForm) {
        manualTrainingForm.addEventListener('submit', handleManualTraining);
    }
    
    if (fileUploadForm) {
        fileUploadForm.addEventListener('submit', handleFileUpload);
    }
    
    // Drag and drop functionality
    if (dropZone && fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        dropZone.addEventListener('drop', handleDrop, false);
        
        // Click to upload
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) {
                handleFiles(fileInput.files);
            }
        });
    }
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dropZone.classList.add('border-primary');
    }
    
    function unhighlight() {
        dropZone.classList.remove('border-primary');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
    
    function handleFiles(files) {
        if (files.length > 0) {
            // Create FormData
            const formData = new FormData();
            formData.append('file', files[0]);
            
            // Upload file
            uploadFile(formData);
        }
    }
    
    /**
     * Handle manual training form submission
     * @param {Event} e - Form submit event
     */
    function handleManualTraining(e) {
        e.preventDefault();
        
        const questionInput = document.getElementById('question-input');
        const answerInput = document.getElementById('answer-input');
        
        const question = questionInput.value.trim();
        const answer = answerInput.value.trim();
        
        if (!question || !answer) {
            showAlert('Both question and answer are required.', 'warning');
            return;
        }
        
        // Send to server
        fetch('/api/training/manual', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question, answer })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to add training data');
            }
            return response.json();
        })
        .then(data => {
            // Clear form
            questionInput.value = '';
            answerInput.value = '';
            
            // Show success message
            showAlert('Training data added successfully!', 'success');
            
            // Reload training data
            loadTrainingData();
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Failed to add training data. Please try again.', 'danger');
        });
    }
    
    /**
     * Handle file upload form submission
     * @param {Event} e - Form submit event
     */
    function handleFileUpload(e) {
        e.preventDefault();
        
        if (!fileInput.files.length) {
            showAlert('Please select a file to upload.', 'warning');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        
        uploadFile(formData);
    }
    
    /**
     * Upload a file to the server
     * @param {FormData} formData - Form data with file
     */
    function uploadFile(formData) {
        // Show loading indicator
        const uploadStatus = document.getElementById('upload-status');
        if (uploadStatus) {
            uploadStatus.innerHTML = `
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span class="ms-2">Uploading file...</span>
            `;
        }
        
        fetch('/api/training/file', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to upload file');
            }
            return response.json();
        })
        .then(data => {
            // Reset file input
            fileInput.value = '';
            
            // Show success message
            showAlert('File uploaded successfully!', 'success');
            
            // Update upload status
            if (uploadStatus) {
                uploadStatus.innerHTML = `
                    <i class="fas fa-check-circle text-success"></i>
                    <span class="ms-2">File uploaded successfully!</span>
                `;
                
                // Clear status after 3 seconds
                setTimeout(() => {
                    uploadStatus.innerHTML = '';
                }, 3000);
            }
            
            // Reload training files and data
            loadTrainingFiles();
            if (typeof loadTrainingData === 'function') {
                loadTrainingData();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Failed to upload file. Please try again.', 'danger');
            
            // Update upload status
            if (uploadStatus) {
                uploadStatus.innerHTML = `
                    <i class="fas fa-times-circle text-danger"></i>
                    <span class="ms-2">Upload failed. Please try again.</span>
                `;
            }
        });
    }
    
    /**
     * Load training data from the server
     */
    function loadTrainingData() {
        fetch('/api/training/data')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load training data');
            }
            return response.json();
        })
        .then(data => {
            renderTrainingData(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Failed to load training data.', 'danger');
        });
    }
    
    /**
     * Render training data in the container
     * @param {Array} data - Array of training data objects
     */
    function renderTrainingData(data) {
        if (!trainingDataContainer) return;
        
        trainingDataContainer.innerHTML = '';
        
        if (data.length === 0) {
            trainingDataContainer.innerHTML = `
                <div class="text-center text-muted my-5">
                    <p>No training data yet. Add some using the form above.</p>
                </div>
            `;
            return;
        }
        
        const row = document.createElement('div');
        row.className = 'row';
        
        data.forEach(item => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            
            col.innerHTML = `
                <div class="card data-card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <span class="badge ${item.source_type === 'manual' ? 'bg-primary' : 'bg-info'}">
                            ${item.source_type === 'manual' ? 'Manual Entry' : 'From File: ' + escapeHtml(item.source_name || 'Unknown')}
                        </span>
                        <div class="data-controls">
                            <button class="btn btn-sm btn-outline-secondary edit-data" data-id="${item.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-data" data-id="${item.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-subtitle mb-2 text-primary">Question:</h6>
                        <p class="card-text question-text">${escapeHtml(item.question)}</p>
                        <h6 class="card-subtitle mb-2 text-success">Answer:</h6>
                        <p class="card-text answer-text">${escapeHtml(item.answer)}</p>
                    </div>
                    <div class="card-footer text-muted small">
                        Added ${formatDate(item.created_at)}
                    </div>
                </div>
            `;
            
            row.appendChild(col);
        });
        
        trainingDataContainer.appendChild(row);
        
        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-data').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const card = this.closest('.card');
                const questionText = card.querySelector('.question-text').textContent;
                const answerText = card.querySelector('.answer-text').textContent;
                
                // Show edit modal
                showEditModal(id, questionText, answerText);
            });
        });
        
        document.querySelectorAll('.delete-data').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this training data?')) {
                    deleteTrainingData(id);
                }
            });
        });
    }
    
    /**
     * Load training files from the server
     */
    function loadTrainingFiles() {
        fetch('/api/training/files')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load training files');
            }
            return response.json();
        })
        .then(data => {
            renderTrainingFiles(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Failed to load training files.', 'danger');
        });
    }
    
    /**
     * Render training files in the container
     * @param {Array} files - Array of training file objects
     */
    function renderTrainingFiles(files) {
        if (!trainingFilesContainer) return;
        
        trainingFilesContainer.innerHTML = '';
        
        if (files.length === 0) {
            trainingFilesContainer.innerHTML = `
                <div class="text-center text-muted my-5">
                    <p>No files uploaded yet. Upload a file using the form above.</p>
                </div>
            `;
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'table table-hover';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Filename</th>
                    <th>Size</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        files.forEach(file => {
            const tr = document.createElement('tr');
            
            // Format file size
            const fileSize = formatFileSize(file.file_size);
            
            // Format status with appropriate badge
            let statusBadge;
            switch (file.status) {
                case 'processing':
                    statusBadge = '<span class="badge bg-warning">Processing</span>';
                    break;
                case 'completed':
                    statusBadge = '<span class="badge bg-success">Completed</span>';
                    break;
                case 'failed':
                    statusBadge = '<span class="badge bg-danger">Failed</span>';
                    break;
                default:
                    statusBadge = '<span class="badge bg-secondary">Unknown</span>';
            }
            
            tr.innerHTML = `
                <td>${escapeHtml(file.filename)}</td>
                <td>${fileSize}</td>
                <td>${escapeHtml(file.file_type)}</td>
                <td>${statusBadge}</td>
                <td>${formatDate(file.created_at)}</td>
            `;
            
            tbody.appendChild(tr);
        });
        
        trainingFilesContainer.appendChild(table);
    }
    
    /**
     * Format file size to human-readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Show edit modal for training data
     * @param {number} id - Training data ID
     * @param {string} question - Original question text
     * @param {string} answer - Original answer text
     */
    function showEditModal(id, question, answer) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('edit-data-modal');
        
        if (!modal) {
            const modalHtml = `
                <div class="modal fade" id="edit-data-modal" tabindex="-1" aria-labelledby="edit-data-modal-label" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="edit-data-modal-label">Edit Training Data</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="edit-data-form">
                                    <input type="hidden" id="edit-data-id">
                                    <div class="mb-3">
                                        <label for="edit-question" class="form-label">Question</label>
                                        <textarea class="form-control" id="edit-question" rows="3" required></textarea>
                                    </div>
                                    <div class="mb-3">
                                        <label for="edit-answer" class="form-label">Answer</label>
                                        <textarea class="form-control" id="edit-answer" rows="5" required></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="save-edit-btn">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('edit-data-modal');
            
            // Add event listener for save button
            document.getElementById('save-edit-btn').addEventListener('click', function() {
                const dataId = document.getElementById('edit-data-id').value;
                const editedQuestion = document.getElementById('edit-question').value.trim();
                const editedAnswer = document.getElementById('edit-answer').value.trim();
                
                if (!editedQuestion || !editedAnswer) {
                    showAlert('Both question and answer are required.', 'warning');
                    return;
                }
                
                updateTrainingData(dataId, editedQuestion, editedAnswer);
                
                // Close modal
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            });
        }
        
        // Set values in the modal
        document.getElementById('edit-data-id').value = id;
        document.getElementById('edit-question').value = question;
        document.getElementById('edit-answer').value = answer;
        
        // Show modal
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    }
    
    /**
     * Update training data on the server
     * @param {number} id - Training data ID
     * @param {string} question - Updated question
     * @param {string} answer - Updated answer
     */
    function updateTrainingData(id, question, answer) {
        fetch(`/api/training/data/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question, answer })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update training data');
            }
            return response.json();
        })
        .then(() => {
            showAlert('Training data updated successfully!', 'success');
            loadTrainingData();
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Failed to update training data. Please try again.', 'danger');
        });
    }
    
    /**
     * Delete training data from the server
     * @param {number} id - Training data ID
     */
    function deleteTrainingData(id) {
        fetch(`/api/training/data/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete training data');
            }
            return response.json();
        })
        .then(() => {
            showAlert('Training data deleted successfully!', 'success');
            loadTrainingData();
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Failed to delete training data. Please try again.', 'danger');
        });
    }
});
