/**
 * Moly AI Chat — Chat Interface Logic
 */

// ========================================
// Configuration
// ========================================
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://your-railway-app.up.railway.app'; // <-- Replace with your Railway URL

// ========================================
// State
// ========================================
let sessionId = sessionStorage.getItem('moly_session_id');
let isProcessing = false;

// ========================================
// DOM Elements
// ========================================
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const sendIcon = document.getElementById('send-icon');
const sendSpinner = document.getElementById('send-spinner');
const welcomeMessage = document.getElementById('welcome-message');
const userEmailDisplay = document.getElementById('user-email-display');
const logoutButton = document.getElementById('logout-button');

// ========================================
// Session Check
// ========================================
(function checkAuth() {
    if (!sessionId) {
        window.location.href = 'index.html';
        return;
    }
    
    const email = sessionStorage.getItem('moly_email') || sessionId;
    userEmailDisplay.textContent = email;
})();

// ========================================
// Suggested Questions
// ========================================
document.querySelectorAll('.suggested-question').forEach(btn => {
    btn.addEventListener('click', () => {
        const question = btn.getAttribute('data-question');
        if (question && !isProcessing) {
            sendMessage(question);
        }
    });
});

// ========================================
// Input Handling
// ========================================
messageInput.addEventListener('input', () => {
    sendButton.disabled = !messageInput.value.trim() || isProcessing;
    autoResize();
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (messageInput.value.trim() && !isProcessing) {
            sendMessage(messageInput.value.trim());
        }
    }
});

function autoResize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + 'px';
}

// ========================================
// Chat Form Submit
// ========================================
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if (msg && !isProcessing) {
        sendMessage(msg);
    }
});

// ========================================
// Send Message
// ========================================
async function sendMessage(message) {
    if (isProcessing) return;
    isProcessing = true;
    
    // Hide welcome
    if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
    }
    
    // Add user message
    addMessage('user', message);
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendButton.disabled = true;
    
    // Show typing indicator
    const typingId = showTypingIndicator();
    
    // Set loading state
    setLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                session_id: sessionId
            })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        if (response.ok) {
            addMessage('ai', data.response, data.sources);
        } else {
            addMessage('error', data.error || 'Wystąpił błąd. Spróbuj ponownie.');
        }
    } catch (err) {
        console.error('Chat error:', err);
        removeTypingIndicator(typingId);
        addMessage('error', 'Nie można połączyć z serwerem. Sprawdź połączenie.');
    }
    
    setLoading(false);
    isProcessing = false;
}

// ========================================
// Add Message to DOM
// ========================================
function addMessage(type, content, sources = []) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-animate', 'mb-4');
    
    if (type === 'user') {
        wrapper.innerHTML = `
            <div class="flex justify-end">
                <div class="max-w-[85%] sm:max-w-[70%]">
                    <div class="bg-gradient-to-br from-moly-600 to-moly-700 text-white px-5 py-3 rounded-2xl rounded-br-md shadow-lg shadow-moly-700/20">
                        <p class="text-[15px] leading-relaxed whitespace-pre-wrap">${escapeHtml(content)}</p>
                    </div>
                    <div class="text-right mt-1">
                        <span class="text-[10px] text-gray-600">${getTime()}</span>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'ai') {
        const renderedContent = renderMarkdown(content);
        const sourcesHtml = sources && sources.length > 0 
            ? `<div class="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap gap-1.5">
                   <span class="text-[10px] text-gray-500 mr-1">📄 Źródła:</span>
                   ${sources.map(s => `<span class="text-[10px] bg-dark-900/50 text-gray-400 px-2 py-0.5 rounded-full border border-white/[0.04]">${escapeHtml(s)}</span>`).join('')}
               </div>` 
            : '';
        
        wrapper.innerHTML = `
            <div class="flex justify-start">
                <div class="flex items-start gap-3 max-w-[90%] sm:max-w-[80%]">
                    <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-moly-500/20 to-moly-700/20 border border-moly-500/20 flex items-center justify-center mt-0.5">
                        <svg class="w-4 h-4 text-moly-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="bg-dark-700/40 backdrop-blur-sm border border-white/[0.06] text-gray-200 px-5 py-3.5 rounded-2xl rounded-tl-md shadow-lg">
                            <div class="ai-message-content text-[15px] leading-relaxed">
                                ${renderedContent}
                            </div>
                            ${sourcesHtml}
                        </div>
                        <div class="mt-1 ml-1">
                            <span class="text-[10px] text-gray-600">${getTime()} · Moly AI</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'error') {
        wrapper.innerHTML = `
            <div class="flex justify-start">
                <div class="flex items-start gap-3 max-w-[85%]">
                    <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center mt-0.5">
                        <svg class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                    </div>
                    <div class="bg-red-500/5 border border-red-500/10 text-red-300 px-5 py-3.5 rounded-2xl rounded-tl-md text-sm">
                        ${escapeHtml(content)}
                    </div>
                </div>
            </div>
        `;
    }
    
    chatMessages.appendChild(wrapper);
    scrollToBottom();
}

// ========================================
// Typing Indicator
// ========================================
function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const el = document.createElement('div');
    el.id = id;
    el.classList.add('message-animate', 'mb-4');
    el.innerHTML = `
        <div class="flex justify-start">
            <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-moly-500/20 to-moly-700/20 border border-moly-500/20 flex items-center justify-center mt-0.5">
                    <svg class="w-4 h-4 text-moly-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                </div>
                <div class="bg-dark-700/40 border border-white/[0.06] px-5 py-4 rounded-2xl rounded-tl-md flex items-center gap-1.5">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        </div>
    `;
    chatMessages.appendChild(el);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.2s ease';
        setTimeout(() => el.remove(), 200);
    }
}

// ========================================
// Logout
// ========================================
logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('moly_session_id');
    sessionStorage.removeItem('moly_email');
    window.location.href = 'index.html';
});

// ========================================
// Utilities
// ========================================
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        try {
            marked.setOptions({
                breaks: true,
                gfm: true,
            });
            return marked.parse(text);
        } catch {
            return escapeHtml(text).replace(/\n/g, '<br>');
        }
    }
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function getTime() {
    return new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    });
}

function setLoading(loading) {
    sendIcon.classList.toggle('hidden', loading);
    sendSpinner.classList.toggle('hidden', !loading);
    sendButton.disabled = loading;
}
