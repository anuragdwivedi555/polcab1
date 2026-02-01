const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

const ABI = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "frontend", "lib", "polcabAbi.json"), "utf8"));

const CONTRACT_ADDRESS = "0x0763f9b2c8E22204063C87ed2B19cAad1e20C23c";
const RPC_URL = "https://rpc-amoy.polygon.technology";

async function testContract() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    try {
        console.log("Testing contract at:", CONTRACT_ADDRESS);

        // Test reading owner
        const owner = await contract.owner();
        console.log("✅ Contract owner:", owner);

        // Test reading rideCount
        const rideCount = await contract.rideCount();
        console.log("✅ Ride count:", rideCount.toString());

        // Test reading platformFeePercent
        const feePercent = await contract.platformFeePercent();
        console.log("✅ Platform fee:", feePercent.toString(), "%");

        console.log("\n✅ Contract is deployed and responding correctly!");

    } catch (error) {
        console.error("❌ Contract test failed:", error.message);
    }
}

testContract();
