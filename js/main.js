// js/main.js

// This special event listener waits for the entire HTML document to be loaded and ready.
document.addEventListener('DOMContentLoaded', () => {
    
    // Now that the DOM is ready, it's safe to run our code.

    // --- General UI Logic ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // By importing auth.js here, inside the listener, we guarantee that it will only run
    // after all the HTML elements it needs are available.
    import('./auth.js')
        .then(() => {
            console.log("Authentication module has loaded and is now running.");
        })
        .catch(err => {
            // This is a failsafe in case something goes wrong loading the auth script.
            console.error("Critical error loading auth module:", err);
            const loadingIndicator = document.getElementById('loading-indicator');
            if(loadingIndicator) loadingIndicator.classList.add('hidden');
            document.body.innerHTML = '<p style="text-align: center; padding: 2rem;">Error: Application could not start. Please try refreshing the page.</p>';
        });

    // Make sure Feather Icons are rendered
    feather.replace();
});
