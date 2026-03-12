import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Image as ImageIcon, Video, Filter, X, Play, ZoomIn, Download, Share2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { handleShare } from '../utils/shareUtils';
import { cn } from '../utils/cn';
import { useData } from '../context/DataContext';

const Gallery = () => {
    const [mediaItems, setMediaItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'Match Action', 'Teams', 'Players', 'Fans', 'Trophy'
    const [selectedMedia, setSelectedMedia] = useState(null);

    useEffect(() => {
        const fetchGallery = async () => {
            try {
                const galleryRef = collection(db, 'gallery');
                const gallerySnap = await getDocs(galleryRef);
                const items = [];
                gallerySnap.forEach(doc => {
                    items.push({ id: doc.id, ...doc.data() });
                });
                
                // Sort newest first
                items.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
                setMediaItems(items);
            } catch (error) {
                console.error("Error fetching gallery:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGallery();
    }, []);

    const filteredMedia = useMemo(() => {
        if (filter === 'all') return mediaItems;
        return mediaItems.filter(item => item.category === filter);
    }, [mediaItems, filter]);

    const categories = [
        { id: 'all', label: 'All Photos' },
        { id: 'Match Action', label: 'Action' },
        { id: 'Teams', label: 'Teams' },
        { id: 'Players', label: 'Players' },
        { id: 'Fans', label: 'Fans' },
        { id: 'Trophy', label: 'Awards' }
    ];

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent shadow-lg shadow-brand-500/20"></div>
                    <div className="text-slate-600 dark:text-slate-400 font-display font-medium animate-pulse">Loading Gallery...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8 min-h-screen">
            
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-sm font-medium mb-4">
                        <Camera size={14} /> Official Media
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight mb-2">
                        Photo <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Gallery</span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-sm md:text-base">
                        Explore exclusive match highlights, team photos, and behind-the-scenes moments from Goal Kashmir.
                    </p>
                </div>

                {/* Filters */}
                <div className="relative min-w-[200px] sm:min-w-[240px]">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full appearance-none bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 text-slate-900 dark:text-white text-sm font-bold rounded-xl px-5 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm cursor-pointer transition-colors"
                    >
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-800">
                                {cat.label}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                    </div>
                </div>
            </motion.div>

            {/* Masonry Grid */}
            {filteredMedia.length > 0 ? (
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                    <AnimatePresence>
                        {filteredMedia.map((media, index) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                key={media.id}
                                className="break-inside-avoid relative group cursor-pointer rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-200/10 dark:border-white/5 bg-slate-100 dark:bg-slate-800"
                                onClick={() => setSelectedMedia(media)}
                            >
                                <img 
                                    src={media.thumbnail} 
                                    alt={media.title}
                                    className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500"
                                    loading="lazy"
                                />
                                
                                {/* Overlay / Hover Details */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-2 rounded-full text-white transform -translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                        <ZoomIn size={18} />
                                    </div>
                                    <div className="transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-1 block">
                                            {categories.find(c => c.id === media.category)?.label}
                                        </span>
                                        <h3 className="text-white font-bold truncate leading-tight">{media.title}</h3>
                                        <p className="text-white/70 text-xs mt-1">{media.date}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="py-20 text-center glass-card rounded-3xl border border-slate-200/5 dark:border-white/5">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera size={24} className="text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Media Found</h3>
                    <p className="text-slate-500">There are no photos matched in this category. Check back later after weekend fixtures!</p>
                </div>
            )}

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedMedia && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedMedia(null)}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-8"
                    >
                        <button 
                            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
                            onClick={(e) => { e.stopPropagation(); setSelectedMedia(null); }}
                        >
                            <X size={24} />
                        </button>
                        
                        <div 
                            className="relative max-w-6xl w-full max-h-full flex flex-col items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <motion.img
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                src={selectedMedia.url}
                                alt={selectedMedia.title}
                                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                            />
                            
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="mt-6 w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm"
                            >
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">{selectedMedia.title}</h2>
                                    <p className="text-white/60 text-sm mt-1">{selectedMedia.date} • {categories.find(c => c.id === selectedMedia.category)?.label}</p>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <a 
                                        href={selectedMedia.url} 
                                        download={`goalkashmir-${selectedMedia.id}.jpg`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-400 text-slate-900 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
                                    >
                                        <Download size={18} />
                                        Save
                                    </a>
                                    <button 
                                        onClick={() => handleShare(
                                            selectedMedia.title,
                                            `Awesome photo from Goal Kashmir!`,
                                            `/gallery` // Ideal would be absolute URL to the image or a specific gallery query, but /gallery works as an entry point
                                        )}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
                                    >
                                        <Share2 size={18} />
                                        Share
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default Gallery;
