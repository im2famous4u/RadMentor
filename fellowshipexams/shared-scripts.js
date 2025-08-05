// shared-scripts.js
// Global variable for username (simulated)
let currentUserName = "Neel Yadav"; // Default username

// Function to display messages (replaces alert)
function showMessage(message, type = 'success') {
  const messageBox = document.getElementById('messageBox');
  messageBox.textContent = message;
  messageBox.className = 'message-box show'; // Reset classes and show
  if (type === 'error') {
    messageBox.style.backgroundColor = '#f44336'; // Red for error
  } else {
    messageBox.style.backgroundColor = '#4CAF50'; // Green for success
  }
  setTimeout(() => {
    messageBox.classList.remove('show');
  }, 3000); // Hide after 3 seconds
}

// Function to get initials from name
function getInitials(name) {
  if (!name) return '';
  const parts = name.split(' ').filter(word => word.length > 0);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Function to update user initials
function updateInitials() {
  const userInitialsElement = document.getElementById('userInitials');
  if (userInitialsElement) {
    userInitialsElement.textContent = getInitials(currentUserName);
  }
}

// Function to update the goals dropdown text based on current iframe content
function updateGoalsDropdownText(iframeSrc) {
    const currentGoalTextElement = document.getElementById('currentGoalText');
    let goalName = "Dashboard"; // Default for dashboard

    // Extract filename from path and remove .html extension
    const filename = iframeSrc.split('/').pop().replace('.html', '');

    // Map filenames to more readable names for the dropdown
    const sectionNames = {
        'frcr': 'FRCR',
        'micr': 'MICR',
        'md-dnb': 'MD / DNB',
        'superspeciality': 'Superspeciality',
        'dashboard': 'Dashboard',
        'my-profile': 'Profile', // Add profile
        'my-bookmarks': 'Bookmarks', // Add bookmarks
        'performance-ai': 'Performance', // Add performance
        'ask-a-doubt': 'Ask a Doubt', // Add ask a doubt
        'anatomy': 'Anatomy',
        'fellowship-exams': 'Fellowship Exams',
        'radscribe-ai': 'RadScribe AI',
        'qbank': 'QBank',
        'mock-exams': 'Mock Exams'
    };

    if (sectionNames[filename]) {
        goalName = sectionNames[filename];
    } else {
        goalName = "Dashboard"; // Fallback if filename not explicitly mapped
    }
    currentGoalTextElement.textContent = `Current Goal: ${goalName}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const userProfileIcon = document.getElementById('userProfileIcon');
  const userDropdown = document.getElementById('userDropdown');
  const goalsDropdownButton = document.getElementById('goalsDropdownButton');
  const goalsDropdown = document.getElementById('goalsDropdown');
  const contentFrame = document.getElementById('contentFrame');
  const sidebarLinks = document.querySelectorAll('.sidebar-link');

  // Initial update of user initials
  updateInitials();

  // Toggle user dropdown visibility
  if (userProfileIcon && userDropdown) {
    userProfileIcon.addEventListener('click', (event) => {
      event.stopPropagation(); // Prevent click from immediately closing dropdown
      userDropdown.classList.toggle('show');
      // Close goals dropdown if open
      if (goalsDropdown && goalsDropdown.classList.contains('show')) {
          goalsDropdown.classList.remove('show');
      }
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
      if (userDropdown.classList.contains('show') && !userDropdown.contains(event.target) && event.target !== userProfileIcon) {
        userDropdown.classList.remove('show');
      }
    });

    // Handle clicks on user dropdown links
    userDropdown.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default link behavior
            userDropdown.classList.remove('show'); // Close dropdown

            if (link.id === 'logoutLink') {
                window.location.href = link.href; // Navigate for logout
            } else {
                const targetPage = link.getAttribute('href'); // Get the href directly
                if (contentFrame && targetPage) {
                    contentFrame.src = targetPage;
                    // Update sidebar active state and goals dropdown text after iframe loads
                    contentFrame.onload = () => {
                        updateSidebarActiveState(targetPage);
                        updateGoalsDropdownText(targetPage);
                    };
                }
            }
        });
    });
  }

  // Toggle goals dropdown visibility
  if (goalsDropdownButton && goalsDropdown) {
      goalsDropdownButton.addEventListener('click', (event) => {
          event.stopPropagation(); // Prevent click from immediately closing dropdown
          goalsDropdown.classList.toggle('show');
          // Close user dropdown if open
          if (userDropdown && userDropdown.classList.contains('show')) {
              userDropdown.classList.remove('show');
          }
      });

      // Close goals dropdown if clicked outside
      document.addEventListener('click', (event) => {
          if (goalsDropdown.classList.contains('show') && !goalsDropdown.contains(event.target) && event.target !== goalsDropdownButton) {
              goalsDropdown.classList.remove('show');
          }
      });

      // Handle clicks on goals dropdown links
      goalsDropdown.querySelectorAll('a').forEach(link => {
          link.addEventListener('click', (event) => {
              event.preventDefault(); // Prevent default link behavior
              goalsDropdown.classList.remove('show'); // Close dropdown
              const targetPage = link.getAttribute('href');
              if (contentFrame && targetPage) {
                  contentFrame.src = targetPage;
                  // Update sidebar active state and goals dropdown text after iframe loads
                  contentFrame.onload = () => {
                      updateSidebarActiveState(targetPage);
                      updateGoalsDropdownText(targetPage);
                  };
              }
          });
      });
  }

  // Function to update sidebar active state
  function updateSidebarActiveState(currentSrc) {
    sidebarLinks.forEach(link => {
      if (link.getAttribute('href') === currentSrc) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Handle initial iframe load and sidebar/goals update
  if (contentFrame) {
    // Set initial iframe src based on URL hash or default to dashboard.html
    const initialHash = window.location.hash.substring(1);
    const initialSrc = initialHash ? `${initialHash}.html` : 'dashboard.html';
    contentFrame.src = initialSrc;

    contentFrame.onload = () => {
        updateSidebarActiveState(contentFrame.src.split('/').pop()); // Pass just the filename
        updateGoalsDropdownText(contentFrame.src.split('/').pop()); // Pass just the filename
    };
  }

  // Event listeners for all sidebar links
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent default link behavior
      const targetPage = link.getAttribute('href');
      if (contentFrame && targetPage) {
        contentFrame.src = targetPage;
        // Update URL hash to reflect current page
        window.location.hash = targetPage.replace('.html', '');
      }
    });
  });

  // Handle browser back/forward buttons
  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.substring(1);
    const newSrc = newHash ? `${newHash}.html` : 'dashboard.html';
    if (contentFrame.src.split('/').pop() !== newSrc) { // Prevent re-loading if already on page
        contentFrame.src = newSrc;
    }
  });

});
