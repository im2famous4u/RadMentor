// --- Feather Icons Initialization ---
feather.replace();

// --- Firebase Configuration ---
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

// --- Mobile Menu Toggle ---
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// --- User Menu Dropdown Toggle ---
userMenuButton.addEventListener('click', () => {
    userMenu.classList.toggle('hidden');
});

// Close dropdown if clicked outside
window.addEventListener('click', function(e) {
    if (!loggedInNav.contains(e.target)) {
        userMenu.classList.add('hidden');
    }
});


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

    if (authMode === 'signin') {
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                // The onAuthStateChanged listener will handle the redirect
                // after checking for email verification.
            })
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
                    // Create a user profile document
                    return db.collection('users').doc(user.uid).set({
                        email: user.email,
                        accessLevel: 'restricted', // All new users start with restricted access
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
            // Check if admin or regular user to load correct dashboard
            if (currentUserData.accessLevel === 'admin') {
                loadAdminDashboard(currentUserData);
            } else {
                loadDashboard(currentUserData);
            }
        })
        .catch(err => alert("Error saving profile: " + err.message));
}

// --- Main Application Flow & State Changes ---
auth.onAuthStateChanged(user => {
    if (user) {
        if (!user.emailVerified) {
            auth.signOut(); // Force sign out if email is not verified
            showAuthModal('signin');
            authMessage.textContent = "Your email is not verified. Please check your inbox for a verification link before logging in.";
            return;
        }
        
        // User is logged in and verified
        db.collection('users').doc(user.uid).get().then(doc => {
            hideAuthModal();
            if (doc.exists) {
                currentUserData = doc.data();
                
                // Update Header
                loggedOutNav.classList.add('hidden');
                loggedInNav.classList.remove('hidden');
                mobileLoggedOutNav.classList.add('hidden');
                mobileLoggedInNav.classList.remove('hidden');
                document.getElementById('user-greeting-header').textContent = currentUserData.name ? currentUserData.name.split(' ')[0] : 'Doctor';

                // Check if profile is complete
                if (currentUserData.name && currentUserData.dob) {
                     // Check for Admin Role
                    if (currentUserData.accessLevel === 'admin') {
                        loadAdminDashboard(currentUserData);
                    } else {
                        loadDashboard(currentUserData);
                    }
                } else {
                    // Show profile completion form
                    landingPage.classList.add('hidden');
                    dashboard.classList.add('hidden');
                    profileFormContainer.classList.remove('hidden');
                }
            } else {
                // This case is unlikely if signup creates the doc, but as a fallback:
                landingPage.classList.add('hidden');
                dashboard.classList.add('hidden');
                profileFormContainer.classList.remove('hidden');
            }
        });

    } else {
        // User is signed out
        currentUserData = null;
        landingPage.classList.remove('hidden');
        dashboard.classList.add('hidden');
        profileFormContainer.classList.add('hidden');
        
        // Update Header
        loggedOutNav.classList.remove('hidden');
        loggedInNav.classList.add('hidden');
        mobileLoggedOutNav.classList.remove('hidden');
        mobileLoggedInNav.classList.add('hidden');

        hideAuthModal();
    }
});

function loadDashboard(userData) {
    landingPage.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('main-nav').classList.add('hidden'); // Hide landing page nav
    
    // Display access level notice
    const noticeDiv = document.getElementById('access-level-notice');
    if(userData.accessLevel === 'restricted') {
        noticeDiv.innerHTML = `<div class="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-r-lg">
            <p class="font-bold">Restricted Access</p>
            <p>Some content is locked. <a href="#" onclick="showDashboardSection('subscription')" class="underline font-semibold">Upgrade to Premium</a> for full access.</p>
        </div>`;
    } else if (userData.accessLevel === 'premium') {
         noticeDiv.innerHTML = `<div class="mt-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-r-lg">
            <p class="font-bold">Premium Access Granted</p>
            <p>You have access to all features. Happy learning!</p>
        </div>`;
    }
    
    // Initialize dashboard view
    showDashboardSection('main');
}

function logout() {
    if (confirm("Are you sure you want to log out?")) {
        auth.signOut().then(() => {
            window.location.reload(); // Reload the page to reset state
        });
    }
}

// --- Dashboard Navigation & Sidebar ---
const sidebar = document.getElementById('sidebar');
const dashboardMenuButton = document.getElementById('dashboard-menu-button');
if (dashboardMenuButton) {
    dashboardMenuButton.addEventListener('click', () => {
        sidebar.classList.remove('translate-x-full');
    });
}
const closeSidebarButton = document.getElementById('close-sidebar-button');
if(closeSidebarButton) {
    closeSidebarButton.addEventListener('click', () => {
        sidebar.classList.add('translate-x-full');
    });
}


function showDashboardSection(sectionId) {
    // Hide all sections first
    document.querySelectorAll('#dashboard-main-content, #profile-section, #analytics-section, #planner-section, #subscription-section, #settings-section, #admin-section').forEach(el => el.classList.add('hidden'));
    
    // Show the selected section
    const elementToShow = document.getElementById(`${sectionId}-section`) || (sectionId === 'main' ? document.getElementById('dashboard-main-content') : null);
    if(elementToShow) elementToShow.classList.remove('hidden');
    
    // Populate content when shown
    if (sectionId === 'profile') populateProfileDetails();
    if (sectionId === 'analytics') populateAnalyticsDetails();
    if (sectionId === 'planner') populatePlannerDetails();
    if (sectionId === 'subscription') populateSubscriptionDetails();
    if (sectionId === 'settings') populateSettingsDetails();

    // Hide sidebar after selection
    sidebar.classList.add('translate-x-full');
     // Also hide main landing page content if we are showing a dashboard section
    landingPage.classList.add('hidden');
    dashboard.classList.remove('hidden');
}

function populateProfileDetails() {
    const section = document.getElementById('profile-section');
    section.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Your Profile</h2>
        <div class="space-y-4">
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Name:</strong> ${currentUserData.name}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Email:</strong> ${currentUserData.email}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Date of Birth:</strong> ${currentUserData.dob}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Position:</strong> ${currentUserData.position}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>College:</strong> ${currentUserData.college}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Exam Pursuing:</strong> ${currentUserData.examPursuing}</div>
        </div>
    `;
}

function populateAnalyticsDetails() {
    const section = document.getElementById('analytics-section');
    section.innerHTML = `<h2 class="text-2xl font-bold mb-6">Performance Analytics</h2><p class="text-gray-600">Your deep analytics dashboard is coming soon!</p>`;
}

function populatePlannerDetails() {
    const section = document.getElementById('planner-section');
    section.innerHTML = `<h2 class="text-2xl font-bold mb-6">Study Planner</h2><p class="text-gray-600">Your personalized study planner is coming soon!</p>`;
}

function populateSubscriptionDetails() {
     const section = document.getElementById('subscription-section');
     section.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Subscription</h2>
        <div class="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <p class="text-lg">Your current plan: <span class="font-bold text-blue-600">${currentUserData.accessLevel.charAt(0).toUpperCase() + currentUserData.accessLevel.slice(1)}</span></p>
            ${currentUserData.accessLevel === 'restricted' ? '<p class="mt-4">Upgrade to our Premium plan to unlock all question banks, full mock exams, and in-depth video lectures.</p><button onclick="alert(\'Payment integration coming soon!\')" class="mt-6 rad-gradient text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition-shadow">Upgrade to Premium</button>' : '<p class="mt-4">You have full access to all our learning materials. Thank you for being a premium member!</p>'}
        </div>
     `;
}

function populateSettingsDetails() {
    const section = document.getElementById('settings-section');
     section.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Settings</h2>
        <p class="text-gray-600">Settings page is under construction.</p>
     `;
}

// Populate datalist for colleges (from your original file)
const collegeDatalist = document.getElementById('colleges');
const colleges = ["All India Institute of Medical Sciences, New Delhi", "Postgraduate Institute of Medical Education and Research, Chandigarh", "Christian Medical College, Vellore", "And many more..."]; // Add all colleges here
colleges.forEach(college => {
    const option = document.createElement('option');
    option.value = college;
    collegeDatalist.appendChild(option);
});

// --- ADMIN DASHBOARD FUNCTIONS ---
function loadAdminDashboard(adminData) {
    landingPage.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('main-nav').classList.add('hidden'); // Hide landing page nav

    // Add Admin Panel link to user menu if it doesn't exist
    if (!document.getElementById('admin-menu-link')) {
        const adminLink = document.createElement('a');
        adminLink.id = 'admin-menu-link';
        adminLink.href = "#";
        adminLink.className = "block px-4 py-2 text-sm text-blue-700 font-bold hover:bg-gray-100";
        adminLink.textContent = "Admin Panel";
        adminLink.onclick = () => showDashboardSection('admin');
        userMenu.insertBefore(adminLink, userMenu.firstChild);
    }

    showDashboardSection('admin');
    loadUsers();
    loadLoginLogs();
}

async function loadUsers() {
    const userListBody = document.getElementById('user-list');
    userListBody.innerHTML = '<tr><td colspan="4" class="py-3 px-6 text-center">Loading users...</td></tr>';
    try {
        const usersSnapshot = await db.collection('users').get();
        if (usersSnapshot.empty) {
            userListBody.innerHTML = '<tr><td colspan="4" class="py-3 px-6 text-center">No users found.</td></tr>';
            return;
        }
        userListBody.innerHTML = ''; // Clear loading message
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
                        <option value="restricted" ${userData.accessLevel === 'restricted' ? 'selected' : ''}>Restricted</option>
                        <option value="premium" ${userData.accessLevel === 'premium' ? 'selected' : ''}>Premium</option>
                        <option value="admin" ${userData.accessLevel === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td class="py-4 px-6">
                    <button id="save-${userId}" class="font-medium text-blue-600 hover:underline mr-4">Save</button>
                    <button id="delete-${userId}" class="font-medium text-red-600 hover:underline">Delete</button>
                </td>
            `;
            userListBody.appendChild(row);

            // Add event listeners
            document.getElementById(`select-${userId}`).addEventListener('change', (e) => {
                 updateAccessLevel(userId, e.target.value);
            });
             document.getElementById(`delete-${userId}`).addEventListener('click', () => {
                 deleteUser(userId, userData.email);
            });
        });
    } catch (error) {
        console.error("Error loading users:", error);
        userListBody.innerHTML = '<tr><td colspan="4" class="py-3 px-6 text-center text-red-500">Error loading users.</td></tr>';
    }
}

async function loadLoginLogs() {
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
                <td class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">${logData.email}</td>
                <td class="py-4 px-6">${logData.timestamp.toDate().toLocaleString()}</td>
                <td class="py-4 px-6">${logData.accessLevel || 'N/A'}</td>
            `;
            loginLogsBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading login logs:", error);
        loginLogsBody.innerHTML = '<tr><td colspan="3" class="py-3 px-6 text-center text-red-500">Error loading logs.</td></tr>';
    }
}

async function updateAccessLevel(userId, newLevel) {
    if (!confirm(`Change access for this user to ${newLevel}?`)) {
        loadUsers(); // Revert dropdown if cancelled
        return;
    }
    try {
        await db.collection('users').doc(userId).update({ accessLevel: newLevel });
        alert('Access level updated.');
    } catch (error) {
        alert('Failed to update access level.');
        console.error("Error updating access level:", error);
    }
}

async function deleteUser(userId, userEmail) {
    if (!confirm(`WARNING: Permanently delete user ${userEmail}? This cannot be undone.`)) {
        return;
    }
    try {
        // IMPORTANT: Deleting a user from Firebase Auth requires a backend function (e.g., Cloud Function)
        // for security reasons. This code will only delete the user's data from Firestore.
        await db.collection('users').doc(userId).delete();
        alert(`User data for ${userEmail} deleted from Firestore. Note: Auth user must be deleted from the Firebase console.`);
        loadUsers(); // Refresh list
    } catch (error) {
        alert('Failed to delete user data.');
        console.error("Error deleting user:", error);
    }
}
