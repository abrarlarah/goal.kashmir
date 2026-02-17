import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { REPO_ASSETS } from '../../constants/repoAssets';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const AssetPicker = ({ isOpen, onClose, onSelect, category }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [dynamicAssets, setDynamicAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;

        const q = query(collection(db, 'assets'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const assets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setDynamicAssets(assets);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen]);

    const allAssets = [...REPO_ASSETS, ...dynamicAssets];

    const filteredAssets = allAssets.filter(asset => {
        const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !category || asset.category === category;
        return matchesSearch && matchesCategory;
    });

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-gray-800 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gray-800/50">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="text-brand-500" size={20} />
                            <h3 className="text-lg font-bold text-white">Select from Repository</h3>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="p-4 border-b border-white/5 bg-gray-900/20">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder={`Search ${category || 'repository'} assets...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="p-4 max-h-[60vh] overflow-y-auto min-h-[300px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
                                <Loader2 className="animate-spin text-brand-500" size={40} />
                                <p className="text-gray-500 text-sm">Fetching repository assets...</p>
                            </div>
                        ) : filteredAssets.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {filteredAssets.map(asset => (
                                    <div
                                        key={asset.id}
                                        onClick={() => {
                                            onSelect(asset.url);
                                            onClose();
                                        }}
                                        className="group relative cursor-pointer aspect-square rounded-xl overflow-hidden border border-white/5 hover:border-brand-500/50 transition-all shadow-lg bg-black/20"
                                    >
                                        <img
                                            src={asset.url}
                                            alt={asset.name}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                            <p className="text-[10px] text-white font-medium truncate">{asset.name}</p>
                                        </div>
                                        <div className="absolute top-2 right-2 bg-brand-500 h-6 w-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-lg scale-0 group-hover:scale-100 transition-all">
                                            <Check size={14} className="text-white font-bold" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="col-span-full py-12 text-center text-gray-500 flex flex-col items-center gap-2">
                                <ImageIcon size={48} className="opacity-20" />
                                <p>No assets found in this category.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 bg-gray-900/50 text-right">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AssetPicker;
