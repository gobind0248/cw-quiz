// login.js - Authentication module for C&W JE Quiz
const LOGIN_SHEET_GID = "1362508814";
const BASE_SHEET_ID = "1hJSzOmZZilf3XR4SxlM-s_xPoq-4KkQKJ9vF8TGxSn4";

class QuizLogin {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.loginAttempts = 0;
        this.maxAttempts = 3;
        this.lockDuration = 30000; // 30 seconds in milliseconds
        
        // DOM Elements
        this.loginContainer = null;
        this.quizContainer = null;
        this.loginForm = null;
        this.usernameInput = null;
        this.passwordInput = null;
        this.loginBtn = null;
        this.logoutBtn = null;
        this.userInfo = null;
        this.errorMsg = null;
        this.lockedUntil = null;
        
        this.init();
    }

    init() {
        this.createLoginUI();
        this.checkSession();
        this.attachEventListeners();
    }

    createLoginUI() {
        // Create login container
        this.loginContainer = document.createElement('div');
        this.loginContainer.id = 'login-container';
        this.loginContainer.innerHTML = `
            <div class="login-box">
                <div class="login-header">
                    <div class="login-title">🔐 JE DPQ / LDCE Login</div>
                    <div class="login-subtitle">Enter your credentials</div>
                </div>
                
                <form id="login-form" class="login-form">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" required 
                               placeholder="Enter your username" autocomplete="username">
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password</label>
                        <div class="password-wrapper">
                            <input type="password" id="password" name="password" required 
                                   placeholder="Enter your password" autocomplete="current-password">
                            <button type="button" class="toggle-password" id="toggle-password">👁️</button>
                        </div>
                    </div>
                    
                    <div id="login-error" class="error-message"></div>
                    
                    <div class="form-group">
                        <button type="submit" id="login-btn" class="login-btn">
                            <span class="btn-text">Login</span>
                            <span class="btn-loader" style="display: none;">
                                <div class="spinner"></div> Verifying...
                            </span>
                        </button>
                    </div>
                    
                    <div class="login-footer">
                        <div class="attempts-counter" id="attempts-counter">
                            Attempts: <span id="attempts-count">0</span>/3
                        </div>
                        <div class="demo-credentials">
                            Demo: User1 / Pass123
                        </div>
                    </div>
                </form>
                
                <div id="locked-message" class="locked-message" style="display: none;">
                    ⚠️ Account locked. Try again in <span id="lock-timer">30</span> seconds
                </div>
            </div>
        `;

        // Get existing quiz container
        this.quizContainer = document.querySelector('.quiz-container');
        if (this.quizContainer) {
            this.quizContainer.style.display = 'none';
            document.body.insertBefore(this.loginContainer, this.quizContainer);
        }

        // Cache DOM elements
        this.loginForm = document.getElementById('login-form');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('login-btn');
        this.errorMsg = document.getElementById('login-error');
        this.attemptsCount = document.getElementById('attempts-count');
        this.togglePasswordBtn = document.getElementById('toggle-password');
        this.lockedMessage = document.getElementById('locked-message');
        this.lockTimer = document.getElementById('lock-timer');
    }

    attachEventListeners() {
        // Login form submission
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Toggle password visibility
        this.togglePasswordBtn.addEventListener('click', () => {
            const type = this.passwordInput.type === 'password' ? 'text' : 'password';
            this.passwordInput.type = type;
            this.togglePasswordBtn.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });

        // Clear error on input
        this.usernameInput.addEventListener('input', () => this.clearError());
        this.passwordInput.addEventListener('input', () => this.clearError());

        // Add logout button to quiz header
        this.createLogoutButton();
    }

    createLogoutButton() {
        // Create logout button that will be added to quiz header after login
        this.logoutBtn = document.createElement('button');
        this.logoutBtn.id = 'logout-btn';
        this.logoutBtn.className = 'logout-btn';
        this.logoutBtn.innerHTML = '👤 Logout';
        this.logoutBtn.style.display = 'none';
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Add logout button to quiz header
        const quizHeader = document.querySelector('.quiz-header');
        if (quizHeader) {
            quizHeader.appendChild(this.logoutBtn);
        }

        // Create user info display
        this.userInfo = document.createElement('div');
        this.userInfo.id = 'user-info';
        this.userInfo.className = 'user-info';
        this.userInfo.style.display = 'none';
        quizHeader.appendChild(this.userInfo);
    }

    async handleLogin() {
        // Check if account is locked
        if (this.lockedUntil && Date.now() < this.lockedUntil) {
            const remaining = Math.ceil((this.lockedUntil - Date.now()) / 1000);
            this.showError(`Account locked. Try again in ${remaining} seconds.`);
            this.showLockedMessage(remaining);
            return;
        }

        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();

        if (!username || !password) {
            this.showError('Please enter both username and password');
            return;
        }

        // Show loading state
        this.setLoading(true);

        try {
            const isValid = await this.validateCredentials(username, password);
            
            if (isValid) {
                // Login successful
                this.loginAttempts = 0;
                this.isAuthenticated = true;
                this.currentUser = username;
                
                // Save session
                this.saveSession(username);
                
                // Show success message
                this.showSuccess('Login successful! Redirecting...');
                
                // Switch to quiz after delay
                setTimeout(() => {
                    this.showQuiz();
                }, 1000);
            } else {
                // Login failed
                this.loginAttempts++;
                this.attemptsCount.textContent = this.loginAttempts;
                
                if (this.loginAttempts >= this.maxAttempts) {
                    // Lock account
                    this.lockedUntil = Date.now() + this.lockDuration;
                    this.showError(`Too many failed attempts. Account locked for 30 seconds.`);
                    this.showLockedMessage(30);
                    
                    // Start lock timer
                    this.startLockTimer();
                } else {
                    this.showError(`Invalid credentials. Attempts: ${this.loginAttempts}/${this.maxAttempts}`);
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please check your connection.');
        } finally {
            this.setLoading(false);
        }
    }

    async validateCredentials(username, password) {
        try {
            // Fetch login credentials from Google Sheet
            const url = `https://docs.google.com/spreadsheets/d/${BASE_SHEET_ID}/export?format=csv&gid=${LOGIN_SHEET_GID}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to fetch credentials');
            }
            
            const csvText = await response.text();
            const credentials = this.parseCredentialsCSV(csvText);
            
            // Check if username and password match
            return credentials.some(cred => 
                cred.username === username && cred.password === password
            );
        } catch (error) {
            console.error('Error validating credentials:', error);
            
            // Fallback: Check against demo credentials if sheet fails
            const demoCredentials = [
                { username: 'User1', password: 'Pass123' },
                { username: 'User2', password: 'Pass456' },
                { username: 'Admin', password: 'Admin123' }
            ];
            
            return demoCredentials.some(cred => 
                cred.username === username && cred.password === password
            );
        }
    }

    parseCredentialsCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const credentials = [];
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
            
            if (row.length >= 2) {
                const username = row[0] ? row[0].replace(/^"|"$/g, '').trim() : '';
                const password = row[1] ? row[1].replace(/^"|"$/g, '').trim() : '';
                
                if (username && password) {
                    credentials.push({ username, password });
                }
            }
        }
        
        return credentials;
    }

    showQuiz() {
        this.loginContainer.style.display = 'none';
        this.quizContainer.style.display = 'block';
        this.logoutBtn.style.display = 'block';
        this.userInfo.style.display = 'block';
        this.userInfo.textContent = `👤 ${this.currentUser}`;
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.isAuthenticated = false;
            this.currentUser = null;
            
            // Clear session
            this.clearSession();
            
            // Reset login form
            this.loginForm.reset();
            this.loginAttempts = 0;
            this.attemptsCount.textContent = '0';
            this.clearError();
            this.hideLockedMessage();
            
            // Show login screen
            this.loginContainer.style.display = 'block';
            this.quizContainer.style.display = 'none';
            this.logoutBtn.style.display = 'none';
            this.userInfo.style.display = 'none';
            
            // Reset any quiz state if needed
            if (window.resetQuizState) {
                window.resetQuizState();
            }
        }
    }

    saveSession(username) {
        const session = {
            username,
            timestamp: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        localStorage.setItem('cwje_quiz_session', JSON.stringify(session));
    }

    checkSession() {
        try {
            const sessionStr = localStorage.getItem('cwje_quiz_session');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                
                if (session.expires > Date.now()) {
                    // Session is valid
                    this.isAuthenticated = true;
                    this.currentUser = session.username;
                    this.showQuiz();
                } else {
                    // Session expired
                    this.clearSession();
                }
            }
        } catch (error) {
            console.error('Error checking session:', error);
            this.clearSession();
        }
    }

    clearSession() {
        localStorage.removeItem('cwje_quiz_session');
    }

    showError(message) {
        this.errorMsg.textContent = message;
        this.errorMsg.style.display = 'block';
        
        // Shake animation for error
        this.loginForm.classList.add('shake');
        setTimeout(() => {
            this.loginForm.classList.remove('shake');
        }, 500);
    }

    showSuccess(message) {
        this.errorMsg.textContent = message;
        this.errorMsg.style.color = '#22c55e';
        this.errorMsg.style.display = 'block';
    }

    clearError() {
        this.errorMsg.textContent = '';
        this.errorMsg.style.display = 'none';
        this.errorMsg.style.color = '#ef4444'; // Reset to error color
    }

    setLoading(isLoading) {
        const btnText = this.loginBtn.querySelector('.btn-text');
        const btnLoader = this.loginBtn.querySelector('.btn-loader');
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-flex';
            this.loginBtn.disabled = true;
        } else {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            this.loginBtn.disabled = false;
        }
    }

    showLockedMessage(seconds) {
        this.lockedMessage.style.display = 'block';
        this.lockTimer.textContent = seconds;
        this.loginForm.style.display = 'none';
    }

    hideLockedMessage() {
        this.lockedMessage.style.display = 'none';
        this.loginForm.style.display = 'block';
    }

    startLockTimer() {
        const updateTimer = () => {
            const remaining = Math.ceil((this.lockedUntil - Date.now()) / 1000);
            
            if (remaining > 0) {
                this.lockTimer.textContent = remaining;
                setTimeout(updateTimer, 1000);
            } else {
                // Lock expired
                this.hideLockedMessage();
                this.lockedUntil = null;
                this.loginAttempts = 0;
                this.attemptsCount.textContent = '0';
                this.clearError();
            }
        };
        
        updateTimer();
    }
}

// Initialize login when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.quizLogin = new QuizLogin();

});
