# SafeWallet Multisend Parser UI

A web application for parsing and visualizing SafeWallet multisend transactions.

## Features

- Parse SafeWallet multisend metadata JSON
- View transactions in a user-friendly list format
- View raw JSON data
- Decode common function calls (e.g., ERC20 approve)
- Responsive design for desktop and mobile

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- pnpm 9.x or higher

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd multisend-ui
pnpm install
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
- `/components` - React components
- `/utils` - Utility functions, including the multisend decoder
- `/__tests__` - Test files

## Technologies Used

- Next.js - React framework
- React - UI library
- TypeScript - Type-safe JavaScript
- TailwindCSS - Utility-first CSS framework
- Jest - Testing framework
- ethers.js - Ethereum library

## License

MIT 