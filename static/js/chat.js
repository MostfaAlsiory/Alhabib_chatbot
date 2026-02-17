/**
 * Chat functionality for AI Assistant Platform
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.getElementById('messages-container');
    const conversationsList = document.getElementById('conversations-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const conversationTitle = document.getElementById('conversation-title');
    const conversationTitleForm = document.getElementById('conversation-title-form');
    const conversationTitleInput = document.getElementById('conversation-title-input');
    
    // Get current conversation ID from URL
    const currentUrl = new URL(window.location.href);
    const conversationId = currentUrl.searchParams.get('id');
    
    // Initialize chat
    if (conversationId) {
        loadMessages(conversationId);
        loadConversations();
    }
    
    // Event listeners
    if (messageForm) {
        messageForm.addEventListener('submit', handleMessageSubmit);
    }
    
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            window.location.href = '/chat';
        });
    }
    
    if (conversationTitleForm) {
        conversationTitleForm.addEventListener('submit', handleTitleUpdate);
    }
    
    if (conversationTitle) {
        conversationTitle.addEventListener('dblclick', function() {
            // Show the form and hide the title
            conversationTitle.style.display = 'none';
            conversationTitleForm.style.display = 'block';
            conversationTitleInput.value = conversationTitle.textContent.trim();
            conversationTitleInput.focus();
        });
    }
    
    /**
     * Handle form submission for sending a message
     * @param {Event} e - Form submit event
     */
    function handleMessageSubmit(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Clear input
        messageInput.value = '';
        
        // Add user message to UI
        addMessageToUI('user', message);
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message message-assistant typing-indicator-container';
        typingIndicator.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        messagesContainer.appendChild(typingIndicator);
        scrollToBottom();
        
        // Send message to server
        fetch(`/api/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            return response.json();
        })
        .then(data => {
            // Remove typing indicator
            typingIndicator.remove();
            
            // Add assistant message to UI
            if (data.assistant_message && data.assistant_message.content) {
                addMessageToUI('assistant', data.assistant_message.content);
            } else if (data.error) {
                showAlert(data.error, 'danger');
            }
            
            // Update conversation list
            loadConversations();
            
            // If this was the first message and title was "New Conversation", 
            // we might want to update the header title too
            if (conversationTitle && (conversationTitle.textContent.trim() === 'New Conversation' || conversationTitle.textContent.trim() === '')) {
                // Fetch updated conversation details to get the new title
                fetch(`/api/conversations?_t=` + new Date().getTime())
                .then(res => res.json())
                .then(conversations => {
                    const currentConv = conversations.find(c => c.id == conversationId);
                    if (currentConv && conversationTitle) {
                        conversationTitle.textContent = currentConv.title;
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            typingIndicator.remove();
            showAlert('Failed to send message. Please try again.', 'danger');
        });
    }
    
    /**
     * Load all conversations for the current user
     */
    function loadConversations() {
        // Add a timestamp parameter to avoid caching issues
        fetch('/api/conversations?_t=' + new Date().getTime())
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load conversations');
            }
            return response.json();
        })
        .then(data => {
            console.log('Loaded conversations:', data.length);
            renderConversations(data);
        })
        .catch(error => {
            console.error('Error loading conversations:', error);
            showAlert('Failed to load conversations.', 'danger');
        });
    }
    
    /**
     * Render conversations in the sidebar
     * @param {Array} conversations - Array of conversation objects
     */
    function renderConversations(conversations) {
        if (!conversationsList) return;
        
        conversationsList.innerHTML = '';
        
        if (conversations.length === 0) {
            conversationsList.innerHTML = `
                <div class="text-center text-muted mt-4">
                    <p>No conversations yet</p>
                </div>
            `;
            return;
        }
        
        conversations.forEach(conversation => {
            const conversationItem = document.createElement('div');
            conversationItem.className = `conversation-item ${conversation.id == conversationId ? 'active' : ''}`;
            conversationItem.dataset.id = conversation.id;
            conversationItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="text-truncate">${escapeHtml(conversation.title)}</div>
                    <div class="dropdown">
                        <button class="btn btn-sm text-light" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><button class="dropdown-item rename-conversation" data-id="${conversation.id}">Rename</button></li>
                            <li><button class="dropdown-item delete-conversation" data-id="${conversation.id}">Delete</button></li>
                        </ul>
                    </div>
                </div>
                <div class="text-muted small">${formatDate(conversation.updated_at)}</div>
            `;
            
            conversationItem.addEventListener('click', function(e) {
                // Don't navigate if clicking on dropdown or its children
                if (e.target.closest('.dropdown')) return;
                
                window.location.href = `/chat?id=${conversation.id}`;
            });
            
            conversationsList.appendChild(conversationItem);
        });
        
        // Add event listeners for rename and delete buttons
        document.querySelectorAll('.rename-conversation').forEach(button => {
            button.addEventListener('click', function() {
                const convId = this.getAttribute('data-id');
                const newTitle = prompt('Enter new conversation title:');
                if (newTitle && newTitle.trim()) {
                    renameConversation(convId, newTitle.trim());
                }
            });
        });
        
        document.querySelectorAll('.delete-conversation').forEach(button => {
            button.addEventListener('click', function() {
                const convId = this.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this conversation?')) {
                    deleteConversation(convId);
                }
            });
        });
    }
    
    /**
     * Load messages for a specific conversation
     * @param {number} id - Conversation ID
     */
    function loadMessages(id) {
        fetch(`/api/conversations/${id}/messages`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load messages');
            }
            return response.json();
        })
        .then(data => {
            renderMessages(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Failed to load messages.', 'danger');
        });
    }
    
    /**
     * Render messages in the chat area
     * @param {Array} messages - Array of message objects
     */
    function renderMessages(messages) {
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="text-center my-5">
                    <div class="mb-3">
                        <i class="fas fa-comments fa-3x text-muted"></i>
                    </div>
                    <h4>Start a new conversation</h4>
                    <p class="text-muted">Send a message to begin chatting with the AI assistant</p>
                </div>
            `;
            return;
        }
        
        messages.forEach(message => {
            addMessageToUI(message.role, message.content, false);
        });
        
        scrollToBottom();
    }
    
    /**
     * Add a message to the UI
     * @param {string} role - 'user' or 'assistant'
     * @param {string} content - Message content
     * @param {boolean} scroll - Whether to scroll to bottom
     */
    function addMessageToUI(role, content, scroll = true) {
        if (!messagesContainer) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${role}`;
        messageEl.innerHTML = formatMessageContent(content);
        
        messagesContainer.appendChild(messageEl);
        
        if (scroll) {
            scrollToBottom();
        }
    }
    
    /**
     * Scroll to the bottom of the messages container
     */
    function scrollToBottom() {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    /**
     * Rename a conversation
     * @param {number} id - Conversation ID
     * @param {string} title - New title
     */
    function renameConversation(id, title) {
        fetch(`/api/conversations/${id}/rename`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to rename conversation');
            }
            return response.json();
        })
        .then(() => {
            if (id == conversationId && conversationTitle) {
                conversationTitle.textContent = title;
            }
            loadConversations();
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Failed to rename conversation.', 'danger');
        });
    }
    
    /**
     * Delete a conversation
     * @param {number} id - Conversation ID
     */
    function deleteConversation(id) {
        fetch(`/api/conversations/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete conversation');
            }
            return response.json();
        })
        .then(() => {
            if (id == conversationId) {
                window.location.href = '/chat';
            } else {
                loadConversations();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Failed to delete conversation.', 'danger');
        });
    }
    
    /**
     * Handle conversation title update
     * @param {Event} e - Form submit event
     */
    function handleTitleUpdate(e) {
        e.preventDefault();
        
        const newTitle = conversationTitleInput.value.trim();
        if (!newTitle) return;
        
        // Hide form and show title
        conversationTitleForm.style.display = 'none';
        conversationTitle.style.display = 'block';
        
        // Update title immediately for better UX
        conversationTitle.textContent = newTitle;
        
        // Send update to server
        renameConversation(conversationId, newTitle);
    }
    
    // Auto-resize message input
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
});
