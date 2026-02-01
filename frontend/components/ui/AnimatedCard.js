"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export default function AnimatedCard({ children, className, delay = 0 }) {
    const cardRef = useRef(null);

    useGSAP(() => {
        gsap.fromTo(
            cardRef.current,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, delay: delay, ease: "power3.out" }
        );
    }, { scope: cardRef });

    const handleMouseEnter = () => {
        gsap.to(cardRef.current, {
            scale: 1.01,
            boxShadow: "0 0 30px rgba(255, 126, 34, 0.15)", // Orange glow
            borderColor: "rgba(255, 126, 34, 0.4)",
            duration: 0.4,
            ease: "power2.out"
        });
    };

    const handleMouseLeave = () => {
        gsap.to(cardRef.current, {
            scale: 1,
            boxShadow: "0 0 0px rgba(0, 0, 0, 0)",
            borderColor: "rgba(255, 255, 255, 0.1)",
            duration: 0.4,
            ease: "power2.out"
        });
    };

    return (
        <div
            ref={cardRef}
            className={cn(
                "relative rounded-xl border border-white/10 bg-black/60 backdrop-blur-md overflow-hidden transition-colors",
                className
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Glow gradient at top */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
