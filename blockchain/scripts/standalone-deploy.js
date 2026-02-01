const fs = require("fs");
const path = require("path");
const solc = require("solc");
const { ethers } = require("ethers");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Read the contract source
const contractsDir = path.join(__dirname, "..", "contracts");
const polcabSource = fs.readFileSync(path.join(contractsDir, "PolCab.sol"), "utf8");

// Read OpenZeppelin ReentrancyGuard for inlining (simplified approach)
const reentrancyGuardPath = path.join(__dirname, "..", "node_modules", "@openzeppelin", "contracts", "utils", "ReentrancyGuard.sol");
const reentrancyGuardSource = fs.readFileSync(reentrancyGuardPath, "utf8");

// Prepare input for solc
const input = {
    language: "Solidity",
    sources: {
        "PolCab.sol": { content: polcabSource },
        "@openzeppelin/contracts/utils/ReentrancyGuard.sol": { content: reentrancyGuardSource },
    },
    settings: {
        outputSelection: {
            "*": {
                "*": ["abi", "evm.bytecode"],
            },
        },
        optimizer: {
            enabled: true,
            runs: 200,
        },
    },
};

// Compile
console.log("Compiling contract...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    output.errors.forEach((err) => {
        console.error(err.formattedMessage);
    });
    if (output.errors.some((e) => e.severity === "error")) {
        process.exit(1);
    }
}

const contract = output.contracts["PolCab.sol"]["PolCab"];
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

console.log("Contract compiled successfully!");

async function deploy() {
    const provider = new ethers.JsonRpcProvider(process.env.AMOY_URL || "https://rpc-amoy.polygon.technology");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log(`Deploying from address: ${wallet.address}`);

    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} MATIC`);

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    console.log("Deploying contract...");
    const deployedContract = await factory.deploy();

    console.log(`Transaction hash: ${deployedContract.deploymentTransaction().hash}`);
    console.log("Waiting for confirmation...");

    await deployedContract.waitForDeployment();

    const address = await deployedContract.getAddress();
    console.log(`\n✅ PolCab deployed to: ${address}`);
    console.log(`\nView on Polygonscan: https://amoy.polygonscan.com/address/${address}`);

    // Save ABI for frontend
    const frontendPath = path.join(__dirname, "..", "..", "frontend", "lib");
    if (!fs.existsSync(frontendPath)) {
        fs.mkdirSync(frontendPath, { recursive: true });
    }
    fs.writeFileSync(path.join(frontendPath, "polcabAbi.json"), JSON.stringify(abi, null, 2));
    fs.writeFileSync(path.join(frontendPath, "contractAddress.js"), `export const CONTRACT_ADDRESS = "${address}";\n`);
    console.log("\n📁 ABI and contract address saved to frontend/lib/");
}

deploy().catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
});
