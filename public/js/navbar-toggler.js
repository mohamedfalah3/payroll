document.addEventListener('DOMContentLoaded', function() {
    // Get all navbar togglers (with the new class toggler-btn)
    const navbarTogglers = document.querySelectorAll('.toggler-btn');
    
    // Add click event listener to each toggler
    navbarTogglers.forEach(toggler => {
        toggler.addEventListener('click', function() {
            // Find the associated nav element (directly look for the nav within the same parent)
            const sidebar = this.closest('.sidebar');
            const nav = sidebar.querySelector('nav');
            
            // Toggle the 'show' class on the nav element
            if (nav) {
                nav.classList.toggle('show');
                
                // Add aria attributes for accessibility
                if (nav.classList.contains('show')) {
                    toggler.setAttribute('aria-expanded', 'true');
                } else {
                    toggler.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });
});