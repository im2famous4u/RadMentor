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
const landingPage = document.getElementById('landing-page');
const profileForm = document.getElementById('profile-form-container');
const loadingIndicator = document.getElementById('loading-indicator');

let isSignIn = true;

// --- UI Functions ---
function showAuthModal(mode) {
    isSignIn = (mode === 'signin');
    updateAuthModalUI();
    authModal.classList.remove('hidden');
    feather.replace();
}

function hideAuthModal() {
    authModal.classList.add('hidden');
    authMessage.textContent = '';
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
    authMessage.textContent = '';

    if (!email || !password) {
        authMessage.textContent = 'Please enter both email and password.';
        return;
    }

    // Optional: Add loading state to button
    authBtn.disabled = true;
    authBtn.textContent = 'Processing...';

    if (isSignIn) {
        await signIn(email, password);
    } else {
        await signUp(email, password);
    }
    
    authBtn.disabled = false;
    updateAuthModalUI(); // Reset button text
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
        // onAuthStateChanged will handle hiding/showing the correct pages now
    } catch (error) {
        authMessage.textContent = error.message;
    }
}

async function signIn(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the UI changes, so we don't need to do anything here
    } catch (error) {
        authMessage.textContent = error.message;
    }
}

async function logout() {
    try {
        await signOut(auth);
        window.location.reload();
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

    if (!profileData.name || !profileData.dob) {
        alert('Please fill in at least your name and date of birth.');
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    try {
        await setDoc(userDocRef, profileData, { merge: true });
        profileForm.classList.add('hidden');
        landingPage.classList.remove('hidden');
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
                loggedInElements.forEach(el => el.classList.remove('hidden'));
                loggedOutElements.forEach(el => el.classList.add('hidden'));
                document.getElementById('user-greeting-header').textContent = userData.name ? userData.name.split(' ')[0] : 'User';
                hideAuthModal();
                profileForm.classList.add('hidden');
                landingPage.classList.remove('hidden');
            } else {
                landingPage.classList.add('hidden');
                profileForm.classList.remove('hidden');
                hideAuthModal();
            }
        } else {
            landingPage.classList.add('hidden');
            profileForm.classList.remove('hidden');
            hideAuthModal();
        }
    } else {
        loggedInElements.forEach(el => el.classList.add('hidden'));
        loggedOutElements.forEach(el => el.classList.remove('hidden'));
        landingPage.classList.remove('hidden');
    }

    loadingIndicator.classList.add('hidden');
    feather.replace();
});

// --- Expose functions to the global window object ---
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;
window.toggleAuth = toggleAuth;
window.handleAuth = handleAuth;
window.submitProfile = submitProfile;
window.logout = logout;
window.showDashboard = () => {
    alert('Dashboard coming soon!');
};
