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

// Client ready event
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
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
process.on('SIGINT', () => {
    console.log('Shutting down...');
    client.destroy();
    process.exit(0);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

// Export client for testing purposes
module.exports = { client };
