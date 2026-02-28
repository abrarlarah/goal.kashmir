import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

const MatchBracket = ({ matchesByRound }) => {
    // Define the order of rounds for the bracket
    const roundOrder = ['Quarter-Final', 'Semi-Final', 'Final'];

    // Filter rounds that actually have matches
    const activeRounds = roundOrder.filter(round => matchesByRound[round] && matchesByRound[round].length > 0);

    if (activeRounds.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                <div className="text-slate-500 mb-2">No knockout matches scheduled yet.</div>
                <div className="text-xs text-slate-600">Ensure matches have rounds like 'Quarter-Final', 'Semi-Final', or 'Final'.</div>
            </div>
        );
    }

    return (
        <div className="py-8 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
            <div className="flex gap-20 min-w-max px-8 pb-12 items-start">
                {activeRounds.map((round, roundIdx) => (
                    <div key={round} className="flex flex-col gap-12 items-center relative">
                        {/* Round Title */}
                        <div className="mb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 bg-slate-900 px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/5 shadow-sm">
                                {round}
                            </h4>
                        </div>

                        {/* Matches List */}
                        <div className="flex flex-col gap-16 justify-around h-full">
                            {matchesByRound[round].map((match, matchIdx) => (
                                <motion.div
                                    key={match.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: (roundIdx * 0.2) + (matchIdx * 0.1) }}
                                    className="relative"
                                >
                                    {/* Connectivity Lines */}
                                    {roundIdx < activeRounds.length - 1 && (
                                        <div className="absolute left-full top-1/2 w-20 h-px bg-slate-700 -z-10 bg-gradient-to-r from-slate-700 to-transparent">
                                            {/* You could add more complex SVG lines here for a "tree" look */}
                                        </div>
                                    )}

                                    <Link
                                        to={`/live/${match.id}`}
                                        className="block w-56 glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 hover:border-brand-500/50 transition-all shadow-2xl group active:scale-95"
                                    >
                                        <div className="bg-slate-900 p-1 flex flex-col">
                                            {/* Team A */}
                                            <div className={cn(
                                                "p-3 flex justify-between items-center transition-colors rounded-t-xl",
                                                match.status === 'finished' && match.scoreA > match.scoreB ? "bg-brand-500/10" : "bg-transparent"
                                            )}>
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[8px] font-bold border border-white/5">
                                                        {match.teamA.substring(0, 1)}
                                                    </div>
                                                    <span className={cn(
                                                        "text-xs font-bold truncate transition-colors",
                                                        match.status === 'finished' && match.scoreA > match.scoreB ? "text-brand-400" : "text-slate-300 group-hover:text-white"
                                                    )}>
                                                        {match.teamA}
                                                    </span>
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-black transition-opacity",
                                                    match.status === 'scheduled' ? "opacity-30" : "opacity-100",
                                                    match.status === 'finished' && match.scoreA > match.scoreB ? "text-brand-400" : "text-slate-400"
                                                )}>
                                                    {match.scoreA}
                                                </span>
                                            </div>

                                            {/* Divider */}
                                            <div className="h-px bg-slate-800 mx-2" />

                                            {/* Team B */}
                                            <div className={cn(
                                                "p-3 flex justify-between items-center transition-colors rounded-b-xl",
                                                match.status === 'finished' && match.scoreB > match.scoreA ? "bg-brand-500/10" : "bg-transparent"
                                            )}>
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[8px] font-bold border border-white/5">
                                                        {match.teamB.substring(0, 1)}
                                                    </div>
                                                    <span className={cn(
                                                        "text-xs font-bold truncate transition-colors",
                                                        match.status === 'finished' && match.scoreB > match.scoreA ? "text-brand-400" : "text-slate-300 group-hover:text-white"
                                                    )}>
                                                        {match.teamB}
                                                    </span>
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-black transition-opacity",
                                                    match.status === 'scheduled' ? "opacity-30" : "opacity-100",
                                                    match.status === 'finished' && match.scoreB > match.scoreA ? "text-brand-400" : "text-slate-400"
                                                )}>
                                                    {match.scoreB}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Match Info Badge */}
                                        <div className="bg-slate-800/50 py-1.5 px-3 flex justify-between items-center boreder-t border-white/5">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">
                                                {match.status}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-500">
                                                {match.date}
                                            </span>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MatchBracket;
