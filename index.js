/**
 * Discord N8N Bot - Main Application Entry Point
 * Modular Discord bot that forwards events to N8N webhooks
 */

// Load environment configuration
require('dotenv').config();

// Discord.js imports
const { Client, GatewayIntentBits, Partials } = require('discord.js');

// Import event handlers
const { registerMessageHandlers } = require('./lib/event-handlers/message-handler');
const { registerReactionHandlers } = require('./lib/event-handlers/reaction-handler');
const { registerThreadHandlers } = require('./lib/event-handlers/thread-handler');
const { registerCommandHandlers } = require('./lib/commands');

// Import service manager
const { serviceManager } = require('./services');

// Create Discord client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.ThreadMember, Partials.User]
});

// Initialize services
async function initializeServices() {
    try {
        await serviceManager.initialize({
            n8nRouter: {
                timeout: parseInt(process.env.N8N_TIMEOUT) || 30000,
                retryAttempts: parseInt(process.env.N8N_RETRY_ATTEMPTS) || 3,
                maxConcurrentRequests: parseInt(process.env.N8N_MAX_CONCURRENT) || 10
            }
        });
        console.log('Services initialized successfully');
    } catch (error) {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    }
}

// Client ready event
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Initialize services after Discord client is ready
    await initializeServices();
});

// Register all event handlers
registerMessageHandlers(client);
registerReactionHandlers(client);
registerThreadHandlers(client);
registerCommandHandlers(client);

// Handle client errors
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');

    try {
        await serviceManager.shutdown();
        client.destroy();
        console.log('Graceful shutdown completed');
    } catch (error) {
        console.error('Error during shutdown:', error);
    }

    process.exit(0);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

// Export client and service manager for testing purposes
module.exports = { client, serviceManager };
