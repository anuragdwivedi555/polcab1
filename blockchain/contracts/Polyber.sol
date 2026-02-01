// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Polyber is ReentrancyGuard {
    enum RideStatus { Requested, Accepted, Completed, Cancelled }

    struct Ride {
        uint256 rideId;
        address rider;
        address driver;
        uint256 fare;
        RideStatus status;
        string pickupLocation;
        string dropoffLocation;
        int256 pickupLat;      // Latitude scaled by 1e6 (e.g., 28.6139 = 28613900)
        int256 pickupLng;      // Longitude scaled by 1e6
        int256 dropoffLat;     // Latitude scaled by 1e6
        int256 dropoffLng;     // Longitude scaled by 1e6
    }

    struct Driver {
        address driverAddress;
        string name;
        uint256 age;
        string gender;
        string vehicleName;
        string vehicleType;
        bool isRegistered;
    }

    uint256 public rideCount;
    mapping(uint256 => Ride) public rides;
    mapping(address => Driver) public drivers;
    uint256 public platformFeePercent = 2; // 2% platform fee
    address public owner;

    event RideRequested(uint256 indexed rideId, address indexed rider, uint256 fare, string pickup, string dropoff);
    event RideAccepted(uint256 indexed rideId, address indexed driver);
    event RideCompleted(uint256 indexed rideId, address indexed driver, uint256 fare);
    event RideCancelled(uint256 indexed rideId, address indexed rider);
    event DriverRegistered(
        address indexed driver, 
        string name, 
        uint256 age, 
        string gender, 
        string vehicleName, 
        string vehicleType
    );
    event PaymentReleased(
        uint256 indexed rideId, 
        address indexed driver, 
        uint256 amountToDriver, 
        uint256 platformFee
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerDriver(
        string memory _name,
        uint256 _age,
        string memory _gender,
        string memory _vehicleName,
        string memory _vehicleType
    ) external {
        drivers[msg.sender] = Driver({
            driverAddress: msg.sender,
            name: _name,
            age: _age,
            gender: _gender,
            vehicleName: _vehicleName,
            vehicleType: _vehicleType,
            isRegistered: true
        });

        emit DriverRegistered(msg.sender, _name, _age, _gender, _vehicleName, _vehicleType);
    }

    function requestRide(
        string memory _pickup, 
        string memory _dropoff,
        int256 _pickupLat,
        int256 _pickupLng,
        int256 _dropoffLat,
        int256 _dropoffLng
    ) external payable nonReentrant {
        require(msg.value > 0, "Fare must be greater than 0");
        
        rideCount++;
        rides[rideCount] = Ride({
            rideId: rideCount,
            rider: msg.sender,
            driver: address(0),
            fare: msg.value,
            status: RideStatus.Requested,
            pickupLocation: _pickup,
            dropoffLocation: _dropoff,
            pickupLat: _pickupLat,
            pickupLng: _pickupLng,
            dropoffLat: _dropoffLat,
            dropoffLng: _dropoffLng
        });

        emit RideRequested(rideCount, msg.sender, msg.value, _pickup, _dropoff);
    }

    function acceptRide(uint256 _rideId) external nonReentrant {
        Ride storage ride = rides[_rideId];
        require(ride.status == RideStatus.Requested, "Ride is not available");
        require(ride.rider != msg.sender, "Rider cannot be the driver");
        require(drivers[msg.sender].isRegistered, "Driver not registered on-chain");

        ride.driver = msg.sender;
        ride.status = RideStatus.Accepted;

        emit RideAccepted(_rideId, msg.sender);
    }

    function completeRide(uint256 _rideId) external nonReentrant {
        Ride storage ride = rides[_rideId];
        require(ride.status == RideStatus.Accepted, "Ride is not in progress");
        require(msg.sender == ride.rider, "Only rider can confirm completion");

        ride.status = RideStatus.Completed;
        
        uint256 fee = (ride.fare * platformFeePercent) / 100;
        uint256 driverPayment = ride.fare - fee;

        (bool success, ) = payable(ride.driver).call{value: driverPayment}("");
        require(success, "Payment to driver failed");

        (bool feeSuccess, ) = payable(owner).call{value: fee}("");
        require(feeSuccess, "Payment of fee failed");

        emit RideCompleted(_rideId, ride.driver, ride.fare);
        emit PaymentReleased(_rideId, ride.driver, driverPayment, fee);
    }

    function cancelRide(uint256 _rideId) external nonReentrant {
        Ride storage ride = rides[_rideId];
        require(msg.sender == ride.rider, "Only rider can cancel");
        require(ride.status == RideStatus.Requested, "Cannot cancel ride after it is accepted");

        ride.status = RideStatus.Cancelled;
        
        (bool success, ) = payable(ride.rider).call{value: ride.fare}("");
        require(success, "Refund failed");

        emit RideCancelled(_rideId, msg.sender);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdraw failed");
    }
}
