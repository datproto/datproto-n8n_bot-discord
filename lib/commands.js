/**
 * Command Management Module
 * Handles Discord slash command registration and execution
 */

/**
 * Initialize command collection and register commands
 * @param {Object} client - Discord client instance
 */
const initializeCommands = (client) => {
    // Add the commands collection to the client
    client.commands = new Map();

    // Import and register the scrape command
    const { scrapeCommand } = require('../commands/scrape');
    client.commands.set(scrapeCommand.data.name, scrapeCommand);
};

/**
 * Handle Discord interaction events (slash commands)
 * @param {Object} interaction - Discord interaction object
 * @returns {Promise<void>} Promise that resolves when interaction is handled
 */
const handleInteraction = async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const errorMessage = 'There was an error while executing this command!';
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: errorMessage,
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: errorMessage,
                ephemeral: true
            });
        }
    }
};

/**
 * Register command handlers with Discord client
 * @param {Object} client - Discord client instance
 */
const registerCommandHandlers = (client) => {
    initializeCommands(client);
    client.on('interactionCreate', handleInteraction);
};

module.exports = {
    initializeCommands,
    handleInteraction,
    registerCommandHandlers
};
