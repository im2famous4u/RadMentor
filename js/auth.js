// js/auth.js - Centralized Firebase Initialization and Authentication

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Hardcoded Firebase Configuration from user's working example
// IMPORTANT: Replace with your actual Firebase project configuration if different
const firebaseConfig = {
    apiKey: "AIzaSyD-OTIwv6P88eT2PCPJXiHgZEDgFV8ZcSw",
    authDomain: "radiology-mcqs.firebaseapp.com",
    projectId: "radiology-mcqs",
    storageBucket: "radiology-mcqs.appspot.com",
    messagingSenderId: "862300415358",
    appId: "1:862300415358:web:097d5e413f388e30587f2f",
    measurementId: "G-0V1SD1H95V"
};

// Global Firebase instances (will be exported)
let app;
let auth;
let db;

// Function to show messages in the parent frame (assuming it exists)
function showParentMessage(message, type = 'success') {
    if (window.parent && window.parent.showMessage) {
        window.parent.showMessage(message, type);
    } else {
        console.log(`Message: ${message} (Type: ${type})`);
    }
}

// Initialize Firebase app immediately when this script loads
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Attempt to sign in with custom token if provided (expected for Canvas environment)
    // This runs once when auth.js is loaded. The onAuthStateChanged listener in
    // individual pages will then react to the result of this sign-in.
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        signInWithCustomToken(auth, __initial_auth_token)
            .catch(error => {
                console.error("Error signing in with custom token:", error);
                showParentMessage(`Authentication failed: ${error.message}. Redirecting to login.`, 'error');
                setTimeout(() => {
                    window.parent.location.href = '/fellowshipexams/index.html'; // Redirect to login
                }, 2000);
            });
    } else {
        // If token is missing, redirect to login as user should be authenticated
        showParentMessage('Authentication token missing. Redirecting to login.', 'error');
        setTimeout(() => {
            window.parent.location.href = '/fellowshipexams/index.html'; // Assuming this is the login page
        }, 2000);
    }

} catch (error) {
    console.error("Error initializing Firebase:", error);
    showParentMessage(`Failed to initialize app. Error: ${error.message}. Please try again.`, 'error');
}

// Export necessary Firebase instances and utility function
export { app, auth, db, showParentMessage };
