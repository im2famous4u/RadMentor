/**
 * Updates the header to show either the login form or the welcome message.
 * @param {boolean} loggedIn - The user's login status.
 * @param {string|null} username - The user's name.
 */
function updateAuthUI(loggedIn, username) {
    const loginSection = document.getElementById('loginSection');
    const loggedInSection = document.getElementById('loggedInSection');
    const userDisplay = document.getElementById('userDisplay');

    if (loggedIn) {
        loginSection.classList.add('hidden');
        loggedInSection.classList.remove('hidden');
        userDisplay.textContent = username;
    } else {
        loginSection.classList.remove('hidden');
        loggedInSection.classList.add('hidden');
        userDisplay.textContent = '';
    }
}

/**
 * Hides the login overlay and shows the main application container.
 */
function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
}

/**
 * Shows the login overlay and hides the main application container.
 */
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

/**
 * Switches between tabs in the "Fellowship" section.
 * @param {string} tabName - The ID of the content to show.
 * @param {Event} event - The click event.
 */
function switchTab(tabName, event) {
    // Hide all tab contents within the fellowship container
    const tabContents = document.querySelectorAll('#fellowship-content-container .tab-content');
    tabContents.forEach(content => content.classList.remove('active'));

    // Remove active class from all tabs within the fellowship container
    const tabs = document.querySelectorAll('#fellowship-tabs-container .tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Show selected tab content
    const selectedTabContent = document.getElementById(tabName);
    if (selectedTabContent) {
        selectedTabContent.classList.add('active');
    }

    // Add active class to clicked tab
    event.currentTarget.classList.add('active');
}

/**
 * Placeholder function to handle clicks on content items.
 * @param {string} section - The content section (e.g., 'anatomy').
 * @param {string} topic - The specific topic.
 */
function openContent(section, topic) {
    if (!isLoggedIn) { // isLoggedIn is a global from auth.js
        alert('Please login to access content');
        return;
    }

    alert(`Opening ${section.toUpperCase()} - ${topic.replace('-', ' ').toUpperCase()}\n\nContent would be loaded here in a real application.`);
}

/**
 * Switches the main content view based on sidebar navigation.
 * @param {string} sectionId - The ID of the section to show (e.g., 'home', 'qbank').
 */
function switchMainContent(sectionId) {
    const allContent = document.querySelectorAll('.main-content > div[id$="Content"]');
    allContent.forEach(content => content.classList.add('hidden'));

    const activeContent = document.getElementById(`${sectionId}Content`);
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
}