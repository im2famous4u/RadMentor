// This script uses modern Firebase v9+ (modular) syntax to match your other files.

// We will dynamically import the necessary Firebase modules.
async function initializeFirebase() {
    try {
        const firebaseAppModule = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js');
        const firebaseAuthModule = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js');
        const firestoreModule = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        const firebaseConfig = {
            apiKey: "AIzaSyD-OTIwv6P88eT2PCPJXiHgZEDgFV8ZcSw",
            authDomain: "radiology-mcqs.firebaseapp.com",
            projectId: "radiology-mcqs",
            storageBucket: "radiology-mcqs.appspot.com",
            messagingSenderId: "862300415358",
            appId: "1:862300415358:web:097d5e413f388e30587f2f"
        };

        // Initialize Firebase
        const app = firebaseAppModule.initializeApp(firebaseConfig);
        const auth = firebaseAuthModule.getAuth(app);
        const db = firestoreModule.getFirestore(app);

        // Once Firebase is ready, initialize the dashboard logic
        initializeDashboard(auth, db, firebaseAuthModule, firestoreModule);

    } catch (error) {
        console.error("Fatal Error: Could not load Firebase libraries.", error);
        document.body.innerHTML = `<div style="padding:40px;text-align:center;"><h1>Error</h1><p>Could not initialize the application. Please check the console.</p></div>`;
    }
}

// This function contains all your dashboard's interactive logic.
function initializeDashboard(auth, db, { onAuthStateChanged, signOut }, { doc, getDoc }) {
    // --- DOM Element References ---
    const userProfileIcon = document.getElementById('userProfileIcon');
    const userDropdown = document.getElementById('userDropdown');
    const userInitials = document.getElementById('userInitials');
    const logoutLink = document.getElementById('logoutLink');
    const contentFrame = document.getElementById('contentFrame');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const messageBox = document.getElementById('messageBox');
    window.currentUserName = "User"; // Global for iframe access

    // --- Authentication Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                window.currentUserName = docSnap.data().name || 'User';
                updateInitials();
            }
        } else {
            // No user is signed in, redirect to the main login page
            window.location.href = '../index.html';
        }
    });
    
    // --- Navigation & UI Logic ---
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const url = this.getAttribute('href');
            if (url && url !== '#') {
                contentFrame.src = url;
            }
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    userProfileIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });

    window.addEventListener('click', () => {
        if (userDropdown.classList.contains('show')) {
            userDropdown.classList.remove('show');
        }
    });

    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).catch(err => console.error('Sign out error:', err));
    });

    // --- Global Functions for Iframe Communication ---
    window.showMessage = (message, type = 'success') => {
        messageBox.textContent = message;
        messageBox.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
        messageBox.classList.add('show');
        setTimeout(() => messageBox.classList.remove('show'), 3000);
    };

    window.updateInitials = () => {
        if (window.currentUserName) {
            const initials = window.currentUserName.split(' ').map(n => n[0]).join('').toUpperCase();
            userInitials.textContent = initials.substring(0, 2);
        }
    };
}

// --- Entry Point ---
document.addEventListener('DOMContentLoaded', initializeFirebase);
