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
        { id: 'draw', label: 'Draw', color: 'bg-[#0B1220]0' },
        { id: 'away', label: teamB, color: 'bg-indigo-500' }
    ];

    if (loading && totalVotes === 0) {
        return (
            <div className="bg-[#131D31]/60 dark:bg-[#0B1220]/60 bg-[#131D31]/50 backdrop-blur-sm rounded-3xl p-6 border border-[#24344D]/40 animate-pulse h-64" />
        );
    }

    return (
        <div className="bg-[#131D31]/60 dark:bg-[#0B1220]/60 bg-[#131D31]/50 backdrop-blur-sm rounded-3xl p-6 border border-[#24344D]/40 shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-500/10 rounded-xl text-brand-400">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h3 className="font-display font-black text-white italic uppercase tracking-wider text-sm">Win Probability</h3>
                        <p className="text-[10px] text-[#64748B] font-bold uppercase">Fan Predictions</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-[#131D31]/50 rounded-full border border-[#24344D]/40">
                    <Users size={12} className="text-[#64748B]" />
                    <span className="text-xs font-black text-[#94A3B8]">{totalVotes} Votes</span>
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
                                className="group relative overflow-hidden bg-[#131D31]/50 hover:bg-[#131D31]/10 border border-[#24344D]/40 rounded-2xl p-4 transition-all hover:border-brand-500/30 font-bold"
                            >
                                <span className="relative z-10 text-xs font-black text-[#94A3B8] group-hover:text-slate-900 text-white uppercase transition-colors">
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
                                                    isSelected ? "text-brand-400" : "text-[#94A3B8]"
                                                )}>
                                                    {choice.label}
                                                </span>
                                                {isSelected && <CheckCircle2 size={14} className="text-brand-400" />}
                                            </div>
                                            <span className="text-lg font-impact text-white">{Math.round(percent)}%</span>
                                        </div>
                                        <div className="h-3 w-full bg-[#101827] bg-[#131D31]/50 rounded-full overflow-hidden border border-[#24344D]/40 p-[1px]">
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

                        <div className="pt-4 border-t border-[#24344D]/40">
                            <p className="text-[10px] text-[#64748B] font-bold uppercase mb-3 text-center">Change your prediction:</p>
                            <div className="grid grid-cols-3 gap-2">
                                {choices.map(choice => (
                                    <button
                                        key={choice.id}
                                        onClick={() => handleVote(choice.id)}
                                        className={cn(
                                            "px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border",
                                            userVote === choice.id
                                                ? "bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20"
                                                : "bg-[#131D31]/50 text-[#64748B] border-[#24344D]/40 hover:bg-[#131D31]/10 hover:text-white"
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
