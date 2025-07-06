/**
 * Command Management Module
 * Handles Discord slash command registration and execution
 */

const { logger, correlation } = require('./logging');

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

    logger.info('Commands initialized', {
        commandCount: client.commands.size,
        commands: Array.from(client.commands.keys())
    });
};

/**
 * Handle Discord interaction events (slash commands)
 * @param {Object} interaction - Discord interaction object
 * @returns {Promise<void>} Promise that resolves when interaction is handled
 */
const handleInteraction = async (interaction) => {
    if (!interaction.isCommand()) return;

    const correlationId = correlation.startCommandCorrelation(interaction);

    try {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            logger.warn('Unknown command requested', {
                correlationId,
                commandName: interaction.commandName,
                userId: interaction.user.id
            });
            return;
        }

        logger.info('Executing command', {
            correlationId,
            commandName: interaction.commandName,
            userId: interaction.user.id,
            guildId: interaction.guildId
        });

        await command.execute(interaction);

        correlation.endCommandCorrelation(correlationId, true);
    } catch (error) {
        logger.error('Command execution failed', {
            correlationId,
            commandName: interaction.commandName,
            error
        });

        const errorMessage = 'There was an error while executing this command!';
        
        try {
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
        } catch (replyError) {
            logger.error('Failed to send error response', {
                correlationId,
                error: replyError
            });
        }

        correlation.endCommandCorrelation(correlationId, false, error);
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
