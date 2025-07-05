# Discord to n8n Message Forwarder Bot

> A powerful Discord bot that seamlessly integrates with n8n workflows. Automatically forwards Discord messages to n8n webhooks with detailed content type detection.

[![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com)
[![n8n](https://img.shields.io/badge/n8n-00E833?style=for-the-badge&logo=n8n&logoColor=white)](https://n8n.io)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)

## 🔍 Overview

This Discord bot bridges Discord and n8n, enabling powerful automation workflows. It listens for Discord messages and forwards them to n8n webhooks with detailed content analysis.

**Perfect for**: Discord message triggers, automated content moderation, message archiving, and workflow automation.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Discord Application & Bot Token
- n8n Webhook URL

### Installation
```bash
# Clone and install
git clone <repository-url>
cd datproto-n8n_bot-discord
npm install

# Configure environment
cp .env.sample .env
# Edit .env with your tokens

# Deploy commands and start
npm run deploy-commands
npm start
```

## 🏗️ Architecture

**Modular Design** with **250-line file limit** for maintainability:

```
├── index.js                    # Application entry (69 lines)
├── lib/                        # Core modules
│   ├── formatters.js           # Data formatting (96 lines)
│   ├── n8n-service.js          # N8N communication (38 lines)
│   ├── event-data.js           # Event structures (108 lines)
│   ├── commands.js             # Command system (63 lines)
│   └── event-handlers/         # Event processing
├── commands/                   # Slash commands
├── scripts/                    # Development tools
└── .taskmaster/               # Project management
```

## 🔧 Key Features

- **Smart Content Detection**: Identifies message types (text, stickers, images, videos, etc.)
- **Rich Message Data**: Comprehensive Discord information forwarded to n8n
- **Modular Architecture**: Easy to maintain, test, and extend
- **File Size Monitoring**: Automated enforcement of 250-line limit
- **Secure & Reliable**: Error handling and graceful shutdown

## 📋 Available Scripts

```bash
npm start                    # Start the bot
npm run deploy-commands      # Register Discord slash commands  
npm run check-file-sizes     # Monitor file size compliance
npm run check-file-sizes-strict  # Strict compliance check
```

## 📚 Documentation

- **[Setup Guide](docs/setup.md)** - Detailed installation and configuration
- **[Architecture Guide](docs/architecture.md)** - Technical design details
- **[API Reference](docs/api-reference.md)** - Webhook formats and content types
- **[Development Guide](docs/development.md)** - Contributing and best practices
- **[Deployment Guide](docs/deployment.md)** - Production deployment options

## 🛡️ File Size Compliance

This project enforces a **250-line maximum** for all files:

```bash
# Check compliance
npm run check-file-sizes

# All files currently comply ✅
Total Files: 22 | Violations: 0 | Warnings: 0 | Compliant: 22
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Ensure file size compliance: `npm run check-file-sizes-strict`
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Discord Developer Portal](https://discord.com/developers/applications)
- [n8n Documentation](https://docs.n8n.io/)
- [Project Documentation](docs/)

---

**Need help?** Check the [docs](docs/) or open an issue!
