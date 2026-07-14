// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Heart, Download, Smartphone, Shield, Zap } from 'lucide-react';

const Footer = () => {
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsInstalled(true);
            return;
        }

        // Check if the prompt was already captured globally (in index.js)
        if (window.__PWA_DEFERRED_PROMPT) {
            setCanInstall(true);
        }

        // Listen for the custom event dispatched from index.js
        const onAvailable = () => setCanInstall(true);
        window.addEventListener('pwa-install-available', onAvailable);
        
        window.addEventListener('appinstalled', () => {
            setCanInstall(false);
            setIsInstalled(true);
        });

        return () => window.removeEventListener('pwa-install-available', onAvailable);
    }, []);

    const handleInstallClick = async () => {
        const prompt = window.__PWA_DEFERRED_PROMPT;
        if (!prompt) {
            alert("To install this app:\n\nâ€¢ Android Chrome: Tap the â‹® menu â†’ 'Install App'\nâ€¢ iPhone Safari: Tap Share â¬†ï¸ â†’ 'Add to Home Screen'\nâ€¢ Desktop Chrome: Click the âŠ• icon in the address bar");
            return;
        }
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
            window.__PWA_DEFERRED_PROMPT = null;
            setCanInstall(false);
        }
    };

    return (
        <footer className="relative mt-auto w-full overflow-hidden">
            {/* Subtle gradient fade */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B1220] pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
            
            <div className="relative border-t border-[#24344D]/50 bg-[#101827]/80 backdrop-blur-xl">
                <div className="container mx-auto px-4 py-10">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                        
                        {/* Brand Section */}
                        <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left space-y-3">
                            <h2 className="text-2xl font-black font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                                GOAL KASHMIR
                            </h2>
                            <p className="text-[#64748B] text-sm max-w-xs">
                                The premium soccer tournament management platform. Track live scores, teams, and stats in real-time.
                            </p>
                        </div>

                        {/* Install App Section */}
                        <div className="md:col-span-4 flex justify-center">
                            {!isInstalled ? (
                                <button 
                                    onClick={handleInstallClick}
                                    className="group relative flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl shadow-xl shadow-brand-500/15 hover:shadow-brand-500/25 transition-all duration-300 hover:-translate-y-1 active:scale-95 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-[#131D31]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                                    <div className="relative bg-[#131D31]/15 p-2 rounded-xl backdrop-blur-sm">
                                        <Smartphone size={20} className="text-white" />
                                    </div>
                                    <div className="relative text-left">
                                        <span className="block text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none mb-0.5">Get the App</span>
                                        <span className="block text-sm font-black text-white leading-none">Install Now</span>
                                    </div>
                                    <Download size={16} className="relative text-white/60 group-hover:text-white group-hover:animate-bounce ml-2" />
                                </button>
                            ) : (
                                <div className="flex justify-center items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-bold shadow-sm">
                                    <Shield size={16} /> App Installed Securely
                                </div>
                            )}
                        </div>

                        {/* Stats / Badges */}
                        <div className="md:col-span-4 flex justify-center md:justify-end gap-4">
                            <div className="flex flex-col items-center p-3 rounded-xl bg-[#131D31] border border-[#24344D]/50">
                                <Zap size={18} className="text-amber-400 mb-1" />
                                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Lightning</span>
                                <span className="text-xs font-black text-white">Fast</span>
                            </div>
                            <div className="flex flex-col items-center p-3 rounded-xl bg-[#131D31] border border-[#24344D]/50">
                                <Shield size={18} className="text-green-400 mb-1" />
                                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">100% Secure</span>
                                <span className="text-xs font-black text-white">Platform</span>
                            </div>
                        </div>

                    </div>

                    {/* Bottom Copyright */}
                    <div className="mt-10 pt-6 border-t border-[#24344D]/50 flex flex-col items-center justify-center gap-3 text-xs font-medium text-[#64748B] text-center">
                        <div className="flex items-center gap-1.5">
                            <span>Crafted with</span>
                            <Heart size={14} fill="currentColor" className="text-red-500 animate-pulse" />
                            <span>in Kashmir by <strong className="text-brand-400 font-bold">Abrar Larah</strong></span>
                        </div>
                        <div>
                            &copy; {new Date().getFullYear()} Goal Kashmir. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default React.memo(Footer);
