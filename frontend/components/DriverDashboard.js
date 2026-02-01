"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useWeb3 } from "@/context/Web3Context";
import AnimatedCard from "@/components/ui/AnimatedCard";
import AnimatedButton from "@/components/ui/AnimatedButton";
import { Badge } from "@/components/ui/badge";
import { Car, CheckCircle, RefreshCw, Loader2, MapPin, Navigation, User, ExternalLink, X } from "lucide-react";
import { ethers } from "ethers";
// import LeafletMap from "@/components/map/LeafletMap";
const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), { ssr: false });
import ChatBox from "@/components/ChatBox";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import ABI from "@/lib/polcabAbi.json";

export default function DriverDashboard({ contractAddress }) {
    const { signer, provider, account, isCorrectNetwork } = useWeb3();
    const [availableRides, setAvailableRides] = useState([]);
    const [myRide, setMyRide] = useState(null);
    const [completedRide, setCompletedRide] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [ignoredRides, setIgnoredRides] = useState([]);

    // Driver Registration States
    const [isRegistered, setIsRegistered] = useState(false);
    const [selectedVehicleType, setSelectedVehicleType] = useState(null);
    const [hasSavedProfile, setHasSavedProfile] = useState(false);
    const [driverProfile, setDriverProfile] = useState({
        name: '',
        age: '',
        gender: '',
        vehicleType: '',
        vehicleName: '',
        licenseFile: null,
        licensePreview: null
    });

    const listRef = useRef(null);

    // Check for existing driver profile on mount
    useEffect(() => {
        const checkRegistration = async () => {
            if (account && provider && contractAddress) {
                try {
                    const contract = new ethers.Contract(contractAddress, ABI, provider);
                    const driver = await contract.drivers(account);
                    if (driver.isRegistered) {
                        setDriverProfile({
                            name: driver.name,
                            age: driver.age.toString(),
                            gender: driver.gender,
                            vehicleType: driver.vehicleType,
                            vehicleName: driver.vehicleName,
                            licenseFile: "Uploaded on-chain",
                            licensePreview: null
                        });
                        setSelectedVehicleType(driver.vehicleType);
                        setHasSavedProfile(true);
                        setIsRegistered(true);
                    } else {
                        // Fallback to localStorage for draft data only
                        const savedProfile = localStorage.getItem(`driver_profile_${account}`);
                        if (savedProfile) {
                            const profile = JSON.parse(savedProfile);
                            setDriverProfile(profile);
                            setSelectedVehicleType(profile.vehicleType);
                            setHasSavedProfile(true);
                        }
                    }
                } catch (e) {
                    console.error("Failed to check registration:", e);
                }
            }
        };
        checkRegistration();
    }, [account, provider, contractAddress]);

    // List entrance animation
    useGSAP(() => {
        if (availableRides.length > 0 && listRef.current) {
            gsap.fromTo(listRef.current.children,
                { opacity: 0, x: -20 },
                { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }
            );
        }
    }, { dependencies: [availableRides.length], scope: listRef });

    const fetchRides = useCallback(async () => {
        if (!provider || !contractAddress || !account) return;
        setRefreshing(true);
        try {
            const contract = new ethers.Contract(contractAddress, ABI, provider);
            const count = await contract.rideCount();
            const rides = [];
            let foundMyRide = null;

            for (let i = 1; i <= Number(count); i++) {
                const ride = await contract.rides(i);
                const status = Number(ride[4]);
                const driverAddr = ride[2];
                const riderAddr = ride[1];

                const pickupCoords = { lat: Number(ride[7]) / 1e6, lng: Number(ride[8]) / 1e6 };
                const dropoffCoords = { lat: Number(ride[9]) / 1e6, lng: Number(ride[10]) / 1e6 };

                if (driverAddr.toLowerCase() === account.toLowerCase() && status === 1) {
                    foundMyRide = {
                        id: i,
                        rider: riderAddr,
                        fare: ethers.formatEther(ride[3]),
                        pickup: ride[5],
                        dropoff: ride[6],
                        pickupCoords,
                        dropoffCoords,
                    };
                }

                if (status === 0 && riderAddr.toLowerCase() !== account.toLowerCase()) {
                    rides.push({
                        id: i,
                        rider: riderAddr,
                        fare: ethers.formatEther(ride[3]),
                        pickup: ride[5],
                        dropoff: ride[6],
                        pickupCoords,
                        dropoffCoords,
                    });
                }
            }

            setMyRide(foundMyRide);
            setAvailableRides(rides);
        } catch (error) {
            console.error("Failed to fetch rides", error);
        } finally {
            setRefreshing(false);
        }
    }, [provider, contractAddress, account]);

    // Sync Agreed Fare from Negotiation
    useEffect(() => {
        if (!myRide) return;

        const syncFare = () => {
            const negotiation = localStorage.getItem(`negotiation_ride_${myRide.id}`);
            if (negotiation) {
                const { fare: negFare, agreed } = JSON.parse(negotiation);
                if (agreed && negFare !== myRide.fare) {
                    setMyRide(prev => ({ ...prev, fare: negFare }));
                }
            }
        };

        const interval = setInterval(syncFare, 2000);
        return () => clearInterval(interval);
    }, [myRide?.id, myRide?.fare]);

    useEffect(() => {
        fetchRides();
        const interval = setInterval(fetchRides, 30000);
        return () => clearInterval(interval);
    }, [fetchRides]);

    useEffect(() => {
        if (!provider || !contractAddress) return;
        const contract = new ethers.Contract(contractAddress, ABI, provider);
        const onRideRequested = () => fetchRides();
        const onRideAccepted = () => fetchRides();
        const onRideCancelled = () => fetchRides();
        const onRideCompleted = (rideId) => {
            if (myRide && Number(rideId) === myRide.id) {
                setCompletedRide(myRide);
                setMyRide(null);
            }
            fetchRides();
        };

        contract.on("RideRequested", onRideRequested);
        contract.on("RideAccepted", onRideAccepted);
        contract.on("RideCancelled", onRideCancelled);
        contract.on("RideCompleted", onRideCompleted);

        return () => {
            contract.off("RideRequested", onRideRequested);
            contract.off("RideAccepted", onRideAccepted);
            contract.off("RideCancelled", onRideCancelled);
            contract.off("RideCompleted", onRideCompleted);
        };
    }, [provider, contractAddress, fetchRides, myRide?.id]);

    // Registration Handlers
    const handleVehicleSelect = (vehicleType) => {
        setSelectedVehicleType(vehicleType);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setDriverProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setDriverProfile(prev => ({
                    ...prev,
                    licenseFile: file.name,
                    licensePreview: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRegisterSubmit = async () => {
        const missingFields = [];

        if (!driverProfile.name) missingFields.push('Driver Name');
        if (!driverProfile.age) missingFields.push('Age');
        if (!driverProfile.gender) missingFields.push('Gender');
        if (!selectedVehicleType) missingFields.push('Vehicle Type');
        if (!driverProfile.vehicleName) missingFields.push('Vehicle Name/Model');
        if (!driverProfile.licenseFile) missingFields.push('Driver\'s License Upload');

        if (missingFields.length > 0) {
            alert(`Oops! All fields are mandatory. Please fill in:\n- ${missingFields.join('\n- ')}`);
            return;
        }

        if (driverProfile.age < 18) {
            alert('You must be at least 18 years old to register as a driver.');
            return;
        }

        if (!signer || !isCorrectNetwork) return;
        setLoading(true);

        try {
            const contract = new ethers.Contract(contractAddress, ABI, signer);

            console.log("Registering driver on-chain...");
            const tx = await contract.registerDriver(
                driverProfile.name,
                parseInt(driverProfile.age),
                driverProfile.gender,
                driverProfile.vehicleName,
                selectedVehicleType,
                {
                    maxPriorityFeePerGas: ethers.parseUnits("25", "gwei"),
                    maxFeePerGas: ethers.parseUnits("50", "gwei")
                }
            );

            setTxHash(tx.hash);
            await tx.wait();
            console.log("Registration successful!");

            setHasSavedProfile(true);
            setIsRegistered(true);

            // Personalized greeting
            const salutation = driverProfile.gender === 'Male' ? 'Mr.' : driverProfile.gender === 'Female' ? 'Ms.' : '';
            const greeting = `Welcome aboard, ${salutation} ${driverProfile.name}! 🚀\n\nYour profile is now saved on the Polygon blockchain. You can now accept rides!`;
            alert(greeting);
        } catch (error) {
            console.error("On-chain registration failed:", error);
            alert(`Registration failed: ${error.message || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProfile = () => {
        if (confirm('Are you sure you want to delete your driver profile? This action cannot be undone.')) {
            localStorage.removeItem(`driver_profile_${account}`);
            setDriverProfile({
                name: '',
                age: '',
                gender: '',
                vehicleType: '',
                vehicleName: '',
                licenseFile: null,
                licensePreview: null
            });
            setSelectedVehicleType(null);
            setHasSavedProfile(false);
            setIsRegistered(false);
            alert('Profile deleted successfully.');
        }
    };

    const handleIgnoreRide = (rideId) => {
        setIgnoredRides(prev => [...prev, rideId]);
    };

    const handleAcceptRide = async (rideId) => {
        if (!signer || !isCorrectNetwork) return;
        setLoading(true);
        try {
            const contract = new ethers.Contract(contractAddress, ABI, signer);
            const tx = await contract.acceptRide(rideId, {
                maxPriorityFeePerGas: ethers.parseUnits("25", "gwei"),
                maxFeePerGas: ethers.parseUnits("50", "gwei")
            });
            setTxHash(tx.hash);
            await tx.wait();
            await fetchRides();
        } catch (error) {
            console.error("Failed to accept ride", error);
        } finally {
            setLoading(false);
        }
    };

    if (myRide) {
        return (
            <div className="max-w-4xl mx-auto p-4">
                <AnimatedCard className="border-emerald-500/20 bg-background/50">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3 text-gradient">
                                <Car className="text-emerald-500" />
                                Current Ride #{myRide.id}
                            </h2>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-sm px-3 py-1">
                                In Progress
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mb-6">
                            Drive to the destination. Rider will confirm on arrival.
                        </p>

                        {myRide.pickupCoords && myRide.dropoffCoords && (
                            <div className="mb-6 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                                <LeafletMap
                                    height="320px"
                                    markers={[
                                        { lat: myRide.pickupCoords.lat, lng: myRide.pickupCoords.lng, label: `Pickup`, color: '#10B981' },
                                        { lat: myRide.dropoffCoords.lat, lng: myRide.dropoffCoords.lng, label: `Dropoff`, color: '#EF4444' },
                                    ]}
                                    route={{ start: myRide.pickupCoords, end: myRide.dropoffCoords }}
                                    interactive={false}
                                    showUserLocation={true}
                                />
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Pickup</span>
                                </div>
                                <p className="font-medium text-lg">{myRide.pickup}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Dropoff</span>
                                </div>
                                <p className="font-medium text-lg">{myRide.dropoff}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-xl border border-emerald-500/20 mb-6">
                            <div className="flex flex-col">
                                <span className="text-muted-foreground font-medium">Your Earning (98%)</span>
                                {txHash && (
                                    <a href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-1 transition-colors">
                                        <ExternalLink size={10} /> View on Polygonscan
                                    </a>
                                )}
                            </div>
                            <span className="text-3xl font-bold text-emerald-400 text-shadow-glow">{(parseFloat(myRide.fare) * 0.98).toFixed(4)} MATIC</span>
                        </div>

                        <div className="mb-6">
                            <ChatBox
                                rideId={myRide.id}
                                currentUser="Driver"
                                otherUser="Rider"
                                account={account}
                                initialFare={myRide.fare}
                            />
                        </div>

                        <div className="text-center text-sm text-muted-foreground p-4 bg-white/5 rounded-xl border border-white/10">
                            Payment will be released when <span className="text-primary font-mono">{myRide.rider.slice(0, 6)}...{myRide.rider.slice(-4)}</span> confirms completion.
                        </div>
                    </div>
                </AnimatedCard >
            </div >
        );
    }

    if (completedRide) {
        return (
            <div className="max-w-4xl mx-auto p-4">
                <AnimatedCard className="border-emerald-500 bg-background/80 backdrop-blur-xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 animate-loading-bar" />
                    <div className="p-10 text-center">
                        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                            <CheckCircle className="text-emerald-500 w-12 h-12" />
                        </div>
                        <h2 className="text-4xl font-bold text-white mb-2 italic uppercase tracking-tighter">Ride Finished! 🏁</h2>
                        <p className="text-muted-foreground text-lg mb-8">You've successfully completed the journey.</p>

                        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-8 max-w-sm mx-auto">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-2">Total Earnings</p>
                            <p className="text-4xl font-mono font-bold text-emerald-400">
                                {(parseFloat(completedRide.fare) * 0.98).toFixed(4)} <span className="text-sm font-normal">MATIC</span>
                            </p>
                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs">
                                <span className="text-muted-foreground">Protocol Fee (2%)</span>
                                <span className="text-white">{(parseFloat(completedRide.fare) * 0.02).toFixed(4)} MATIC</span>
                            </div>
                        </div>

                        <AnimatedButton
                            onClick={() => setCompletedRide(null)}
                            variant="primary"
                            className="w-full max-w-xs h-14 bg-emerald-500 hover:bg-emerald-600 shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
                        >
                            Back to Dashboard
                        </AnimatedButton>
                    </div>
                </AnimatedCard>
            </div>
        );
    }

    // Registration UI
    if (!isRegistered) {
        const vehicleTypes = [
            {
                type: 'Auto',
                label: 'AUTO RICKSHAW',
                category: 'BUDGET',
                icon: '🛺',
                description: 'Compact 3-wheeler for city rides'
            },
            {
                type: 'Sedan',
                label: 'SEDAN',
                category: 'STANDARD',
                icon: '🚗',
                description: 'Comfortable 4-seater car'
            },
            {
                type: 'SUV',
                label: 'SUV',
                category: 'PREMIUM',
                icon: '🚙',
                description: 'Spacious vehicle for groups'
            },
            {
                type: 'Luxury',
                label: 'LUXURY',
                category: 'ELITE',
                icon: '🏎️',
                description: 'Premium comfort experience'
            }
        ];

        return (
            <div className="max-w-5xl mx-auto p-4">
                <AnimatedCard>
                    <div className="p-8">
                        <div className="text-center mb-12">
                            <h1 className="text-4xl font-bold mb-3">
                                <span className="text-gradient from-emerald-400 to-cyan-400">Join as a Driver</span>
                            </h1>
                            <p className="text-muted-foreground text-lg mb-6">Complete your profile to start earning</p>

                            {hasSavedProfile && (
                                <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium">
                                        ✓ Saved profile data found for this wallet
                                    </div>
                                    <button
                                        onClick={handleDeleteProfile}
                                        className="text-xs text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest font-bold border-b border-red-400/30 hover:border-red-400"
                                    >
                                        Delete Previous Data
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Step 1: Vehicle Selection */}
                        {!selectedVehicleType ? (
                            <>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-[3px] w-12 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                    <h3 className="text-2xl font-bold uppercase italic tracking-wider text-white">
                                        Select Your Vehicle Type
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    {vehicleTypes.map((vehicle) => (
                                        <button
                                            key={vehicle.type}
                                            onClick={() => handleVehicleSelect(vehicle.type)}
                                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 hover:border-emerald-500/50 transition-all duration-300 hover:scale-105 p-6 text-left"
                                        >
                                            <div className="text-5xl mb-4">{vehicle.icon}</div>
                                            <div className="mb-2">
                                                <div className="text-xs text-emerald-400 font-bold tracking-widest uppercase mb-1">{vehicle.category}</div>
                                                <div className="text-xl font-bold text-white uppercase tracking-wide">{vehicle.label}</div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">{vehicle.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Step 2: Profile Form */}
                                <div className="mb-6">
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-sm px-4 py-2">
                                        Selected: {selectedVehicleType.toUpperCase()}
                                    </Badge>
                                    <button
                                        onClick={() => setSelectedVehicleType(null)}
                                        className="ml-3 text-sm text-muted-foreground hover:text-white transition-colors underline"
                                    >
                                        Change Vehicle
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-[3px] w-12 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                    <h3 className="text-2xl font-bold uppercase italic tracking-wider text-white">
                                        Complete Your Profile
                                    </h3>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-muted-foreground">Driver Name *</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={driverProfile.name}
                                                onChange={handleInputChange}
                                                placeholder="Enter your full name"
                                                required
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-muted-foreground">Age *</label>
                                            <input
                                                type="number"
                                                name="age"
                                                value={driverProfile.age}
                                                onChange={handleInputChange}
                                                placeholder="Your age"
                                                min="18"
                                                max="100"
                                                required
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-muted-foreground">Gender *</label>
                                            <select
                                                name="gender"
                                                value={driverProfile.gender}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-white"
                                            >
                                                <option value="" disabled className="bg-slate-900">Select Gender</option>
                                                <option value="Male" className="bg-slate-900">Male</option>
                                                <option value="Female" className="bg-slate-900">Female</option>
                                                <option value="Other" className="bg-slate-900">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-muted-foreground">Vehicle Name/Model *</label>
                                        <input
                                            type="text"
                                            name="vehicleName"
                                            value={driverProfile.vehicleName}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Toyota Camry, Honda City"
                                            required
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-muted-foreground">Driver's License *</label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                id="license-upload"
                                            />
                                            <label
                                                htmlFor="license-upload"
                                                className="flex items-center justify-center w-full px-4 py-6 rounded-xl bg-white/5 border-2 border-dashed border-white/20 hover:border-emerald-500/50 cursor-pointer transition-all group"
                                            >
                                                {driverProfile.licensePreview ? (
                                                    <div className="text-center">
                                                        <img src={driverProfile.licensePreview} alt="License" className="max-h-32 mx-auto mb-2 rounded" />
                                                        <p className="text-sm text-emerald-400">License uploaded ✓</p>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <p className="text-sm text-muted-foreground group-hover:text-white transition-colors">
                                                            Click to upload driver's license
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    <AnimatedButton
                                        onClick={handleRegisterSubmit}
                                        className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20"
                                    >
                                        Complete Registration
                                    </AnimatedButton>

                                    {txHash && (
                                        <div className="text-center pt-4">
                                            <a href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                                                className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center justify-center gap-2 transition-colors">
                                                <ExternalLink size={14} /> View Registration on Polygonscan
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </AnimatedCard>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <AnimatedCard>
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                                <Navigation className="text-emerald-500 w-8 h-8" />
                                <span className="text-gradient from-emerald-400 to-cyan-400">Available Rides</span>
                            </h1>
                            <p className="text-muted-foreground text-lg">
                                Real-time ride requests on Polygon Amoy.
                            </p>
                        </div>
                        <AnimatedButton
                            variant="secondary"
                            onClick={fetchRides}
                            disabled={refreshing}
                            className="w-12 h-12 p-0 rounded-full bg-white/5 border-white/10"
                            icon={refreshing ? Loader2 : RefreshCw}
                        >
                        </AnimatedButton>
                    </div>

                    <div ref={listRef} className="space-y-4">
                        {availableRides.filter(r => !ignoredRides.includes(r.id)).length === 0 ? (
                            <div className="text-center py-20 space-y-6">
                                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                                    <Car size={40} className="text-muted-foreground/50" />
                                </div>
                                <div>
                                    <p className="text-xl font-medium text-muted-foreground">No active ride requests</p>
                                    <p className="text-sm text-muted-foreground/60 mt-2">New requests will appear here automatically</p>
                                </div>
                            </div>
                        ) : (
                            availableRides.filter(r => !ignoredRides.includes(r.id)).map((ride) => (
                                <div key={ride.id} className="group relative overflow-hidden p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors">
                                    <button
                                        onClick={() => handleIgnoreRide(ride.id)}
                                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 z-10"
                                        title="Ignore Ride"
                                    >
                                        <X size={16} />
                                    </button>
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="flex gap-5 items-center flex-shrink-0">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-2xl font-bold text-white shadow-inner shrink-0">
                                                #{ride.id}
                                            </div>
                                            <div className="shrink-0">
                                                <p className="text-3xl font-bold text-primary mb-1">{ride.fare} MATIC</p>
                                                <p className="text-sm text-muted-foreground font-mono bg-white/5 px-2 py-0.5 rounded w-fit">
                                                    Rider: {ride.rider.slice(0, 6)}...{ride.rider.slice(-4)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 w-full md:w-auto space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3 text-sm min-w-0">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                                                <span className="text-muted-foreground w-12 text-xs uppercase tracking-wider shrink-0">From</span>
                                                <span className="font-medium text-gray-200 truncate flex-1">{ride.pickup}</span>
                                            </div>
                                            <div className="w-full h-px bg-white/5 ml-5" />
                                            <div className="flex items-center gap-3 text-sm min-w-0">
                                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] shrink-0" />
                                                <span className="text-muted-foreground w-12 text-xs uppercase tracking-wider shrink-0">To</span>
                                                <span className="font-medium text-gray-200 truncate flex-1">{ride.dropoff}</span>
                                            </div>
                                        </div>

                                        <AnimatedButton
                                            onClick={() => handleAcceptRide(ride.id)}
                                            disabled={loading || !isCorrectNetwork}
                                            variant="primary"
                                            className="w-full md:w-auto whitespace-nowrap px-8 shrink-0"
                                            icon={CheckCircle}
                                        >
                                            Accept Ride
                                        </AnimatedButton>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </AnimatedCard>
        </div>
    );
}
