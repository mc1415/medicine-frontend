// public/admin/js/auth.js

// --- SIMULATED AUTH FUNCTIONS ---

/**
 * Simulates logging in. In a real app, this would make an API call.
 * For now, it just checks for a non-empty email and stores a dummy token.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password (currently unused).
 * @returns {boolean} - True if login is "successful", false otherwise.
 */
function login(email, password) {
  if (!email) {
    return false;
  }
  // Simulate successful login
  const fakeToken = 'frontend_dummy_token_12345';
  const user = {
    fullName: 'Admin User',
    email: email,
    role: 'admin'
  };
  localStorage.setItem('authToken', fakeToken);
  localStorage.setItem('user', JSON.stringify(user));
  return true;
}

/**
 * Logs the user out by clearing localStorage.
 */
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

/**
 * Checks if a user is "logged in". If not, redirects to the login page.
 * Call this at the start of every protected page's script.
 */
function checkAuth() {
  if (!localStorage.getItem('authToken')) {
    window.location.href = 'login.html';
  }
}

/**
 * Gets the current user's info from localStorage.
 * @returns {object|null} - The user object or null if not found.
 */
function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}