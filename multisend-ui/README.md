# SafeWallet Multisend Parser UI

A web application for parsing and visualizing SafeWallet multisend transactions.

## Features

- Parse SafeWallet multisend metadata JSON
- View transactions in a user-friendly list format
- View raw JSON data
- Decode common function calls (e.g., ERC20 approve)
- Extract JSON fields from screenshots using AI
- Responsive design for desktop and mobile

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- pnpm 9.x or higher
- OpenAI API key for the JSON extraction feature

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd multisend-ui
pnpm install
```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Add your OpenAI API key to `.env.local`

```bash
cp .env.local.example .env.local
# Edit .env.local and add your OpenAI API key
```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Testing

Run the tests:

```bash
pnpm test
```

### Building for Production

Build the application for production:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```

## Project Structure

- `/app` - Next.js app router pages
  - `/api` - API routes for server-side processing
- `/components` - React components
- `/utils` - Utility functions, including the multisend decoder
- `/__tests__` - Test files

## Technologies Used

- Next.js - React framework
- React - UI library
- TypeScript - Type-safe JavaScript
- TailwindCSS - Utility-first CSS framework
- OpenAI API - AI-powered JSON extraction
- Jest - Testing framework
- ethers.js - Ethereum library

## JSON Extraction Feature

The JSON extraction feature allows users to:

1. Click the "Extract JSON from Screenshot" button to upload a screenshot
2. Process the image to extract transaction data
3. Automatically parse and display the transactions in the UI

This feature is particularly useful when you have screenshots of transaction data but need to extract the structured information for further processing.

## License

MIT 