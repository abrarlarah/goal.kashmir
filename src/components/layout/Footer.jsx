import React, { useState, useEffect } from 'react';
import { Heart, Download, Smartphone, Shield, Zap } from 'lucide-react';

const Footer = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsInstalled(true);
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        
        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setIsInstalled(true);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert("App installation is not supported on this browser or you have already installed it. If you're on iOS, tap the 'Share' button and select 'Add to Home Screen'.");
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    return (
        <footer className="relative mt-auto w-full overflow-hidden">
            {/* Fancy Background Gradients */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50 dark:to-[#020617] pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
            
            <div className="relative border-t border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                <div className="container mx-auto px-4 py-10">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                        
                        {/* Brand Section */}
                        <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left space-y-3">
                            <h2 className="text-2xl font-black font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-cyan-500">
                                GOAL KASHMIR
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
                                The premium soccer tournament management platform. Track live scores, teams, and stats in real-time.
                            </p>
                        </div>

                        {/* Install App Section (Vibrant & Attractive) */}
                        <div className="md:col-span-4 flex justify-center">
                            {!isInstalled ? (
                                <button 
                                    onClick={handleInstallClick}
                                    className="group relative flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-brand-500 to-cyan-500 rounded-2xl shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-300 hover:-translate-y-1 active:scale-95 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                                    <div className="relative bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                        <Smartphone size={20} className="text-white" />
                                    </div>
                                    <div className="relative text-left">
                                        <span className="block text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none mb-0.5">Get the App</span>
                                        <span className="block text-sm font-black text-white leading-none">Install Now</span>
                                    </div>
                                    <Download size={16} className="relative text-white/70 group-hover:text-white group-hover:animate-bounce ml-2" />
                                </button>
                            ) : (
                                <div className="flex justify-center items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-bold shadow-sm">
                                    <Shield size={16} /> App Installed Securely
                                </div>
                            )}
                        </div>

                        {/* Stats / Badges */}
                        <div className="md:col-span-4 flex justify-center md:justify-end gap-4">
                            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 shadow-inner">
                                <Zap size={18} className="text-amber-500 mb-1" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lightning</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white">Fast</span>
                            </div>
                            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 shadow-inner">
                                <Shield size={18} className="text-emerald-500 mb-1" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">100% Secure</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white">Platform</span>
                            </div>
                        </div>

                    </div>

                    {/* Bottom Copyright */}
                    <div className="mt-10 pt-6 border-t border-slate-200/50 dark:border-white/5 flex flex-col items-center justify-center gap-3 text-xs font-medium text-slate-500 text-center">
                        <div className="flex items-center gap-1.5">
                            <span>Crafted with</span>
                            <Heart size={14} fill="currentColor" className="text-red-500 animate-pulse" />
                            <span>in Kashmir by <strong className="text-brand-500 dark:text-brand-400 font-bold">Abrar Larah</strong></span>
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
