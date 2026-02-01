"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, MessageSquare, Check, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AnimatedButton from "@/components/ui/AnimatedButton";

export default function ChatBox({ rideId, currentUser, otherUser, account, initialFare }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [proposedFare, setProposedFare] = useState(initialFare || "");
    const [agreedFare, setAgreedFare] = useState(initialFare || "");
    const [isAgreed, setIsAgreed] = useState(false);

    const scrollRef = useRef(null);
    const chatKey = `chat_ride_${rideId}`;
    const negotiationKey = `negotiation_ride_${rideId}`;

    // Load messages and negotiation state
    useEffect(() => {
        const syncChat = () => {
            const savedChat = localStorage.getItem(chatKey);
            if (savedChat) setMessages(JSON.parse(savedChat));

            const savedNegotiation = localStorage.getItem(negotiationKey);
            if (savedNegotiation) {
                const neg = JSON.parse(savedNegotiation);
                setAgreedFare(neg.fare);
                setIsAgreed(neg.agreed);
                if (neg.proposer !== account) {
                    setProposedFare(neg.fare);
                }
            }
        };

        syncChat();
        const interval = setInterval(syncChat, 2000);
        return () => clearInterval(interval);
    }, [chatKey, negotiationKey, account]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msg = {
            id: Date.now(),
            sender: account,
            text: newMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const updatedChat = [...messages, msg];
        setMessages(updatedChat);
        localStorage.setItem(chatKey, JSON.stringify(updatedChat));
        setNewMessage("");
    };

    const handleProposeFare = () => {
        const neg = {
            fare: proposedFare,
            proposer: account,
            agreed: false
        };
        localStorage.setItem(negotiationKey, JSON.stringify(neg));

        // Add a system message
        const systemMsg = {
            id: Date.now(),
            sender: 'system',
            text: `${currentUser} proposed a new fare: ${proposedFare} MATIC`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const updatedChat = [...messages, systemMsg];
        localStorage.setItem(chatKey, JSON.stringify(updatedChat));
    };

    const handleAgreeFare = () => {
        const neg = {
            fare: proposedFare,
            proposer: account,
            agreed: true
        };
        localStorage.setItem(negotiationKey, JSON.stringify(neg));
        setIsAgreed(true);
        setAgreedFare(proposedFare);

        const systemMsg = {
            id: Date.now(),
            sender: 'system',
            text: `✅ Fare agreed: ${proposedFare} MATIC`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const updatedChat = [...messages, systemMsg];
        localStorage.setItem(chatKey, JSON.stringify(updatedChat));
    };

    return (
        <div className="flex flex-col h-[500px] bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                        <MessageSquare size={18} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-white uppercase tracking-wider">Ride Chat</h3>
                        <p className="text-[10px] text-muted-foreground">Agreed Fare: <span className="text-emerald-400 font-bold">{agreedFare} MATIC</span></p>
                    </div>
                </div>
                {isAgreed && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">Fare Finalized</Badge>
                )}
            </div>

            {/* Negotiation Bar */}
            {!isAgreed && (
                <div className="p-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-white/5 flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 border border-white/10">
                        <DollarSign size={14} className="text-primary" />
                        <input
                            type="number"
                            value={proposedFare}
                            onChange={(e) => setProposedFare(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold w-full text-white"
                            placeholder="Propose fare..."
                        />
                    </div>
                    <AnimatedButton
                        onClick={handleProposeFare}
                        variant="secondary"
                        className="px-4 py-2 text-[10px] h-auto"
                    >
                        Propose
                    </AnimatedButton>
                    <AnimatedButton
                        onClick={handleAgreeFare}
                        variant="primary"
                        className="px-4 py-2 text-[10px] h-auto"
                        icon={Check}
                    >
                        Agree
                    </AnimatedButton>
                </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.length === 0 && (
                    <div className="text-center py-10 opacity-20 flex flex-col items-center">
                        <MessageSquare size={40} className="mb-2" />
                        <p className="text-xs">Start the negotiation...</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'system' ? 'justify-center' : msg.sender === account ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'system' ? (
                            <div className="bg-white/5 border border-white/5 px-3 py-1 rounded-full text-[10px] text-muted-foreground italic">
                                {msg.text}
                            </div>
                        ) : (
                            <div className={`max-w-[80%] space-y-1 ${msg.sender === account ? 'text-right' : 'text-left'}`}>
                                <div className={`inline-block p-3 rounded-2xl text-sm ${msg.sender === account
                                        ? 'bg-primary text-white rounded-tr-none shadow-lg'
                                        : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/10'
                                    }`}>
                                    {msg.text}
                                </div>
                                <div className="text-[9px] text-muted-foreground px-1">{msg.timestamp}</div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/5 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-white"
                />
                <button
                    type="submit"
                    className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
