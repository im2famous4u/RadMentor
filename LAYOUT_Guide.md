RadMentor Layout System Guide

This guide explains how to maintain consistent layout across all pages in the RadMentor website.

## Overview

The layout system ensures that all pages have:
- Consistent header with navigation
- Consistent footer
- Proper authentication state management
- Mobile-responsive design
- Unified styling and branding

## Layout Components

### 1. Header
- **Fixed position** at the top of the page
- **Logo and brand name** on the left
- **Navigation menu** in the center (desktop)
- **Authentication buttons** on the right
- **Mobile menu** for smaller screens

### 2. Main Content Area
- **Padding-top: 20** to account for fixed header
- **Page-specific content** goes here
- **Responsive design** with proper spacing

### 3. Footer
- **Consistent branding** and links
- **Course categories** and support links
- **Legal information** and copyright

## How to Use the Layout

### For New Pages

1. **Copy the layout template structure:**
   ```html
   <!DOCTYPE html>
   <html lang="en" class="scroll-smooth">
   <head>
       <!-- Include all the standard meta tags, CSS, and scripts -->
   </head>
   <body class="text-gray-800">
       <!-- Header -->
       <header class="bg-white/80 backdrop-blur-lg fixed top-0 left-0 right-0 z-50 shadow-sm">
           <!-- Header content -->
       </header>

       <!-- Main Content -->
       <main class="pt-20">
           <!-- Your page-specific content here -->
       </main>

       <!-- Footer -->
       <footer class="bg-gray-900 text-white py-12 mt-20">
           <!-- Footer content -->
       </footer>

       <!-- Scripts -->
       <!-- Firebase and app.js -->
   </body>
   </html>
   ```

2. **Update navigation links:**
   - For pages in subdirectories, use `../index.html` to link back to home
   - For pages in the root, use `index.html`

3. **Set the page title:**
   - Update the `<title>` tag to reflect the page content
   - Use the format: "RadMentor - [Page Description]"

### Key Elements to Include

#### Required CSS Classes
```css
/* Custom gradient for buttons and highlights */
.rad-gradient {
    background: linear-gradient(90deg, #1e40af, #3b82f6);
}
.rad-gradient-text {
    background: linear-gradient(90deg, #1e40af, #3b82f6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
```

#### Required Scripts
```html
<!-- Firebase Scripts -->
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>

<!-- Main App Script -->
<script src="app.js"></script>
```

#### Authentication Elements
```html
<!-- Logged Out Buttons -->
<div id="header-logged-out" class="flex items-center">
    <button onclick="showAuthModal('signin')" class="hidden md:block text-gray-600 hover:text-blue-600 mr-6">Login</button>
    <button onclick="showAuthModal('signup')" class="rad-gradient text-white font-semibold px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow">
        Sign Up
    </button>
</div>

<!-- Logged In Buttons -->
<div id="header-logged-in" class="hidden items-center">
     <span class="hidden sm:block text-gray-700 mr-4">Hi, <span id="user-greeting-header"></span>!</span>
     <button onclick="showDashboard()" class="rad-gradient text-white font-semibold px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow">
        Dashboard
     </button>
     <button onclick="logout()" class="ml-4 text-gray-600 hover:text-blue-600" title="Logout">
        <i data-feather="log-out"></i>
     </button>
</div>
```

## Directory Structure

```
/
├── index.html              # Main landing page
├── admin.html              # Admin dashboard
├── app.js                  # Main application logic
├── layout-template.html    # Layout template
├── layout-utils.js        # Layout utilities
├── anatomy/
│   ├── index.html         # Anatomy modules page
│   ├── ct-anatomy/        # CT anatomy content
│   ├── mri-anatomy/       # MRI anatomy content
│   └── brain-viewer.html  # Brain viewer tool
└── frcr/
    ├── index.html         # FRCR exam preparation
    ├── Part 1/            # FRCR Part 1 content
    ├── Part 2A/           # FRCR Part 2A content
    └── Part 2B/           # FRCR Part 2B content
```

## Best Practices

1. **Consistent Navigation:**
   - Always include the same navigation items
   - Update links to point to the correct relative paths
   - Highlight the current page in navigation

2. **Responsive Design:**
   - Use Tailwind CSS classes for responsive design
   - Test on mobile and desktop
   - Ensure mobile menu works properly

3. **Authentication State:**
   - The header automatically shows/hides login/logout buttons
   - User greeting shows when logged in
   - All authentication functions are handled by app.js

4. **Styling Consistency:**
   - Use the same color scheme (blue gradient)
   - Maintain consistent spacing and typography
   - Use Inter font family throughout

5. **Performance:**
   - Include only necessary scripts
   - Use CDN for external libraries
   - Optimize images and assets

## Troubleshooting

### Common Issues

1. **Header not showing properly:**
   - Check that all required CSS classes are included
   - Ensure the header has the correct z-index (z-50)

2. **Authentication not working:**
   - Verify that app.js is properly loaded
   - Check that Firebase scripts are included
   - Ensure authentication elements have correct IDs

3. **Mobile menu not working:**
   - Include the mobile menu toggle JavaScript
   - Check that Feather icons are properly initialized

4. **Navigation links broken:**
   - Verify relative paths are correct for the page location
   - Test all navigation links

### Testing Checklist

- [ ] Header displays correctly on all screen sizes
- [ ] Mobile menu opens and closes properly
- [ ] Authentication buttons show/hide based on login state
- [ ] Navigation links work correctly
- [ ] Footer displays properly
- [ ] Page title is appropriate
- [ ] All scripts load without errors
- [ ] Responsive design works on mobile and desktop

## Files to Reference

- `layout-template.html` - Complete layout template
- `layout-utils.js` - Layout management utilities
- `index.html` - Example of main page layout
- `anatomy/index.html` - Example of subdirectory page layout
- `frcr/index.html` - Example of course page layout
