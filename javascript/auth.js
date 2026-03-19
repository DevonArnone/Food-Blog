// Authentication system with Google OAuth and Username/Password
class AuthManager {
    constructor() {
        this.user = null;
        this.users = this.loadUsers(); // Simple user storage
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeAuth();
            });
        } else {
            this.initializeAuth();
        }
    }

    initializeAuth() {
        // Check for stored user session
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                this.user = JSON.parse(storedUser);
            } catch (e) {
                console.error('Error parsing user data:', e);
                localStorage.removeItem('user');
            }
        }

        // Update UI - try immediately, then retry if needed
        this.updateUI();
        
        // Also try after a short delay to ensure DOM is fully ready
        setTimeout(() => {
            this.updateUI();
        }, 200);

        // Load Google Identity Services (but SSO is currently down)
        // this.loadGoogleSignIn();
    }

    loadUsers() {
        // Load users from localStorage (simple implementation)
        const stored = localStorage.getItem('users');
        return stored ? JSON.parse(stored) : [];
    }

    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    registerUser(username, password, email = '') {
        // Check if username already exists
        if (this.users.find(u => u.username === username)) {
            return { success: false, message: 'Username already exists' };
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username: username,
            password: password, // In production, this should be hashed
            email: email,
            name: username,
            picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=889ca8&color=fff&size=128`
        };

        this.users.push(newUser);
        this.saveUsers();
        return { success: true, user: newUser };
    }

    loginWithPassword(username, password) {
        const user = this.users.find(u => u.username === username && u.password === password);
        if (user) {
            this.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                picture: user.picture,
                username: user.username
            };
            localStorage.setItem('user', JSON.stringify(this.user));
            this.updateUI();
            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: this.user }));
            return { success: true };
        }
        return { success: false, message: 'Invalid username or password' };
    }

    loadGoogleSignIn() {
        // Load Google Identity Services script
        if (!document.querySelector('script[src*="accounts.google.com"]')) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => this.initializeGoogleSignIn();
            document.head.appendChild(script);
        } else {
            // Script already loaded, initialize
            if (window.google?.accounts) {
                this.initializeGoogleSignIn();
            }
        }
    }

    initializeGoogleSignIn() {
        if (!window.google?.accounts) {
            setTimeout(() => this.initializeGoogleSignIn(), 100);
            return;
        }

        window.google.accounts.id.initialize({
            // IMPORTANT: Replace 'YOUR_GOOGLE_CLIENT_ID' with your actual Google OAuth Client ID
            // Get your Client ID from: https://console.cloud.google.com/
            // See SETUP.md for detailed instructions
            client_id: 'YOUR_GOOGLE_CLIENT_ID',
            callback: (response) => this.handleCredentialResponse(response),
        });

        // Render sign-in button
        const signInButton = document.getElementById('google-signin-button');
        if (signInButton) {
            window.google.accounts.id.renderButton(signInButton, {
                theme: 'outline',
                size: 'large',
                width: signInButton.offsetWidth || 250,
            });
        }
    }

    handleGoogleSSOClick() {
        // SSO is currently down, show message and prompt for username/password
        alert('Google SSO is currently unavailable. Please use username and password to sign in.');
        this.showLoginModal();
    }

    handleCredentialResponse(response) {
        // Decode the JWT token (simplified - in production, verify on backend)
        try {
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            this.user = {
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                picture: payload.picture,
            };
            localStorage.setItem('user', JSON.stringify(this.user));
            this.updateUI();
            
            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: this.user }));
        } catch (error) {
            console.error('Error processing login:', error);
            alert('Login failed. Please try again.');
        }
    }

    signOut() {
        this.user = null;
        localStorage.removeItem('user');
        this.updateUI();
        
        // Sign out from Google
        if (window.google?.accounts) {
            window.google.accounts.id.disableAutoSelect();
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
    }

    isAuthenticated() {
        return this.user !== null;
    }

    getUser() {
        return this.user;
    }

    showLoginModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('login-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.className = 'login-modal';
        modal.innerHTML = `
            <div class="login-modal-content">
                <span class="close-modal">&times;</span>
                <h2>Sign In</h2>
                <div class="login-tabs">
                    <button class="tab-btn active" data-tab="login">Login</button>
                    <button class="tab-btn" data-tab="register">Register</button>
                </div>
                
                <form id="login-form" class="auth-form active">
                    <div class="form-group">
                        <label for="login-username">Username</label>
                        <input type="text" id="login-username" required>
                    </div>
                    <div class="form-group">
                        <label for="login-password">Password</label>
                        <input type="password" id="login-password" required>
                    </div>
                    <div id="login-error" class="error-message"></div>
                    <button type="submit" class="submit-auth-btn">Sign In</button>
                </form>

                <form id="register-form" class="auth-form">
                    <div class="form-group">
                        <label for="register-username">Username</label>
                        <input type="text" id="register-username" required>
                    </div>
                    <div class="form-group">
                        <label for="register-email">Email (optional)</label>
                        <input type="email" id="register-email">
                    </div>
                    <div class="form-group">
                        <label for="register-password">Password</label>
                        <input type="password" id="register-password" required>
                    </div>
                    <div id="register-error" class="error-message"></div>
                    <button type="submit" class="submit-auth-btn">Register</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event listeners
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => modal.remove());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Tab switching
        const tabBtns = modal.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const forms = modal.querySelectorAll('.auth-form');
                forms.forEach(f => f.classList.remove('active'));
                document.getElementById(`${tab}-form`).classList.add('active');
                
                // Clear errors
                modal.querySelectorAll('.error-message').forEach(el => el.textContent = '');
            });
        });

        // Login form
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            
            const result = this.loginWithPassword(username, password);
            if (result.success) {
                modal.remove();
            } else {
                errorDiv.textContent = result.message || 'Invalid username or password';
            }
        });

        // Register form
        const registerForm = document.getElementById('register-form');
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const errorDiv = document.getElementById('register-error');
            
            if (password.length < 6) {
                errorDiv.textContent = 'Password must be at least 6 characters';
                return;
            }

            const result = this.registerUser(username, password, email);
            if (result.success) {
                // Auto-login after registration
                this.loginWithPassword(username, password);
                modal.remove();
            } else {
                errorDiv.textContent = result.message || 'Registration failed';
            }
        });
    }

    updateUI() {
        const authContainer = document.getElementById('auth-container');
        if (!authContainer) {
            // Retry after a short delay if container doesn't exist yet
            setTimeout(() => this.updateUI(), 100);
            return;
        }

        // Clear any existing content
        authContainer.innerHTML = '';

        if (this.user) {
            // User is logged in
            authContainer.innerHTML = `
                <div class="user-info">
                    <img src="${this.user.picture || 'https://ui-avatars.com/api/?name=User&background=889ca8&color=fff&size=128'}" alt="${this.user.name}" class="user-avatar">
                    <span class="user-name">${this.user.name}</span>
                    <button id="signout-button" class="signout-btn">Sign Out</button>
                </div>
            `;
            
            const signOutBtn = document.getElementById('signout-button');
            if (signOutBtn) {
                signOutBtn.addEventListener('click', () => this.signOut());
            }
        } else {
            // User is not logged in
            authContainer.innerHTML = `
                <button id="google-sso-btn" class="google-sso-btn">Sign in with Google</button>
                <button id="username-login-btn" class="username-login-btn">Sign In</button>
            `;
            
            // Setup button listeners immediately
            setTimeout(() => {
                const googleBtn = document.getElementById('google-sso-btn');
                const usernameBtn = document.getElementById('username-login-btn');
                
                if (googleBtn) {
                    googleBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.handleGoogleSSOClick();
                    });
                } else {
                    console.warn('Google SSO button not found');
                }
                
                if (usernameBtn) {
                    usernameBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showLoginModal();
                    });
                } else {
                    console.warn('Username login button not found');
                }
            }, 50);
        }
    }
}

// Initialize auth manager when DOM is ready
let authManager;

function initializeAuthManager() {
    authManager = new AuthManager();
    window.authManager = authManager;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuthManager);
} else {
    // DOM is already ready
    initializeAuthManager();
}

