import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Tag, ChevronRight, Newspaper, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const News = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const newsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Mock data if empty for demo
                if (newsData.length === 0) {
                    setNews([
                        { id: 1, title: 'Season Kickoff Announced', excerpt: 'The new season starts this weekend with exciting fixtures.', imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80', category: 'Announcement', createdAt: { seconds: Date.now() / 1000 } },
                        { id: 2, title: 'Star Player Transfer Rumors', excerpt: 'Top clubs are eyeing the league\'s top scorer.', imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&q=80', category: 'Transfer', createdAt: { seconds: Date.now() / 1000 - 86400 } },
                    ]);
                } else {
                    setNews(newsData);
                }
            } catch (error) {
                console.error("Error fetching news:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                    <div className="text-slate-400 font-medium animate-pulse">Loading News...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-2xl mx-auto"
            >
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">Latest News</h1>
                <p className="text-slate-400 text-lg">Stay updated with the latest match reports, transfer news, and club announcements.</p>
            </motion.div>

            {news.length > 0 ? (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                    {/* Featured Article (First One) */}
                    <motion.div
                        variants={item}
                        className="lg:col-span-2 group cursor-pointer relative rounded-3xl overflow-hidden aspect-[16/9] md:aspect-[21/9]"
                        onClick={() => window.location.href = `/news/${news[0].id}`}
                    >
                        <img
                            src={news[0].imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80'}
                            alt={news[0].title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/50 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-8 space-y-3">
                            <span className="inline-block px-3 py-1 bg-brand-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg">
                                {news[0].category}
                            </span>
                            <h2 className="text-2xl md:text-4xl font-display font-bold text-white leading-tight max-w-2xl group-hover:text-brand-400 transition-colors">
                                {news[0].title}
                            </h2>
                            <p className="text-slate-300 line-clamp-2 max-w-xl text-sm md:text-base">
                                {news[0].excerpt}
                            </p>
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium pt-2">
                                <Calendar size={14} />
                                {news[0].createdAt?.seconds ? new Date(news[0].createdAt.seconds * 1000).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Today'}
                            </div>
                        </div>
                    </motion.div>

                    {/* Other Articles */}
                    {news.slice(1).map((article) => (
                        <Link
                            key={article.id}
                            to={`/news/${article.id}`}
                            className="group flex flex-col glass-card rounded-2xl overflow-hidden hover:border-brand-500/30 transition-all duration-300 h-full"
                        >
                            <motion.div variants={item} className="h-full flex flex-col">
                                <div className="relative aspect-video overflow-hidden">
                                    <img
                                        src={article.imageUrl || 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80'}
                                        alt={article.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className="px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded border border-white/10">
                                            {article.category}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="text-xl font-display font-bold text-white mb-2 line-clamp-2 group-hover:text-brand-400 transition-colors">
                                        {article.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm line-clamp-3 mb-4 flex-1">
                                        {article.excerpt}
                                    </p>

                                    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                        <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <Calendar size={12} />
                                            {article.createdAt?.seconds ? new Date(article.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}
                                        </span>
                                        <span className="text-xs font-bold text-brand-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                            Read More <ArrowRight size={12} />
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </motion.div>
            ) : (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <Newspaper className="w-16 h-16 text-slate-600 mx-auto mb-4" strokeWidth={1.5} />
                    <h3 className="text-xl font-bold text-white mb-2">No News Yet</h3>
                    <p className="text-slate-400">Check back later for the latest updates from the league.</p>
                </div>
            )}
        </div>
    );
};

export default News;
