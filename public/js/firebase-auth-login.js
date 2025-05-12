// Firebase Auth for Login Page
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// UI Elements
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('firebase-login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const loginContainer = document.querySelector('.login-container');
  const errorMessage = document.getElementById('error-message');
  const successMessage = document.getElementById('success-message');

  // Show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    
    // Hide error after 5 seconds
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  }

  // Show success message
  function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
  }

  // Get Firebase Auth instance
  const auth = getAuth();

  // Handle form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get values
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      
      // Validate
      if (!email || !password) {
        showError('Please enter both email and password');
        return;
      }
      
      // Show loading state
      loginContainer.classList.add('submitting');
      loginBtn.disabled = true;
      
      try {
        console.log('Attempting Firebase authentication...');
        
        // Sign in with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Get user details for logging
        const userDetails = {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.displayName || 'Not set'
        };
        console.log('Firebase authentication successful:', userDetails);
        
        // Get ID token
        const idToken = await user.getIdToken();
        console.log('ID token obtained successfully');
        
        // Try to get the BACKEND_URL if coming from Firebase hosting redirect
        let backendUrl = window.location.origin;
        
        // If we're on Firebase hosting, we might have access to the BACKEND_URL global variable
        if (window.parent && window.parent.BACKEND_URL) {
            backendUrl = window.parent.BACKEND_URL;
            console.log('Using parent window BACKEND_URL:', backendUrl);
        }
        
        console.log('Using backend URL:', backendUrl);
        
        // Display message to user
        showSuccess('Firebase authentication successful, creating session...');
        
        // Store Firebase token in cookie for cross-domain requests
        document.cookie = `firebaseToken=${idToken}; path=/; max-age=3600; SameSite=None; ${window.location.protocol === 'https:' ? 'Secure' : ''}`;
        
        // Send token to server to create session
        console.log('Sending request to backend API to create session...');
        const response = await fetch(`${backendUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            idToken: idToken,
            uid: user.uid,
            email: user.email,
            timestamp: new Date().toISOString(),
            origin: window.location.origin
          }),
          // Include credentials to ensure cookies are sent and stored
          credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Backend response:', data);
        
        if (data.error) {
          console.error('Backend authentication error:', data.error);
          showError(`Authentication error: ${data.error}`);
          loginContainer.classList.remove('submitting');
          loginBtn.disabled = false;
          return;
        }
        
        // Show success with user details
        showSuccess(`Login successful. Welcome ${data.user?.email || 'back'}! Redirecting...`);
        
        // Test that the session is working by making a request to the status API
        try {
          const statusResponse = await fetch(`${backendUrl}/api/auth/verify`, {
            credentials: 'include'
          });
          const statusData = await statusResponse.json();
          console.log('Session status check:', statusData);
          
          if (!statusData.authenticated) {
            console.warn('Warning: Session may not be properly set. Continuing anyway...');
          }
        } catch (statusError) {
          console.error('Failed to check session status:', statusError);
        }
        
        // Redirect to dashboard or specified page
        console.log('Redirecting to:', data.redirectUrl || '/');
        setTimeout(() => {
          window.location.href = data.redirectUrl || '/';
        }, 1500);
      } catch (error) {
        // Handle errors
        loginContainer.classList.remove('submitting');
        loginBtn.disabled = false;
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        // Parse Firebase error codes for user-friendly messages
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address format';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email. Please check your credentials.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Invalid password. Please check your credentials.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many unsuccessful login attempts. Please try again later or reset your password.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network connection error. Please check your internet connection and try again.';
            break;  
          case 'auth/requires-recent-login':
            errorMessage = 'This action requires a recent login. Please log in again.';
            break;
        }
        
        showError(errorMessage);
        console.error('Login error:', error);
      }
    });
  }
  
  // Check if user is already signed in with Firebase
  onAuthStateChanged(auth, async (user) => {    
    // Log authentication state
    console.log('Firebase Auth State Changed:', user ? 'User signed in' : 'No user');
    
    // On login page or root path - automatic login/session creation
    if ((window.location.pathname === '/login' || window.location.pathname === '/') && user) {
      try {
        // Get new ID token
        const idToken = await user.getIdToken(true);
        
        // Try to get the BACKEND_URL if coming from Firebase hosting redirect
        let backendUrl = window.location.origin;
        
        // If we're on Firebase hosting, we might have access to the BACKEND_URL global variable
        if (window.parent && window.parent.BACKEND_URL) {
            backendUrl = window.parent.BACKEND_URL;
            console.log('Auth state - Using parent window BACKEND_URL:', backendUrl);
        }
        
        console.log('Auth state changed - Using backend URL:', backendUrl);
        
        // Store Firebase token in cookie for cross-domain requests
        document.cookie = `firebaseToken=${idToken}; path=/; max-age=3600; SameSite=None; ${window.location.protocol === 'https:' ? 'Secure' : ''}`;
        
        // Send to server to create session
        const response = await fetch(`${backendUrl}/api/auth/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            timestamp: new Date().toISOString(),
            origin: window.location.origin
          }),
          // Include credentials to ensure cookies are sent and stored
          credentials: 'include'
        });
        
        const data = await response.json();
        
        // Redirect if we have a valid URL
        if (data.redirectUrl && !data.error) {
          window.location.href = data.redirectUrl;
        }
      } catch (error) {
        console.error('Session creation error:', error);
      }
    }
  });
});
