// shared-scripts.js
// Global variable for username (simulated)
let currentUserName = "Neel Yadav"; // Default username

// Function to display messages (replaces alert)
function showMessage(message, type = 'success') {
  const messageBox = document.getElementById('messageBox');
  if (messageBox) { // Check if messageBox exists
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

    // Remove the /
/ prefix and .html extension
    const cleanFilename = iframeSrc.replace('/dashboard/', '').replace('.html', '');

    // Map filenames to more readable names for the dropdown
    const sectionNames = {
        'frcr': 'FRCR',
        'micr': 'MICR',
        'md-dnb': 'MD / DNB',
        'superspeciality': 'Superspeciality',
        'dashboard': 'Dashboard',
        'my-profile': 'Profile',
        'my-bookmarks': 'Bookmarks',
        'performance-ai': 'Performance',
        'ask-a-doubt': 'Ask a Doubt',
        'anatomy': 'Anatomy',
        'fellowship-exams': 'Fellowship Exams',
        'radscribe-ai': 'RadScribe AI',
        'qbank': 'QBank',
        'mock-exams': 'Mock Exams'
    };

    if (sectionNames[cleanFilename]) {
        goalName = sectionNames[cleanFilename];
    } else {
        goalName = "Dashboard"; // Fallback if filename not explicitly mapped
    }
    if (currentGoalTextElement) { // Check if element exists
      currentGoalTextElement.textContent = `Current Goal: ${goalName}`;
    }
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
                        updateSidebarActiveState(contentFrame.contentWindow.location.pathname); // Use iframe's actual path
                        updateGoalsDropdownText(contentFrame.contentWindow.location.pathname); // Use iframe's actual path
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
                      updateSidebarActiveState(contentFrame.contentWindow.location.pathname); // Use iframe's actual path
                      updateGoalsDropdownText(contentFrame.contentWindow.location.pathname); // Use iframe's actual path
                  };
              }
          });
      });
  }

  // Function to update sidebar active state
  function updateSidebarActiveState(currentPath) {
    // Remove the /dashboard/ prefix for comparison with data-section
    const cleanPath = currentPath.replace('/dashboard/', '');
    sidebarLinks.forEach(link => {
      const linkSection = link.dataset.section;
      if (linkSection && linkSection + '.html' === cleanPath) {
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
    const initialSrc = initialHash ? `/dashboard/${initialHash}.html` : '/dashboard/dashboard.html';
    contentFrame.src = initialSrc;

    contentFrame.onload = () => {
        // Use the iframe's actual loaded path for accurate updates
        updateSidebarActiveState(contentFrame.contentWindow.location.pathname);
        updateGoalsDropdownText(contentFrame.contentWindow.location.pathname);
    };
  }

  // Event listeners for all sidebar links
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent default link behavior
      const targetPage = link.getAttribute('href');
      if (contentFrame && targetPage) {
        contentFrame.src = targetPage;
        // Update URL hash to reflect current page, stripping the prefix and .html
        const newHash = targetPage.replace('/dashboard/', '').replace('.html', '');
        window.location.hash = newHash;
      }
    });
  });

  // Handle browser back/forward buttons
  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.substring(1);
    const newSrc = newHash ? `/dashboard/${newHash}.html` : '/dashboard/dashboard.html';
    if (contentFrame.src !== window.location.origin + newSrc) { // Compare full URLs
        contentFrame.src = newSrc;
    }
  });

});
