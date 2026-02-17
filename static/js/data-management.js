/**
 * Data management functionality for AI Assistant Platform
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dataTableContainer = document.getElementById('data-table-container');
    const searchInput = document.getElementById('search-data');
    
    // Initialize
    if (dataTableContainer) {
        loadAllTrainingData();
    }
    
    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            filterTrainingData(searchTerm);
        });
    }
    
    /**
     * Load all training data
     */
    function loadAllTrainingData() {
        fetch('/api/training/data')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load training data');
            }
            return response.json();
        })
        .then(data => {
            renderDataTable(data);
            // Store original data for filtering
            dataTableContainer.dataset.originalData = JSON.stringify(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Failed to load training data.', 'danger');
        });
    }
    
    /**
     * Render data table
     * @param {Array} data - Array of training data objects
     */
    function renderDataTable(data) {
        if (!dataTableContainer) return;
        
        dataTableContainer.innerHTML = '';
        
        if (data.length === 0) {
            dataTableContainer.innerHTML = `
                <div class="text-center text-muted my-5">
                    <i class="fas fa-inbox fa-3x opacity-50 mb-3 d-block"></i>
                    <p>No training data available. Add some data in the Training section.</p>
                </div>
            `;
            return;
        }
        
        // Create wrapper for horizontal scrolling
        const wrapper = document.createElement('div');
        wrapper.className = 'data-table-wrapper';
        
        const table = document.createElement('table');
        table.className = 'table table-hover mb-0';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="min-width: 200px;">
                        <i class="fas fa-question-circle me-2"></i>Question
                    </th>
                    <th style="min-width: 200px;">
                        <i class="fas fa-lightbulb me-2"></i>Answer
                    </th>
                    <th style="min-width: 120px;">
                        <i class="fas fa-tag me-2"></i>Source
                    </th>
                    <th style="min-width: 130px;">
                        <i class="fas fa-calendar me-2"></i>Date Added
                    </th>
                    <th style="min-width: 140px; text-align: center;">
                        <i class="fas fa-cog me-2"></i>Actions
                    </th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        data.forEach((item, index) => {
            const tr = document.createElement('tr');
            
            // Truncate long text
            const truncatedQuestion = truncateText(item.question, 50);
            const truncatedAnswer = truncateText(item.answer, 50);
            
            // Format source badge
            const sourceBadge = item.source_type === 'manual' 
                ? '<span class="badge bg-primary">Manual Entry</span>'
                : `<span class="badge bg-info" title="${escapeHtml(item.source_name || 'Unknown')}">From File</span>`;
            
            tr.innerHTML = `
                <td title="${escapeHtml(item.question)}" style="word-break: break-word;">
                    <small>${escapeHtml(truncatedQuestion)}</small>
                </td>
                <td title="${escapeHtml(item.answer)}" style="word-break: break-word;">
                    <small>${escapeHtml(truncatedAnswer)}</small>
                </td>
                <td>
                    ${sourceBadge}
                </td>
                <td>
                    <small>${formatDate(item.created_at)}</small>
                </td>
                <td style="text-align: center;">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-secondary view-data" data-id="${item.id}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-primary edit-data" data-id="${item.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-data" data-id="${item.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        wrapper.appendChild(table);
        dataTableContainer.appendChild(wrapper);
        
        // Add event listeners
        document.querySelectorAll('.view-data').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const originalData = JSON.parse(dataTableContainer.dataset.originalData);
                const item = originalData.find(d => d.id == id);
                
                if (item) {
                    showViewModal(item);
                }
            });
        });
        
        document.querySelectorAll('.edit-data').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const originalData = JSON.parse(dataTableContainer.dataset.originalData);
                const item = originalData.find(d => d.id == id);
                
                if (item) {
                    showEditModal(item.id, item.question, item.answer);
                }
            });
        });
        
        document.querySelectorAll('.delete-data').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this training data? This action cannot be undone.')) {
                    deleteTrainingData(id);
                }
            });
        });
    }
    
    /**
     * Truncate text to a certain length and add ellipsis
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }
    
    /**
     * Filter training data based on search term
     * @param {string} searchTerm - Search term
     */
    function filterTrainingData(searchTerm) {
        if (!dataTableContainer || !dataTableContainer.dataset.originalData) return;
        
        const originalData = JSON.parse(dataTableContainer.dataset.originalData);
        
        if (!searchTerm) {
            renderDataTable(originalData);
            return;
        }
        
        const filteredData = originalData.filter(item => {
            return item.question.toLowerCase().includes(searchTerm) || 
                   item.answer.toLowerCase().includes(searchTerm) ||
                   (item.source_name && item.source_name.toLowerCase().includes(searchTerm));
        });
        
        renderDataTable(filteredData);
    }
    
    /**
     * Show view modal for training data
     * @param {Object} item - Training data item
     */
    function showViewModal(item) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('view-data-modal');
        
        if (!modal) {
            const modalHtml = `
                <div class="modal fade" id="view-data-modal" tabindex="-1" aria-labelledby="view-data-modal-label" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="view-data-modal-label">
                                    <i class="fas fa-eye me-2"></i>View Training Data
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <h6 class="text-primary mb-2">
                                        <i class="fas fa-question-circle me-2"></i>Question:
                                    </h6>
                                    <div class="p-3 bg-light rounded" id="view-question" style="word-break: break-word; max-height: 200px; overflow-y: auto;"></div>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-success mb-2">
                                        <i class="fas fa-lightbulb me-2"></i>Answer:
                                    </h6>
                                    <div class="p-3 bg-light rounded" id="view-answer" style="word-break: break-word; max-height: 200px; overflow-y: auto;"></div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <p><strong><i class="fas fa-tag me-2"></i>Source:</strong> <span id="view-source"></span></p>
                                    </div>
                                    <div class="col-md-6">
                                        <p><strong><i class="fas fa-calendar me-2"></i>Date Added:</strong> <span id="view-date"></span></p>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('view-data-modal');
        }
        
        // Set values in the modal
        document.getElementById('view-question').textContent = item.question;
        document.getElementById('view-answer').textContent = item.answer;
        
        const sourceText = item.source_type === 'manual' 
            ? 'Manual Entry' 
            : `File: ${item.source_name || 'Unknown'}`;
        document.getElementById('view-source').textContent = sourceText;
        
        document.getElementById('view-date').textContent = formatDate(item.created_at);
        
        // Show modal
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
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
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="edit-data-modal-label">
                                    <i class="fas fa-edit me-2"></i>Edit Training Data
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="edit-data-form">
                                    <input type="hidden" id="edit-data-id">
                                    <div class="mb-3">
                                        <label for="edit-question" class="form-label">
                                            <i class="fas fa-question-circle me-2"></i>Question
                                        </label>
                                        <textarea class="form-control" id="edit-question" rows="4" required placeholder="Enter the question..."></textarea>
                                        <small class="form-text text-muted">Maximum 500 characters</small>
                                    </div>
                                    <div class="mb-3">
                                        <label for="edit-answer" class="form-label">
                                            <i class="fas fa-lightbulb me-2"></i>Answer
                                        </label>
                                        <textarea class="form-control" id="edit-answer" rows="4" required placeholder="Enter the answer..."></textarea>
                                        <small class="form-text text-muted">Maximum 1000 characters</small>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="save-edit-btn">
                                    <i class="fas fa-save me-2"></i>Save Changes
                                </button>
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
                
                if (editedQuestion.length > 500) {
                    showAlert('Question must not exceed 500 characters.', 'warning');
                    return;
                }
                
                if (editedAnswer.length > 1000) {
                    showAlert('Answer must not exceed 1000 characters.', 'warning');
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
            loadAllTrainingData();
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
            loadAllTrainingData();
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Failed to delete training data. Please try again.', 'danger');
        });
    }
});
