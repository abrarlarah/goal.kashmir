import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';
import { Trophy, Edit3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Proper knockout bracket component.
 * Renders rounds left-to-right (earliest round → Final) with connecting lines.
 */
const MatchBracket = ({ matchesByRound, tournamentTeams = [] }) => {
    const { isAdmin } = useAuth();

    // Order rounds from earliest to latest
    const orderedRounds = useMemo(() => {
        if (!matchesByRound || Object.keys(matchesByRound).length === 0) return [];

        const roundPriority = {
            'Round of 64': 1,
            'Round of 32': 2,
            'Round of 16': 3,
            'Quarter-Final': 4,
            'Semi-Final': 5,
            'Final': 6,
        };

        // Map all round keys and sort by priority (preliminary rounds go first)
        const allRounds = Object.keys(matchesByRound);

        return allRounds.sort((a, b) => {
            // Preliminary rounds first
            const aIsPrelim = a.toLowerCase().includes('preliminary') || a.toLowerCase().includes('qualifying');
            const bIsPrelim = b.toLowerCase().includes('preliminary') || b.toLowerCase().includes('qualifying');
            if (aIsPrelim && !bIsPrelim) return -1;
            if (!aIsPrelim && bIsPrelim) return 1;

            // Use roundOrder from first match if available
            const aOrder = matchesByRound[a]?.[0]?.roundOrder;
            const bOrder = matchesByRound[b]?.[0]?.roundOrder;
            if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;

            // Fallback: use priority map
            const aPriority = roundPriority[a] || 0;
            const bPriority = roundPriority[b] || 0;
            if (aPriority !== bPriority) return aPriority - bPriority;

            // Last resort: alphabetical
            return a.localeCompare(b);
        });
    }, [matchesByRound]);

    // Get team logo/info
    const getTeamInfo = (teamName) => {
        return tournamentTeams.find(t => t.name === teamName);
    };

    // Render a single match card
    const renderMatchCard = (match, isFinal = false, side = 'left') => {
        if (!match) return null;

        const teamAInfo = getTeamInfo(match.teamA);
        const teamBInfo = getTeamInfo(match.teamB);

        const teams = [
            { name: match.teamA, score: match.scoreA, win: match.status === 'finished' && match.scoreA > match.scoreB, info: teamAInfo },
            { name: match.teamB, score: match.scoreB, win: match.status === 'finished' && match.scoreB > match.scoreA, info: teamBInfo }
        ];

        return (
            <motion.div
                key={match.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={cn(
                    "relative group/card flex items-center",
                    side === 'right' ? "flex-row-reverse" : "flex-row",
                    isFinal ? "w-64" : "w-48 lg:w-56"
                )}
            >
                {/* Connector line to NEXT round (outward from wings) */}
                {!isFinal && (
                    <div className={cn(
                        "absolute top-1/2 w-6 md:w-10 h-[2px] bg-slate-700/50",
                        side === 'left' ? "left-full" : "right-full"
                    )} />
                )}

                <div className={cn(
                    "w-full rounded-xl overflow-hidden border transition-all duration-300 relative bg-slate-900/80 z-10",
                    isFinal ? "border-2 border-brand-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)]" : "border-white/10 hover:border-brand-500/30",
                    match.isPlaceholder && "opacity-50 grayscale",
                    match.status === 'live' && "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                )}>
                    {/* Header */}
                    <div className={cn(
                        "px-2 py-1 flex justify-between items-center text-[8px] font-black uppercase tracking-tighter",
                        match.status === 'live' ? "bg-red-500/10 text-red-500" : "bg-white/5 text-slate-500"
                    )}>
                        <span>{match.status === 'live' ? 'LIVE' : match.time || 'Match'}</span>
                        <span>{match.date}</span>
                    </div>

                    {/* Teams */}
                    <div className="p-2 space-y-1">
                        {teams.map((t, i) => (
                            <div key={i} className={cn(
                                "flex items-center justify-between gap-2 px-1 py-0.5 rounded transition-colors",
                                t.win && "bg-brand-500/5"
                            )}>
                                <div className={cn("flex items-center gap-2 overflow-hidden flex-1", side === 'right' && "flex-row-reverse")}>
                                    <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center shrink-0 border border-white/5 overflow-hidden">
                                        {t.info?.logoUrl ? <img src={t.info.logoUrl} className="w-full h-full object-contain p-0.5" alt="" /> : <span className="text-[8px]">{t.name?.[0] || '?'}</span>}
                                    </div>
                                    <span className={cn("text-[11px] font-bold truncate", t.win ? "text-brand-400" : "text-slate-300")}>
                                        {t.name || 'TBD'}
                                    </span>
                                </div>
                                <span className="text-[11px] font-black text-slate-100">{match.status !== 'scheduled' ? t.score : '-'}</span>
                            </div>
                        ))}
                    </div>

                    {isAdmin && (
                        <Link to={`/live/${match.id}`} className="absolute top-1 right-1 p-1 bg-brand-500 text-slate-900 rounded-md opacity-0 group-hover/card:opacity-100 transition-all z-20">
                            <Edit3 size={10} />
                        </Link>
                    )}
                </div>
            </motion.div>
        );
    };

    if (!matchesByRound || Object.keys(matchesByRound).length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                <Trophy size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                <div className="text-slate-500 mb-2 font-display font-bold">No Bracket Structure</div>
                <div className="text-xs text-slate-600 italic">Create a tournament with "Auto-Seed" or add matches manually.</div>
            </div>
        );
    }

    // Count total rounds excluding Final for wing calculation
    const wingRounds = orderedRounds.filter(r => r !== 'Final');
    const finalMatch = matchesByRound['Final']?.[0];

    return (
        <div className="py-12 overflow-x-auto custom-scrollbar">
            <div className="flex items-center justify-center min-w-max px-12 gap-12 lg:gap-20">

                {/* Left Wing (Pool A) - Inward Flow */}
                <div className="flex gap-12 lg:gap-20">
                    {wingRounds.map((roundName, rIdx) => {
                        const matches = matchesByRound[roundName] || [];
                        const poolAMatches = matches.filter(m => m.pool === 'A' || (!m.pool && matches.indexOf(m) < matches.length / 2));

                        if (poolAMatches.length === 0) return null;

                        return (
                            <div key={`left-${roundName}`} className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-6">{roundName}</span>
                                <div className="flex flex-col justify-around h-full gap-8">
                                    {poolAMatches.map((m, mIdx) => renderMatchCard(m, false, 'left'))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Center Piece (Final) */}
                <div className="relative flex flex-col items-center">
                    <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-8">Championship Final</span>
                    <div className="relative">
                        {/* Decorative background for final */}
                        <div className="absolute inset-0 bg-brand-500/10 blur-3xl rounded-full scale-150 -z-10" />
                        {finalMatch ? renderMatchCard(finalMatch, true) : (
                            <div className="w-64 h-32 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center bg-slate-950/50">
                                <Trophy size={24} className="text-slate-700 mb-2" />
                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Final Match</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Wing (Pool B) - Inward Flow (Reversed Order) */}
                <div className="flex flex-row-reverse gap-12 lg:gap-20">
                    {wingRounds.map((roundName, rIdx) => {
                        const matches = matchesByRound[roundName] || [];
                        const poolBMatches = matches.filter(m => m.pool === 'B' || (!m.pool && matches.indexOf(m) >= matches.length / 2));

                        if (poolBMatches.length === 0) return null;

                        return (
                            <div key={`right-${roundName}`} className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-6">{roundName}</span>
                                <div className="flex flex-col justify-around h-full gap-8">
                                    {poolBMatches.map((m, mIdx) => renderMatchCard(m, false, 'right'))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-16 pt-6 border-t border-white/5 mx-auto max-w-2xl">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-brand-500/20 border border-brand-500/30" />
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Champion Pathway</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30 animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Live Action</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-slate-800 border border-white/5 opacity-50" />
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Unscheduled</span>
                </div>
            </div>
        </div>
    );
};

export default MatchBracket;
