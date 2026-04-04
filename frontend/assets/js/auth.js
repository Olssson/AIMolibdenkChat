/**
 * Moly AI Chat — Auth (Login) Logic
 */

// ========================================
// Configuration
// ========================================
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://your-railway-app.up.railway.app'; // <-- Replace with your Railway URL after deployment

// ========================================
// DOM Elements
// ========================================
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const loginText = document.getElementById('login-text');
const loginSpinner = document.getElementById('login-spinner');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const togglePassword = document.getElementById('toggle-password');

// ========================================
// Check existing session
// ========================================
(function checkSession() {
    const sessionId = sessionStorage.getItem('moly_session_id');
    if (sessionId) {
        window.location.href = 'chat.html';
    }
})();

// ========================================
// Toggle password visibility
// ========================================
togglePassword.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    
    const eyeIcon = document.getElementById('eye-icon');
    if (isPassword) {
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        `;
    } else {
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        `;
    }
});

// ========================================
// Login Form Submit
// ========================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showError('Wypełnij wszystkie pola');
        return;
    }
    
    // Set loading state
    setLoading(true);
    hideError();
    
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Save session
            sessionStorage.setItem('moly_session_id', data.session_id);
            sessionStorage.setItem('moly_email', email);
            
            // Success animation then redirect
            loginButton.classList.add('bg-emerald-600');
            loginText.textContent = '✓ Zalogowano!';
            
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 600);
        } else {
            showError(data.error || 'Nieprawidłowe hasło');
            setLoading(false);
        }
    } catch (err) {
        console.error('Login error:', err);
        showError('Nie można połączyć z serwerem. Sprawdź czy backend działa.');
        setLoading(false);
    }
});

// ========================================
// Helpers
// ========================================
function setLoading(loading) {
    loginButton.disabled = loading;
    loginSpinner.classList.toggle('hidden', !loading);
    loginText.textContent = loading ? 'Logowanie...' : 'Zaloguj się';
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    errorMessage.classList.add('animate-shake');
    
    // Shake animation
    errorMessage.style.animation = 'none';
    requestAnimationFrame(() => {
        errorMessage.style.animation = 'shake 0.5s ease-in-out';
    });
}

function hideError() {
    errorMessage.classList.add('hidden');
}

// Add shake keyframe
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
    }
`;
document.head.appendChild(style);
