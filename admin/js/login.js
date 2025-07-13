// public/admin/js/login.js
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');

  loginForm.addEventListener('submit', async (e) => { // Make the function async
    e.preventDefault();
    errorMessage.textContent = '';
    const loginButton = e.target.querySelector('button');
    loginButton.textContent = 'Logging in...';
    loginButton.disabled = true;

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      // --- REAL API CALL ---
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Use the real auth functions to store token and user data
      login(data.token, data.user); 
      
      window.location.href = 'dashboard.html';

    } catch (error) {
      errorMessage.textContent = error.message;
    } finally {
        loginButton.textContent = 'Login';
        loginButton.disabled = false;
    }
  });
});

// --- Update auth.js to handle real data ---
// This is a conceptual change. Your auth.js needs to be updated.
function login(token, user) {
    if (!token || !user) return false;
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    return true;
}