# Discord to n8n Message Forwarder Bot

This Discord bot listens for messages in channels and forwards them to an n8n webhook.

## Setup

1. Create a Discord application and bot:
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to the "Bot" section and create a bot
   - Copy the bot token and client ID

2. Configure the bot:
   - Copy the `.env` file and rename it to `.env`
   - Fill in the following values:
     - `DISCORD_TOKEN`: Your Discord bot token
     - `DISCORD_CLIENT_ID`: Your Discord client ID
     - `N8N_WEBHOOK_URL`: Your n8n webhook URL

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the bot:
   ```bash
   node index.js
   ```

## Features

- Listens for messages in all channels the bot has access to
- Forwards messages to n8n webhook with detailed information including:
  - Message content
  - Author information
  - Channel information
  - Guild (server) information
  - Timestamp

## Security

- Uses environment variables for sensitive information
- Implements proper error handling
- Graceful shutdown on process termination
- Ignores messages from other bots

## Required Discord Bot Permissions

- Read Messages/View Channels
- Send Messages
- Read Message History

## n8n Webhook Format

The bot sends messages to n8n in the following format:

```json
{
  "content": "message content",
  "author": {
    "id": "user id",
    "username": "username",
    "discriminator": "discriminator"
  },
  "channel": {
    "id": "channel id",
    "name": "channel name",
    "type": "channel type"
  },
  "guild": {
    "id": "guild id",
    "name": "guild name"
  },
  "timestamp": 1234567890
}
``` 