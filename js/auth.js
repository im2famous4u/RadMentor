// auth.js - This file would contain your core authentication logic

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase instances
let app;
let auth;
let db;
let currentUser = null; // Stores the authenticated Firebase user object

// Function to show messages in the parent frame (assuming it exists)
function showParentMessage(message, type = 'success') {
    if (window.parent && window.parent.showMessage) {
        window.parent.showMessage(message, type);
    } else {
        console.log(`Message: ${message} (Type: ${type})`);
    }
}

// Initialize Firebase and set up authentication listener
async function initializeAuth() {
    try {
        // Use global __firebase_config and __app_id provided by Canvas
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // Fallback for local testing

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Attempt to sign in with custom token if provided (expected for Canvas environment)
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            // If token is missing, redirect to login as user should be authenticated
            showParentMessage('Authentication token missing. Redirecting to login.', 'error');
            setTimeout(() => {
                window.parent.location.href = '/fellowshipexams/index.html'; // Assuming this is the login page
            }, 2000);
            return; // Stop further execution
        }

        // Set up the authentication state observer
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                // You would typically trigger further app initialization here
                // e.g., load user-specific data, populate UI, etc.
                console.log("User authenticated:", currentUser.uid);
            } else {
                currentUser = null;
                // User became unauthenticated (e.g., token expired, signed out)
                showParentMessage('Session expired or authentication failed. Redirecting to login.', 'error');
                setTimeout(() => {
                    window.parent.location.href = '/fellowshipexams/index.html'; // Redirect to login
                }, 2000);
            }
        });

    } catch (error) {
        console.error("Error initializing Firebase or authenticating:", error);
        showParentMessage(`Failed to initialize app. Error: ${error.message}. Please try again.`, 'error');
    }
}

// Export necessary variables/functions for other modules to use
export { app, auth, db, currentUser, initializeAuth, showParentMessage };
