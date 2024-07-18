function app() {
    return {
        loggedIn: false,
        loading: false,
        username: '',
        subdomain: '',
        selectedRepo: '',
        repos: [],
        registering: false,
        registrationError: '',
        registrationSuccess: '',
        registeredDomains: [],
        error: '',

        checkAuthStatus() {
            this.loading = true;
            fetch('/api/auth/status')
                .then(res => {
                    if (!res.ok) throw new Error('Failed to check authentication status');
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        this.loggedIn = true;
                        this.username = data.user.login;
                        this.fetchRepos();
                        this.fetchRegisteredDomains();
                    }
                })
                .catch(err => {
                    console.error(err);
                    this.error = 'Failed to check authentication status';
                })
                .finally(() => {
                    this.loading = false;
                });
        },

        login() {
            this.loading = true;
            fetch('/api/github/login')
                .then(res => {
                    if (!res.ok) throw new Error('Failed to initiate login');
                    return res.json();
                })
                .then(data => {
                    window.location.href = data.url;
                })
                .catch(err => {
                    console.error(err);
                    this.error = 'Failed to initiate login';
                })
                .finally(() => {
                    this.loading = false;
                });
        },

        logout() {
            fetch('/api/github/logout')
                .then(res => {
                    if (!res.ok) throw new Error('Failed to logout');
                    this.loggedIn = false;
                    this.username = '';
                    this.repos = [];
                    this.registeredDomains = [];
                })
                .catch(err => {
                    console.error(err);
                    this.error = 'Failed to logout';
                });
        },

        fetchRepos() {
            fetch('/api/github/repos')
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch repositories');
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        this.repos = data.repos;
                    }
                })
                .catch(err => {
                    console.error(err);
                    this.error = 'Failed to fetch repositories';
                });
        },

        registerSubdomain() {
            this.registering = true;
            this.registrationError = '';
            this.registrationSuccess = '';

            fetch('/api/register-subdomain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subdomain: this.subdomain,
                    repo: this.selectedRepo
                })
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to register subdomain');
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    this.registrationSuccess = 'Subdomain registered successfully';
                    this.fetchRegisteredDomains();
                } else {
                    this.registrationError = data.message;
                }
            })
            .catch(err => {
                console.error(err);
                this.registrationError = 'Failed to register subdomain';
            })
            .finally(() => {
                this.registering = false;
            });
        },

        fetchRegisteredDomains() {
            fetch('/api/registered-domains')
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch registered domains');
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        this.registeredDomains = data.domains;
                    }
                })
                .catch(err => {
                    console.error(err);
                    this.error = 'Failed to fetch registered domains';
                });
        }
    }
}
