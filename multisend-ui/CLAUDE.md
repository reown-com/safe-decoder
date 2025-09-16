# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

The project uses pnpm as the package manager:

```bash
# Development
pnpm dev          # Start Next.js development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test         # Run Jest tests

# Single test file
pnpm test -- --testNamePattern="test name"
pnpm test path/to/test.test.ts
```

## Architecture Overview

This is a Next.js web application for parsing and visualizing SafeWallet multisend transactions. The core architecture consists of:

### Core Decoder System (`utils/decoder.ts`)
- **Primary function**: `decodeTransactionData()` - Universal decoder that handles:
  - MultiSend function calls with signature `0x8d80ff0a` (wrapped in ABI encoding)
  - Direct multisend transaction bundles (packed binary format)
  - Single function calls (ERC20 transfers, approvals, etc.)
- **Data flow**: Raw hex data → Normalized → Decoded transactions array
- **Key interfaces**: `DecodedTransaction` with operation, to, value, dataLength, data fields

### Transaction Processing Flow
1. Input parsing (JSON or hex) via `MultisendForm`
2. Data normalization with `normalizeHexString()`
3. Transaction decoding via `decodeTransactionData()`
4. Visualization in `TransactionList` or `JsonDisplay`

### AI-Powered JSON Extraction (`app/api/extract-json/route.ts`)
- Uses OpenAI GPT-4 Vision API to extract transaction data from screenshots
- Processes images to extract Safe transaction fields (to, value, data, nonce, etc.)
- Normalizes hex strings in extracted data
- Falls back to mock data if OpenAI API unavailable

### Multi-Page Architecture
- **Main page** (`app/page.tsx`): Transaction decoder with AI extraction
- **Checksums page** (`app/checksums/page.tsx`): Safe transaction hash calculator
- **Transactions page** (`app/transactions/page.tsx`): Additional transaction utilities

### Testing Structure
- Unit tests in `__tests__/` mirror the component/utils structure
- Jest configured with jsdom environment for React component testing
- Decoder tests cover edge cases and malformed data handling

## Key Dependencies
- **ethers.js v5**: Ethereum address/BigNumber handling and ABI decoding
- **OpenAI API**: Image-to-JSON extraction functionality
- **Next.js 14**: App router for API routes and pages
- **React Hook Form**: Form state management
- **TailwindCSS**: Styling framework

## Environment Setup
Create `.env.local` with:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Function Signature Recognition
The decoder recognizes these function signatures:
- `0x8d80ff0a`: multiSend(bytes)
- `0x095ea7b3`: approve(address,uint256)
- `0xa9059cbb`: transfer(address,uint256)
- `0x1e83409a`: claim(address)
- `0xe318b52b`: swapOwner(address,address,address)
- `0x1ffacdef`: setAllowedFrom(address,bool)
- `0x097cd232`: injectReward(uint256,uint256)
- `0x7c918634`: setPeer(uint256,bytes32,uint8,uint256)
- `0x7ab56403`: setWormholePeer(uint256,bytes32)
- `0x96dddc63`: setIsWormholeEvmChain(uint256,bool)
- `0x657b3b2f`: setIsWormholeRelayingEnabled(uint256,bool)

## Data Format Handling
The decoder handles three primary data formats:
1. **ABI-encoded multiSend calls**: Function signature + ABI-encoded parameters
2. **Packed multisend bundles**: Direct binary concatenation of transactions
3. **JSON metadata**: Safe transaction metadata with nested data fields