// --- Feather Icons Initialization ---
feather.replace();

// --- Firebase Configuration ---
// IMPORTANT: For security, it's highly recommended to use environment variables
// or Firebase Hosting's reserved URLs instead of hardcoding keys in client-side code.
const firebaseConfig = {
    apiKey: "AIzaSyD-OTIwv6P88eT2PCPJXiHgZEDgFV8ZcSw",
    authDomain: "radiology-mcqs.firebaseapp.com",
    projectId: "radiology-mcqs",
    storageBucket: "radiology-mcqs.appspot.com",
    messagingSenderId: "862300415358",
    appId: "1:862300415358:web:097d5e413f388e30587f2f",
    measurementId: "G-0V1SD1H95V"
};

// --- Firebase Initialization ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

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
const landingPage = document.getElementById('landing-page');
const dashboard = document.getElementById('dashboard');
const profileFormContainer = document.getElementById('profile-form-container');
const loggedOutNav = document.getElementById('logged-out-nav');
const loggedInNav = document.getElementById('logged-in-nav');
const mobileLoggedOutNav = document.getElementById('mobile-logged-out-nav');
const mobileLoggedInNav = document.getElementById('mobile-logged-in-nav');
const userMenuButton = document.getElementById('user-menu-button');
const userMenu = document.getElementById('user-menu');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const sidebar = document.getElementById('sidebar');

// --- Event Listeners ---
mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

userMenuButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent the window click listener from firing immediately
    userMenu.classList.toggle('hidden');
});

window.addEventListener('click', function(e) {
    if (!loggedInNav.contains(e.target)) {
        userMenu.classList.add('hidden');
    }
});

const closeSidebarButton = document.getElementById('close-sidebar-button');
if (closeSidebarButton) {
    closeSidebarButton.addEventListener('click', () => {
        sidebar.classList.add('translate-x-full');
    });
}

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
    } else {
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

    authBtn.disabled = true;
    authBtn.textContent = 'Processing...';

    if (authMode === 'signin') {
        auth.signInWithEmailAndPassword(email, password)
            .catch(err => {
                authMessage.textContent = err.message;
            }).finally(() => {
                updateAuthModalUI();
                authBtn.disabled = false;
            });
    } else { // signup
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                // Create user document in Firestore first
                const userDocPromise = db.collection('users').doc(user.uid).set({
                    email: user.email,
                    accessLevel: 'Restricted', // Capitalized for consistency
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                // Then send verification email
                const emailPromise = user.sendEmailVerification();

                return Promise.all([userDocPromise, emailPromise]);
            })
            .then(() => {
                auth.signOut();
                authMode = 'signin';
                updateAuthModalUI();
                authMessage.textContent = "Verification email sent! Please check your inbox and verify your email before signing in.";
            })
            .catch(err => {
                authMessage.textContent = err.message;
            }).finally(() => {
                authBtn.disabled = false;
                if (authMode === 'signup') { // If signup failed, revert button text
                    updateAuthModalUI();
                }
            });
    }
}

// --- Main Application State Change Handler ---
auth.onAuthStateChanged(user => {
    if (user) {
        // First check for email verification
        if (!user.emailVerified) {
            auth.signOut(); // Force sign out
            showAuthModal('signin');
            authMessage.textContent = "Email not verified. Please check your inbox or spam folder for a verification link.";
            return;
        }

        // User is logged in and verified, fetch their data
        db.collection('users').doc(user.uid).get().then(doc => {
            hideAuthModal();
            if (doc.exists) {
                currentUserData = { uid: user.uid, ...doc.data() };
                setupLoggedInUI(currentUserData);

                // Check if profile is complete
                if (!currentUserData.name || !currentUserData.dob) {
                    showProfileCompletionForm();
                } else {
                    updateDashboardView(currentUserData);
                }
            } else {
                // Fallback for an unlikely case where auth user exists but has no DB record
                showProfileCompletionForm();
            }
        }).catch(error => {
            console.error("Error getting user data:", error);
            auth.signOut(); // Log out on error
        });
    } else {
        // User is signed out
        setupLoggedOutUI();
    }
});

// --- UI Setup Functions ---
function setupLoggedInUI(userData) {
    loggedOutNav.classList.add('hidden');
    loggedInNav.classList.remove('hidden');
    mobileLoggedOutNav.classList.add('hidden');
    mobileLoggedInNav.classList.remove('hidden');
    document.getElementById('user-greeting-header').textContent = userData.name ? userData.name.split(' ')[0] : 'User';
}

function setupLoggedOutUI() {
    currentUserData = null;
    landingPage.classList.remove('hidden');
    dashboard.classList.add('hidden');
    profileFormContainer.classList.add('hidden');
    loggedOutNav.classList.remove('hidden');
    loggedInNav.classList.add('hidden');
    mobileLoggedOutNav.classList.remove('hidden');
    mobileLoggedInNav.classList.add('hidden');
    hideAuthModal();
}

function showProfileCompletionForm() {
    landingPage.classList.add('hidden');
    dashboard.classList.add('hidden');
    profileFormContainer.classList.remove('hidden');
}

// --- Profile Submission ---
function submitProfile() {
    if (!currentUserData) return;

    const profileData = {
        name: document.getElementById('name').value.trim(),
        dob: document.getElementById('dob').value,
        sex: document.getElementById('sex').value,
        position: document.getElementById('position').value,
        college: document.getElementById('college').value.trim(),
        examPursuing: document.getElementById('exam_pursuing').value,
    };

    if (Object.values(profileData).some(val => !val)) {
        alert("Please fill in all profile fields.");
        return;
    }

    db.collection('users').doc(currentUserData.uid).update(profileData)
        .then(() => {
            currentUserData = { ...currentUserData, ...profileData };
            profileFormContainer.classList.add('hidden');
            updateDashboardView(currentUserData); // Go to correct dashboard
        })
        .catch(err => alert("Error saving profile: " + err.message));
}

// --- Dashboard View Controller [FIXED LOGIC] ---
function updateDashboardView(userData) {
    const mainDashboard = document.getElementById('dashboard-main-content');
    const adminDashboard = document.getElementById('admin-section');
    const adminMenuLink = document.getElementById('admin-menu-link');

    // Hide landing page, show main dashboard container
    landingPage.classList.add('hidden');
    dashboard.classList.remove('hidden');

    // Add or remove the 'Admin Panel' link from the dropdown menu
    if (userData.accessLevel === 'Admin') {
        if (!adminMenuLink) {
            const link = document.createElement('a');
            link.id = 'admin-menu-link';
            link.href = "#";
            link.className = "block px-4 py-2 text-sm text-blue-700 font-bold hover:bg-gray-100";
            link.textContent = "Admin Panel";
            link.onclick = () => showDashboardSection('admin');
            userMenu.insertBefore(link, userMenu.firstChild);
        }
    } else {
        if (adminMenuLink) adminMenuLink.remove();
    }

    // Show the correct dashboard panel
    if (userData.accessLevel === 'Admin') {
        mainDashboard.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        // Load admin-specific data
        loadUsersForAdmin();
        loadLoginLogsForAdmin();
    } else {
        mainDashboard.classList.remove('hidden');
        adminDashboard.classList.add('hidden');
        // Update regular dashboard notice
        updateAccessLevelNotice(userData.accessLevel);
    }
    // Set the initial view to the main/admin content
    showDashboardSection(userData.accessLevel === 'Admin' ? 'admin' : 'main');
}

function showDashboardSection(sectionId) {
    // Hide all sections first
    document.querySelectorAll('#dashboard-main-content, #admin-section, [id$="-section"]').forEach(el => {
        if (el.id !== 'dashboard') el.classList.add('hidden');
    });

    const elementToShow = document.getElementById(`${sectionId}-section`) || (sectionId === 'main' ? document.getElementById('dashboard-main-content') : null);
    if (elementToShow) {
        elementToShow.classList.remove('hidden');
    }

    // Lazy load content for sections when they are shown
    if (sectionId === 'profile') populateProfileDetails();
    if (sectionId === 'analytics') populateAnalyticsDetails();
    if (sectionId === 'subscription') populateSubscriptionDetails();
    if (sectionId === 'settings') populateSettingsDetails();

    sidebar.classList.add('translate-x-full'); // Close sidebar on selection
}

// --- Content Population for Dashboard Sections ---
function updateAccessLevelNotice(accessLevel) {
    const noticeDiv = document.getElementById('access-level-notice');
    if (accessLevel === 'Restricted') {
        noticeDiv.innerHTML = `<div class="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-r-lg">
            <p><span class="font-bold">Restricted Access:</span> Some content is locked. <a href="#" onclick="showDashboardSection('subscription')" class="underline font-semibold">Upgrade to Premium</a> for full access.</p>
        </div>`;
    } else if (accessLevel === 'Premium') {
        noticeDiv.innerHTML = `<div class="mt-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-r-lg">
            <p><span class="font-bold">Full Subscriber Access!</span> Enjoy all features.</p>
        </div>`;
    } else {
        noticeDiv.innerHTML = '';
    }
}

function populateProfileDetails() {
    const section = document.getElementById('profile-section');
    section.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Your Profile</h2>
        <div class="space-y-4 max-w-2xl">
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Name:</strong> ${currentUserData.name || 'N/A'}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Email:</strong> ${currentUserData.email}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Date of Birth:</strong> ${currentUserData.dob || 'N/A'}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Position:</strong> ${currentUserData.position || 'N/A'}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>College:</strong> ${currentUserData.college || 'N/A'}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Exam Pursuing:</strong> ${currentUserData.examPursuing || 'N/A'}</div>
        </div>`;
}

function populateAnalyticsDetails() {
    document.getElementById('analytics-section').innerHTML = `<h2 class="text-2xl font-bold mb-6">Performance Analytics</h2><p class="text-gray-600">This feature is coming soon!</p>`;
}

function populateSubscriptionDetails() {
    const section = document.getElementById('subscription-section');
    const level = currentUserData.accessLevel || 'N/A';
    const isRestricted = level === 'Restricted';
    section.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">My Subscription</h2>
        <div class="bg-blue-50 p-6 rounded-lg border border-blue-200 max-w-2xl">
            <p class="text-lg">Your current plan: <span class="font-bold text-blue-600">${level}</span></p>
            <p class="mt-4">${isRestricted ? 'Upgrade to our Premium plan to unlock all question banks and features.' : 'You have full access to all our learning materials. Thank you!'}</p>
            ${isRestricted ? `<button onclick="alert('Payment integration coming soon!')" class="mt-6 rad-gradient text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition-shadow">Upgrade to Premium</button>` : ''}
        </div>`;
}

function populateSettingsDetails() {
    document.getElementById('settings-section').innerHTML = `<h2 class="text-2xl font-bold mb-6">Settings</h2><p class="text-gray-600">Settings page is under construction.</p>`;
}

// --- Admin-Specific Functions ---
async function loadUsersForAdmin() {
    const userListBody = document.getElementById('user-list');
    userListBody.innerHTML = '<tr><td colspan="4" class="py-3 px-6 text-center">Loading users...</td></tr>';
    try {
        const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        if (usersSnapshot.empty) {
            userListBody.innerHTML = '<tr><td colspan="4" class="py-3 px-6 text-center">No users found.</td></tr>';
            return;
        }
        userListBody.innerHTML = ''; // Clear
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const userId = doc.id;
            const row = document.createElement('tr');
            row.className = 'bg-white border-b';
            row.innerHTML = `
                <td class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">${userData.name || 'N/A'}</td>
                <td class="py-4 px-6">${userData.email}</td>
                <td class="py-4 px-6">
                    <select id="select-${userId}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                        <option value="Restricted" ${userData.accessLevel === 'Restricted' ? 'selected' : ''}>Restricted</option>
                        <option value="Premium" ${userData.accessLevel === 'Premium' ? 'selected' : ''}>Premium</option>
                        <option value="Admin" ${userData.accessLevel === 'Admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td class="py-4 px-6">
                    <button onclick="updateUserAccessLevel('${userId}')" class="font-medium text-blue-600 hover:underline mr-4">Save</button>
                    <button onclick="deleteUserData('${userId}', '${userData.email}')" class="font-medium text-red-600 hover:underline">Delete</button>
                </td>`;
            userListBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading users:", error);
        userListBody.innerHTML = '<tr><td colspan="4" class="py-3 px-6 text-center text-red-500">Error loading users.</td></tr>';
    }
}

async function loadLoginLogsForAdmin() {
    // This function can be uncommented if you create the 'loginLogs' collection
    /*
    const loginLogsBody = document.getElementById('login-logs-list');
    loginLogsBody.innerHTML = '<tr><td colspan="3" class="py-3 px-6 text-center">Loading logs...</td></tr>';
    try {
        const logsSnapshot = await db.collection('loginLogs').orderBy('timestamp', 'desc').limit(50).get();
        if (logsSnapshot.empty) {
            loginLogsBody.innerHTML = '<tr><td colspan="3" class="py-3 px-6 text-center">No login activity.</td></tr>';
            return;
        }
        loginLogsBody.innerHTML = '';
        logsSnapshot.forEach(doc => {
            const logData = doc.data();
            const row = document.createElement('tr');
            row.className = 'bg-white border-b';
            row.innerHTML = `
                <td class="py-4 px-6">${logData.email}</td>
                <td class="py-4 px-6">${logData.timestamp.toDate().toLocaleString()}</td>
                <td class="py-4 px-6">${logData.accessLevel || 'N/A'}</td>`;
            loginLogsBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading login logs:", error);
        loginLogsBody.innerHTML = '<tr><td colspan="3" class="py-3 px-6 text-center text-red-500">Error loading logs.</td></tr>';
    }
    */
}

async function updateUserAccessLevel(userId) {
    const newLevel = document.getElementById(`select-${userId}`).value;
    if (!confirm(`Are you sure you want to change this user's access level to ${newLevel}?`)) {
        return;
    }
    try {
        await db.collection('users').doc(userId).update({ accessLevel: newLevel });
        alert('Access level updated successfully.');
    } catch (error) {
        alert('Failed to update access level.');
        console.error("Error updating access level:", error);
    }
}

async function deleteUserData(userId, userEmail) {
    if (!confirm(`WARNING: This will delete the user data for ${userEmail} from Firestore, but will NOT delete their authentication account. Are you sure you want to proceed?`)) {
        return;
    }
    try {
        await db.collection('users').doc(userId).delete();
        alert(`User data for ${userEmail} deleted from Firestore.`);
        loadUsersForAdmin(); // Refresh list
    } catch (error) {
        alert('Failed to delete user data.');
        console.error("Error deleting user data:", error);
    }
}

// --- Logout ---
function logout() {
    auth.signOut().catch(error => console.error("Logout Error:", error));
}
