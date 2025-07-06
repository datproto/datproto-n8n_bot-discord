require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { scrapeCommand } = require('./commands/scrape');
const { logger, correlation } = require('./lib/logging');

const commands = [
    scrapeCommand.data.toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    const correlationId = correlation.startCorrelation();
    
    try {
        logger.info('Started refreshing application slash commands', { 
            correlationId, 
            commandCount: commands.length 
        });

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands },
        );

        logger.info('Successfully reloaded application slash commands', { 
            correlationId, 
            commandCount: commands.length 
        });
    } catch (error) {
        logger.error('Failed to reload application slash commands', { correlationId, error });
        process.exit(1);
    } finally {
        correlation.endCorrelation();
    }
})();