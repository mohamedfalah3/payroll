document.addEventListener('DOMContentLoaded', function() {
    // Get all navbar togglers (with the new class toggler-btn)
    const navbarTogglers = document.querySelectorAll('.toggler-btn, .navbar-toggler');
    
    // Add click event listener to each toggler
    navbarTogglers.forEach(toggler => {
        toggler.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Find the associated nav element (directly look for the nav within the same parent)
            const sidebar = this.closest('.sidebar');
            const nav = sidebar?.querySelector('nav');
            
            // Toggle the 'show' class on the nav element
            if (nav) {
                nav.classList.toggle('show');
                
                // Add aria attributes for accessibility
                if (nav.classList.contains('show')) {
                    toggler.setAttribute('aria-expanded', 'true');
                    toggler.setAttribute('aria-label', 'Close navigation menu');
                } else {
                    toggler.setAttribute('aria-expanded', 'false');
                    toggler.setAttribute('aria-label', 'Open navigation menu');
                }
                
                // Update toggler icon - optional visual feedback
                const togglerIcon = toggler.querySelector('.toggler-icon');
                if (togglerIcon) {
                    togglerIcon.classList.toggle('active');
                }
            }
        });
    });
    
    // Close navigation when a link is clicked on mobile
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Only perform this on mobile viewports
            if (window.innerWidth <= 992) {
                const nav = this.closest('nav');
                if (nav && nav.classList.contains('show')) {
                    nav.classList.remove('show');
                    
                    // Update toggler state if it exists
                    const toggler = this.closest('.sidebar').querySelector('.toggler-btn, .navbar-toggler');
                    if (toggler) {
                        toggler.setAttribute('aria-expanded', 'false');
                    }
                }
            }
        });
    });
    
    // Add resize event listener to handle menu state on window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 992) {
            // On larger screens, ensure navigation is visible
            const navs = document.querySelectorAll('.sidebar nav');
            navs.forEach(nav => {
                nav.classList.remove('show');
            });
            
            const togglers = document.querySelectorAll('.toggler-btn, .navbar-toggler');
            togglers.forEach(toggler => {
                toggler.setAttribute('aria-expanded', 'false');
            });
        }
    });

    const navToggler = document.querySelector('.toggler-btn');
    const navMenu = document.querySelector('.sidebar nav');
    
    if (navToggler && navMenu) {
        // Add toggle functionality for mobile navigation
        navToggler.addEventListener('click', function() {
            navMenu.classList.toggle('show');
            // Change icon based on menu state
            const icon = navToggler.querySelector('i');
            if (icon) {
                if (navMenu.classList.contains('show')) {
                    icon.classList.remove('bi-list');
                    icon.classList.add('bi-x-lg');
                } else {
                    icon.classList.remove('bi-x-lg');
                    icon.classList.add('bi-list');
                }
            }
        });
        
        // Close menu when a link is clicked
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                // Only close if on mobile (window width < 1100px)
                if (window.innerWidth < 1100) {
                    navMenu.classList.remove('show');
                    // Reset icon
                    const icon = navToggler.querySelector('i');
                    if (icon) {
                        icon.classList.remove('bi-x-lg');
                        icon.classList.add('bi-list');
                    }
                }
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            // Only if we're on mobile and the menu is open
            if (window.innerWidth < 1100 && navMenu.classList.contains('show')) {
                // Check if the click was outside the sidebar
                let targetElement = event.target;
                let isClickInside = false;
                
                while (targetElement != null) {
                    if (targetElement.classList && 
                        (targetElement.classList.contains('sidebar') || 
                         targetElement.classList.contains('toggler-btn'))) {
                        isClickInside = true;
                        break;
                    }
                    targetElement = targetElement.parentElement;
                }
                
                if (!isClickInside) {
                    navMenu.classList.remove('show');
                    // Reset icon
                    const icon = navToggler.querySelector('i');
                    if (icon) {
                        icon.classList.remove('bi-x-lg');
                        icon.classList.add('bi-list');
                    }
                }
            }
        });
        
        // Adjust menu visibility when resizing the window
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 1100) {
                navMenu.classList.remove('show');
                // Reset icon
                const icon = navToggler.querySelector('i');
                if (icon) {
                    icon.classList.remove('bi-x-lg');
                    icon.classList.add('bi-list');
                }
            }
        });
    }
});