/**
 * Populates the dynamic content on the home page from data.js.
 */
function populateHomePage() {
    const anatomyList = document.getElementById('anatomy-list');
    anatomyTopics.forEach(topic => {
        const li = document.createElement('li');
        li.className = 'content-item';
        li.textContent = topic;
        li.onclick = () => openContent('anatomy', topic.toLowerCase().replace(/ /g, '-'));
        anatomyList.appendChild(li);
    });

    const mdDnbContent = document.getElementById('md-dnb-content');
    mdDnbTopics.forEach(topic => {
        const div = document.createElement('div');
        div.className = 'content-item';
        div.textContent = topic;
        div.onclick = () => openContent('md-dnb', topic.toLowerCase().replace(/ /g, '-'));
        mdDnbContent.appendChild(div);
    });

    const fellowshipTabsContainer = document.getElementById('fellowship-tabs-container');
    const fellowshipContentContainer = document.getElementById('fellowship-content-container');
    let isFirstTab = true;

    for (const key in fellowshipData) {
        const tabData = fellowshipData[key];
        
        // Create tab
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.textContent = tabData.name;
        tab.onclick = (event) => switchTab(`${key}-content`, event);
        fellowshipTabsContainer.appendChild(tab);

        // Create tab content
        const contentDiv = document.createElement('div');
        contentDiv.id = `${key}-content`;
        contentDiv.className = 'tab-content';
        
        const ul = document.createElement('ul');
        tabData.topics.forEach(topic => {
            const li = document.createElement('li');
            li.className = 'content-item';
            li.textContent = topic;
            li.onclick = () => openContent('fellowship', topic.toLowerCase().replace(/ /g, '-'));
            ul.appendChild(li);
        });
        contentDiv.appendChild(ul);
        fellowshipContentContainer.appendChild(contentDiv);

        if (isFirstTab) {
            tab.classList.add('active');
            contentDiv.classList.add('active');
            isFirstTab = false;
        }
    }
}

/**
 * Sets up all the event listeners for the application.
 */
function setupEventListeners() {
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Handle Enter key in login form
    document.getElementById('loginSection').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            login();
        }
    });

    // Sidebar navigation
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            switchMainContent(item.getAttribute('data-section'));
        });
    });
}

// Main application entry point, runs when the page is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    populateHomePage();
    setupEventListeners();
});