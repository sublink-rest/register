const express = require('express');
const axios = require('axios');
const { Octokit } = require('@octokit/rest');
const session = require('express-session');

const app = express();

app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GITHUB_TOKEN = process.env.MY_GIT_TOKEN;

const octokit = new Octokit({ auth: GITHUB_TOKEN });

app.get('/api/github/login', (req, res) => {
    res.redirect(`https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo`);
});

app.get('/api/github/callback', async (req, res) => {
    const { code } = req.query;
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
        console.error('GitHub callback error:', error);
        res.status(500).json({ success: false, message: 'Failed to authenticate with GitHub' });
    }
});

app.post('/api/register-subdomain', async (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const { subdomain, repo } = req.body;
        
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
        console.error('Subdomain registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to register subdomain' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
