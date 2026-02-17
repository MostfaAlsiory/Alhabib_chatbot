/**
 * Authentication functionality for AI Assistant Platform
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const updateProfileForm = document.getElementById('update-profile-form');
    const changePasswordForm = document.getElementById('change-password-form');
    
    // Form validation
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            validateForm(e, this);
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            validateForm(e, this);
        });
    }
    
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', function(e) {
            validateForm(e, this);
        });
    }
    
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(e) {
            validateForm(e, this);
            
            // Additional password validation
            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = document.getElementById('confirm_password').value;
            
            if (newPassword !== confirmPassword) {
                e.preventDefault();
                showValidationError('confirm_password', 'Passwords do not match');
            }
            
            // Check password strength
            if (newPassword.length < 8) {
                e.preventDefault();
                showValidationError('new_password', 'Password must be at least 8 characters');
            }
        });
    }
    
    /**
     * Validate form inputs
     * @param {Event} e - Form submit event
     * @param {HTMLFormElement} form - Form element
     */
    function validateForm(e, form) {
        // Clear previous errors
        form.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        form.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });
        
        // Check required fields
        let hasErrors = false;
        form.querySelectorAll('[required]').forEach(field => {
            if (!field.value.trim()) {
                e.preventDefault();
                hasErrors = true;
                showValidationError(field.id, 'This field is required');
            }
        });
        
        // Email validation
        const emailField = form.querySelector('input[type="email"]');
        if (emailField && emailField.value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailField.value.trim())) {
                e.preventDefault();
                hasErrors = true;
                showValidationError(emailField.id, 'Please enter a valid email address');
            }
        }
        
        return !hasErrors;
    }
    
    /**
     * Show validation error for a field
     * @param {string} fieldId - Field ID
     * @param {string} message - Error message
     */
    function showValidationError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.classList.add('is-invalid');
        
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = message;
        
        field.parentNode.appendChild(feedback);
    }
});
