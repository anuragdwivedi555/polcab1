# PolCab - Decentralized Ride-Sharing on Polygon Amoy

PolCab is a minimal, functional decentralized ride-sharing dApp where riders can request rides and drivers can accept them, with payments handled trustlessly via smart contracts on the Polygon Amoy testnet.

## Project Structure
- `blockchain/`: Hardhat project containing the `PolCab.sol` smart contract and deployment scripts.
- `frontend/`: Next.js 14+ application with Tailwind CSS and `ethers.js` integration.

## Tech Stack
- **Smart Contract**: Solidity ^0.8.20, OpenZeppelin, Hardhat.
- **Frontend**: Next.js, Tailwind CSS, Lucide React, Ethers.js v6.
- **Network**: Polygon Amoy Testnet (Chain ID: 80002).

## Getting Started

### Prerequisites
- Node.js (v18 or v20 recommended for Hardhat stability)
- MetaMask extension installed in your browser
- Testnet MATIC on Polygon Amoy

### 1. Smart Contract Deployment
1. Navigate to the blockchain directory:
   ```bash
   cd blockchain
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file and add your private key:
   ```env
   PRIVATE_KEY=your_private_key_here
   ```
4. Deploy the contract:
   ```bash
   npx hardhat run scripts/deploy.js --network amoy
   ```
5. Note the deployed contract address.

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Open `app/page.tsx` and update `CONTRACT_ADDRESS` with your deployed address.
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture & Data Flow
PolCab follows a decentralized architecture:
1. **Rider** submits a ride request to the smart contract, locking the fare in escrow.
2. **Driver** monitors the blockchain for `RideRequested` events and accepts a ride via `acceptRide`.
3. **Rider** completes the ride on-chain (in this simple version, rider confirmation releases the payment).
4. **Smart Contract** automatically deducts a 2% platform fee and transfers the remaining fare to the driver.

### Why Off-Chain GPS?
In a production app, GPS and maps (Google Maps/Mapbox) are handled off-chain because:
- **Cost**: Storing real-time coordinates on-chain is prohibitively expensive.
- **Privacy**: Coordinates are sensitive data; only necessary proofs should be on-chain.
- **Performance**: High-frequency updates are not suitable for current blockchain latency.
The `rideId` acts as the link between off-chain trip data and on-chain payment logic.

## Best Practices & Improvements
- **Production Security**: Add a timeout for cancellations or a multi-sig/mediation layer for disputes.
- **Stablecoins**: Use USDC or USDT for stable fares.
- **Privacy**: Use Zero-Knowledge Proofs for location validation without revealing exact coordinates.
