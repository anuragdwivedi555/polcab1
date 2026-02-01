const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

const ABI = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "frontend", "lib", "polcabAbi.json"), "utf8"));

const CONTRACT_ADDRESS = "0x0763f9b2c8E22204063C87ed2B19cAad1e20C23c";
const RPC_URL = "https://polygon-amoy.infura.io/v3/6f33db5465d64246947b673315178dda";

async function checkRides() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    try {
        console.log("=== Checking Rides in Contract ===\n");

        const rideCount = await contract.rideCount();
        console.log(`Total Rides: ${rideCount}\n`);

        if (Number(rideCount) === 0) {
            console.log("❌ No rides found in the contract.");
            console.log("This means no ride has been successfully requested yet.");
            return;
        }

        for (let i = 1; i <= Number(rideCount); i++) {
            const ride = await contract.rides(i);
            const status = Number(ride[4]);
            const statusNames = ['Requested', 'Accepted', 'Completed', 'Cancelled'];

            console.log(`\n--- Ride #${i} ---`);
            console.log(`Rider: ${ride[1]}`);
            console.log(`Driver: ${ride[2]}`);
            console.log(`Fare: ${ethers.formatEther(ride[3])} MATIC`);
            console.log(`Status: ${statusNames[status]} (${status})`);
            console.log(`Pickup: ${ride[5]}`);
            console.log(`Dropoff: ${ride[6]}`);
            console.log(`Pickup Coords: ${Number(ride[7]) / 1e6}, ${Number(ride[8]) / 1e6}`);
            console.log(`Dropoff Coords: ${Number(ride[9]) / 1e6}, ${Number(ride[10]) / 1e6}`);
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

checkRides();
