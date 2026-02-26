import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion } from 'framer-motion';
import { TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const MatchPredictions = ({ matchId, teamA, teamB }) => {
    const [votes, setVotes] = useState({ home: 0, draw: 0, away: 0 });
    const [userVote, setUserVote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isVoting, setIsVoting] = useState(false);
    const [voteError, setVoteError] = useState(null);

    useEffect(() => {
        if (!matchId) return;

        try {
            const storedVote = localStorage.getItem(`vote_${matchId}`);
            if (storedVote) {
                setUserVote(storedVote);
            }
        } catch (e) {
            console.warn("LocalStorage not available");
        }

        const predRef = doc(db, 'match_predictions', matchId);
        const unsubscribe = onSnapshot(predRef, (snapshot) => {
            if (snapshot.exists()) {
                setVotes(snapshot.data());
            } else {
                setVotes({ home: 0, draw: 0, away: 0 });
            }
            setLoading(false);
        }, (err) => {
            console.error("Snapshot error:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [matchId]);

    const handleVote = async (choice) => {
        if (!matchId || isVoting) return;

        setIsVoting(true);
        setVoteError(null);

        try {
            const predRef = doc(db, 'match_predictions', matchId);

            if (userVote) {
                if (userVote === choice) {
                    setIsVoting(false);
                    return;
                }

                await setDoc(predRef, {
                    [userVote]: increment(-1),
                    [choice]: increment(1)
                }, { merge: true });
            } else {
                await setDoc(predRef, {
                    [choice]: increment(1)
                }, { merge: true });
            }

            setUserVote(choice);
            try {
                localStorage.setItem(`vote_${matchId}`, choice);
            } catch (e) {
                console.warn("Could not save vote to LocalStorage");
            }
        } catch (error) {
            console.error("Detailed Voting Error:", error);
            if (error.code === 'permission-denied') {
                setVoteError("Permission Denied: Your Firestore rules are blocking guest writes to 'match_predictions'.");
            } else {
                setVoteError(`Error: ${error.message || 'Failed to save vote'}`);
            }
        } finally {
            setIsVoting(false);
        }
    };

    const totalVotes = (votes.home || 0) + (votes.draw || 0) + (votes.away || 0);
    const getPercentage = (count) => {
        if (totalVotes === 0) return 33.3;
        return ((count || 0) / totalVotes) * 100;
    };

    const choices = [
        { id: 'home', label: teamA, color: 'bg-brand-500' },
        { id: 'draw', label: 'Draw', color: 'bg-slate-500' },
        { id: 'away', label: teamB, color: 'bg-indigo-500' }
    ];

    if (loading && totalVotes === 0) {
        return (
            <div className="bg-slate-900/50 dark:bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-slate-200 dark:border-white/5 animate-pulse h-64" />
        );
    }

    return (
        <div className="bg-slate-900/50 dark:bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-slate-200 dark:border-white/5 shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-500/10 rounded-xl text-brand-400">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h3 className="font-display font-black text-slate-900 dark:text-white italic uppercase tracking-wider text-sm">Win Probability</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Fan Predictions</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-slate-200 dark:border-white/5">
                    <Users size={12} className="text-slate-500" />
                    <span className="text-xs font-black text-slate-600 dark:text-slate-400">{totalVotes} Votes</span>
                </div>
            </div>

            <div className="space-y-6">
                {voteError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-[10px] text-red-400 font-bold uppercase text-center">{voteError}</p>
                    </div>
                )}

                {isVoting && (
                    <div className="flex justify-center">
                        <div className="animate-spin h-4 w-4 border-2 border-brand-500 border-t-transparent rounded-full" />
                    </div>
                )}

                {!userVote ? (
                    <div className="grid grid-cols-3 gap-3">
                        {choices.map(choice => (
                            <button
                                key={choice.id}
                                onClick={() => handleVote(choice.id)}
                                className="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-slate-200 dark:border-white/5 rounded-2xl p-4 transition-all hover:border-brand-500/30 font-bold"
                            >
                                <span className="relative z-10 text-xs font-black text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:text-white uppercase transition-colors">
                                    {choice.label}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            {choices.map(choice => {
                                const percent = getPercentage(votes[choice.id]);
                                const isSelected = userVote === choice.id;

                                return (
                                    <div key={choice.id} className="relative">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-xs font-black uppercase tracking-wider",
                                                    isSelected ? "text-brand-400" : "text-slate-600 dark:text-slate-400"
                                                )}>
                                                    {choice.label}
                                                </span>
                                                {isSelected && <CheckCircle2 size={14} className="text-brand-400" />}
                                            </div>
                                            <span className="text-lg font-impact text-slate-900 dark:text-white">{Math.round(percent)}%</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200 dark:border-white/5 p-[1px]">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percent}%` }}
                                                className={cn("h-full rounded-full", choice.color)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-3 text-center">Change your prediction:</p>
                            <div className="grid grid-cols-3 gap-2">
                                {choices.map(choice => (
                                    <button
                                        key={choice.id}
                                        onClick={() => handleVote(choice.id)}
                                        className={cn(
                                            "px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border",
                                            userVote === choice.id
                                                ? "bg-brand-500 text-slate-900 dark:text-white border-brand-500 shadow-lg shadow-brand-500/20"
                                                : "bg-white/5 text-slate-500 border-slate-200 dark:border-white/5 hover:bg-white/10 hover:text-slate-900 dark:text-white"
                                        )}
                                    >
                                        {choice.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchPredictions;
