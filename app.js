document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let isLoggedIn = false;
    let currentUser = '';

    // --- DOM ELEMENTS ---
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    const loginSection = document.getElementById('loginSection');
    const loggedInSection = document.getElementById('loggedInSection');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userDisplay = document.getElementById('userDisplay');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Content containers
    const anatomyList = document.getElementById('anatomy-list');
    const mdDnbContent = document.getElementById('md-dnb-content');
    const fellowshipTabsContainer = document.getElementById('fellowship-tabs-container');
    const fellowshipContentContainer = document.getElementById('fellowship-content-container');

    // --- RENDER FUNCTIONS ---

    function createListItems(items, section) {
        const ul = document.createElement('ul');
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.name;
            li.dataset.section = section;
            li.dataset.topic = item.id;
            ul.appendChild(li);
        });
        return ul;
    }

    function renderAnatomy() {
        anatomyList.innerHTML = ''; // Clear existing
        anatomyList.appendChild(createListItems(courseData.anatomy, 'anatomy'));
    }

    function renderMdDnb() {
        mdDnbContent.innerHTML = ''; // Clear existing
        mdDnbContent.appendChild(createListItems(courseData.md_dnb, 'md-dnb'));
    }

    function renderFellowship() {
        fellowshipTabsContainer.innerHTML = '';
        fellowshipContentContainer.innerHTML = '';

        Object.keys(courseData.fellowship).forEach((key, index) => {
            const tabData = courseData.fellowship[key];
            
            // Create tab button
            const tabButton = document.createElement('div');
            tabButton.className = 'tab';
            tabButton.textContent = tabData.name;
            tabButton.dataset.tab = key;
            if (index === 0) tabButton.classList.add('active');
            fellowshipTabsContainer.appendChild(tabButton);

            // Create tab content
            const tabContent = document.createElement('div');
            tabContent.id = key;
            tabContent.className = 'tab-content';
            if (index === 0) tabContent.classList.add('active');
            tabContent.appendChild(createListItems(tabData.courses, key));
            fellowshipContentContainer.appendChild(tabContent);
        });
    }

    // --- UI UPDATE FUNCTIONS ---

    function showMainContent() {
        loginScreen.classList.add('hidden');
        appContainer.style.display = 'flex';
        loginSection.classList.add('hidden');
        loggedInSection.classList.remove('hidden');
        userDisplay.textContent = currentUser;
    }

    function showLoginScreen() {
        loginScreen.classList.remove('hidden');
        appContainer.style.display = 'none';
        loginSection.classList.remove('hidden');
        loggedInSection.classList.add('hidden');
    }

    function setActiveSection(sectionId, activeElement) {
        // Remove active class from all sidebar items
        document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
        // Add active class to the clicked item
        activeElement.classList.add('active');

        // Hide all main content sections
        document.querySelectorAll('.main-content > div[id]').forEach(section => section.classList.add('hidden'));
        
        // Show the target content section
        const targetContent = document.getElementById(`${sectionId}Content`);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        }
    }

    // --- EVENT HANDLERS ---

    function handleLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }
        if (username.length < 3 || password.length < 6) {
            alert('Please enter a valid username (min 3 chars) and password (min 6 chars)');
            return;
        }

        currentUser = username;
        isLoggedIn = true;
        localStorage.setItem('radmentorUser', username);
        showMainContent();
    }

    function handleLogout() {
        isLoggedIn = false;
        currentUser = '';
        localStorage.removeItem('radmentorUser');
        usernameInput.value = '';
        passwordInput.value = '';
        showLoginScreen();
    }

    function openContent(section, topic) {
        if (!isLoggedIn) {
            alert('Please login to access content');
            return;
        }
        alert(`Opening ${section.toUpperCase()} - ${topic.replace(/-/g, ' ').toUpperCase()}\n\nContent would be loaded here in a real application.`);
    }

    // --- EVENT LISTENERS & INITIALIZATION ---

    function init() {
        // Check for saved user
        const savedUser = localStorage.getItem('radmentorUser');
        if (savedUser) {
            currentUser = savedUser;
            isLoggedIn = true;
            showMainContent();
        } else {
            showLoginScreen();
        }

        // Render all dynamic content from data.js
        renderAnatomy();
        renderMdDnb();
        renderFellowship();

        // Attach event listeners
        loginBtn.addEventListener('click', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);

        // Event delegation for sidebar
        sidebar.addEventListener('click', (e) => {
            const item = e.target.closest('.sidebar-item');
            if (item && item.dataset.section) {
                setActiveSection(item.dataset.section, item);
            }
        });

        // Event delegation for fellowship tabs
        fellowshipTabsContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (tab && tab.dataset.tab) {
                // Deactivate all tabs and content
                fellowshipTabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                fellowshipContentContainer.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Activate clicked tab and corresponding content
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab).classList.add('active');
            }
        });

        // Event delegation for all content lists
        mainContent.addEventListener('click', (e) => {
            const listItem = e.target.closest('li[data-topic]');
            if (listItem) {
                openContent(listItem.dataset.section, listItem.dataset.topic);
            }
        });

        // Handle Enter key in login form
        loginSection.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }

    init();
});