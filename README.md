# Multisend Decoder

A tool to decode Safe Wallet (v1.3) multisend transactions.

## Description

This tool decodes multisend bytes for a Safe Wallet version 1.3, showing the individual transactions in a readable format. Each transaction is decoded according to the following format:

```
| Type (1 byte) | Operation (1 byte) | To (20 bytes) | Value (32 bytes) | Data Length (32 bytes) | Data (variable length) |
```

The decoder extracts each transaction and provides detailed information about:
- Operation type (Call or DelegateCall)
- Target address
- Value (in wei)
- Transaction data
- Additional context for specific transaction types (e.g., token approvals)

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher) or pnpm (v7 or higher)
- Docker (optional, for containerized usage)

### Option 1: Local Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/reown-com/safe-decoder.git
   cd safe-decoder
   ```

2. Install dependencies:
   ```bash
   npm install
   # or using pnpm
   pnpm install
   ```

3. Build the TypeScript code (if using TypeScript version):
   ```bash
   npm run build
   # or using pnpm
   pnpm build
   ```

### Option 2: Docker Installation

#### Pull from Docker Repository

The easiest way to get started is to pull the pre-built Docker image:

```bash
# From Docker Hub
docker pull reowncom/safe-decoder:latest

# OR from GitHub Container Registry
docker pull ghcr.io/reown-com/safe-decoder:latest
```

#### Build Locally

Alternatively, you can build the Docker image locally:

1. Clone this repository:
   ```bash
   git clone https://github.com/reown-com/safe-decoder.git
   cd safe-decoder
   ```

2. Build the Docker image:
   ```bash
   docker build -t safe-decoder .
   ```

## Usage

### Using Node.js Directly

Run the script with your multisend transaction data:

#### JavaScript Version
```bash
node decode.js "0x<your-multisend-data>"
```

#### TypeScript Version
```bash
# Run the compiled JavaScript
node dist/decode.js "0x<your-multisend-data>"

# Or run directly with ts-node
npx ts-node decode.ts "0x<your-multisend-data>"
# or using pnpm
pnpm dev "0x<your-multisend-data>"
```

Example:
```bash
node dist/decode.js "0x00ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a100f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1"
```

### Using Docker

Run the Docker container with your multisend transaction data:

```bash
# If you pulled from Docker Hub
docker run reowncom/safe-decoder "0x<your-multisend-data>"

# If you pulled from GitHub Container Registry
docker run ghcr.io/reown-com/safe-decoder "0x<your-multisend-data>"

# If you built locally
docker run safe-decoder "0x<your-multisend-data>"
```

Example:
```bash
docker run reowncom/safe-decoder "0x00ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a100f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1"
```

### Using Docker with a Specific Version

If you want to use a specific version:

```bash
docker run reowncom/safe-decoder:1.0.0 "0x<your-multisend-data>"
```

### Saving Output to a File

You can save the output to a file using standard output redirection:

```bash
# Using Node.js
node dist/decode.js "0x<your-multisend-data>" > output.txt

# Using Docker
docker run reowncom/safe-decoder "0x<your-multisend-data>" > output.txt
```

## Example Output

```
Decoded 2 transactions:

Transaction 1:
Operation: Call
To: 0xef4461891dfb3ac8572ccf7c794664a8dd927945
Value: 0
Data: 0x095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a1
Spender: 0xF368F535e329c6d08DFf0d4b2dA961C4e7F3fCAF
Amount: 26436651029164848837793

Transaction 2:
Operation: Call
To: 0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf
Value: 0
Data: 0x097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1
Contract: 0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf
```

## Development

### TypeScript Version

The project has been migrated to TypeScript for improved type safety and developer experience. The TypeScript source code is in `decode.ts`.

#### Building the TypeScript Code

To compile the TypeScript code to JavaScript:

```bash
npm run build
# or using pnpm
pnpm build
```

This will generate the compiled JavaScript files in the `dist` directory.

#### Modifying the TypeScript Script

The main TypeScript script is in `decode.ts`. If you want to add support for decoding additional transaction types or enhance the output format, modify this file and then rebuild.

### JavaScript Version

The original JavaScript version is still available in `decode.js` for backward compatibility.

### Building a New Docker Image

After making changes to the script, rebuild the Docker image:

```bash
docker build -t safe-decoder:latest .
```

You can also tag the image with a specific version:

```bash
docker tag safe-decoder:latest safe-decoder:1.0.1
```

### Publishing to Docker Repositories

To make the image available to your teammates, you can push it to a Docker repository:

#### Docker Hub

```bash
# Log in to Docker Hub
docker login

# Tag the image (if not already done)
docker tag safe-decoder:latest yourusername/safe-decoder:latest

# Push the image
docker push yourusername/safe-decoder:latest
```

#### GitHub Container Registry

```bash
# Log in to GitHub Container Registry
echo YOUR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Tag the image (if not already done)
docker tag safe-decoder:latest ghcr.io/yourusername/safe-decoder:latest

# Push the image
docker push ghcr.io/yourusername/safe-decoder:latest
```

## License

[MIT](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.