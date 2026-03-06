import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion } from 'framer-motion';

const SponsorsCarousel = () => {
    const [sponsors, setSponsors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSponsors = async () => {
            try {
                // Fetch active sponsors
                const q = query(
                    collection(db, 'sponsors'),
                    where('active', '==', true),
                    // We'll pull all active sponsors and then sort/filter them if needed
                );

                const snapshot = await getDocs(q);
                let sponsorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Sort by tier if needed (Premium > Gold > Silver > Bronze)
                const tierWeights = { 'Premium': 4, 'Gold': 3, 'Silver': 2, 'Bronze': 1 };
                sponsorsData.sort((a, b) => (tierWeights[b.tier] || 0) - (tierWeights[a.tier] || 0));

                setSponsors(sponsorsData);
            } catch (error) {
                console.error("Error fetching sponsors:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSponsors();
    }, []);

    if (loading || sponsors.length === 0) return null;

    return (
        <section className="py-8 border-t border-slate-200 dark:border-white/10 mt-12 overflow-hidden relative">
            <div className="container mx-auto px-4 mb-8">
                <h3 className="text-center text-sm font-bold tracking-widest text-slate-500 uppercase">Our Official Partners</h3>
            </div>

            <div className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
                <motion.ul
                    className="flex items-center justify-center md:justify-start [&_li]:mx-12 [&_img]:max-w-none animate-infinite-scroll"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{ ease: "linear", duration: 30, repeat: Infinity }}
                >
                    {/* Map twice to create auto-scrolling seamless loop */}
                    {[...sponsors, ...sponsors].map((sponsor, idx) => (
                        <li key={`${sponsor.id}-${idx}`} className="flex flex-col items-center gap-2 group flex-shrink-0">
                            <a
                                href={sponsor.websiteUrl || '#'}
                                target={sponsor.websiteUrl ? "_blank" : "_self"}
                                rel="noopener noreferrer"
                                className="block h-32 sm:h-40 w-64 sm:w-[320px] relative hover:scale-105 transition-transform duration-300 pointer-events-auto rounded-2xl overflow-hidden bg-slate-800/20"
                            >
                                <img
                                    src={sponsor.logoUrl}
                                    alt={sponsor.name}
                                    className="h-full w-full object-cover shadow-inner"
                                />
                            </a>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide">
                                {sponsor.name}
                            </span>
                        </li>
                    ))}
                </motion.ul>
            </div>
        </section>
    );
};

export default SponsorsCarousel;
