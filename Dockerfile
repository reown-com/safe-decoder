FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Copy the TypeScript configuration and source files
COPY tsconfig.json ./
COPY decode.ts ./

# Build the TypeScript code
RUN pnpm build

# Make the script executable
RUN chmod +x dist/decode.js

# Set the entrypoint
ENTRYPOINT ["node", "dist/decode.js"] 