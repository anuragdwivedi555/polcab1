"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useWeb3 } from "@/context/Web3Context";
import AnimatedCard from "@/components/ui/AnimatedCard";
import AnimatedButton from "@/components/ui/AnimatedButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Send, Loader2, Map, Car, Clock, CheckCircle, ExternalLink, User, X, Shield } from "lucide-react";
import { ethers } from "ethers";
import LocationPicker from "@/components/LocationPicker";
import ChatBox from "@/components/ChatBox";
// import LeafletMap from "@/components/map/LeafletMap";
const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), { ssr: false });
import { calculateRoute, calculateFare } from "@/lib/routing";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import ABI from "@/lib/polcabAbi.json";

export default function RiderDashboard({ contractAddress }) {
    const { signer, account, provider, isCorrectNetwork } = useWeb3();
    const [pickup, setPickup] = useState("");
    const [dropoff, setDropoff] = useState("");
    const [pickupCoords, setPickupCoords] = useState(null);
    const [dropoffCoords, setDropoffCoords] = useState(null);
    const [fare, setFare] = useState("");
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [activeRide, setActiveRide] = useState(null);
    const [completedRide, setCompletedRide] = useState(null);
    const [acceptedNotification, setAcceptedNotification] = useState(null);
    const [showPickupMap, setShowPickupMap] = useState(false);
    const [showDropoffMap, setShowDropoffMap] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);
    const [vehicleType, setVehicleType] = useState("auto");

    const containerRef = useRef(null);

    // Entrance Animation
    useGSAP(() => {
        gsap.fromTo(containerRef.current,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
        );
    }, { scope: containerRef });

    const fetchActiveRide = useCallback(async () => {
        if (!provider || !account || !contractAddress) return;
        try {
            const contract = new ethers.Contract(contractAddress, ABI, provider);
            const count = await contract.rideCount();
            for (let i = Number(count); i >= 1; i--) {
                const ride = await contract.rides(i);
                if (ride[1].toLowerCase() === account.toLowerCase() && (Number(ride[4]) === 0 || Number(ride[4]) === 1)) {
                    const driverAddr = ride[2];
                    let driverInfo = null;

                    if (Number(ride[4]) === 1 && driverAddr !== ethers.ZeroAddress) {
                        try {
                            const driver = await contract.drivers(driverAddr);
                            if (driver.isRegistered) {
                                driverInfo = {
                                    name: driver.name,
                                    age: driver.age.toString(),
                                    gender: driver.gender,
                                    vehicleName: driver.vehicleName,
                                    vehicleType: driver.vehicleType
                                };
                            }
                        } catch (e) {
                            console.error("Failed to load on-chain driver profile:", e);
                        }
                    }

                    setActiveRide({
                        id: i,
                        fare: ethers.formatEther(ride[3]),
                        status: Number(ride[4]),
                        pickup: ride[5],
                        dropoff: ride[6],
                        driver: driverAddr,
                        driverInfo: driverInfo,
                        pickupCoords: {
                            lat: Number(ride[7]) / 1e6,
                            lng: Number(ride[8]) / 1e6,
                        },
                        dropoffCoords: {
                            lat: Number(ride[9]) / 1e6,
                            lng: Number(ride[10]) / 1e6,
                        },
                    });
                    return;
                }
            }
            setActiveRide(null);
        } catch (e) {
            console.error("Failed to fetch ride:", e);
        }
    }, [provider, account, contractAddress]);

    useEffect(() => {
        if (!provider || !contractAddress || !account) return;
        const contract = new ethers.Contract(contractAddress, ABI, provider);

        const onRideAccepted = async (rideId, driverAddr) => {
            console.log(`Ride ${rideId} accepted by ${driverAddr}`);

            // Check if this is the rider's active ride
            if (activeRide && Number(rideId) === activeRide.id) {
                try {
                    const driver = await contract.drivers(driverAddr);
                    setAcceptedNotification({
                        name: driver.name,
                        vehicleName: driver.vehicleName,
                    });
                    // Auto-hide notification after 10 seconds
                    setTimeout(() => setAcceptedNotification(null), 10000);
                } catch (e) {
                    console.error("Failed to fetch driver details for notification:", e);
                }
            }
            fetchActiveRide();
        };

        const onRideCompleted = (rideId) => {
            console.log(`Ride ${rideId} completed`);
            if (activeRide && Number(rideId) === activeRide.id) {
                setCompletedRide(activeRide);
            }
            fetchActiveRide();
        };

        contract.on("RideAccepted", onRideAccepted);
        contract.on("RideCompleted", onRideCompleted);

        return () => {
            contract.off("RideAccepted", onRideAccepted);
            contract.off("RideCompleted", onRideCompleted);
        };
    }, [provider, contractAddress, account, fetchActiveRide, activeRide?.id]);

    // Sync Agreed Fare from Negotiation
    useEffect(() => {
        if (!activeRide || activeRide.status !== 1) return;

        const syncFare = () => {
            const negotiation = localStorage.getItem(`negotiation_ride_${activeRide.id}`);
            if (negotiation) {
                const { fare: negFare, agreed } = JSON.parse(negotiation);
                if (agreed && negFare !== activeRide.fare) {
                    setActiveRide(prev => ({ ...prev, fare: negFare }));
                }
            }
        };

        const interval = setInterval(syncFare, 2000);
        return () => clearInterval(interval);
    }, [activeRide?.id, activeRide?.status, activeRide?.fare]);

    const [nativePrice, setNativePrice] = useState(null);
    const [priceLoading, setPriceLoading] = useState(false);

    // ... (existing entrance animation)

    // ... (fetchActiveRide logic - unchanged)

    const handlePickupSelect = (location) => {
        setPickup(location.address);
        setPickupCoords({ lat: location.lat, lng: location.lng });
        setShowPickupMap(false);
        if (dropoffCoords) updateRoute({ lat: location.lat, lng: location.lng }, dropoffCoords, location.address, dropoff);
    };

    const handleDropoffSelect = (location) => {
        setDropoff(location.address);
        setDropoffCoords({ lat: location.lat, lng: location.lng });
        setShowDropoffMap(false);
        if (pickupCoords) updateRoute(pickupCoords, { lat: location.lat, lng: location.lng }, pickup, location.address);
    };

    const updateRoute = async (start, end, startAddr = pickup, endAddr = dropoff) => {
        try {
            const route = await calculateRoute(start, end);
            setRouteInfo(route);

            // Call Gemini API for Smart Pricing
            setPriceLoading(true);
            try {
                const res = await fetch('/api/estimate-fare', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        startAddress: startAddr,
                        endAddress: endAddr,
                        distanceKm: route.distance,
                        vehicleType: vehicleType
                    })
                });

                const data = await res.json();

                if (data.pricePOL) {
                    setFare(data.pricePOL.toString());
                    setNativePrice(data);
                } else {
                    // Fallback to simple calculation
                    const suggestedFare = calculateFare(parseFloat(route.distance));
                    setFare(suggestedFare.total);
                    setNativePrice(null);
                }
            } catch (err) {
                console.error("Pricing API failed:", err);
                const suggestedFare = calculateFare(parseFloat(route.distance));
                setFare(suggestedFare.total);
            } finally {
                setPriceLoading(false);
            }
        } catch (error) {
            console.error('Route calculation failed:', error);
        }
    };

    const handleRequestRide = async (e) => {
        e.preventDefault();
        if (!signer || !contractAddress || !isCorrectNetwork) return;
        if (!pickupCoords || !dropoffCoords) {
            alert('Please select pickup and dropoff locations using the map');
            return;
        }

        // Validate fare amount
        if (!fare || parseFloat(fare) <= 0) {
            alert('Please wait for fare calculation to complete. Fare must be greater than 0.');
            return;
        }

        console.log('=== RIDE REQUEST DEBUG ===');
        console.log('Fare string:', fare);
        console.log('Fare as number:', parseFloat(fare));
        console.log('Pickup:', pickup);
        console.log('Dropoff:', dropoff);

        setLoading(true);
        setTxHash(null);
        try {
            const contract = new ethers.Contract(contractAddress, ABI, signer);
            const pickupLatScaled = Math.floor(pickupCoords.lat * 1e6);
            const pickupLngScaled = Math.floor(pickupCoords.lng * 1e6);
            const dropoffLatScaled = Math.floor(dropoffCoords.lat * 1e6);
            const dropoffLngScaled = Math.floor(dropoffCoords.lng * 1e6);

            // Convert fare to Wei and verify it's valid
            const fareInWei = ethers.parseEther(fare.toString());
            console.log('Fare in Wei:', fareInWei.toString());
            console.log('Fare in MATIC:', ethers.formatEther(fareInWei));

            // Confirm with user
            const confirmMessage = `Request ride?\n\nPickup: ${pickup}\nDropoff: ${dropoff}\nFare: ${ethers.formatEther(fareInWei)} MATIC`;
            if (!confirm(confirmMessage)) {
                setLoading(false);
                return;
            }

            console.log('Sending transaction with value:', fareInWei.toString());

            const tx = await contract.requestRide(
                pickup,
                dropoff,
                pickupLatScaled,
                pickupLngScaled,
                dropoffLatScaled,
                dropoffLngScaled,
                {
                    value: fareInWei,
                    maxPriorityFeePerGas: ethers.parseUnits("25", "gwei"),
                    maxFeePerGas: ethers.parseUnits("50", "gwei")
                }
            );
            setTxHash(tx.hash);
            await tx.wait();
            setPickup("");
            setDropoff("");
            setPickupCoords(null);
            setDropoffCoords(null);
            setFare("");
            setRouteInfo(null);
            setNativePrice(null);
            await fetchActiveRide();
        } catch (error) {
            console.error("Ride request failed", error);
            console.error("Error details:", {
                code: error.code,
                message: error.message,
                data: error.data
            });
            if (error.code === 'INSUFFICIENT_FUNDS') {
                alert('Insufficient MATIC balance for gas fees. Please fund your wallet on Polygon Amoy testnet.');
            } else if (error.message.includes('Fare must be greater than 0')) {
                alert('The fare amount is too low. Please check the calculated fare.');
            } else if (error.code === 'CALL_EXCEPTION') {
                alert(`Transaction would fail: The smart contract rejected this transaction. This usually means:\n\n1. You don't have enough MATIC for gas fees\n2. The fare value is 0 or invalid\n3. You're on the wrong network\n\nPlease check your console (F12) for detailed logs.`);
            } else {
                alert(`Transaction failed: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRide = async () => {
        if (!signer || !activeRide) return;
        setLoading(true);
        try {
            const contract = new ethers.Contract(contractAddress, ABI, signer);
            const tx = await contract.cancelRide(activeRide.id, {
                maxPriorityFeePerGas: ethers.parseUnits("25", "gwei"),
                maxFeePerGas: ethers.parseUnits("50", "gwei")
            });
            await tx.wait();
            setActiveRide(null);
        } catch (e) {
            console.error("Cancel failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteRide = async () => {
        if (!signer || !activeRide) return;
        setLoading(true);
        try {
            const contract = new ethers.Contract(contractAddress, ABI, signer);
            const tx = await contract.completeRide(activeRide.id, {
                maxPriorityFeePerGas: ethers.parseUnits("25", "gwei"),
                maxFeePerGas: ethers.parseUnits("50", "gwei")
            });
            await tx.wait();
            setActiveRide(null);
        } catch (e) {
            console.error("Complete failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveRide();
    }, [fetchActiveRide]);

    if (activeRide) {
        return (
            <div ref={containerRef} className="max-w-4xl mx-auto p-4 relative">
                {/* Ride Accepted Notification Pop-up */}
                {acceptedNotification && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none">
                        <div className="bg-emerald-500/95 backdrop-blur-md text-white p-5 rounded-2xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] border border-white/20 animate-in fade-in zoom-in slide-in-from-top-12 duration-500 flex items-center gap-5 pointer-events-auto">
                            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                <Car className="text-white h-7 w-7" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-xl leading-tight mb-1">Ride Accepted! 🚀</h4>
                                <p className="text-white/90 text-sm leading-snug">
                                    <span className="font-bold">{acceptedNotification.name}</span> is on the way in a <span className="font-bold italic">{acceptedNotification.vehicleName}</span>.
                                </p>
                            </div>
                            <button
                                onClick={() => setAcceptedNotification(null)}
                                className="p-1.5 hover:bg-white/10 rounded-full transition-colors self-start"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}
                <AnimatedCard className="border-primary/20 bg-background/50">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3 text-gradient">
                                <Car className="text-primary" />
                                Active Ride #{activeRide.id}
                            </h2>
                            <Badge variant={activeRide.status === 0 ? "secondary" : "default"}
                                className="bg-primary/20 text-primary border-primary/50 text-sm px-3 py-1">
                                {activeRide.status === 0 ? "Searching Driver" : "In Progress"}
                            </Badge>
                        </div>

                        {activeRide.pickupCoords && activeRide.dropoffCoords && (
                            <div className="mb-6 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                                <LeafletMap
                                    height="320px"
                                    markers={[
                                        { lat: activeRide.pickupCoords.lat, lng: activeRide.pickupCoords.lng, label: `Pickup`, color: '#10B981' },
                                        { lat: activeRide.dropoffCoords.lat, lng: activeRide.dropoffCoords.lng, label: `Dropoff`, color: '#EF4444' },
                                    ]}
                                    route={{ start: activeRide.pickupCoords, end: activeRide.dropoffCoords }}
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
                                <p className="font-medium text-lg">{activeRide.pickup}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Dropoff</span>
                                </div>
                                <p className="font-medium text-lg">{activeRide.dropoff}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-primary/10 to-transparent rounded-xl border border-primary/20 mb-8 scale-105 transition-transform">
                            <div className="flex flex-col">
                                <span className="text-muted-foreground font-medium">Total Fare</span>
                                {txHash && (
                                    <a href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                                        className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 mt-1 transition-colors">
                                        <ExternalLink size={10} /> View on Polygonscan
                                    </a>
                                )}
                            </div>
                            <span className="text-4xl font-black text-primary text-shadow-glow">{activeRide.fare} MATIC</span>
                        </div>

                        {activeRide.status === 1 && (
                            <div className="space-y-4 mb-6">
                                <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-xl border border-emerald-500/20">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                            <User className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase tracking-widest">Your Driver</p>
                                            <h4 className="text-xl font-bold text-white">
                                                {activeRide.driverInfo ? activeRide.driverInfo.name : "Registered Driver"}
                                            </h4>
                                        </div>
                                        {activeRide.driverInfo && (
                                            <Badge className="ml-auto bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                                {activeRide.driverInfo.gender}, {activeRide.driverInfo.age}y
                                            </Badge>
                                        )}
                                    </div>

                                    {activeRide.driverInfo && (
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Vehicle</p>
                                                <div className="flex items-center gap-2">
                                                    <Car size={14} className="text-primary" />
                                                    <span className="text-sm font-medium">{activeRide.driverInfo.vehicleName}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Type</p>
                                                <span className="text-sm font-bold text-primary italic uppercase">{activeRide.driverInfo.vehicleType}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-xs text-muted-foreground mb-1">Driver Address</p>
                                    <p className="font-mono text-[10px] break-all text-primary/60">{activeRide.driver}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex pt-2">
                            {activeRide.status === 0 ? (
                                <AnimatedButton variant="destructive" onClick={handleCancelRide} loading={loading} className="w-full">
                                    Cancel Ride
                                </AnimatedButton>
                            ) : (
                                <div className="space-y-6 w-full">
                                    <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-2xl border border-emerald-500/20">
                                        <div className="flex justify-between items-end mb-3">
                                            <span className="text-emerald-400 font-black italic tracking-widest flex items-center gap-2 text-sm">
                                                <Car className="animate-bounce" size={18} /> DRIVER EN ROUTE
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono bg-white/5 px-2 py-0.5 rounded tracking-tighter">LIVE TRACKING</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 animate-pulse" />
                                            <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 w-[65%] rounded-full shadow-[0_0_15px_rgba(52,211,153,0.5)] relative">
                                                <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full blur-[2px]" />
                                            </div>
                                        </div>
                                    </div>
                                    <ChatBox
                                        rideId={activeRide.id}
                                        currentUser="Rider"
                                        otherUser="Driver"
                                        account={account}
                                        initialFare={activeRide.fare}
                                    />
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-primary rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                                        <AnimatedButton
                                            variant="primary"
                                            onClick={handleCompleteRide}
                                            loading={loading}
                                            className="relative w-full h-16 text-xl font-black bg-gradient-to-r from-orange-500 to-orange-600 shadow-2xl hover:scale-[1.02] active:scale-[0.98] border-b-4 border-orange-700 rounded-xl"
                                            icon={CheckCircle}
                                        >
                                            Confirm Arrival & Pay {activeRide.fare} MATIC
                                        </AnimatedButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </AnimatedCard>
            </div>
        );
    }

    if (completedRide) {
        return (
            <div className="max-w-4xl mx-auto p-4">
                <AnimatedCard className="border-primary bg-background/80 backdrop-blur-xl overflow-hidden text-center relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-orange-500 to-primary animate-loading-bar" />
                    <div className="p-12">
                        <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-primary shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                            <Navigation className="text-primary w-12 h-12" />
                        </div>
                        <h1 className="text-5xl font-black text-white mb-3 italic tracking-tighter">MISSION ACCOMPLISHED! 🚀</h1>
                        <p className="text-muted-foreground text-xl mb-12">Your ride is complete and payment has been released.</p>

                        <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-2xl mx-auto">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Total Paid</p>
                                <p className="text-3xl font-bold text-white">{completedRide.fare} MATIC</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Distance Travelled</p>
                                <p className="text-3xl font-bold text-white">{routeInfo?.distance || "--"} KM</p>
                            </div>
                        </div>

                        <AnimatedButton
                            onClick={() => setCompletedRide(null)}
                            variant="primary"
                            className="w-full max-w-sm h-16 text-xl font-bold shadow-2xl"
                        >
                            Request Another Ride
                        </AnimatedButton>
                    </div>
                </AnimatedCard>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="max-w-4xl mx-auto p-4 relative">
            {/* Ride Accepted Notification Pop-up */}
            {acceptedNotification && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none">
                    <div className="bg-emerald-500/95 backdrop-blur-md text-white p-5 rounded-2xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] border border-white/20 animate-in fade-in zoom-in slide-in-from-top-12 duration-500 flex items-center gap-5 pointer-events-auto">
                        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <Car className="text-white h-7 w-7" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-xl leading-tight mb-1">Ride Accepted! 🚀</h4>
                            <p className="text-white/90 text-sm leading-snug">
                                <span className="font-bold">{acceptedNotification.name}</span> is on the way in a <span className="font-bold italic">{acceptedNotification.vehicleName}</span>.
                            </p>
                        </div>
                        <button
                            onClick={() => setAcceptedNotification(null)}
                            className="p-1.5 hover:bg-white/10 rounded-full transition-colors self-start"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
            <AnimatedCard delay={0.1}>
                <div className="p-8">
                    <div className="mb-8 border-b border-white/10 pb-6">
                        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                            <Navigation className="text-primary w-8 h-8" />
                            <span className="text-gradient">Request a Ride</span>
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Choose your destination and ride in decentralized style.
                        </p>
                    </div>

                    <form onSubmit={handleRequestRide} className="space-y-8">
                        {pickupCoords && dropoffCoords && routeInfo && (
                            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
                                <div className="absolute top-4 left-4 z-[500] bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <Car size={16} className="text-primary" />
                                        <span className="font-bold">{routeInfo.distance} km</span>
                                    </div>
                                    <div className="w-px bg-white/20" />
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className="text-blue-400" />
                                        <span className="font-bold">{routeInfo.duration} min</span>
                                    </div>
                                </div>
                                <LeafletMap
                                    height="300px"
                                    markers={[
                                        { lat: pickupCoords.lat, lng: pickupCoords.lng, label: `Pickup`, color: '#10B981' },
                                        { lat: dropoffCoords.lat, lng: dropoffCoords.lng, label: `Dropoff`, color: '#EF4444' },
                                    ]}
                                    route={{ start: pickupCoords, end: dropoffCoords }}
                                    interactive={false}
                                    showUserLocation={false}
                                />
                            </div>
                        )}

                        <div className="grid gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Pickup Location
                                </label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1 group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" size={20} />
                                        <Input
                                            type="text"
                                            placeholder="Where from?"
                                            className="pl-12 h-14 bg-white/5 border-white/10 focus:border-emerald-500/50 focus:bg-white/10 text-lg transition-all"
                                            value={pickup}
                                            onChange={(e) => setPickup(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <AnimatedButton
                                        variant="secondary"
                                        onClick={() => setShowPickupMap(true)}
                                        className="w-14 h-14 p-0 rounded-xl"
                                        icon={Map}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Dropoff Location
                                </label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1 group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-red-500 transition-colors" size={20} />
                                        <Input
                                            type="text"
                                            placeholder="Where to?"
                                            className="pl-12 h-14 bg-white/5 border-white/10 focus:border-red-500/50 focus:bg-white/10 text-lg transition-all"
                                            value={dropoff}
                                            onChange={(e) => setDropoff(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <AnimatedButton
                                        variant="secondary"
                                        onClick={() => setShowDropoffMap(true)}
                                        className="w-14 h-14 p-0 rounded-xl"
                                        icon={Map}
                                    />
                                </div>
                            </div>

                            {/* Vehicle Type Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Car size={16} className="text-primary" />
                                    You can also choose your ride
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        {
                                            value: "auto",
                                            label: "Auto Rickshaw",
                                            icon: "🛺",
                                            ratePerKm: 15,
                                            baseFare: 30,
                                            desc: "Budget",
                                            details: "Perfect for short trips and budget-friendly travel"
                                        },
                                        {
                                            value: "sedan",
                                            label: "Sedan",
                                            icon: "🚗",
                                            ratePerKm: 20,
                                            baseFare: 50,
                                            desc: "Comfort",
                                            details: "Comfortable AC ride for 4 passengers"
                                        },
                                        {
                                            value: "suv",
                                            label: "SUV",
                                            icon: "🚙",
                                            ratePerKm: 30,
                                            baseFare: 80,
                                            desc: "Spacious",
                                            details: "Spacious ride for families with extra luggage"
                                        },
                                        {
                                            value: "luxury",
                                            label: "Luxury",
                                            icon: "🏎️",
                                            ratePerKm: 100,
                                            baseFare: 200,
                                            desc: "Premium",
                                            details: "Premium experience with high-end vehicles"
                                        }
                                    ].map((vehicle) => {
                                        // Calculate estimated fare for this vehicle type if route exists
                                        const estimatedFareINR = routeInfo
                                            ? Math.round(vehicle.baseFare + (routeInfo.distance * vehicle.ratePerKm))
                                            : null;
                                        const estimatedFarePOL = estimatedFareINR
                                            ? (estimatedFareINR / 42).toFixed(2)
                                            : null;

                                        return (
                                            <div key={vehicle.value} className="relative group">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setVehicleType(vehicle.value);
                                                        // Recalculate fare if route exists
                                                        if (pickupCoords && dropoffCoords && routeInfo) {
                                                            updateRoute(pickupCoords, dropoffCoords, pickup, dropoff);
                                                        }
                                                    }}
                                                    className={`
                                                        w-full relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
                                                        ${vehicleType === vehicle.value
                                                            ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(253,126,20,0.3)]'
                                                            : 'border-white/10 bg-white/5 hover:border-primary/50 hover:bg-white/10 hover:scale-105'
                                                        }
                                                    `}
                                                >
                                                    <div className="text-3xl mb-2">{vehicle.icon}</div>
                                                    <div className="font-bold text-sm mb-1">{vehicle.label}</div>
                                                    <div className="text-xs text-emerald-400 font-mono">₹{vehicle.ratePerKm}/km</div>
                                                    <div className="text-xs text-primary/70 mt-1">{vehicle.desc}</div>
                                                    {vehicleType === vehicle.value && (
                                                        <div className="absolute top-2 right-2">
                                                            <CheckCircle size={16} className="text-primary" />
                                                        </div>
                                                    )}
                                                </button>

                                                {/* Futuristic Tooltip on Hover */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-5 py-4 bg-gradient-to-br from-black/70 via-gray-900/60 to-black/70 backdrop-blur-2xl text-white text-xs rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-[0_8px_32px_rgba(253,126,20,0.2)] border border-primary/30 min-w-[240px]">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/10 rounded-2xl"></div>
                                                    <div className="relative">
                                                        <div className="font-bold text-sm mb-3 text-primary flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                                            {vehicle.label}
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-white/60 text-xs">Base Fare:</span>
                                                                <span className="text-emerald-400 font-mono font-semibold">₹{vehicle.baseFare}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-white/60 text-xs">Per Km:</span>
                                                                <span className="text-emerald-400 font-mono font-semibold">₹{vehicle.ratePerKm}</span>
                                                            </div>
                                                            {estimatedFareINR && (
                                                                <>
                                                                    <div className="border-t border-white/10 my-2"></div>
                                                                    <div className="flex justify-between items-center font-bold">
                                                                        <span className="text-white text-xs">Estimated:</span>
                                                                        <span className="text-primary text-sm">₹{estimatedFareINR}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-white/50 text-xs">In POL:</span>
                                                                        <span className="text-emerald-300 font-mono text-xs">{estimatedFarePOL} POL</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="text-white/60 mt-3 text-xs leading-relaxed border-t border-white/10 pt-3">{vehicle.details}</div>
                                                    </div>
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2">
                                                        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black/70"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                                    <span>Offer Fare (MATIC)</span>
                                    {priceLoading ? (
                                        <span className="flex items-center gap-1 text-xs text-primary animate-pulse">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Estimating...
                                        </span>
                                    ) : nativePrice && (
                                        <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                            ≈ ₹{nativePrice.priceINR} (@ ₹{nativePrice.exchangeRate}/POL)
                                        </span>
                                    )}
                                </label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    placeholder="0.0"
                                    className="h-14 bg-white/5 border-white/10 focus:border-primary/50 text-2xl font-bold text-primary transition-all"
                                    value={fare}
                                    onChange={(e) => setFare(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <AnimatedButton
                            type="submit"
                            variant="primary"
                            loading={loading}
                            disabled={!account || !isCorrectNetwork}
                            className="w-full h-14 text-lg font-bold"
                            icon={Send}
                        >
                            Request Ride
                        </AnimatedButton>

                        {txHash && (
                            <div className="text-center pt-2">
                                <a href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 hover:underline transition-colors text-sm">
                                    View transaction on Polygonscan →
                                </a>
                            </div>
                        )}
                    </form>

                    <LocationPicker
                        isOpen={showPickupMap}
                        onClose={() => setShowPickupMap(false)}
                        onLocationSelect={handlePickupSelect}
                        title="Select Pickup Point"
                        description="Drag map to pin exact pickup location"
                        initialLocation={pickupCoords}
                    />

                    <LocationPicker
                        isOpen={showDropoffMap}
                        onClose={() => setShowDropoffMap(false)}
                        onLocationSelect={handleDropoffSelect}
                        title="Select Destination"
                        description="Drag map to pin exact dropoff location"
                        initialLocation={dropoffCoords}
                    />
                </div>
            </AnimatedCard>
        </div>
    );
}
