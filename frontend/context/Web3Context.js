"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

const POLYGON_AMOY_CHAIN_ID = 80002;
const POLYGON_AMOY_CONFIG = {
    chainId: "0x" + POLYGON_AMOY_CHAIN_ID.toString(16),
    chainName: "Polygon Amoy Testnet",
    nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18,
    },
    rpcUrls: ["https://rpc-amoy.polygon.technology"],
    blockExplorerUrls: ["https://amoy.polygonscan.com/"],
};

const Web3Context = createContext(null);

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    const switchToAmoy = async () => {
        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: POLYGON_AMOY_CONFIG.chainId }],
            });
            return true;
        } catch (switchError) {
            // Chain not added, try to add it
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [POLYGON_AMOY_CONFIG],
                    });
                    return true;
                } catch (addError) {
                    console.error("Failed to add Polygon Amoy network:", addError);
                    setError("Failed to add Polygon Amoy network");
                    return false;
                }
            }
            console.error("Failed to switch network:", switchError);
            setError("Failed to switch to Polygon Amoy");
            return false;
        }
    };

    const connectWallet = useCallback(async () => {
        if (!window.ethereum) {
            setError("Please install MetaMask!");
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            console.log("Requesting accounts...");
            // Request account access
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            console.log("Accounts received from eth_requestAccounts:", accounts);

            const _provider = new ethers.BrowserProvider(window.ethereum);
            const network = await _provider.getNetwork();

            // Check if on correct network
            if (Number(network.chainId) !== POLYGON_AMOY_CHAIN_ID) {
                const switched = await switchToAmoy();
                if (!switched) {
                    setIsConnecting(false);
                    return;
                }
                // Re-initialize provider after network switch
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const _newProvider = new ethers.BrowserProvider(window.ethereum);
            const _signer = await _newProvider.getSigner();
            const _account = await _signer.getAddress();
            const _network = await _newProvider.getNetwork();

            setProvider(_newProvider);
            setSigner(_signer);
            setAccount(_account);
            setChainId(Number(_network.chainId));
        } catch (err) {
            console.error("Connection failed:", err);
            setError(err.message || "Failed to connect wallet");
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const switchAccount = useCallback(async () => {
        if (!window.ethereum) return;
        try {
            console.log("Triggering wallet_requestPermissions...");
            await window.ethereum.request({
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
            });
            console.log("Permissions granted. Re-connecting...");
            // After permissions are granted/selected, request accounts again
            await connectWallet();
        } catch (err) {
            console.error("Failed to switch account:", err);
            setError("Failed to switch account");
        }
    }, [connectWallet]);

    const disconnectWallet = useCallback(() => {
        setAccount(null);
        setProvider(null);
        setSigner(null);
        setChainId(null);
    }, []);

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", (accounts) => {
                console.log("accountsChanged event fired:", accounts);
                if (accounts.length === 0) {
                    disconnectWallet();
                } else {
                    console.log("Account changed, re-connecting...");
                    connectWallet();
                }
            });

            window.ethereum.on("chainChanged", (newChainId) => {
                setChainId(parseInt(newChainId, 16));
                window.location.reload();
            });

            // Auto-connect disabled to force manual connection as per user request
            // window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
            //     if (accounts.length > 0) {
            //         connectWallet();
            //     }
            // });
        }
    }, [connectWallet, disconnectWallet]);

    const isCorrectNetwork = chainId === POLYGON_AMOY_CHAIN_ID;

    return (
        <Web3Context.Provider
            value={{
                account,
                provider,
                signer,
                chainId,
                isConnecting,
                error,
                isCorrectNetwork,
                connectWallet,
                disconnectWallet,
                switchAccount,
                switchToAmoy,
            }}
        >
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => {
    const context = useContext(Web3Context);
    if (!context) {
        throw new Error("useWeb3 must be used within a Web3Provider");
    }
    return context;
};
