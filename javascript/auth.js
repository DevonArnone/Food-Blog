// Authentication system using Google OAuth
class AuthManager {
    constructor() {
        this.user = null;
        this.init();
    }

    init() {
        // Check for stored user session
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            this.user = JSON.parse(storedUser);
            this.updateUI();
        }

        // Load Google Identity Services
        this.loadGoogleSignIn();
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

    updateUI() {
        const authContainer = document.getElementById('auth-container');
        if (!authContainer) return;

        if (this.user) {
            // User is logged in
            authContainer.innerHTML = `
                <div class="user-info">
                    <img src="${this.user.picture}" alt="${this.user.name}" class="user-avatar">
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
                <div id="google-signin-button"></div>
            `;
            // Re-initialize Google Sign-In button
            setTimeout(() => this.initializeGoogleSignIn(), 100);
        }
    }
}

// Initialize auth manager when DOM is ready
let authManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        authManager = new AuthManager();
    });
} else {
    authManager = new AuthManager();
}

// Export for use in other scripts
window.authManager = authManager;

