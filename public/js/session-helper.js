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
        // Try to ping the server first to restore session before reloading
        fetch('/favicon.ico', { 
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'X-Session-Check': 'true'
          }
        })
        .then(response => {
          // Short delay before reload to allow session to restore
          setTimeout(() => window.location.reload(), 100);
        })
        .catch(e => {
          console.error('Session restoration ping failed', e);
          window.location.reload();
        });
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
        // Store timestamp of login attempt
        localStorage.setItem('login_timestamp', Date.now());
      }
    });
  } 
  // If not on login page and has login attempt flag, must have succeeded
  else if (hasLocalStorage && localStorage.getItem('login_attempted')) {
    localStorage.removeItem('login_attempted');
    localStorage.setItem('payroll_auth_state', 'authenticated');
    localStorage.setItem('auth_timestamp', Date.now());
  }
  
  // Special handling for protected pages
  if (hasLocalStorage && localStorage.getItem('payroll_auth_state') && !window.location.pathname.includes('/login')) {
    // More aggressive session pinging for Vercel serverless environment
    // Ping faster initially to establish session, then slow down
    let pingInterval = 30000; // 30 seconds
    
    // First ping immediately on page load
    fetch('/favicon.ico', { 
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'X-Session-Check': 'true'
      }
    }).catch(e => console.log('Initial session ping error', e));
    
    // Regular pinging
    setInterval(function() {
      fetch('/favicon.ico', { 
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'X-Session-Check': 'true',
          'X-Last-Activity': localStorage.getItem('auth_timestamp') || ''
        }
      })
      .then(() => {
        // Update last activity timestamp
        localStorage.setItem('auth_timestamp', Date.now());
      })
      .catch(e => console.log('Session ping error', e));
    }, pingInterval);
    
    // Listen for visibility changes to ping immediately when tab becomes visible again
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible' && localStorage.getItem('payroll_auth_state')) {
        fetch('/favicon.ico', { 
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'X-Session-Check': 'true',
            'X-Visibility-Restore': 'true'
          }
        }).catch(e => console.log('Visibility restore ping error', e));
      }
    });
  }
  
  // Check for logout links
  document.querySelectorAll('a[href="/logout"]').forEach(function(logoutLink) {
    logoutLink.addEventListener('click', function() {
      if (hasLocalStorage) {
        localStorage.removeItem('payroll_auth_state');
        localStorage.removeItem('auth_timestamp');
        localStorage.removeItem('login_attempted');
        localStorage.removeItem('login_timestamp');
      }
    });
  });
  
  // Run an initial check on page load
  checkAuthState();
  
  // Also run a check when the page becomes visible again
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      checkAuthState();
    }
  });
});