# Docker Deployment Guide

This guide explains how to deploy the Discord to n8n Message Forwarder Bot using Docker and Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your system
- [Docker Compose](https://docs.docker.com/compose/install/) installed on your system

## Setup

1. **Configure Environment Variables**

   Edit the `docker-compose.yml` file and update the environment variables with your credentials:

   ```yaml
   environment:
     - DISCORD_TOKEN=your_discord_bot_token
     - DISCORD_CLIENT_ID=your_discord_client_id
     - N8N_WEBHOOK_URL=your_n8n_webhook_url
   ```

2. **Build and Start the Container**

   You can use the provided setup script to manage your Docker containers:

   ```bash
   # Make the script executable (first time only)
   chmod +x docker-setup.sh

   # Start the bot
   ./docker-setup.sh start
   ```

   Or use Docker Compose directly:

   ```bash
   docker-compose up -d
   ```

3. **View Logs**

   Using the setup script:

   ```bash
   ./docker-setup.sh logs
   ```

   Or with Docker Compose:

   ```bash
   docker-compose logs -f
   ```

4. **Stop the Bot**

   Using the setup script:

   ```bash
   ./docker-setup.sh stop
   ```

   Or with Docker Compose:

   ```bash
   docker-compose down
   ```

5. **Check Status**

   Using the setup script:

   ```bash
   ./docker-setup.sh status
   ```

   Or with Docker Compose:

   ```bash
   docker-compose ps
   ```

## Running Multiple Bots

The docker-compose.yml file includes commented sections for running multiple bots. To run multiple bots:

1. Uncomment the relevant sections in the `docker-compose.yml` file
2. Update the environment variables for each bot with their respective credentials
3. Start all bots with `docker-compose up -d`

## Updating the Bot

To update the bot after making changes to the code:

Using the setup script:

```bash
./docker-setup.sh stop
./docker-setup.sh start
```

Or with Docker Compose:

```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## Troubleshooting

- **Bot not connecting**: Check your environment variables and ensure they are correctly set in the `docker-compose.yml` file.
- **Container crashes**: View the logs with `docker-compose logs` to identify the issue.
- **Permission issues**: Ensure your Docker installation has the necessary permissions to access the files.

## Advanced Configuration

You can modify the `Dockerfile` and `docker-compose.yml` files to customize the deployment:

- Change the Node.js version in the Dockerfile
- Add additional environment variables
- Configure volume mappings
- Set up custom networks
- Add health checks
