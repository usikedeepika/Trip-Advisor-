// Authentication Module
const AUTH_API = '/api/auth';
const GOOGLE_CLIENT_ID = '238714539124-l2mo199psvn8j0a4j9fan9v960ttdt4t.apps.googleusercontent.com';

const auth = {
    // Trigger Google Sign-In with popup
    signInWithGoogle() {
        try {
            if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
                throw new Error('Google OAuth library not loaded');
            }

            // Check if we're in a development environment
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.warn('Running on localhost - Google OAuth might have domain restrictions');
            }

            // Use OAuth2 popup approach for better user experience
            const client = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'openid email profile',
                callback: (response) => {
                    if (response.access_token) {
                        console.log(response.access_token);
                        this.handleGoogleOAuthResponse(response.access_token);
                    } else {
                        console.error('No access token received');
                        alert('Google sign-in failed. Please try again.');
                    }
                },
                error_callback: (error) => {
                    console.error('Google OAuth error:', error);
                    if (error.type !== 'popup_closed') {
                        alert('Google sign-in failed: ' + error.type);
                    }
                },
                ux_mode: 'popup',
                select_account: true // This forces account selection
            });

            // Request access token (opens popup)
            client.requestAccessToken();

        } catch (error) {
            console.error('Error with Google Sign-In:', error);
            this.handleGoogleNotAvailable();
        }
    },

    // Handle Google OAuth response with access token
    async handleGoogleOAuthResponse(accessToken) {
        try {
            // Fetch user info using the access token
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!userInfoResponse.ok) {
                throw new Error('Failed to fetch user info');
            }

            const userData = await userInfoResponse.json();
            console.log('Google user data:', userData);
            
            if (userData && userData.email) {
                // Pass both user data and the Google access token to backend
                await this.processGoogleUser(userData, accessToken);
            } else {
                throw new Error('Invalid Google user data received');
            }
        } catch (error) {
            console.error('Google OAuth response error:', error);
            alert('Failed to process Google authentication: ' + error.message);
        }
    },

    // Handle case when Google Sign-In is not available
    handleGoogleNotAvailable() {
        console.warn('Google Sign-In not available');
        
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            alert('Google Sign-In is not configured for localhost development.\n\nTo use Google Sign-In:\n1. Add http://localhost:5500 and http://127.0.0.1:5500 to authorized origins in Google Cloud Console\n2. Enable both "Authorized JavaScript origins" and "Authorized redirect URIs"\n3. Or use email/password login for development');
        } else {
            alert('Google Sign-In is not available. Please use email/password login or try again later.');
        }
    },

    // Process Google user data
    async processGoogleUser(userData, googleToken) {
        try {
            console.log('Attempting Google authentication for:', userData.email);
            
            // Send Google token to backend for validation
            const response = await fetch(`${AUTH_API}/google-auth`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'request-type': 'google'
                },
                body: JSON.stringify({
                    token: googleToken,
                    userData: userData
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.data) {
                // Store the JWT token and user data from backend response
                localStorage.setItem('JWT_TOKEN', data.data.token);
                localStorage.setItem('CURRENT_USER', JSON.stringify({
                    id: data.data.id,
                    userName: data.data.userName,
                    email: data.data.email,
                    firstName: data.data.firstName,
                    lastName: data.data.lastName,
                    role: data.data.role
                }));
                
                console.log('Google authentication successful');
                alert('Google authentication successful!');
               window.location.href = '/html/home.html';

                return;
            } else {
                throw new Error(data.message || 'Google authentication failed');
            }
            
        } catch (error) {
            console.error('Error processing Google user:', error);
            alert('Google authentication failed: ' + error.message);
        }
    },

    async login(emailOrUsername, password) {
        const isEmail = emailOrUsername.includes('@');
        const loginData = isEmail 
            ? { email: emailOrUsername, password }
            : { userName: emailOrUsername, password };
            
        const response = await fetch(`${AUTH_API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store in localStorage
            localStorage.setItem('JWT_TOKEN', data.data.token);
            localStorage.setItem('CURRENT_USER', JSON.stringify({
                id: data.data.id,
                userName: data.data.userName,
                email: data.data.email,
                firstName: data.data.firstName,
                lastName: data.data.lastName,
                role: data.data.role
            }));
            return data;
        }
        throw new Error(data.message || 'Login failed');
    },

    async signup(userData) {
        const response = await fetch(`${AUTH_API}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userName: userData.email,
                email: userData.email,
                password: userData.password,
                firstName: userData.firstName,
                lastName: userData.lastName
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store in localStorage
            localStorage.setItem('JWT_TOKEN', data.token);
            localStorage.setItem('CURRENT_USER', JSON.stringify({
                id: data.id,
                userName: data.userName,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role
            }));
            return data;
        }
        throw new Error(data.message || 'Signup failed');
    },

    async request(url, options = {}) {
        const token = localStorage.getItem('JWT_TOKEN');
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            }
        });
    },

    logout() {
        localStorage.removeItem('JWT_TOKEN');
        localStorage.removeItem('CURRENT_USER');
        window.location.href = '/html/home.html';

    },

    isAuthenticated() {
        return localStorage.getItem('JWT_TOKEN') !== null;
    },

    getCurrentUser() {
        const user = localStorage.getItem('CURRENT_USER');
        return user ? JSON.parse(user) : null;
    },

    getToken() {
        return localStorage.getItem('JWT_TOKEN');
    }
};

// Form handlers
document.addEventListener('DOMContentLoaded', () => {

    // Login form
    const loginForm = document.getElementById('signinForm');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            
            const emailOrUsername = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!emailOrUsername || !password) {
                alert('Please fill in all fields');
                return;
            }
            
            try {
                await auth.login(emailOrUsername, password);
                alert('Login successful!');
                window.location.href = '/html/home.html';

            } catch (error) {
                alert('Login failed: ' + error.message);
            }
        };
    }

    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.onsubmit = async (e) => {
            e.preventDefault();
            try {
                await auth.signup({
                    firstName: document.getElementById('firstName').value,
                    lastName: document.getElementById('lastName').value,
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value
                });
                
                alert('Account created successfully!');
               window.location.href = '/html/home.html';

            } catch (error) {
                alert('Signup failed: ' + error.message);
            }
        };
    }

    // Google OAuth buttons
    document.querySelectorAll('.google-signin-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            auth.signInWithGoogle();
        };
    });

    // Logout buttons
    document.querySelectorAll('[data-logout]').forEach(btn => {
        btn.onclick = () => auth.logout();
    });

    // Route protection
    if (window.location.pathname.includes('home.html')) {
        if (!auth.isAuthenticated()) {
            window.location.href = '/html/home.html';

        }
    }
});

// Global access
window.auth = auth; 