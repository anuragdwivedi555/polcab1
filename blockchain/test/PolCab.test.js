import { expect } from "chai";
import hre from "hardhat";

describe("PolCab", function () {
    let polcab;
    let owner;
    let rider;
    let driver;

    beforeEach(async function () {
        [owner, rider, driver] = await hre.ethers.getSigners();
        const PolCab = await hre.ethers.getContractFactory("PolCab");
        polcab = await PolCab.deploy();
    });

    it("Should allow a rider to request a ride", async function () {
        const fare = hre.ethers.parseEther("1.0");
        await expect(polcab.connect(rider).requestRide("Pickup Point", "Dropoff Point", { value: fare }))
            .to.emit(polcab, "RideRequested")
            .withArgs(1, rider.address, fare);

        const ride = await polcab.rides(1);
        expect(ride.rider).to.equal(rider.address);
        expect(ride.fare).to.equal(fare);
        expect(ride.status).to.equal(0); // Requested
    });

    it("Should allow a driver to accept a ride", async function () {
        const fare = hre.ethers.parseEther("1.0");
        await polcab.connect(rider).requestRide("Pickup", "Dropoff", { value: fare });

        await expect(polcab.connect(driver).acceptRide(1))
            .to.emit(polcab, "RideAccepted")
            .withArgs(1, driver.address);

        const ride = await polcab.rides(1);
        expect(ride.driver).to.equal(driver.address);
        expect(ride.status).to.equal(1); // Accepted
    });

    it("Should allow a rider to complete a ride and pay the driver", async function () {
        const fare = hre.ethers.parseEther("1.0");
        await polcab.connect(rider).requestRide("Pickup", "Dropoff", { value: fare });
        await polcab.connect(driver).acceptRide(1);

        const initialDriverBalance = await hre.ethers.provider.getBalance(driver.address);

        await expect(polcab.connect(rider).completeRide(1))
            .to.emit(polcab, "RideCompleted")
            .withArgs(1, driver.address, fare);

        const ride = await polcab.rides(1);
        expect(ride.status).to.equal(2); // Completed

        const finalDriverBalance = await hre.ethers.provider.getBalance(driver.address);

        const fee = (fare * 2n) / 100n;
        const driverPayment = fare - fee;

        expect(finalDriverBalance - initialDriverBalance).to.equal(driverPayment);
    });

    it("Should allow a rider to cancel a ride before it is accepted", async function () {
        const fare = hre.ethers.parseEther("1.0");
        await polcab.connect(rider).requestRide("Pickup", "Dropoff", { value: fare });

        await expect(polcab.connect(rider).cancelRide(1))
            .to.emit(polcab, "RideCancelled")
            .withArgs(1, rider.address);

        const ride = await polcab.rides(1);
        expect(ride.status).to.equal(3); // Cancelled
    });
});
