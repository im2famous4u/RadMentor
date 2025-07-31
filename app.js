// =================================================================
// RadMentor Application Logic (app.js)
// =================================================================

// --- Firebase Configuration ---
// This configuration now points to your Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyD-OTIwv6P88eT2PCPJXiHgZEDgFV8ZcSw",
  authDomain: "radiology-mcqs.firebaseapp.com",
  projectId: "radiology-mcqs",
  storageBucket: "radiology-mcqs.appspot.com", // Corrected storage bucket URL
  messagingSenderId: "862300415358",
  appId: "1:862300415358:web:097d5e413f388e30587f2f"
};


// --- Initialize Firebase ---
// The app uses the compat libraries loaded in the HTML file.
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Global State ---
let isSignIn = true; // Tracks if the auth modal is in 'signin' or 'signup' mode
let currentUserData = null; // To store the logged-in user's profile data

// --- DOM Element Selectors ---
// General UI
const landingPage = document.getElementById('landing-page');
const dashboard = document.getElementById('dashboard');

// Navigation
const loggedOutNav = document.getElementById('logged-out-nav');
const loggedInNav = document.getElementById('logged-in-nav');
const mobileLoggedOutNav = document.getElementById('mobile-logged-out-nav');
const mobileLoggedInNav = document.getElementById('mobile-logged-in-nav');
const userGreetingHeader = document.getElementById('user-greeting-header');
const userMenuButton = document.getElementById('user-menu-button');
const userMenu = document.getElementById('user-menu');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

// Auth Modal
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const toggleBtn = document.getElementById('toggle-btn');
const authMessage = document.getElementById('auth-message');

// Profile Completion Form
const profileFormContainer = document.getElementById('profile-form-container');

// Dashboard Elements
const allDashboardSections = document.querySelectorAll('#dashboard > div.pt-16 > div > div[id$="-section"], #dashboard-main-content, #admin-section');
const profileSection = document.getElementById('profile-section');
const settingsSection = document.getElementById('settings-section');
const accessLevelNotice = document.getElementById('access-level-notice');

// Admin Elements
const adminSection = document.getElementById('admin-section');
const userList = document.getElementById('user-list');
const loginLogsList = document.getElementById('login-logs-list');


// =================================================================
// EVENT LISTENERS
// =================================================================

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);

// Toggle user dropdown menu
userMenuButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent the window click listener from closing it immediately
    userMenu.classList.toggle('hidden');
});

// Toggle mobile navigation menu
mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Close dropdown/modals when clicking outside
window.addEventListener('click', (e) => {
    // Close user menu if clicked outside
    if (!userMenu.classList.contains('hidden') && !userMenuButton.contains(e.target)) {
        userMenu.classList.add('hidden');
    }
});

// Close sidebar (if it exists and is part of the design)
const closeSidebarButton = document.getElementById('close-sidebar-button');
if (closeSidebarButton) {
    closeSidebarButton.addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('translate-x-full');
    });
}


// =================================================================
// INITIALIZATION
// =================================================================

/**
 * Main app initialization function.
 * Sets up the authentication state listener.
 */
function initApp() {
    feather.replace(); // Initialize Feather Icons

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    // Profile is complete
                    currentUserData = { uid: user.uid, ...userDoc.data() };
                    updateUIAfterLogin(user, currentUserData);
                } else {
                    // New user, profile is not complete
                    showProfileForm();
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                authMessage.textContent = "Could not load your profile. Please try again.";
                logout(); // Log out if profile can't be fetched
            }
        } else {
            // User is signed out
            currentUserData = null;
            updateUIAfterLogout();
        }
    });
}


// =================================================================
// UI UPDATE FUNCTIONS
// =================================================================

/**
 * Updates the entire UI for a logged-in user.
 * @param {object} user - The Firebase user object.
 * @param {object} userData - The user's profile data from Firestore.
 */
function updateUIAfterLogin(user, userData) {
    // Hide landing page, show dashboard
    landingPage.classList.add('hidden');
    dashboard.classList.remove('hidden');

    // Update navigation bars
    loggedOutNav.classList.add('hidden');
    loggedInNav.classList.remove('hidden');
    mobileLoggedOutNav.parentElement.classList.add('hidden');
    mobileLoggedInNav.classList.remove('hidden');

    // Greet the user
    const firstName = userData.name ? userData.name.split(' ')[0] : 'User';
    userGreetingHeader.textContent = firstName;

    // Populate dashboard sections with user data
    populateProfileSection(userData);
    populateSettingsSection(user, userData);
    displayAccessLevel(userData.accessLevel);

    // Check for admin privileges
    if (userData.accessLevel === 'admin') {
        addAdminLink();
        loadAdminDashboard();
    }

    // Hide any open modals
    hideAuthModal();
    profileFormContainer.classList.add('hidden');
    showDashboardSection('main'); // Show the main dashboard content by default
}

/**
 * Resets the UI to the logged-out state.
 */
function updateUIAfterLogout() {
    // Show landing page, hide dashboard
    landingPage.classList.remove('hidden');
    dashboard.classList.add('hidden');

    // Update navigation bars
    loggedOutNav.classList.remove('hidden');
    loggedInNav.classList.add('hidden');
    mobileLoggedOutNav.parentElement.classList.remove('hidden');
    mobileLoggedInNav.classList.add('hidden');

    // Reset user-specific elements
    userGreetingHeader.textContent = '';
    removeAdminLink();
}

/**
 * Displays the user's current access level on the dashboard.
 * @param {string} accessLevel - The user's access level (e.g., 'free', 'qbank').
 */
function displayAccessLevel(accessLevel) {
    let noticeHTML = '';
    if (accessLevel) {
        noticeHTML = `
            <div class="mt-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md" role="alert">
                <p class="font-bold">Access Level: ${accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1)}</p>
                <p>You currently have access to ${accessLevel}-tier features. <a href="#" onclick="showDashboardSection('subscription')" class="underline">Upgrade your plan</a> for more content.</p>
            </div>
        `;
    }
    accessLevelNotice.innerHTML = noticeHTML;
}


// =================================================================
// AUTHENTICATION MODAL & LOGIC
// =================================================================

/**
 * Shows the authentication modal.
 * @param {string} mode - 'signin' or 'signup'.
 */
window.showAuthModal = (mode) => {
    isSignIn = (mode === 'signin');
    authModal.classList.remove('hidden');
    updateAuthModalUI();
};

/**
 * Hides the authentication modal.
 */
window.hideAuthModal = () => {
    authModal.classList.add('hidden');
    authMessage.textContent = ''; // Clear any previous error messages
};

/**
 * Toggles the auth modal between Sign In and Sign Up states.
 */
window.toggleAuth = () => {
    isSignIn = !isSignIn;
    updateAuthModalUI();
};

/**
 * Updates the text and buttons inside the auth modal based on the current mode.
 */
function updateAuthModalUI() {
    authMessage.textContent = ''; // Clear errors on toggle
    if (isSignIn) {
        authTitle.textContent = 'Login to RadMentor';
        authSubtitle.textContent = 'Welcome back!';
        authBtn.textContent = 'Sign In';
        toggleBtn.textContent = "Don't have an account? Sign up";
    } else {
        authTitle.textContent = 'Create an Account';
        authSubtitle.textContent = 'Join the future of radiology education.';
        authBtn.textContent = 'Sign Up';
        toggleBtn.textContent = 'Already have an account? Sign in';
    }
}

/**
 * Handles the sign-in or sign-up process when the auth button is clicked.
 */
window.handleAuth = () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        authMessage.textContent = 'Please enter both email and password.';
        return;
    }

    authBtn.disabled = true;
    authBtn.textContent = 'Processing...';

    if (isSignIn) {
        // --- Sign In Logic ---
        auth.signInWithEmailAndPassword(email, password)
            .then(async (userCredential) => {
                // This will be handled by onAuthStateChanged, but we can log activity here
                const user = userCredential.user;
                const userDoc = await db.collection('users').doc(user.uid).get();
                logUserActivity(user.email, 'login', { accessLevel: userDoc.data()?.accessLevel || 'unknown' });
            })
            .catch(handleAuthError)
            .finally(() => {
                authBtn.disabled = false;
                updateAuthModalUI();
            });
    } else {
        // --- Sign Up Logic ---
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // onAuthStateChanged will detect the new user and trigger the profile form
            })
            .catch(handleAuthError)
            .finally(() => {
                authBtn.disabled = false;
                updateAuthModalUI();
            });
    }
};

/**
 * Handles and displays authentication errors.
 * @param {object} error - The error object from Firebase Auth.
 */
function handleAuthError(error) {
    console.error("Authentication Error:", error);
    let message = "An unknown error occurred.";
    switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            message = 'Invalid email or password.';
            break;
        case 'auth/email-already-in-use':
            message = 'This email address is already in use.';
            break;
        case 'auth/weak-password':
            message = 'Password should be at least 6 characters.';
            break;
        case 'auth/invalid-email':
            message = 'Please enter a valid email address.';
            break;
    }
    authMessage.textContent = message;
}

/**
 * Signs the current user out.
 */
window.logout = () => {
    auth.signOut().catch(error => console.error("Logout Error:", error));
};


// =================================================================
// PROFILE COMPLETION
// =================================================================

/**
 * Shows the profile completion form.
 */
function showProfileForm() {
    hideAuthModal();
    landingPage.classList.add('hidden');
    dashboard.classList.add('hidden');
    profileFormContainer.classList.remove('hidden');
}

/**
 * Submits the completed profile data to Firestore.
 */
window.submitProfile = () => {
    const user = auth.currentUser;
    if (!user) {
        console.error("No user is logged in to submit a profile.");
        return;
    }

    // --- Collect form data ---
    const profileData = {
        name: document.getElementById('name').value,
        dob: document.getElementById('dob').value,
        sex: document.getElementById('sex').value,
        position: document.getElementById('position').value,
        exam_pursuing: document.getElementById('exam_pursuing').value,
        college: document.getElementById('college').value,
        email: user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        accessLevel: 'free' // Default access level for new users
    };

    // --- Basic Validation ---
    if (!profileData.name || !profileData.dob || !profileData.position) {
        alert("Please fill out all required fields: Name, Date of Birth, and Position.");
        return;
    }

    // --- Save to Firestore ---
    db.collection('users').doc(user.uid).set(profileData)
        .then(() => {
            console.log("Profile created successfully!");
            // Log this specific activity
            logUserActivity(user.email, 'profile_created', { accessLevel: profileData.accessLevel });
            // The onAuthStateChanged listener will re-fetch and update the UI
            // We just need to hide the form.
            profileFormContainer.classList.add('hidden');
        })
        .catch(error => {
            console.error("Error writing profile to Firestore: ", error);
            alert("There was an error saving your profile. Please try again.");
        });
};


// =================================================================
// DASHBOARD NAVIGATION & CONTENT
// =================================================================

/**
 * Shows a specific section within the dashboard and hides others.
 * @param {string} sectionId - The ID of the section to show (e.g., 'main', 'profile').
 */
window.showDashboardSection = (sectionId) => {
    allDashboardSections.forEach(section => {
        section.classList.add('hidden');
    });

    let sectionToShow;
    if (sectionId === 'main') {
        sectionToShow = document.getElementById('dashboard-main-content');
    } else {
        sectionToShow = document.getElementById(`${sectionId}-section`);
    }

    if (sectionToShow) {
        sectionToShow.classList.remove('hidden');
    } else {
        // Fallback to main dashboard if section not found
        document.getElementById('dashboard-main-content').classList.remove('hidden');
    }

    // Close mobile menu if it's open
    if (!mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
};

/**
 * Populates the profile section with user data.
 * @param {object} userData - The user's data from Firestore.
 */
function populateProfileSection(userData) {
    profileSection.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">My Profile</h2>
        <div class="space-y-4">
            <p><strong>Name:</strong> ${userData.name || 'Not set'}</p>
            <p><strong>Email:</strong> ${userData.email || 'Not set'}</p>
            <p><strong>Date of Birth:</strong> ${userData.dob || 'Not set'}</p>
            <p><strong>Sex:</strong> ${userData.sex || 'Not set'}</p>
            <p><strong>Position:</strong> ${userData.position || 'Not set'}</p>
            <p><strong>Exam Pursuing:</strong> ${userData.exam_pursuing || 'Not set'}</p>
            <p><strong>Medical College:</strong> ${userData.college || 'Not set'}</p>
            <p><strong>Access Level:</strong> <span class="font-semibold capitalize">${userData.accessLevel || 'free'}</span></p>
        </div>
    `;
}

/**
 * Populates the settings section.
 * @param {object} user - The Firebase user object.
 * @param {object} userData - The user's data from Firestore.
 */
function populateSettingsSection(user, userData) {
    settingsSection.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Settings</h2>
        <div class="space-y-6">
            <div>
                <h3 class="text-lg font-semibold">Account Information</h3>
                <p class="text-gray-600">Your email is ${user.email}.</p>
            </div>
            <div>
                <h3 class="text-lg font-semibold">Change Password</h3>
                <p class="text-gray-600 mb-2">An email will be sent to you to reset your password.</p>
                <button onclick="sendPasswordReset()" class="rad-gradient text-white font-semibold px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    Send Password Reset Email
                </button>
            </div>
        </div>
    `;
}

/**
 * Sends a password reset email to the current user.
 */
window.sendPasswordReset = () => {
    const user = auth.currentUser;
    if (user) {
        auth.sendPasswordResetEmail(user.email)
            .then(() => {
                alert("Password reset email sent! Please check your inbox.");
            })
            .catch(error => {
                console.error("Password Reset Error:", error);
                alert("Could not send password reset email. Please try again later.");
            });
    }
};


// =================================================================
// ADMIN FUNCTIONALITY
// =================================================================

/**
 * Adds the 'Admin Dashboard' link to the user menu if not present.
 */
function addAdminLink() {
    if (!document.getElementById('admin-nav-link')) {
        const adminLink = document.createElement('a');
        adminLink.href = '#';
        adminLink.id = 'admin-nav-link';
        adminLink.className = 'block px-4 py-2 text-sm text-blue-600 font-bold hover:bg-gray-100';
        adminLink.textContent = 'Admin Dashboard';
        adminLink.onclick = () => showDashboardSection('admin');
        // Insert it before the 'My Dashboard' link
        userMenu.insertBefore(adminLink, userMenu.firstChild);
    }
}

/**
 * Removes the 'Admin Dashboard' link from the user menu.
 */
function removeAdminLink() {
    const adminLink = document.getElementById('admin-nav-link');
    if (adminLink) {
        adminLink.remove();
    }
}

/**
 * Loads all data required for the admin dashboard.
 */
async function loadAdminDashboard() {
    try {
        // Fetch all users
        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateUserList(users);

        // Fetch recent login logs
        const logsSnapshot = await db.collection('activityLogs').orderBy('timestamp', 'desc').limit(20).get();
        const logs = logsSnapshot.docs.map(doc => doc.data());
        populateLoginLogs(logs);

    } catch (error) {
        console.error("Error loading admin dashboard:", error);
        adminSection.innerHTML = '<p class="text-red-500">Could not load admin data.</p>';
    }
}

/**
 * Populates the user management table in the admin dashboard.
 * @param {Array<object>} users - An array of user objects.
 */
function populateUserList(users) {
    userList.innerHTML = ''; // Clear previous list
    users.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b';
        row.innerHTML = `
            <td class="py-4 px-6 font-medium text-gray-900">${user.name || 'N/A'}</td>
            <td class="py-4 px-6">${user.email}</td>
            <td class="py-4 px-6">
                <select id="access-${user.id}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                    <option value="free" ${user.accessLevel === 'free' ? 'selected' : ''}>Free</option>
                    <option value="qbank" ${user.accessLevel === 'qbank' ? 'selected' : ''}>Q-Bank</option>
                    <option value="smart-prep" ${user.accessLevel === 'smart-prep' ? 'selected' : ''}>Smart-Prep</option>
                    <option value="all-access" ${user.accessLevel === 'all-access' ? 'selected' : ''}>All-Access</option>
                    <option value="admin" ${user.accessLevel === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </td>
            <td class="py-4 px-6">
                <button onclick="updateUserAccess('${user.id}')" class="font-medium text-blue-600 hover:underline">Save</button>
            </td>
        `;
        userList.appendChild(row);
    });
}

/**
 * Populates the login activity table.
 * @param {Array<object>} logs - An array of log objects.
 */
function populateLoginLogs(logs) {
    loginLogsList.innerHTML = ''; // Clear previous list
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b';
        row.innerHTML = `
            <td class="py-4 px-6">${log.userEmail}</td>
            <td class="py-4 px-6">${new Date(log.timestamp.seconds * 1000).toLocaleString()}</td>
            <td class="py-4 px-6 capitalize">${log.details.accessLevel || 'N/A'}</td>
        `;
        loginLogsList.appendChild(row);
    });
}

/**
 * Updates a user's access level in Firestore.
 * @param {string} userId - The UID of the user to update.
 */
window.updateUserAccess = (userId) => {
    const selectElement = document.getElementById(`access-${userId}`);
    const newLevel = selectElement.value;

    db.collection('users').doc(userId).update({ accessLevel: newLevel })
        .then(() => {
            alert(`User access level updated to ${newLevel}.`);
            logUserActivity(currentUserData.email, 'access_level_change', { targetUser: userId, newLevel: newLevel });
        })
        .catch(error => {
            console.error("Error updating access level:", error);
            alert("Failed to update access level.");
        });
};


// =================================================================
// UTILITY FUNCTIONS
// =================================================================

/**
 * Logs user activity to a dedicated collection in Firestore.
 * @param {string} userEmail - The email of the user performing the action.
 * @param {string} action - A short description of the action (e.g., 'login', 'update_profile').
 * @param {object} details - Any additional details about the action.
 */
function logUserActivity(userEmail, action, details) {
    db.collection('activityLogs').add({
        userEmail: userEmail,
        action: action,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        details: details
    }).catch(error => console.error("Error logging activity:", error));
}
