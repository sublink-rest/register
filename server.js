const express = require('express');
const axios = require('axios');
const { Octokit } = require('@octokit/rest');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GITHUB_TOKEN = process.env.MY_GIT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Middleware to check authentication
const checkAuth = (req, res, next) => {
    if (!req.session.accessToken) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    next();
};

app.get('/api/github/login', (req, res) => {
    const state = uuidv4();
    req.session.oauthState = state;
    res.redirect(`https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo&state=${state}`);
});

app.get('/api/github/callback', async (req, res) => {
    const { code, state } = req.query;
    if (state !== req.session.oauthState) {
        return res.status(400).json({ success: false, message: 'Invalid state parameter' });
    }
    try {
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code
        }, {
            headers: { Accept: 'application/json' }
        });
        const accessToken = tokenResponse.data.access_token;
        req.session.accessToken = accessToken;

        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` }
        });
        const reposResponse = await axios.get('https://api.github.com/user/repos', {
            headers: { Authorization: `token ${accessToken}` }
        });
        const repos = reposResponse.data.map(repo => repo.name);
        
        res.json({
            success: true,
            username: userResponse.data.login,
            repos: repos
        });
    } catch (error) {
        console.error('GitHub callback error:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Failed to authenticate with GitHub' });
    }
});

app.post('/api/register-subdomain', checkAuth, async (req, res) => {
    try {
        const { subdomain, repo } = req.body;
        
        if (!subdomain || !repo) {
            return res.status(400).json({ success: false, message: 'Subdomain and repo are required' });
        }

        // Validate subdomain format
        if (!/^[a-z0-9-]+$/.test(subdomain)) {
            return res.status(400).json({ success: false, message: 'Invalid subdomain format' });
        }
        
        // Check if subdomain is available
        const existingFile = await octokit.repos.getContent({
            owner: 'sublink-rest',
            repo: 'domains',
            path: `${subdomain}.sublink.rest.json`
        }).catch(() => null);

        if (existingFile) {
            return res.status(400).json({ success: false, message: 'Subdomain already taken' });
        }

        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${req.session.accessToken}` }
        });

        // Create JSON file in the domains folder
        await octokit.repos.createOrUpdateFileContents({
            owner: 'sublink-rest',
            repo: 'domains',
            path: `${subdomain}.sublink.rest.json`,
            message: `Register ${subdomain}.sublink.rest`,
            content: Buffer.from(JSON.stringify({
                subdomain: subdomain,
                github_repo: `https://github.com/${userResponse.data.login}/${repo}`,
                created_at: new Date().toISOString(),
                status: 'active'
            })).toString('base64')
        });

        res.json({ success: true, message: 'Subdomain registered successfully' });
    } catch (error) {
        console.error('Subdomain registration error:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Failed to register subdomain' });
    }
});

app.get('/support', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'support.html'));
});

app.get('/policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'policy.html'));
});

app.get('/installation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'installation.html'));
});

app.get('/status', async (req, res) => {
    try {
        // Check GitHub API status
        const githubStatus = await axios.get('https://www.githubstatus.com/api/v2/status.json');
        
        // Check your own API status
        const apiStatus = { status: 'operational' }; // Replace with actual status check

        res.json({
            github: githubStatus.data,
            api: apiStatus
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to retrieve status' });
    }
});

app.get('/service', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/documentation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

// GitHub Marketplace Webhook
app.post('/api/github/webhook', (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    if (signature === digest) {
        const event = req.headers['x-github-event'];
        console.log('Received valid webhook:', event);
        
        switch (event) {
            case 'marketplace_purchase':
                handleMarketplacePurchase(req.body);
                break;
            case 'marketplace_cancellation':
                handleMarketplaceCancellation(req.body);
                break;
            case 'marketplace_change':
                handleMarketplaceChange(req.body);
                break;
            default:
                console.log('Unhandled event type:', event);
        }

        res.status(200).send('Webhook received successfully');
    } else {
        console.error('Invalid webhook signature');
        res.status(401).send('Unauthorized');
    }
});

function handleMarketplacePurchase(data) {
    // Implement logic for new purchases
    console.log('New purchase:', data);
    // e.g., Activate user account, send welcome email, etc.
}

function handleMarketplaceCancellation(data) {
    // Implement logic for cancellations
    console.log('Cancellation:', data);
    // e.g., Deactivate user account, send feedback survey, etc.
}

function handleMarketplaceChange(data) {
    // Implement logic for plan changes
    console.log('Plan changed:', data);
    // e.g., Upgrade/downgrade user account, adjust limits, etc.
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Catch-all route for React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
