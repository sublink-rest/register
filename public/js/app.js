function app() {
    return {
        loggedIn: false,
        loading: false,
        error: null,
        username: '',
        repos: [],
        subdomain: '',
        selectedRepo: '',
        registering: false,
        registrationError: null,
        registrationSuccess: null,
        registeredDomains: [],

        async checkAuthStatus() {
            try {
                const response = await fetch('/api/auth/status');
                const data = await response.json();
                if (data.loggedIn) {
                    this.loggedIn = true;
                    this.username = data.username;
                    this.repos = data.repos;
                    await this.fetchRegisteredDomains();
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
            }
        },

        async login() {
            this.loading = true;
            this.error = null;
            try {
                const response = await fetch('/api/github/login', {
                    headers: { 'Accept': 'application/json' }
                });
                const data = await response.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error('No login URL provided');
                }
            } catch (err) {
                this.error = 'Failed to initiate login. Please try again.';
                console.error('Login error:', err);
            } finally {
                this.loading = false;
            }
        },

        async logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                this.loggedIn = false;
                this.username = '';
                this.repos = [];
                this.registeredDomains = [];
            } catch (error) {
                console.error('Logout error:', error);
            }
        },

        async registerSubdomain() {
            this.registering = true;
            this.registrationError = null;
            this.registrationSuccess = null;
            try {
                const response = await fetch('/api/register-subdomain', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        subdomain: this.subdomain,
                        repo: this.selectedRepo
                    })
                });
                const data = await response.json();
                if (data.success) {
                    this.registrationSuccess = `Successfully registered ${this.subdomain}.sublink.rest`;
                    this.subdomain = '';
                    this.selectedRepo = '';
                    await this.fetchRegisteredDomains();
                } else {
                    throw new Error(data.message || 'Failed to register subdomain');
                }
            } catch (err) {
                this.registrationError = err.message;
                console.error('Registration error:', err);
            } finally {
                this.registering = false;
            }
        },

        async fetchRegisteredDomains() {
            try {
                const response = await fetch('/api/registered-domains');
                const data = await response.json();
                this.registeredDomains = data.domains;
            } catch (error) {
                console.error('Error fetching registered domains:', error);
            }
        }
    };
}
