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
- npm (v6 or higher)
- Docker (optional, for containerized usage)

### Option 1: Local Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/multisend-decoder.git
   cd multisend-decoder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Option 2: Docker Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/multisend-decoder.git
   cd multisend-decoder
   ```

2. Build the Docker image:
   ```bash
   docker build -t multisend-decoder .
   ```

## Usage

### Using Node.js Directly

Run the script with your multisend transaction data:

```bash
node decode.js "0x<your-multisend-data>"
```

Example:
```bash
node decode.js "0x00ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a100f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1"
```

### Using Docker

Run the Docker container with your multisend transaction data:

```bash
docker run multisend-decoder "0x<your-multisend-data>"
```

Example:
```bash
docker run multisend-decoder "0x00ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a100f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1"
```

### Using Docker with a Specific Version

If you've tagged the Docker image with a version:

```bash
docker run multisend-decoder:1.0.0 "0x<your-multisend-data>"
```

### Saving Output to a File

You can save the output to a file using standard output redirection:

```bash
# Using Node.js
node decode.js "0x<your-multisend-data>" > output.txt

# Using Docker
docker run multisend-decoder "0x<your-multisend-data>" > output.txt
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

### Modifying the Script

The main script is in `decode.js`. If you want to add support for decoding additional transaction types or enhance the output format, modify this file.

### Building a New Docker Image

After making changes to the script, rebuild the Docker image:

```bash
docker build -t multisend-decoder:latest .
```

You can also tag the image with a specific version:

```bash
docker tag multisend-decoder:latest multisend-decoder:1.0.1
```

## License

[MIT](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 