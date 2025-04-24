#!/bin/sh
echo "Deploying slash commands..."
node deploy-commands.js || echo "Warning: Command deployment failed, but continuing with bot startup..."
echo "Starting bot..."
exec node index.js