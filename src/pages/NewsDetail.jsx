import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { Calendar, Tag, ChevronLeft, Share2, Clock, User } from 'lucide-react';

const NewsDetail = () => {
    const { id } = useParams();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const docRef = doc(db, 'news', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setArticle({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (error) {
                console.error("Error fetching article:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Article Not Found</h2>
                <Link to="/news" className="text-brand-400 hover:text-brand-300 flex items-center justify-center gap-2">
                    <ChevronLeft size={20} /> Back to News
                </Link>
            </div>
        );
    }

    const date = article.createdAt?.seconds
        ? new Date(article.createdAt.seconds * 1000).toLocaleDateString(undefined, { dateStyle: 'long' })
        : 'Recently Published';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto px-4 py-8 md:py-12"
        >
            <Link
                to="/news"
                className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors mb-8 group"
            >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Latest News
            </Link>

            <article className="space-y-8">
                {/* Header Information */}
                <div className="space-y-4">
                    <motion.span
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="inline-block px-3 py-1 bg-brand-600/20 text-brand-400 text-xs font-bold uppercase tracking-wider rounded-lg border border-brand-500/20"
                    >
                        {article.category || 'Updates'}
                    </motion.span>

                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-5xl font-display font-bold text-slate-900 dark:text-white leading-tight"
                    >
                        {article.title}
                    </motion.h1>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap items-center gap-6 text-slate-600 dark:text-slate-400 text-sm py-4 border-y border-slate-200 dark:border-white/5"
                    >
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-brand-500" />
                            {date}
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-brand-500" />
                            5 min read
                        </div>
                        <div className="flex items-center gap-2">
                            <User size={16} className="text-brand-500" />
                            Goal Kashmir Editorial
                        </div>
                    </motion.div>
                </div>

                {/* Featured Image */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl shadow-black/50"
                >
                    <img
                        src={article.imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80'}
                        alt={article.title}
                        className="w-full h-full object-cover"
                    />
                </motion.div>

                {/* Content */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="prose prose-invert prose-brand max-w-none"
                >
                    <p className="text-xl text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-8">
                        {article.excerpt}
                    </p>
                    <div className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg whitespace-pre-wrap">
                        {article.content}
                    </div>
                </motion.div>

                {/* Footer / Actions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="pt-12 mt-12 border-t border-slate-200 dark:border-white/5 flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-900 dark:text-white rounded-xl transition-colors">
                            <Share2 size={18} />
                            Share
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Tag size={16} />
                        {article.tags || article.category || 'Soccer'}
                    </div>
                </motion.div>
            </article>
        </motion.div>
    );
};

export default NewsDetail;
