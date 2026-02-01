"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function AnimatedButton({
    children,
    onClick,
    className,
    variant = "primary",
    disabled = false,
    loading = false,
    type = "button",
    icon: Icon = null
}) {
    const btnRef = useRef(null);

    const handleMouseEnter = () => {
        if (disabled || loading) return;
        gsap.to(btnRef.current, {
            scale: 1.02,
            duration: 0.3,
            ease: "power2.out"
        });
    };

    const handleMouseLeave = () => {
        if (disabled || loading) return;
        gsap.to(btnRef.current, {
            scale: 1,
            duration: 0.3,
            ease: "power2.out"
        });
    };

    const handleMouseDown = () => {
        if (disabled || loading) return;
        gsap.to(btnRef.current, {
            scale: 0.98,
            duration: 0.1,
            ease: "power2.out"
        });
    };

    const handleMouseUp = () => {
        if (disabled || loading) return;
        gsap.to(btnRef.current, {
            scale: 1.02,
            duration: 0.1,
            ease: "power2.out"
        });
    };

    const variants = {
        primary: "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 border-0",
        secondary: "bg-surface-light border border-white/10 text-gray-200 hover:bg-white/5",
        destructive: "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20",
        outline: "bg-transparent border border-primary/30 text-primary hover:border-primary",
        ghost: "bg-transparent hover:bg-white/5 text-gray-300"
    };

    return (
        <button
            ref={btnRef}
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            className={cn(
                "relative flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 outline-none select-none",
                variants[variant],
                (disabled || loading) && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!loading && Icon && <Icon className="w-4 h-4" />}
            {children}
        </button>
    );
}
