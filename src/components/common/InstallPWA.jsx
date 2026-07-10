import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If already installed, we won't show it
    window.addEventListener('appinstalled', () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-96 z-50 pointer-events-auto"
      >
        <div className="bg-[#131D31] bg-[#131D31] rounded-2xl shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 p-4 border border-brand-500/20 overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl"></div>
          
          <button 
            onClick={handleDismiss} 
            className="absolute top-2 right-2 p-1.5 text-[#64748B] hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-[#18253C] dark:hover:bg-slate-700 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-cyan-500 flex-shrink-0 flex items-center justify-center text-white shadow-inner">
              <Download size={24} />
            </div>
            
            <div className="flex-1 pr-4">
              <h3 className="font-bold text-white text-white mb-1">Install Goal Kashmir</h3>
              <p className="text-xs text-[#64748B] text-[#94A3B8] mb-3 leading-relaxed">
                Install our app for a faster experience, offline access to scores, and easy access from your home screen.
              </p>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleInstallClick}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm active:scale-95"
                >
                  Install App
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallPWA;
