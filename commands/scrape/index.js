/**
 * Scrape Command Main Handler
 * Coordinates web scraping requests through N8N routing service
 */

const { SlashCommandBuilder } = require('discord.js');
const { sendToN8n } = require('../../lib/n8n-service');
const { logger, correlation } = require('../../lib/logging');
const { validateScrapeInput } = require('./validator');
const { transformScrapeData, formatSuccessMessage } = require('./transformer');

/**
 * Main scrape command execution handler
 * @param {Object} interaction - Discord interaction object
 * @returns {Promise<void>} Promise that resolves when command is handled
 */
async function executeScrapeCommand(interaction) {
    const correlationId = correlation.getCorrelationId();
    
    try {
        // Extract input parameters
        const url = interaction.options.getString('url');
        const extractionRequest = interaction.options.getString('extraction_request');
        const outputSchema = interaction.options.getString('output_schema');

        logger.info('Processing scrape command', {
            correlationId,
            url,
            extractionRequest: extractionRequest.substring(0, 100),
            outputSchema: outputSchema.substring(0, 100),
            userId: interaction.user.id,
            guildId: interaction.guildId
        });

        // Validate input parameters
        const validationResult = validateScrapeInput({ url, extractionRequest, outputSchema });
        if (!validationResult.isValid) {
            await handleValidationError(interaction, validationResult.error, correlationId);
            return;
        }

        // Defer reply for processing
        await interaction.deferReply({ ephemeral: true });

        // Transform data for N8N processing
        const scrapeData = transformScrapeData({
            url,
            extractionRequest,
            outputSchema,
            interaction
        });

        // Send to N8N routing service
        await sendToN8n(scrapeData, 'scrape_command');

        // Send success response
        const successMessage = formatSuccessMessage({ url, extractionRequest, outputSchema });
        await interaction.editReply({
            content: successMessage,
            ephemeral: true
        });

        logger.info('Scrape command completed successfully', {
            correlationId,
            url,
            userId: interaction.user.id
        });

    } catch (error) {
        await handleCommandError(interaction, error, correlationId);
    }
}

/**
 * Handle validation errors with user-friendly messages
 * @param {Object} interaction - Discord interaction object
 * @param {string} errorMessage - Validation error message
 * @param {string} correlationId - Request correlation ID
 */
async function handleValidationError(interaction, errorMessage, correlationId) {
    logger.warn('Scrape command validation failed', {
        correlationId,
        error: errorMessage,
        userId: interaction.user.id
    });

    await interaction.reply({
        content: errorMessage,
        ephemeral: true
    });
}

/**
 * Handle command execution errors with logging and user feedback
 * @param {Object} interaction - Discord interaction object
 * @param {Error} error - The error that occurred
 * @param {string} correlationId - Request correlation ID
 */
async function handleCommandError(interaction, error, correlationId) {
    logger.error('Error in scrape command execution', {
        correlationId,
        error,
        userId: interaction.user?.id
    });

    const errorMessage = 'An error occurred while processing your scrape request. Please try again later.';

    try {
        if (!interaction.deferred) {
            await interaction.reply({
                content: errorMessage,
                ephemeral: true
            });
        } else {
            await interaction.editReply({
                content: errorMessage,
                ephemeral: true
            });
        }
    } catch (replyError) {
        logger.error('Failed to send error response in scrape command', {
            correlationId,
            error: replyError
        });
    }
}

/**
 * Build the slash command definition
 * @returns {SlashCommandBuilder} The command builder instance
 */
function buildScrapeCommand() {
    return new SlashCommandBuilder()
        .setName('scrape')
        .setDescription('Scrape data from a provided URL using intelligent extraction')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The URL to scrape data from (must be a valid HTTP/HTTPS URL)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('extraction_request')
                .setDescription('Specify what data you want to extract from the website')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('output_schema')
                .setDescription('Define the structure of the output data (JSON format)')
                .setRequired(true));
}

// Export the command object
const scrapeCommand = {
    data: buildScrapeCommand(),
    execute: executeScrapeCommand
};

module.exports = {
    scrapeCommand,
    executeScrapeCommand,
    handleValidationError,
    handleCommandError,
    buildScrapeCommand
};
