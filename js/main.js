// js/main.js

// By importing auth.js, we ensure its code (like onAuthStateChanged) runs.
import './auth.js';
// If your chatbot has its own logic, you would import it here too.
// import './chatbot.js'; 

// --- General UI Logic ---

// Mobile Menu Toggle
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Make sure Feather Icons are rendered
// This is a failsafe in case onAuthStateChanged doesn't run immediately
document.addEventListener('DOMContentLoaded', () => {
    feather.replace();
});
