"use client";
import React, { useRef } from 'react';
import { useWeb3 } from "@/context/Web3Context";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export default function Navbar() {
    const { account, connectWallet, switchAccount } = useWeb3();
    const navRef = useRef(null);

    useGSAP(() => {
        const tl = gsap.timeline();
        tl.from(navRef.current, { y: -20, opacity: 0, duration: 0.6, ease: "power3.out" })
            .from(".nav-logo", { x: -20, opacity: 0, duration: 0.5 }, "-=0.4")
            .from(".nav-action", { x: 20, opacity: 0, duration: 0.5 }, "-=0.4");
    }, { scope: navRef });

    return (
        <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/20">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                <Link href="/" className="nav-logo flex items-center gap-3 active:scale-95 transition-transform group">
                    <div className="relative">
                        <img
                            src="/logo.png"
                            alt="Polcab"
                            className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(255,100,0,0.3)] transition-transform group-hover:scale-110"
                        />
                    </div>
                    <span className="text-3xl font-normal tracking-wider uppercase text-gradient hidden sm:block font-[family-name:var(--font-polcab)] polcab-text">POLCAB</span>
                </Link>

                <div className="nav-action flex items-center gap-4">
                    {account ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-secondary/30 pl-3 pr-1 py-1 rounded-full border border-white/5 hover:border-white/10 transition-colors group/wallet">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                <span className="text-xs font-mono text-muted-foreground bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                                    {account.slice(0, 6)}...{account.slice(-4)}
                                </span>
                                <button
                                    onClick={switchAccount}
                                    title="Switch Wallet / Account"
                                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-white transition-colors border-l border-white/10 ml-1"
                                >
                                    Switch
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={connectWallet}
                            className="group relative px-6 py-2 rounded-full overflow-hidden transition-all duration-300 transform hover:scale-105 shadow-lg shadow-primary/20"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 transition-opacity group-hover:opacity-90" />
                            <span className="relative text-xs font-bold uppercase tracking-widest text-white">Connect Wallet</span>
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
