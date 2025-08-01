#!/usr/bin/env node

/**
 * RadMentor Page Generator
 * Creates new pages with consistent layout
 */

const fs = require('fs');
const path = require('path');

// Template for new pages
const pageTemplate = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RadMentor - {{PAGE_TITLE}}</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Google Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- Feather Icons -->
    <script src="https://unpkg.com/feather-icons"></script>
    <style>
        /* Custom styles to complement Tailwind */
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f8fafc; /* Light gray background */
        }
        /* Custom gradient for buttons and highlights */
        .rad-gradient {
            background: linear-gradient(90deg, #1e40af, #3b82f6);
        }
        .rad-gradient-text {
            background: linear-gradient(90deg, #1e40af, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .nav-button {
            transition: all 0.2s ease-in-out;
            border: 1px solid #e5e7eb;
        }
        .nav-button:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            border-color: #3b82f6;
        }
    </style>
</head>
<body class="text-gray-800">
    <!-- Header -->
    <header class="bg-white/80 backdrop-blur-lg fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div class="container mx-auto px-6 py-3 flex justify-between items-center">
            <div class="flex items-center">
                <img src="https://raw.githubusercontent.com/im2famous4u/RadMentor/main/logo.png" alt="RadMentor Logo" class="h-10 mr-3"/>
                <span class="text-2xl font-bold text-gray-800">RadMentor</span>
            </div>
            <nav id="main-nav" class="hidden md:flex items-center space-x-8">
                <a href="{{HOME_LINK}}" class="text-gray-600 hover:text-blue-600">Home</a>
                <a href="{{HOME_LINK}}#courses" class="text-gray-600 hover:text-blue-600">Courses</a>
                <a href="{{HOME_LINK}}#features" class="text-gray-600 hover:text-blue-600">Features</a>
                <a href="{{HOME_LINK}}#about" class="text-gray-600 hover:text-blue-600">About Us</a>
            </nav>
            <div class="flex items-center">
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
                <button id="mobile-menu-button" class="md:hidden ml-4 text-gray-700">
                    <i data-feather="menu"></i>
                </button>
            </div>
        </div>
          <!-- Mobile Menu -->
        <div id="mobile-menu" class="hidden md:hidden px-6 pb-4">
            <a href="{{HOME_LINK}}" class="block py-2 text-gray-600 hover:text-blue-600">Home</a>
            <a href="{{HOME_LINK}}#courses" class="block py-2 text-gray-600 hover:text-blue-600">Courses</a>
            <a href="{{HOME_LINK}}#features" class="block py-2 text-gray-600 hover:text-blue-600">Features</a>
            <a href="{{HOME_LINK}}#about" class="block py-2 text-gray-600 hover:text-blue-600">About Us</a>
            <!-- Mobile Logged Out -->
            <div id="mobile-logged-out">
                <button onclick="showAuthModal('signin')" class="block w-full text-left py-2 text-gray-600 hover:text-blue-600">Login</button>
            </div>
             <!-- Mobile Logged In -->
            <div id="mobile-logged-in" class="hidden">
                <button onclick="showDashboard()" class="block w-full text-left py-2 text-gray-600 hover:text-blue-600">Dashboard</button>
                <button onclick="logout()" class="block w-full text-left py-2 text-gray-600 hover:text-blue-600">Logout</button>
            </div>
        </div>
    </header>
    <!-- Main Content -->
    <main class="pt-20">
        <!-- Your page content goes here -->
        <div class="container mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-6">{{PAGE_HEADING}}</h1>
            <p class="text-lg text-gray-600 mb-8">{{PAGE_DESCRIPTION}}</p>
            
            <!-- Add your page-specific content here -->
            <div class="bg-white p-8 rounded-xl shadow-lg">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Content Section</h2>
                <p class="text-gray-600">This is where your page content will go.</p>
            </div>
        </div>
    </main>
    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12 mt-20">
        <div class="container mx-auto px-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <h3 class="text-xl font-bold mb-4">RadMentor</h3>
                    <p class="text-gray-400">The world's most comprehensive radiology learning source.</p>
                </div>
                <div>
                    <h4 class="font-semibold mb-4">Courses</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#" class="hover:text-white">FRCR</a></li>
                        <li><a href="#" class="hover:text-white">MD/DNB</a></li>
                        <li><a href="#" class="hover:text-white">Anatomy</a></li>
                        <li><a href="#" class="hover:text-white">MICR</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-4">Support</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#" class="hover:text-white">Contact Us</a></li>
                        <li><a href="#" class="hover:text-white">FAQ</a></li>
                        <li><a href="#" class="hover:text-white">Help Center</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-4">Legal</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#" class="hover:text-white">Privacy Policy</a></li>
                        <li><a href="#" class="hover:text-white">Terms of Service</a></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; 2024 RadMentor. All rights reserved.</p>
            </div>
        </div>
    </footer>
    <!-- Firebase Scripts -->
    <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>
    <!-- Main App Script -->
    <script src="{{APP_JS_PATH}}"></script>
    <script>
        // Initialize Feather Icons
        feather.replace();
        // Mobile menu toggle
        document.getElementById('mobile-menu-button').addEventListener('click', function() {
            const mobileMenu = document.getElementById('mobile-menu');
            mobileMenu.classList.toggle('hidden');
        });
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            const mobileMenu = document.getElementById('mobile-menu');
            const mobileMenuButton = document.getElementById('mobile-menu-button');
            
            if (!mobileMenu.contains(event.target) && !mobileMenuButton.contains(event.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    </script>
</body>
</html>`;

function createPage(pageName, pageTitle, pageHeading, pageDescription, outputPath) {
    // Determine the relative path to home and app.js based on output path
    const pathDepth = outputPath.split('/').length - 1;
    const homeLink = '../'.repeat(pathDepth) + 'index.html';
    const appJsPath = '../'.repeat(pathDepth) + 'app.js';

    // Replace placeholders in template
    let content = pageTemplate
        .replace(/{{PAGE_TITLE}}/g, pageTitle)
        .replace(/{{PAGE_HEADING}}/g, pageHeading)
        .replace(/{{PAGE_DESCRIPTION}}/g, pageDescription)
        .replace(/{{HOME_LINK}}/g, homeLink)
        .replace(/{{APP_JS_PATH}}/g, appJsPath);

    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(outputPath, content);
    console.log(`✅ Created page: ${outputPath}`);
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length < 4) {
        console.log(`
Usage: node create-page.js <page-name> <page-title> <page-heading> <page-description> [output-path]
Examples:
  node create-page.js "my-page" "My Page" "My Page Heading" "This is a description" "pages/my-page.html"
  node create-page.js "anatomy/ct" "CT Anatomy" "CT Anatomy" "Learn CT anatomy" "anatomy/ct/index.html"
        `);
        process.exit(1);
    }

    const [pageName, pageTitle, pageHeading, pageDescription, outputPath = `${pageName}.html`] = args;

    createPage(pageName, pageTitle, pageHeading, pageDescription, outputPath);
}

module.exports = { createPage };
