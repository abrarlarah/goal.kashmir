import React from 'react';
import { Heart } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="w-full border-t border-slate-200 dark:border-white/10 bg-white dark:bg-dark-bg mt-auto">
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 text-sm text-slate-500 font-medium">
                    <Heart size={14} fill="currentColor" className="text-red-500 animate-pulse" />
                    <span>Crafted in kashmir</span>

                    <span>by <strong className="text-brand-500 font-bold dark:text-brand-400">Abrar Larah</strong></span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
