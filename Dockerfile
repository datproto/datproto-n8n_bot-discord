FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Verify the index.js file exists and show directory contents for debugging
RUN ls -la && \
    echo "Current directory: $(pwd)" && \
    if [ ! -f "index.js" ]; then echo "ERROR: index.js not found!"; exit 1; fi

# Run the bot
CMD ["node", "index.js"]
