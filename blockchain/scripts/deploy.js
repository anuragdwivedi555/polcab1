import hre from "hardhat";

async function main() {
    const polcab = await hre.ethers.deployContract("PolCab");

    await polcab.waitForDeployment();

    console.log(
        `PolCab deployed to ${polcab.target}`
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
