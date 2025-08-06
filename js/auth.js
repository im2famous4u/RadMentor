// js/auth.js

import { auth, db } from './firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- DOM Elements ---
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authBtn = document.getElementById('auth-btn');
const toggleBtn = document.getElementById('toggle-btn');
const authMessage = document.getElementById('auth-message');

let isSignIn = true; // State to track if the modal is for sign-in or sign-up

// --- UI Functions ---
function showAuthModal(mode) {
    isSignIn = (mode === 'signin');
    updateAuthModalUI();
    authModal.classList.remove('hidden');
    feather.replace(); // Re-render icons if any in the modal
}

function hideAuthModal() {
    authModal.classList.add('hidden');
    authMessage.textContent = ''; // Clear any error messages
}

function toggleAuth() {
    isSignIn = !isSignIn;
    updateAuthModalUI();
}

function updateAuthModalUI() {
    if (isSignIn) {
        authTitle.textContent = 'Login to RadMentor';
        authSubtitle.textContent = 'Welcome back!';
        authBtn.textContent = 'Sign In';
        toggleBtn.textContent = 'Don\'t have an account? Sign up';
    } else {
        authTitle.textContent = 'Create an Account';
        authSubtitle.textContent = 'Get started with RadMentor today!';
        authBtn.textContent = 'Sign Up';
        toggleBtn.textContent = 'Already have an account? Sign in';
    }
    authMessage.textContent = '';
}

// --- Auth Logic Functions ---
async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authMessage.textContent = ''; // Clear previous messages

    if (!email || !password) {
        authMessage.textContent = 'Please enter both email and password.';
        return;
    }

    if (isSignIn) {
        await signIn(email, password);
    } else {
        await signUp(email, password);
    }
}

async function signUp(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
            email: user.email,
            createdAt: serverTimestamp(),
            profileComplete: false
        });

        hideAuthModal();
        document.getElementById('profile-form-container').classList.remove('hidden');
    } catch (error) {
        authMessage.textContent = error.message;
    }
}

async function signIn(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the UI changes
    } catch (error) {
        authMessage.textContent = error.message;
    }
}

async function logout() {
    try {
        await signOut(auth);
        // onAuthStateChanged will handle the UI changes
        window.location.reload(); // Reload the page to reset state
    } catch (error) {
        console.error("Error signing out:", error);
    }
}

async function submitProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const profileData = {
        name: document.getElementById('name').value,
        dob: document.getElementById('dob').value,
        sex: document.getElementById('sex').value,
        position: document.getElementById('position').value,
        exam_pursuing: document.getElementById('exam_pursuing').value,
        college: document.getElementById('college').value,
        profileComplete: true
    };

    const userDocRef = doc(db, "users", user.uid);
    try {
        await setDoc(userDocRef, profileData, { merge: true });
        document.getElementById('profile-form-container').classList.add('hidden');
        document.getElementById('landing-page').classList.remove('hidden');
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Could not update profile. Please try again.");
    }
}

// --- Main Auth State Listener ---
onAuthStateChanged(auth, async (user) => {
    const loggedOutElements = document.querySelectorAll('#header-logged-out, #mobile-logged-out');
    const loggedInElements = document.querySelectorAll('#header-logged-in, #mobile-logged-in');

    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.profileComplete) {
                // User is fully logged in
                loggedInElements.forEach(el => el.classList.remove('hidden'));
                loggedOutElements.forEach(el => el.classList.add('hidden'));
                document.getElementById('user-greeting-header').textContent = userData.name ? userData.name.split(' ')[0] : 'User';
                hideAuthModal();
                document.getElementById('profile-form-container').classList.add('hidden');
            } else {
                // User needs to complete their profile
                document.getElementById('landing-page').classList.add('hidden');
                document.getElementById('profile-form-container').classList.remove('hidden');
                hideAuthModal();
            }
        } else {
             // Edge case: Auth user exists but no Firestore doc. Force profile completion.
            document.getElementById('landing-page').classList.add('hidden');
            document.getElementById('profile-form-container').classList.remove('hidden');
            hideAuthModal();
        }
    } else {
        // User is logged out
        loggedInElements.forEach(el => el.classList.add('hidden'));
        loggedOutElements.forEach(el => el.classList.remove('hidden'));
    }
    feather.replace(); // Always re-render icons after UI changes
});

// --- Expose functions to the global window object so HTML onclicks can find them ---
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;
window.toggleAuth = toggleAuth;
window.handleAuth = handleAuth;
window.submitProfile = submitProfile;
window.logout = logout;
window.showDashboard = () => {
    // You can redirect to a dashboard page or show a dashboard modal here
    alert('Dashboard coming soon!');
};
