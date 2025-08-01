// Layout Utilities for RadMentor
// This script provides functions to maintain consistent layout across all pages

class LayoutManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path.endsWith('index.html')) return 'home';
        if (path.includes('admin')) return 'admin';
        if (path.includes('anatomy')) return 'anatomy';
        if (path.includes('frcr')) return 'frcr';
        return 'other';
    }

    init() {
        this.setPageTitle();
        this.setupNavigation();
        this.setupAuthState();
    }

    setPageTitle() {
        const titles = {
            'home': 'RadMentor - Comprehensive Radiology Learning Source',
            'admin': 'RadMentor - Admin Dashboard',
            'anatomy': 'RadMentor - Anatomy Modules',
            'frcr': 'RadMentor - FRCR Exam Preparation',
            'other': 'RadMentor - Radiology Learning Platform'
        };

        const title = titles[this.currentPage] || titles.other;
        document.title = title;

        const titleElement = document.getElementById('page-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    setupNavigation() {
        // Highlight current page in navigation
        const navLinks = document.querySelectorAll('#main-nav a, #mobile-menu a');
        navLinks.forEach(link => {
            if (link.getAttribute('href') && link.getAttribute('href').includes(this.currentPage)) {
                link.classList.add('text-blue-600', 'font-semibold');
            }
        });
    }

    setupAuthState() {
        // This will be handled by the main app.js
        // We just ensure the auth state is properly managed
        if (typeof setupAuthState === 'function') {
            setupAuthState();
        }
    }

    // Method to inject content into the layout
    injectContent(content) {
        const contentContainer = document.getElementById('page-content');
        if (contentContainer) {
            contentContainer.innerHTML = content;
        }
    }

    // Method to show/hide sections based on auth state
    updateAuthUI(isLoggedIn, user = null) {
        const loggedOutElements = document.querySelectorAll('#header-logged-out, #mobile-logged-out');
        const loggedInElements = document.querySelectorAll('#header-logged-in, #mobile-logged-in');
        const userGreeting = document.getElementById('user-greeting-header');

        if (isLoggedIn) {
            loggedOutElements.forEach(el => el.classList.add('hidden'));
            loggedInElements.forEach(el => el.classList.remove('hidden'));

            if (user && userGreeting) {
                const displayName = user.displayName || user.email.split('@')[0];
                userGreeting.textContent = displayName;
            }
        } else {
            loggedOutElements.forEach(el => el.classList.remove('hidden'));
            loggedInElements.forEach(el => el.classList.add('hidden'));
        }
    }
}

// Initialize layout manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.layoutManager = new LayoutManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayoutManager;
}
