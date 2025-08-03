// --- Global State ---
let authMode = 'signin';
let currentUserData = null;

// --- UI Elements ---
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authBtn = document.getElementById('auth-btn');
const toggleBtn = document.getElementById('toggle-btn');
const authMessage = document.getElementById('auth-message');
const profileFormContainer = document.getElementById('profile-form-container');
const headerLoggedOut = document.getElementById('header-logged-out');
const headerLoggedIn = document.getElementById('header-logged-in');
const userGreetingHeader = document.getElementById('user-greeting-header');
const mobileLoggedOut = document.getElementById('mobile-logged-out');
const mobileLoggedIn = document.getElementById('mobile-logged-in');

// --- Auth Modal Logic ---
function showAuthModal(mode = 'signin') {
    authMode = mode;
    updateAuthModalUI();
    authModal.classList.remove('hidden');
}

function hideAuthModal() {
    authModal.classList.add('hidden');
    authMessage.textContent = '';
}

function toggleAuth() {
    authMode = authMode === 'signin' ? 'signup' : 'signin';
    updateAuthModalUI();
}

function updateAuthModalUI() {
    if (authMode === 'signin') {
        authTitle.textContent = 'Login to RadMentor';
        authSubtitle.textContent = 'Welcome back!';
        authBtn.textContent = 'Sign In';
        toggleBtn.textContent = "Don't have an account? Sign up";
    } else { // signup
        authTitle.textContent = 'Create Your Account';
        authSubtitle.textContent = 'Start your journey with us today.';
        authBtn.textContent = 'Sign Up';
        toggleBtn.textContent = 'Already have an account? Sign in';
    }
    authMessage.textContent = '';
}

// --- Authentication Logic ---
function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authMessage.textContent = '';

    if (!email || !password) {
        authMessage.textContent = "Please enter both email and password.";
        return;
    }

    if (authMode === 'signin') {
        auth.signInWithEmailAndPassword(email, password)
            .catch(err => {
                authMessage.textContent = err.message;
            });
    } else { // signup
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                return user.sendEmailVerification().then(() => {
                    auth.signOut();
                    authMode = 'signin';
                    updateAuthModalUI();
                    authMessage.textContent = "Verification email sent! Please check your inbox and verify your email before signing in.";
                    return db.collection('users').doc(user.uid).set({
                        email: user.email,
                        accessLevel: 'restricted',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                });
            })
            .catch(err => {
                authMessage.textContent = err.message;
            });
    }
}

// --- Profile Logic ---
function submitProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const profileData = {
        name: document.getElementById('name').value,
        dob: document.getElementById('dob').value,
        sex: document.getElementById('sex').value,
        position: document.getElementById('position').value,
        college: document.getElementById('college').value,
        examPursuing: document.getElementById('exam_pursuing').value,
    };

    if (Object.values(profileData).some(val => !val)) {
        alert("Please fill in all profile fields.");
        return;
    }

    db.collection('users').doc(user.uid).update(profileData)
        .then(() => {
            currentUserData = { ...currentUserData, ...profileData };
            profileFormContainer.classList.add('hidden');
            window.location.href = 'dashboard.html'; // Redirect to dashboard after profile completion
        })
        .catch(err => alert("Error saving profile: " + err.message));
}

// --- Main Application Flow & State Changes ---
auth.onAuthStateChanged(user => {
    if (user) {
        if (!user.emailVerified) {
            auth.signOut();
            showAuthModal('signin');
            authMessage.textContent = "Please verify your email before logging in.";
            return;
        }
        
        db.collection('users').doc(user.uid).get().then(doc => {
            hideAuthModal();
            if (doc.exists) {
                currentUserData = doc.data();
                if (currentUserData.name && currentUserData.dob) {
                    setupLoggedInState(currentUserData);
                } else {
                    // If on index.html, show profile form. If on another page, they should be redirected anyway.
                    if(document.getElementById('landing-page')) {
                        document.getElementById('landing-page').classList.add('hidden');
                        profileFormContainer.classList.remove('hidden');
                    }
                }
            }
        });

    } else {
        // User is signed out
        currentUserData = null;
        setupLoggedOutState();
    }
});

function setupLoggedInState(userData) {
    if (headerLoggedOut && headerLoggedIn && userGreetingHeader && mobileLoggedOut && mobileLoggedIn) {
        headerLoggedOut.classList.add('hidden');
        headerLoggedIn.classList.remove('hidden');
        mobileLoggedOut.classList.add('hidden');
        mobileLoggedIn.classList.remove('hidden');
        userGreetingHeader.textContent = userData.name.split(' ')[0];
        feather.replace();
    }
}

function setupLoggedOutState() {
    if (headerLoggedOut && headerLoggedIn && mobileLoggedOut && mobileLoggedIn) {
        headerLoggedOut.classList.remove('hidden');
        headerLoggedIn.classList.add('hidden');
        mobileLoggedOut.classList.remove('hidden');
        mobileLoggedIn.classList.add('hidden');
    }
     if (profileFormContainer) {
        profileFormContainer.classList.add('hidden');
     }
     if(document.getElementById('landing-page')){
        document.getElementById('landing-page').classList.remove('hidden');
     }
    hideAuthModal();
}

function logout() {
    auth.signOut()
        .then(() => {
            window.location.href = 'index.html';
        });
}

// This function is now for redirecting, not showing a div
function showDashboard() {
    window.location.href = 'dashboard.html';
}
