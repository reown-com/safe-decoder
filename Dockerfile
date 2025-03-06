FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the script
COPY decode.js ./

# Make the script executable
RUN chmod +x decode.js

# Set the entrypoint
ENTRYPOINT ["node", "decode.js"] 