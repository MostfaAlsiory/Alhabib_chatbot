/**
 * Main JavaScript functionality for AI Assistant Platform
 */

// Initialize tooltips and popovers
document.addEventListener('DOMContentLoaded', function() {
    // Apply language settings first (Force English)
    localStorage.setItem('userLanguage', 'en-US');
    applyLanguageSettings();
    
    // Then apply theme settings (Force Dark)
    localStorage.setItem('darkMode', 'dark');
    applyThemeSettings();
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Mobile sidebar toggle functionality
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickOnToggle = sidebarToggle.contains(event.target);
            
            if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
        });
    }
    
    // Enable download project functionality
    const downloadProjectBtn = document.getElementById('download-project-btn');
    if (downloadProjectBtn) {
        downloadProjectBtn.addEventListener('click', function() {
            alert('Project download functionality would be implemented here. In a real application, this would generate a ZIP file of the project.');
        });
    }
    
    // Dark mode toggle functionality
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            
            // Save preference to localStorage
            localStorage.setItem('darkMode', newTheme);
            
            // Update toggle text based on language
            updateToggleText(darkModeToggle, newTheme);
                
            console.log("Theme toggled to:", newTheme);
        });
    }
});

// Apply theme settings
function applyThemeSettings() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (!darkModeToggle) return;
    
    // Apply saved theme preference on load
    const savedMode = localStorage.getItem('darkMode');
    
    // Set the theme
    if (savedMode) {
        document.documentElement.setAttribute('data-bs-theme', savedMode);
        
        // Update toggle text based on language
        updateToggleText(darkModeToggle, savedMode);
        
        console.log("Setting theme from localStorage:", savedMode);
    } else {
        // Default to dark theme if not set
        document.documentElement.setAttribute('data-bs-theme', 'dark');
        
        // Update toggle text based on language
        updateToggleText(darkModeToggle, 'dark');
        
        console.log("Using default dark theme");
    }
}

function updateToggleText(element, theme) {
    const userLanguage = getUserLanguage();
    if (userLanguage === 'ar') {
        element.innerHTML = theme === 'dark' 
            ? '<i class="fas fa-sun me-2"></i>الوضع المضيء' 
            : '<i class="fas fa-moon me-2"></i>الوضع المظلم';
    } else {
        element.innerHTML = theme === 'dark' 
            ? '<i class="fas fa-sun me-2"></i>Light Mode' 
            : '<i class="fas fa-moon me-2"></i>Dark Mode';
    }
}

// Apply language settings
function applyLanguageSettings() {
    // Always use English as default as requested
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.classList.remove('rtl-language');
    console.log("Language set to English (Forced)");
}

// Apply RTL-specific styles
function applyRTLStyles() {
    // Create a style element if it doesn't exist
    let rtlStyle = document.getElementById('rtl-styles');
    if (!rtlStyle) {
        rtlStyle = document.createElement('style');
        rtlStyle.id = 'rtl-styles';
        document.head.appendChild(rtlStyle);
    }
    
    // Add RTL-specific CSS
    rtlStyle.textContent = `
        .ms-auto { margin-left: 0 !important; margin-right: auto !important; }
        .me-auto { margin-right: 0 !important; margin-left: auto !important; }
        .me-1, .me-2, .me-3 { margin-right: 0 !important; margin-left: 0.25rem !important; }
        .dropdown-menu-end { right: auto !important; left: 0 !important; }
    `;
}

// Translate common UI elements to Arabic
function translateUIElements() {
    // Map of English text to Arabic translations for common UI elements
    const translations = {
        'Dashboard': 'لوحة التحكم',
        'Chat': 'المحادثة',
        'Training': 'التدريب',
        'Data': 'البيانات',
        'Settings': 'الإعدادات',
        'Logout': 'تسجيل الخروج',
        'Login': 'تسجيل الدخول',
        'Register': 'إنشاء حساب',
        'Download Project': 'تحميل المشروع',
        'Dark Mode': 'الوضع المظلم',
        'Light Mode': 'الوضع المضيء',
        'Start a new conversation': 'ابدأ محادثة جديدة',
        'Send a message to begin chatting with the AI assistant': 'أرسل رسالة للبدء في الدردشة مع المساعد الذكي',
        'New Conversation': 'محادثة جديدة',
        'New Chat': 'محادثة جديدة',
        'Type a message...': 'اكتب رسالة...',
        'Send': 'إرسال',
        'User Preferences': 'تفضيلات المستخدم',
        'Language': 'اللغة',
        'Theme': 'السمة',
        'Dark': 'مظلم',
        'Light': 'مضيء'
    };
    
    // Function to replace text in an element if it exists
    function translateElement(selector, textOnly = true) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (textOnly) {
                const text = el.textContent.trim();
                if (translations[text]) {
                    el.textContent = translations[text];
                }
            } else {
                // For elements like inputs with placeholder
                if (el.placeholder && translations[el.placeholder]) {
                    el.placeholder = translations[el.placeholder];
                }
            }
        });
    }
    
    // Translate navbar links
    translateElement('.nav-link');
    translateElement('.dropdown-item');
    
    // Translate buttons
    translateElement('button');
    translateElement('.btn');
    
    // Translate headers
    translateElement('h1, h2, h3, h4, h5, h6');
    
    // Translate input placeholders
    translateElement('input[placeholder]', false);
    translateElement('textarea[placeholder]', false);
    
    // Translate labels
    translateElement('label');
    
    console.log("UI elements translated to Arabic");
}

/**
 * Format a date string to a human-readable format
 * @param {string} dateString - ISO date string
 * @param {string} locale - Language locale (en-US, ar, etc)
 * @returns {string} Formatted date string
 */
function formatDate(dateString, locale = getUserLanguage()) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Handle Arabic and English relative times
    if (locale === 'ar') {
        if (diffMinutes < 1) {
            return 'الآن';
        } else if (diffMinutes < 60) {
            return `منذ ${diffMinutes} دقيقة`;
        } else if (diffHours < 24) {
            return `منذ ${diffHours} ساعة`;
        } else if (diffDays < 7) {
            return `منذ ${diffDays} يوم`;
        } else {
            return date.toLocaleDateString('ar', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    } else {
        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }
}

/**
 * Get the user's preferred language
 * @returns {string} Language code (en-US, ar, etc)
 */
function getUserLanguage() {
    const savedLanguage = localStorage.getItem('userLanguage');
    if (savedLanguage) {
        return savedLanguage;
    }
    
    // Default to English regardless of browser language
    return 'en-US';
}

/**
 * Show an alert message
 * @param {string} message - The message to display
 * @param {string} type - The alert type (success, danger, warning, info)
 * @param {number} duration - How long to show the alert (ms)
 */
function showAlert(message, type = 'info', duration = 3000) {
    const alertContainer = document.getElementById('alert-container');
    
    if (!alertContainer) {
        // Create alert container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'alert-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.getElementById('alert-container').appendChild(alert);
    
    // Automatically dismiss after duration
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.remove();
        }, 150);
    }, duration);
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} unsafe - Unsafe string that might contain HTML
 * @returns {string} Escaped string
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Format message content with Markdown-like syntax
 * @param {string} content - Raw message content
 * @returns {string} Formatted HTML
 */
function formatMessageContent(content) {
    if (!content) return '';
    
    // Escape HTML first
    let escapedContent = escapeHtml(content);
    
    // Code blocks (```code```)
    escapedContent = escapedContent.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code (`code`)
    escapedContent = escapedContent.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold (**text**)
    escapedContent = escapedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic (*text*)
    escapedContent = escapedContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Lists
    escapedContent = escapedContent.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
    escapedContent = escapedContent.replace(/<li>(.*)<\/li>/g, '<ul><li>$1</li></ul>');
    escapedContent = escapedContent.replace(/<\/ul>\s*<ul>/g, '');
    
    // Line breaks
    escapedContent = escapedContent.replace(/\n/g, '<br>');
    
    return escapedContent;
}
