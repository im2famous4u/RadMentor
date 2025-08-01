 
app.js
Original file line number	Diff line number	Diff line change
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
// The app uses the compat libraries loaded in the HTML file,
// which creates a global `firebase` object.
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// --- Global State ---
let isSignIn = true; // Tracks if the auth modal is in 'signin' or 'signup' mode
let currentUserData = null; // To store the logged-in user's profile data
// --- DOM Element Selectors ---
const landingPage = document.getElementById('landing-page');
const dashboard = document.getElementById('dashboard');
const loggedOutNav = document.getElementById('logged-out-nav');
const loggedInNav = document.getElementById('logged-in-nav');
const mobileLoggedOutNav = document.getElementById('mobile-logged-out-nav');
const mobileLoggedInNav = document.getElementById('mobile-logged-in-nav');
const userGreetingHeader = document.getElementById('user-greeting-header');
const userMenuButton = document.getElementById('user-menu-button');
const userMenu = document.getElementById('user-menu');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const toggleBtn = document.getElementById('toggle-btn');
const authMessage = document.getElementById('auth-message');
const profileFormContainer = document.getElementById('profile-form-container');
const allDashboardSections = document.querySelectorAll('#dashboard > div > div > div[id$="-section"], #dashboard-main-content, #admin-section');
const profileSection = document.getElementById('profile-section');
const settingsSection = document.getElementById('settings-section');
const accessLevelNotice = document.getElementById('access-level-notice');
const adminSection = document.getElementById('admin-section');
const userList = document.getElementById('user-list');
// =================================================================
// EVENT LISTENERS
// =================================================================
document.addEventListener('DOMContentLoaded', initApp);
userMenuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenu.classList.toggle('hidden');
});
mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});
window.addEventListener('click', (e) => {
    if (!userMenu.classList.contains('hidden') && !userMenuButton.contains(e.target)) {
        userMenu.classList.add('hidden');
    }
});
// =================================================================
// INITIALIZATION
// =================================================================
/**
 * Main app initialization function.
 */
function initApp() {
    // Apply saved theme on initial load
    const savedTheme = localStorage.getItem('theme') || 'light'; // Default to light
    applyTheme(savedTheme);
    feather.replace(); // Initialize Feather Icons
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    currentUserData = { uid: user.uid, ...userDoc.data() };
                    updateUIAfterLogin(user, currentUserData);
                } else {
                    showProfileForm();
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                authMessage.textContent = "Could not load your profile. Please try again.";
                logout();
            }
        } else {
            currentUserData = null;
            updateUIAfterLogout();
        }
    });
}
// =================================================================
// THEME MANAGEMENT
// =================================================================
/**
 * Applies the selected theme by adding/removing the 'dark' class.
 * @param {string} theme - The theme to apply ('dark' or 'light').
 */
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    // Ensure feather icons are re-rendered on theme change if colors are dynamic
    setTimeout(() => feather.replace(), 0);
}
/**
 * Toggles the theme and saves the preference to localStorage.
 */
window.toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
};
// =================================================================
// UI UPDATE FUNCTIONS
// =================================================================
function updateUIAfterLogin(user, userData) {
    landingPage.classList.add('hidden');
    dashboard.classList.remove('hidden');
    loggedOutNav.classList.add('hidden');
    loggedInNav.classList.remove('hidden');
    mobileLoggedOutNav.parentElement.classList.add('hidden');
    mobileLoggedInNav.classList.remove('hidden');
    const firstName = userData.name ? userData.name.split(' ')[0] : 'User';
    userGreetingHeader.textContent = firstName;
    populateProfileSection(userData);
    populateSettingsSection(user, userData);
    displayAccessLevel(userData.accessLevel);
    if (userData.accessLevel === 'admin') {
        addAdminLink();
        loadAdminDashboard();
    }
    hideAuthModal();
    profileFormContainer.classList.add('hidden');
    showDashboardSection('main');
}
function updateUIAfterLogout() {
    landingPage.classList.remove('hidden');
    dashboard.classList.add('hidden');
    loggedOutNav.classList.remove('hidden');
    loggedInNav.classList.add('hidden');
    mobileLoggedOutNav.parentElement.classList.remove('hidden');
    mobileLoggedInNav.classList.add('hidden');
    userGreetingHeader.textContent = '';
    removeAdminLink();
}
function displayAccessLevel(accessLevel) {
    let noticeHTML = '';
    if (accessLevel) {
        noticeHTML = `
            <div class="mt-4 bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-md" role="alert">
                <p class="font-bold">Access Level: ${accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1)}</p>
                <p>You have access to ${accessLevel}-tier features. <a href="#" onclick="showDashboardSection('subscription')" class="underline">Upgrade your plan</a> for more.</p>
            </div>
        `;
    }
    accessLevelNotice.innerHTML = noticeHTML;
}
// =================================================================
// AUTHENTICATION MODAL & LOGIC
// =================================================================
window.showAuthModal = (mode) => {
    isSignIn = (mode === 'signin');
    authModal.classList.remove('hidden');
    updateAuthModalUI();
};
window.hideAuthModal = () => {
    authModal.classList.add('hidden');
    authMessage.textContent = '';
};
window.toggleAuth = () => {
    isSignIn = !isSignIn;
    updateAuthModalUI();
};
function updateAuthModalUI() {
    authMessage.textContent = '';
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
window.handleAuth = () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        authMessage.textContent = 'Please enter both email and password.';
        return;
    }
    authBtn.disabled = true;
    authBtn.textContent = 'Processing...';
    const authPromise = isSignIn
        ? auth.signInWithEmailAndPassword(email, password)
        : auth.createUserWithEmailAndPassword(email, password);
    authPromise
        .then(async (userCredential) => {
            if (isSignIn) {
                const user = userCredential.user;
                const userDoc = await db.collection('users').doc(user.uid).get();
                logUserActivity(user.email, 'login', { accessLevel: userDoc.data()?.accessLevel || 'unknown' });
            }
        })
        .catch(handleAuthError)
        .finally(() => {
            authBtn.disabled = false;
            updateAuthModalUI();
        });
};
function handleAuthError(error) {
    console.error("Authentication Error:", error);
    authMessage.textContent = error.message;
}
window.logout = () => {
    auth.signOut().catch(error => console.error("Logout Error:", error));
};
// =================================================================
// PROFILE COMPLETION & DASHBOARD SECTIONS
// =================================================================
function showProfileForm() {
    hideAuthModal();
    landingPage.classList.add('hidden');
    dashboard.classList.add('hidden');
    profileFormContainer.classList.remove('hidden');
}
window.submitProfile = () => {
    const user = auth.currentUser;
    if (!user) return;
    const profileData = {
        name: document.getElementById('name').value,
        dob: document.getElementById('dob').value,
        sex: document.getElementById('sex').value,
        position: document.getElementById('position').value,
        exam_pursuing: document.getElementById('exam_pursuing').value,
        college: document.getElementById('college').value,
        email: user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        accessLevel: 'free'
    };
    if (!profileData.name || !profileData.dob || !profileData.position) {
        alert("Please fill out all required fields: Name, Date of Birth, and Position.");
        return;
    }
    db.collection('users').doc(user.uid).set(profileData)
        .then(() => {
            logUserActivity(user.email, 'profile_created', { accessLevel: profileData.accessLevel });
            profileFormContainer.classList.add('hidden');
        })
        .catch(error => {
            console.error("Error writing profile: ", error);
            alert("There was an error saving your profile.");
        });
};
window.showDashboardSection = (sectionId) => {
    allDashboardSections.forEach(section => section.classList.add('hidden'));
    const sectionToShow = document.getElementById(`${sectionId}-section`) || document.getElementById('dashboard-main-content');
    sectionToShow.classList.remove('hidden');
    if (!mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
};
/**
 * Calculates age from a date of birth string.
 * @param {string} dobString - The date of birth (e.g., "YYYY-MM-DD").
 * @returns {number|string} The calculated age or 'N/A'.
 */
function calculateAge(dobString) {
    if (!dobString) return 'N/A';
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
/**
 * Populates the profile section with the new required fields.
 * @param {object} userData - The user's data from Firestore.
 */
function populateProfileSection(userData) {
    const age = calculateAge(userData.dob);
    const joinDate = userData.membershipJoiningDate ? new Date(userData.membershipJoiningDate.seconds * 1000).toLocaleDateString() : null;
    const endDate = userData.membershipEndingDate ? new Date(userData.membershipEndingDate.seconds * 1000).toLocaleDateString() : null;
    let membershipInfo = '';
    if (joinDate && endDate) {
        membershipInfo = `
            <p><strong>Membership Active Since:</strong> ${joinDate}</p>
            <p><strong>Membership Valid Until:</strong> ${endDate}</p>
        `;
    } else {
        membershipInfo = `<p><strong>Membership:</strong> <span class="font-semibold text-yellow-500 dark:text-yellow-400">No active subscription</span></p>`;
    }
    profileSection.innerHTML = `
        <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">My Profile</h2>
        <div class="space-y-4 text-gray-700 dark:text-gray-300">
            <p><strong>Name:</strong> ${userData.name || 'Not set'}</p>
            <p><strong>Age:</strong> ${age}</p>
            <p><strong>Institute:</strong> ${userData.college || 'Not set'}</p>
            ${membershipInfo}
        </div>
    `;
}
/**
 * Populates the settings section with account info and the new theme toggle.
 * @param {object} user - The Firebase user object.
 */
function populateSettingsSection(user) {
    const isDarkMode = document.documentElement.classList.contains('dark');
    settingsSection.innerHTML = `
        <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Settings</h2>
        <div class="space-y-8">
            <div>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Account Information</h3>
                <p class="text-gray-600 dark:text-gray-400">Your email is ${user.email}.</p>
            </div>
            <div>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Change Password</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-2">An email will be sent to you to reset your password.</p>
                <button onclick="sendPasswordReset()" class="rad-gradient text-white font-semibold px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    Send Password Reset Email
                </button>
            </div>
            <div>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Theme</h3>
                <div class="mt-2 flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                     <span class="text-gray-700 dark:text-gray-300">Toggle Dark/Light Mode</span>
                     <label for="theme-toggle" class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="theme-toggle" class="sr-only peer" onchange="toggleTheme()" ${isDarkMode ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
        </div>
    `;
}
window.sendPasswordReset = () => {
    const user = auth.currentUser;
    if (user) {
        auth.sendPasswordResetEmail(user.email)
            .then(() => alert("Password reset email sent! Please check your inbox."))
            .catch(error => alert("Could not send password reset email. " + error.message));
    }
};
// =================================================================
// ADMIN FUNCTIONALITY
// =================================================================
function addAdminLink() {
    if (document.getElementById('admin-nav-link')) return;
    const adminLink = document.createElement('a');
    adminLink.href = '#';
    adminLink.id = 'admin-nav-link';
    adminLink.className = 'block px-4 py-2 text-sm text-blue-600 dark:text-blue-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-700';
    adminLink.textContent = 'Admin Dashboard';
    adminLink.onclick = () => showDashboardSection('admin');
    userMenu.insertBefore(adminLink, userMenu.firstChild);
}
function removeAdminLink() {
    const adminLink = document.getElementById('admin-nav-link');
    if (adminLink) adminLink.remove();
}
async function loadAdminDashboard() {
    try {
        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateUserList(users);
    } catch (error) {
        console.error("Error loading admin dashboard:", error);
        adminSection.innerHTML = '<p class="text-red-500">Could not load admin data.</p>';
    }
}
function populateUserList(users) {
    userList.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700';
        row.innerHTML = `
            <td class="py-4 px-6 font-medium text-gray-900 dark:text-white">${user.name || 'N/A'}</td>
            <td class="py-4 px-6">${user.email}</td>
            <td class="py-4 px-6">
                <select id="access-${user.id}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
                    <option value="free" ${user.accessLevel === 'free' ? 'selected' : ''}>Free</option>
                    <option value="qbank" ${user.accessLevel === 'qbank' ? 'selected' : ''}>Q-Bank</option>
                    <option value="smart-prep" ${user.accessLevel === 'smart-prep' ? 'selected' : ''}>Smart-Prep</option>
                    <option value="all-access" ${user.accessLevel === 'all-access' ? 'selected' : ''}>All-Access</option>
                    <option value="admin" ${user.accessLevel === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </td>
            <td class="py-4 px-6">
                <button onclick="updateUserAccess('${user.id}')" class="font-medium text-blue-600 dark:text-blue-500 hover:underline">Save</button>
            </td>
        `;
        userList.appendChild(row);
    });
}
window.updateUserAccess = (userId) => {
    const newLevel = document.getElementById(`access-${userId}`).value;
    db.collection('users').doc(userId).update({ accessLevel: newLevel })
        .then(() => {
            alert(`User access level updated to ${newLevel}.`);
            logUserActivity(currentUserData.email, 'access_level_change', { targetUser: userId, newLevel: newLevel });
        })
        .catch(error => alert("Failed to update access level: " + error.message));
};


// =================================================================
// LAYOUT INTEGRATION FUNCTIONS
// =================================================================

// Function to load landing page content (used by layout manager)
window.loadLandingPageContent = function(container) {
    // This function will be called by the layout manager to load the home page content
    // The content is already in the HTML, so we just need to ensure it's visible
    const landingContent = document.querySelector('#page-content');
    if (landingContent) {
        container.innerHTML = landingContent.innerHTML;
    }
};

// Function to show dashboard (updated for new layout)
window.showDashboard = function() {
    if (window.layoutManager) {
        window.location.hash = '#dashboard';
        window.layoutManager.handleRouteChange();
    }
};

// Function to show landing page (updated for new layout)
window.showLandingPage = function() {
    if (window.layoutManager) {
        window.location.hash = '#home';
        window.layoutManager.handleRouteChange();
    }
};

// =================================================================
// UTILITY FUNCTIONS
// =================================================================
function logUserActivity(userEmail, action, details) {
    db.collection('activityLogs').add({
        userEmail: userEmail,
        action: action,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        details: details
    }).catch(error => console.error("Error logging activity:", error));
}
