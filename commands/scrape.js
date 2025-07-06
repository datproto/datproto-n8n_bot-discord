const { SlashCommandBuilder } = require('discord.js');
const { sendToN8n } = require('../lib/n8n-service');
const { logger, correlation } = require('../lib/logging');

// Create the scrape command
const scrapeCommand = {
    data: new SlashCommandBuilder()
        .setName('scrape')
        .setDescription('Scrape data from a provided URL')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The URL to scrape data from')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('extraction_request')
                .setDescription('Specify what data you want to extract from the website')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('output_schema')
                .setDescription('Define the structure of the output data')
                .setRequired(true)),

    async execute(interaction) {
        const correlationId = correlation.getCorrelationId();
        
        try {
            const url = interaction.options.getString('url');
            const extractionRequest = interaction.options.getString('extraction_request');
            const outputSchema = interaction.options.getString('output_schema');

            // Validate URL
            if (!url.match(/^https?:\/\/.+/)) {
                logger.warn('Invalid URL provided in scrape command', {
                    correlationId,
                    url,
                    userId: interaction.user.id
                });

                await interaction.reply({
                    content: 'Please provide a valid URL starting with http:// or https://',
                    ephemeral: true
                });
                return;
            }

            logger.info('Processing scrape command', {
                correlationId,
                url,
                extractionRequest: extractionRequest.substring(0, 100),
                outputSchema: outputSchema.substring(0, 100),
                userId: interaction.user.id
            });

            await interaction.deferReply();

            // Create a payload for n8n with the URL, extraction request, and output schema
            const scrapeData = {
                url: url,
                extraction_request: extractionRequest,
                output_schema: outputSchema,
                timestamp: Date.now(),
                user_id: interaction.user.id,
                guild_id: interaction.guildId,
                channel_id: interaction.channelId
            };

            // Send to n8n webhook for processing
            await sendToN8n(scrapeData, 'scrape_command');

            // Create a more informative success message
            let successMessage = `Successfully sent URL to n8n for processing: ${url}`;
            successMessage += `\nExtraction request: "${extractionRequest}"`;
            successMessage += `\nOutput schema: "${outputSchema}"`;

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
            logger.error('Error in scrape command execution', {
                correlationId,
                error,
                userId: interaction.user?.id
            });

            const errorMessage = 'An error occurred while sending the URL to n8n.';

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
    }
};

module.exports = { scrapeCommand };
