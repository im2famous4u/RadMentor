document.addEventListener('DOMContentLoaded', () => {
    feather.replace();

    let currentUserData = null;

    const mainDashboardContent = document.getElementById('dashboard-main-content');
    const frcrPartsView = document.getElementById('frcr-parts-view');
    const frcrPart1SubjectsView = document.getElementById('frcr-part1-subjects-view');
    const sidebar = document.getElementById('sidebar');

    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    currentUserData = doc.data();
                    if (!currentUserData.name || !currentUserData.dob) {
                        // If profile is not complete, redirect to index to complete it
                        window.location.href = 'index.html';
                    } else {
                        // Populate dashboard with user data
                        initializeDashboard(currentUserData);
                    }
                } else {
                    // This case should ideally not happen if signup flow is correct
                    window.location.href = 'index.html';
                }
            });
        } else {
            // No user is signed in.
            window.location.href = 'index.html';
        }
    });

    function initializeDashboard(userData) {
        document.getElementById('user-greeting-name').textContent = userData.name.split(' ')[0];
        
        const noticeDiv = document.getElementById('access-level-notice');
        if(userData.accessLevel === 'restricted') {
            noticeDiv.innerHTML = `<div class="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-r-lg">
                <p class="font-bold">Restricted Access</p>
                <p>Some content is locked. <a href="#" onclick="showDashboardSection('subscription')" class="underline">Subscribe</a> for full access.</p>
            </div>`;
        } else {
            noticeDiv.innerHTML = `<div class="mt-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-r-lg">
                <p class="font-bold">Full Access Granted</p>
                <p>You have access to all features. Happy learning!</p>
            </div>`;
        }
        showMainDashboard();
    }

    // --- Dashboard Navigation & Sidebar ---
    document.getElementById('dashboard-menu-button').addEventListener('click', () => {
        sidebar.classList.remove('translate-x-full');
    });
    document.getElementById('close-sidebar-button').addEventListener('click', () => {
        sidebar.classList.add('translate-x-full');
    });
     document.getElementById('logout-button').addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    });


    window.showDashboardSection = function(sectionId) {
        // Hide all dashboard views
        mainDashboardContent.classList.add('hidden');
        frcrPartsView.classList.add('hidden');
        frcrPart1SubjectsView.classList.add('hidden');

        ['profile-section', 'subscription-section', 'settings-section'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
        
        const sectionToShow = document.getElementById(`${sectionId}-section`) || mainDashboardContent;
        sectionToShow.classList.remove('hidden');
        
        if (sectionId === 'main') showMainDashboard();
        if (sectionId === 'profile') populateProfileDetails();
        if (sectionId === 'subscription') populateSubscriptionDetails();
        if (sectionId === 'settings') populateSettingsDetails();

        sidebar.classList.add('translate-x-full');
        feather.replace();
    }

    window.showMainDashboard = function() {
        mainDashboardContent.classList.remove('hidden');
        frcrPartsView.classList.add('hidden');
        frcrPart1SubjectsView.classList.add('hidden');
        feather.replace();
    }

    window.showFrcrParts = function() {
        mainDashboardContent.classList.add('hidden');
        frcrPartsView.classList.remove('hidden');
        frcrPart1SubjectsView.classList.add('hidden');
        feather.replace();
    }

    window.showFrcrPart1Subjects = function() {
        mainDashboardContent.classList.add('hidden');
        frcrPartsView.classList.add('hidden');
        frcrPart1SubjectsView.classList.remove('hidden');
        feather.replace();
    }

    function populateProfileDetails() {
        const section = document.getElementById('profile-section');
        section.innerHTML = `
            <h2 class="text-2xl font-bold mb-6">Your Profile</h2>
            <div class="space-y-4">
                <div class="p-4 bg-gray-50 rounded-lg"><strong>Name:</strong> ${currentUserData.name || 'Not set'}</div>
                <div class="p-4 bg-gray-50 rounded-lg"><strong>Email:</strong> ${currentUserData.email || 'Not set'}</div>
                <div class="p-4 bg-gray-50 rounded-lg"><strong>Date of Birth:</strong> ${currentUserData.dob || 'Not set'}</div>
                <div class="p-4 bg-gray-50 rounded-lg"><strong>Position:</strong> ${currentUserData.position || 'Not set'}</div>
                <div class="p-4 bg-gray-50 rounded-lg"><strong>College:</strong> ${currentUserData.college || 'Not set'}</div>
                <div class="p-4 bg-gray-50 rounded-lg"><strong>Exam Pursuing:</strong> ${currentUserData.examPursuing || 'Not set'}</div>
            </div>
        `;
    }

    function populateSubscriptionDetails() {
        const section = document.getElementById('subscription-section');
        section.innerHTML = `
            <h2 class="text-2xl font-bold mb-6">Subscription</h2>
            <p class="text-gray-600">Your current plan: <span class="font-bold text-blue-600">${currentUserData.accessLevel.toUpperCase()}</span></p>
            <p class="mt-4">Subscription management features coming soon!</p>
        `;
    }

    function populateSettingsDetails() {
        const section = document.getElementById('settings-section');
        section.innerHTML = `
            <h2 class="text-2xl font-bold mb-6">Settings</h2>
            <p class="text-gray-600">Settings page is under construction.</p>
        `;
    }
});
