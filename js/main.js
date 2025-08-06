// js/main.js

// Import our initialized services and all necessary Firebase functions
import { auth, db } from './firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// This event listener ensures that no code runs until the HTML is fully ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM is ready. Initializing application.");

    // --- DOM Element References ---
    const loadingIndicator = document.getElementById('loading-indicator');
    const landingPage = document.getElementById('landing-page');
    const profileForm = document.getElementById('profile-form-container');
    const authModal = document.getElementById('auth-modal');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authBtn = document.getElementById('auth-btn');
    const toggleBtn = document.getElementById('toggle-btn');
    const authMessage = document.getElementById('auth-message');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    let isSignIn = true; // Tracks if the modal is for sign-in or sign-up

    // --- UI LOGIC ---
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    function showAuthModal(mode) {
        isSignIn = (mode === 'signin');
        updateAuthModalUI();
        authModal.classList.remove('hidden');
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
        authBtn.disabled = false;
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
    
    // --- AUTHENTICATION LOGIC ---
    async function handleAuth() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        authMessage.textContent = '';

        if (!email || !password) {
            authMessage.textContent = 'Please enter both email and password.';
            return;
        }

        authBtn.disabled = true;
        authBtn.textContent = 'Processing...';

        try {
            if (isSignIn) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    email: user.email,
                    createdAt: serverTimestamp(),
                    profileComplete: false
                });
            }
        } catch (error) {
            authMessage.textContent = error.message;
        } finally {
            updateAuthModalUI(); // Reset button text and state
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
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Could not update profile. Please try again.");
        }
    }
    
    // --- MAIN STATE CONTROLLER ---
    console.log("Setting up onAuthStateChanged listener...");
    onAuthStateChanged(auth, async (user) => {
        console.log("onAuthStateChanged triggered. User:", user ? user.uid : 'null');
        const loggedOutElements = document.querySelectorAll('#header-logged-out, #mobile-logged-out');
        const loggedInElements = document.querySelectorAll('#header-logged-in, #mobile-logged-in');

        try {
            if (user) {
                console.log("User is logged in. Fetching profile from Firestore...");
                const userDocRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userDocRef);
                console.log("Firestore document exists:", docSnap.exists());

                if (docSnap.exists() && docSnap.data().profileComplete) {
                    console.log("Profile is complete. Showing main page.");
                    const userData = docSnap.data();
                    loggedInElements.forEach(el => el.classList.remove('hidden'));
                    loggedOutElements.forEach(el => el.classList.add('hidden'));
                    document.getElementById('user-greeting-header').textContent = userData.name ? userData.name.split(' ')[0] : 'User';
                    hideAuthModal();
                    profileForm.classList.add('hidden');
                    landingPage.classList.remove('hidden');
                } else {
                    console.log("Profile is incomplete. Showing profile form.");
                    landingPage.classList.add('hidden');
                    profileForm.classList.remove('hidden');
                    hideAuthModal();
                }
            } else {
                console.log("User is logged out. Showing main page.");
                loggedInElements.forEach(el => el.classList.add('hidden'));
                loggedOutElements.forEach(el => el.classList.remove('hidden'));
                landingPage.classList.remove('hidden');
            }
        } catch (error) {
            console.error("Error in onAuthStateChanged:", error);
            // If there's an error, still try to show a sensible default state
            loggedInElements.forEach(el => el.classList.add('hidden'));
            loggedOutElements.forEach(el => el.classList.remove('hidden'));
            landingPage.classList.remove('hidden');
        } finally {
            console.log("Hiding loader.");
            loadingIndicator.classList.add('hidden');
            feather.replace();
        }
    });

    // --- Expose functions to the global window object ---
    window.showAuthModal = showAuthModal;
    window.hideAuthModal = hideAuthModal;
    window.toggleAuth = toggleAuth;
    window.handleAuth = handleAuth;
    window.submitProfile = submitProfile;
    window.logout = async () => {
        try { await signOut(auth); window.location.reload(); } catch (e) { console.error(e); }
    };
    window.showDashboard = () => alert('Dashboard coming soon!');
});
