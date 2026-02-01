import { Geist, Geist_Mono, Righteous } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/context/Web3Context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const righteous = Righteous({
  weight: "400",
  variable: "--font-polcab",
  subsets: ["latin"],
});

export const metadata = {
  title: "Polcab | Decentralized Ride-Sharing",
  description: "Minimal, functional ride-sharing dApp on Polygon Amoy Testnet. Trustless, peer-to-peer, powered by smart contracts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} ${righteous.variable} antialiased`}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
