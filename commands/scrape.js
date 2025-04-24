const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

// Function to send data to n8n - copied from index.js to maintain consistency
const sendToN8n = async (data, eventType) => {
    try {
        const payload = {
            event_type: eventType,
            timestamp: Date.now(),
            ...data
        };

        // Log the payload in a readable format
        console.log('\nSending to n8n:');
        console.log('Event Type:', eventType);
        console.log('Timestamp:', new Date(payload.timestamp).toISOString());
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('----------------------------------------');

        await axios.post(process.env.N8N_WEBHOOK_URL, payload);
        console.log(`Successfully forwarded ${eventType} to n8n`);
    } catch (error) {
        console.error(`Error forwarding ${eventType} to n8n:`, error);
    }
};

// Create the scrape command
const scrapeCommand = {
    data: new SlashCommandBuilder()
        .setName('scrape')
        .setDescription('Scrape data from a provided URL')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The URL to scrape data from')
                .setRequired(true)),
                
    async execute(interaction) {
        try {
            const url = interaction.options.getString('url');
            
            // Validate URL
            if (!url.match(/^https?:\/\/.+/)) {
                await interaction.reply({
                    content: 'Please provide a valid URL starting with http:// or https://',
                    ephemeral: true
                });
                return;
            }

            await interaction.deferReply();

            // Use axios to fetch the webpage
            const response = await axios.get(url);
            
            // Create a payload for n8n
            const scrapeData = {
                url: url,
                content: response.data,
                timestamp: Date.now()
            };

            // Send to n8n webhook
            await sendToN8n(scrapeData, 'scrape_command');

            await interaction.editReply({
                content: `Successfully scraped data from ${url} and forwarded to n8n!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in scrape command:', error);
            const errorMessage = error.response?.status === 403 ? 
                'Access to this URL is forbidden.' : 
                'An error occurred while trying to scrape the URL.';
                
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
        }
    }
};

module.exports = { scrapeCommand };
