// dashboard/shared-scripts.js

// This script is self-contained and dynamically loads Firebase to avoid changing the HTML file.
(function() {
    'use strict';

    // --- Step 1: Configuration ---
    // Your Firebase project configuration
    const firebaseConfig = {
        apiKey: "AIzaSyD-OTIwv6P88eT2PCPJXiHgZEDgFV8ZcSw",
        authDomain: "radiology-mcqs.firebaseapp.com",
        projectId: "radiology-mcqs",
        storageBucket: "radiology-mcqs.appspot.com",
        messagingSenderId: "862300415358",
        appId: "1:862300415358:web:097d5e413f388e30587f2f",
        measurementId: "G-0V1SD1H95V"
    };

    // --- Step 2: Dynamic Script Loading ---
    // Helper function to load a script file and return a promise
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    // --- Step 3: Main Application Logic ---
    // This function runs after the Firebase SDKs are loaded
    function initializeDashboard(auth, db) {
        // --- DOM Element References ---
        const userProfileIcon = document.getElementById('userProfileIcon');
        const userDropdown = document.getElementById('userDropdown');
        const userInitials = document.getElementById('userInitials');
        const logoutLink = document.getElementById('logoutLink');
        const contentFrame = document.getElementById('contentFrame');
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        const goalsDropdownButton = document.getElementById('goalsDropdownButton');
        const goalsDropdown = document.getElementById('goalsDropdown');
        const body = document.body;

        // --- Authentication Check ---
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in, fetch their data from Firestore
                const userDocRef = db.collection("users").doc(user.uid);
                try {
                    const docSnap = await userDocRef.get();
                    if (docSnap.exists) {
                        const userData = docSnap.data();
                        const name = userData.name || 'User';
                        // Generate initials from name for the profile icon
                        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
                        userInitials.textContent = initials;
                    } else {
                        userInitials.textContent = '??';
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    userInitials.textContent = 'E'; // 'E' for Error
                }
                // Make the page content visible now that auth is confirmed
                body.style.visibility = 'visible';
            } else {
                // No user is signed in, redirect to the main login page
                window.location.href = '/index.html';
            }
        });

        // --- Logout Button ---
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                auth.signOut().catch((error) => console.error('Sign out error:', error));
                // The onAuthStateChanged listener above will handle the redirect
            });
        }

        // --- UI Interaction Logic (Dropdowns, etc.) ---
        if (userProfileIcon) userProfileIcon.addEventListener('click', () => userDropdown.classList.toggle('show'));
        if (goalsDropdownButton) goalsDropdownButton.addEventListener('click', () => goalsDropdown.classList.toggle('show'));

        window.addEventListener('click', (e) => {
            if (userProfileIcon && !userProfileIcon.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
            if (goalsDropdownButton && !goalsDropdownButton.contains(e.target) && !goalsDropdown.contains(e.target)) {
                goalsDropdown.classList.remove('show');
            }
        });

        // --- Iframe Navigation Logic ---
        const setActiveLink = (section) => {
            sidebarLinks.forEach(link => {
                link.classList.toggle('active', link.dataset.section === section);
            });
        };

        document.querySelectorAll('a[data-section]').forEach(link => {
            if (link.id !== 'logoutLink') { // Make sure not to override logout link
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const url = this.getAttribute('href');
                    const section = this.dataset.section;
                    if (url && url !== '#') contentFrame.src = url;
                    setActiveLink(section);
                    if (userDropdown) userDropdown.classList.remove('show');
                    if (goalsDropdown) goalsDropdown.classList.remove('show');
                });
            }
        });

        // Set the initial active link based on the iframe's default src
        const initialLink = document.querySelector(`.sidebar-link[href='${contentFrame.getAttribute('src')}']`);
        setActiveLink(initialLink ? initialLink.dataset.section : 'dashboard');
    }

    // --- Step 4: Entry Point ---
    // Start the process when the document is ready
    document.addEventListener('DOMContentLoaded', () => {
        // URLs for the Firebase SDK (version 8 "compat" for global access)
        const FIREBASE_SDK_URL = "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js";
        const FIREBASE_AUTH_URL = "https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js";
        const FIREBASE_FIRESTORE_URL = "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js";

        // Load scripts sequentially, then initialize the app
        loadScript(FIREBASE_SDK_URL)
            .then(() => loadScript(FIREBASE_AUTH_URL))
            .then(() => loadScript(FIREBASE_FIRESTORE_URL))
            .then(() => {
                // Now that all scripts are loaded, the global `firebase` object is available
                firebase.initializeApp(firebaseConfig);
                initializeDashboard(firebase.auth(), firebase.firestore());
            })
            .catch(error => {
                console.error("Fatal Error: Could not load Firebase libraries.", error);
                document.body.innerHTML = `<div style="padding:40px;text-align:center;"><h1>Error</h1><p>Could not initialize the application. Please check the console.</p></div>`;
                document.body.style.visibility = 'visible';
            });
    });
})();
