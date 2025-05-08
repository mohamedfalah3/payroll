/**
 * Session Helper - Assists with maintaining session state in serverless environments
 * This script helps ensure authentication state is maintained between requests.
 */

// Check if we have local storage support
const hasLocalStorage = (function() {
  try {
    return 'localStorage' in window && window.localStorage !== null;
  } catch (e) {
    return false;
  }
})();

// Function to check current auth state
function checkAuthState() {
  // Check for our session backup cookie
  const isLoggedInCookie = document.cookie.split(';').some(item => item.trim().startsWith('user_logged_in='));
  
  // If we've lost session but have a backup indicator, try refreshing the session
  if (hasLocalStorage) {
    const localAuth = localStorage.getItem('payroll_auth_state');
    
    if (localAuth && !isLoggedInCookie) {
      // We had auth but lost the server session, try reloading
      console.log('Session state mismatch detected. Attempting to restore...');
      
      // Only reload if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.reload();
      }
    }
  }
}

// When login is successful, store a backup indicator
document.addEventListener('DOMContentLoaded', function() {
  // Check for a login form
  const loginForm = document.getElementById('loginForm');
  
  // If on login page with form
  if (loginForm) {
    loginForm.addEventListener('submit', function() {
      // Mark that we're attempting login (will be cleared if login fails and we return to login page)
      if (hasLocalStorage) {
        localStorage.setItem('login_attempted', 'true');
      }
    });
  } 
  // If not on login page and has login attempt flag, must have succeeded
  else if (hasLocalStorage && localStorage.getItem('login_attempted')) {
    localStorage.removeItem('login_attempted');
    localStorage.setItem('payroll_auth_state', 'authenticated');
  }
  
  // Special handling for protected pages
  if (hasLocalStorage && localStorage.getItem('payroll_auth_state') && !window.location.pathname.includes('/login')) {
    // We're on a protected page with local auth state, add a ping for session health
    setInterval(function() {
      fetch('/favicon.ico', { credentials: 'include' })
        .catch(e => console.log('Session ping error', e));
    }, 60000); // Ping every minute to keep session alive
  }
  
  // Check for logout links
  document.querySelectorAll('a[href="/logout"]').forEach(function(logoutLink) {
    logoutLink.addEventListener('click', function() {
      if (hasLocalStorage) {
        localStorage.removeItem('payroll_auth_state');
      }
    });
  });
  
  // Run an initial check on page load
  checkAuthState();
});