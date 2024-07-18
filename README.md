# sublink.rest - Free Subdomain Registration

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsublink-rest%2Fregister)

Instantly get a free subdomain (sublink.rest) for your personal site, open-source project, and more! 🌐

## 🚀 Features

- **Free Subdomains**: Get your own `yourname.sublink.rest` domain at no cost.
- **GitHub Integration**: Seamlessly connect your subdomain to your GitHub repository.
- **One-Click Deploy**: Easy setup with Vercel deployment.
- **Open Source**: Contribute and help improve the platform!

## 🛠 Quick Start

1. Click the "Deploy with Vercel" button above.
2. Connect your GitHub account and select the repository to deploy.
3. Once deployed, visit your new app and follow the instructions to register your subdomain.

## 🔧 Local Development

To set up the project locally:

1. Clone the repository:
   ```
   git clone https://github.com/sublink-rest/register.git
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add:
   ```
   CLIENT_ID=your_github_client_id
   CLIENT_SECRET=your_github_client_secret
   MY_GIT_TOKEN=your_github_personal_access_token
   SESSION_SECRET=your_session_secret
   ```

4. Start the development server:
   ```
   npm start
   ```

5. Visit `http://localhost:3000` in your browser.

## 📘 How It Works

1. **Authentication**: Users log in with their GitHub account.
2. **Repository Selection**: Users choose which repository they want to associate with their subdomain.
3. **Subdomain Creation**: A new subdomain is created and linked to the selected repository.
4. **DNS Configuration**: Our system automatically sets up the necessary DNS records.

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit pull requests, report issues, or request features.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [GitHub](https://github.com) for authentication and repository hosting.
- [Vercel](https://vercel.com) for hosting and easy deployment.

---

Made with ❤️ by the sublink.rest team. Happy coding!
