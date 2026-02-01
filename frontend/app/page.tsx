"use client";

import { useWeb3 } from "@/context/Web3Context";
import Navbar from "@/components/Navbar";
import RiderDashboard from "@/components/RiderDashboard";
import DriverDashboard from "@/components/DriverDashboard";
import AnimatedButton from "@/components/ui/AnimatedButton";
import AnimatedCard from "@/components/ui/AnimatedCard";
import { CheckCircle, Shield, Zap, Car, Wallet, ArrowRight, User } from "lucide-react";
import { useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

import { CONTRACT_ADDRESS } from "@/lib/contractAddress";

export default function Home() {
    const { account, connectWallet, isConnecting } = useWeb3();
    const [view, setView] = useState("rider"); // 'rider' or 'driver'
    const [showDashboard, setShowDashboard] = useState(false);

    // Diagnostic log
    useState(() => {
        console.log("Current Contract Address in Page:", CONTRACT_ADDRESS);
    });

    const containerRef = useRef(null);

    const isDashboardActive = account && showDashboard;

    // 1. Dashboard & Perspective Transitions (Depends on state)
    useGSAP(() => {
        const tl = gsap.timeline();

        if (!isDashboardActive) {
            // Hero Entrance
            tl.fromTo(".hero-text", { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power3.out" })
                .fromTo(".hero-desc", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "-=0.6")
                .fromTo(".launch-card", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)" }, "-=0.6")
                .fromTo(".vehicle-card", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power2.out" }, "-=0.4");
        } else {
            // Dashboard Entrance
            tl.fromTo(".dashboard-container",
                { opacity: 0, scale: 0.95, filter: "blur(10px)" },
                { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.6, ease: "power2.out" }
            );
        }

        // Refresh ScrollTrigger after potential layout shift
        setTimeout(() => ScrollTrigger.refresh(), 100);

    }, { scope: containerRef, dependencies: [isDashboardActive, view] });

    // 2. Static Benefits Section (Run once)
    useGSAP(() => {
        gsap.from(".benefit-card", {
            scrollTrigger: {
                trigger: ".benefits-section",
                start: "top 85%",
                toggleActions: "play none none reverse"
            },
            y: 30,
            duration: 0.8,
            stagger: 0.08,
            ease: "power2.out",
            clearProps: "all"
        });
    }, { scope: containerRef });

    return (
        <main ref={containerRef} className="min-h-screen bg-transparent relative overflow-hidden selection:bg-primary/30">
            {/* Background Watermark Logo */}
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden select-none">
                <img
                    src="/logo.png"
                    alt=""
                    className="w-[85vw] max-w-[1100px] opacity-[0.05] mix-blend-overlay grayscale filter contrast-125"
                />
            </div>

            <Navbar />

            <div className="container mx-auto px-6 pt-32 pb-20 relative z-10">
                {!isDashboardActive ? (
                    <div className="flex flex-col items-center justify-center min-h-[75vh]">

                        {/* Mode Switcher Pill */}
                        <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md p-1.5 rounded-full border border-white/10 mb-12 shadow-2xl">
                            <button
                                onClick={() => setView("rider")}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${view === "rider"
                                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105"
                                    : "text-muted-foreground hover:text-white"
                                    }`}
                            >
                                <User size={16} /> Rider
                            </button>
                            <button
                                onClick={() => setView("driver")}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${view === "driver"
                                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg scale-105"
                                    : "text-muted-foreground hover:text-white"
                                    }`}
                            >
                                <Car size={16} /> Driver
                            </button>
                        </div>

                        {/* Hero Text */}
                        <div className="hero-text text-center space-y-6 max-w-4xl mx-auto mb-12">
                            <h1 className="text-6xl md:text-9xl font-normal tracking-widest uppercase drop-shadow-2xl font-[family-name:var(--font-polcab)] polcab-text-hero">
                                <span className={`bg-clip-text text-transparent bg-gradient-to-r ${view === 'rider' ? 'from-white via-orange-200 to-orange-500' : 'from-white via-emerald-200 to-emerald-500'}`}>
                                    POLCAB
                                </span>
                            </h1>
                            <p className="hero-desc text-lg md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
                                The next generation of ride-sharing on <span className="text-white font-bold">Polygon Amoy</span>.
                                <br className="hidden md:block" />
                                Trustless. Peer-to-Peer. Unstoppable.
                            </p>
                        </div>

                        {/* Launch / Connect Card */}
                        <div className="launch-card w-full max-w-sm mb-24 z-20">
                            <AnimatedCard className="border-t-4 border-t-primary/80 shadow-2xl shadow-primary/10">
                                <div className="p-8 flex flex-col items-center gap-6">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center ring-1 ring-white/10 shadow-inner">
                                        <Wallet className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-bold text-white">
                                            {account ? "Resuming Session" : "Welcome to Polcab"}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {account ? "Wallet Connected" : "Connect your wallet to begin"}
                                        </p>
                                    </div>
                                    <AnimatedButton
                                        onClick={account ? () => setShowDashboard(true) : connectWallet}
                                        loading={isConnecting}
                                        variant="primary"
                                        className="w-full h-12 text-base font-bold shadow-lg shadow-primary/25"
                                    >
                                        {account ? "Launch App" : "Connect Wallet"}
                                    </AnimatedButton>
                                </div>
                            </AnimatedCard>
                        </div>

                        {/* Vehicle Types Grid */}
                        <div className="w-full max-w-7xl mx-auto">
                            <div className="flex items-center gap-4 mb-12 opacity-90">
                                <div className={`h-[3px] w-12 rounded-full ${view === 'rider' ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}></div>
                                <h3 className="text-3xl font-bold uppercase italic tracking-wider text-white text-shadow-sm">
                                    {view === "rider" ? "Offering Amazing Ride Options" : "Drive with Polcab"}
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[
                                    { name: "Auto Rickshaw", img: "/vehicles/auto.png", desc: "Classic Indian 3-wheeler, agile and efficient.", price: "Budget" },
                                    { name: "Sedan", img: "/vehicles/sedan.png", desc: "Executive comfort for daily commutes.", price: "Standard" },
                                    { name: "SUV", img: "/vehicles/suv.png", desc: "Rugged style for any terrain.", price: "Premium" },
                                    { name: "Luxury", img: "/vehicles/luxury.png", desc: "Ultimate decentralized experience.", price: "Elite" },
                                ].map((vehicle, i) => (
                                    <div key={i} className="vehicle-card h-full perspective-1000">
                                        <AnimatedCard className="h-full group cursor-pointer overflow-hidden bg-black/40 border-white/5 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
                                            <div className="relative h-64 p-0">
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                                                <img
                                                    src={vehicle.img}
                                                    alt={vehicle.name}
                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 grayscale group-hover:grayscale-0"
                                                />
                                                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col justify-end transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                                    <h4 className={`font-bold text-xl uppercase italic leading-none mb-1 ${view === 'rider' ? 'text-white' : 'text-emerald-400'}`}>
                                                        {vehicle.name}
                                                    </h4>
                                                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest leading-none mb-2">
                                                        {vehicle.price}
                                                    </p>
                                                    <p className="text-xs text-gray-400 overflow-hidden h-0 group-hover:h-auto opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                                                        {vehicle.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        </AnimatedCard>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                ) : (
                    // DASHBOARD VIEW
                    <div className="dashboard-container w-full">
                        <div className="mb-6">
                            <AnimatedButton
                                variant="ghost"
                                onClick={() => setShowDashboard(false)}
                                className="pl-0 hover:bg-transparent hover:text-white text-muted-foreground"
                            >
                                ← Back to Home
                            </AnimatedButton>
                        </div>

                        {view === "rider" ? (
                            <RiderDashboard contractAddress={CONTRACT_ADDRESS} />
                        ) : (
                            <DriverDashboard contractAddress={CONTRACT_ADDRESS} />
                        )}
                    </div>
                )}

                {/* Benefits Section (Static at bottom) */}
                <div className="benefits-section mt-40 w-full mb-24 max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h3 className="text-4xl font-black uppercase italic mb-4 text-white drop-shadow-lg">Why Polcab?</h3>
                        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            {
                                title: "Instant Settlements",
                                desc: "Funds sent directly to your wallet.",
                                icon: Zap,
                                details: "No waiting for bank transfers. Receive payments instantly in cryptocurrency as soon as the ride is completed. Your money, your control."
                            },
                            {
                                title: "Zero Hidden Fees",
                                desc: "Just 2% protocol fee. That's it.",
                                icon: Shield,
                                details: "Complete transparency with every transaction. Unlike traditional platforms charging 25-30%, Polcab keeps it simple with only a 2% platform fee."
                            },
                            {
                                title: "Global Access",
                                desc: "One network. Anywhere on Earth.",
                                icon: ArrowRight,
                                details: "No geographic restrictions or banking requirements. Anyone with a crypto wallet can use Polcab anywhere in the world on the Polygon network."
                            },
                            {
                                title: "Trustless Security",
                                desc: "Code is law. Funds are safe.",
                                icon: CheckCircle,
                                details: "Smart contracts ensure payments are secure and automatic. No middleman can freeze your funds or block your account. Fully decentralized and censorship-resistant."
                            }
                        ].map((item, i) => (
                            <div key={i} className="benefit-card relative group">
                                <AnimatedCard className="border-l-2 border-l-primary bg-white/5 hover:bg-white/10 h-full transition-all duration-300 hover:scale-[1.02]">
                                    <div className="p-8 flex items-start gap-6">
                                        <div className="mt-1 p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                                            <item.icon className="text-primary h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold uppercase italic mb-2 text-white text-shadow-sm">{item.title}</h4>
                                            <p className="text-muted-foreground leading-relaxed text-shadow-sm">{item.desc}</p>
                                        </div>
                                    </div>
                                </AnimatedCard>

                                {/* Futuristic Hover Tooltip */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mt-2 px-6 py-5 bg-gradient-to-br from-black/80 via-gray-900/70 to-black/80 backdrop-blur-md text-white text-sm rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-[0_8px_32px_rgba(253,126,20,0.2)] border border-primary/30 max-w-sm pointer-events-none">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-2xl"></div>
                                    <div className="relative">
                                        <div className="font-bold text-primary mb-3 text-base tracking-wide">{item.title}</div>
                                        <div className="text-white/90 leading-relaxed">{item.details}</div>
                                    </div>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                                        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-black/60"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <footer className="py-8 text-center text-muted-foreground/40 text-xs uppercase tracking-widest border-t border-white/5 bg-black/50 backdrop-blur-sm">
                <p>Polcab © 2026 • Powered by Polygon</p>
                <div className="mt-2 flex justify-center gap-4">
                    <a href="#" className="hover:text-primary transition-colors">Terms</a>
                    <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                </div>
            </footer>
        </main>
    );
}
