// Authentication Module
const AUTH_API = 'https://trip-advisor-3.onrender.com/api/auth'; // Use your Render app URL
const GOOGLE_CLIENT_ID = '238714539124-l2mo199psvn8j0a4j9fan9v960ttdt4t.apps.googleusercontent.com';

const auth = {
    // Trigger Google Sign-In with popup
    signInWithGoogle() {
        try {
            if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
                throw new Error('Google OAuth library not loaded');
            }

            // Use OAuth2 popup approach
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
                select_account: true
            });

            client.requestAccessToken();

        } catch (error) {
            console.error('Error with Google Sign-In:', error);
            this.handleGoogleNotAvailable();
        }
    },

    async handleGoogleOAuthResponse(accessToken) {
        try {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!userInfoResponse.ok) throw new Error('Failed to fetch user info');

            const userData = await userInfoResponse.json();
            console.log('Google user data:', userData);

            if (userData && userData.email) {
                await this.processGoogleUser(userData, accessToken);
            } else {
                throw new Error('Invalid Google user data received');
            }
        } catch (error) {
            console.error('Google OAuth response error:', error);
            alert('Failed to process Google authentication: ' + error.message);
        }
    },

    async processGoogleUser(userData, googleToken) {
        try {
            const response = await fetch(`${AUTH_API}/google-auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'request-type': 'google'
                },
                body: JSON.stringify({ token: googleToken, userData })
            });

            const data = await response.json();

            if (response.ok && data.data) {
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
                window.location.href = '/html/home.html';
            } else {
                throw new Error(data.message || 'Google authentication failed');
            }

        } catch (error) {
            console.error('Error processing Google user:', error);
            alert('Google authentication failed: ' + error.message);
        }
    },

    async login(emailOrUsername, password) {
        const loginData = emailOrUsername.includes('@')
            ? { email: emailOrUsername, password }
            : { userName: emailOrUsername, password };

        const response = await fetch(`${AUTH_API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();

        if (response.ok) {
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

// Form handlers and event listeners remain the same, just make sure all `window.location.href` paths are relative if served from the same Render app.
