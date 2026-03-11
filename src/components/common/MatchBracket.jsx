import React, { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';
import { Trophy, Edit3 } from 'lucide-react';

/**
 * Responsive knockout bracket component.
 * Shows a large horizontal bracket tree on ALL screen sizes.
 * On mobile, auto-scales down to fit the container width.
 */
const MatchBracket = ({ matchesByRound, tournamentTeams = [], canEdit = false }) => {
    const containerRef = useRef(null);
    const bracketRef = useRef(null);
    const [scaledStyle, setScaledStyle] = useState({ transform: 'scale(1)', transformOrigin: 'top left' });
    const [wrapperHeight, setWrapperHeight] = useState('auto');

    const fitBracket = useCallback(() => {
        const bracket = bracketRef.current;
        const container = containerRef.current;
        if (!bracket || !container) return;

        // Reset to measure natural size
        bracket.style.transform = 'scale(1)';
        bracket.style.transformOrigin = 'top center';
        bracket.style.width = 'auto';

        // Force reflow
        void bracket.offsetWidth;

        const naturalW = bracket.scrollWidth;
        const naturalH = bracket.scrollHeight;
        const containerW = container.clientWidth;

        let s = containerW / naturalW;
        // Cap the maximum scale so it doesn't get comically huge
        if (s > 1.25) s = 1.25;

        // Apply scale - we removed the minimum scale limit so it always fits
        bracket.style.transform = `scale(${s})`;
        bracket.style.transformOrigin = 'top left';
        // Force the container to collapse to the scaled width so centering works
        bracket.style.width = `${naturalW}px`;
        
        setScaledStyle({ transform: `scale(${s})`, transformOrigin: 'top left', width: naturalW });
        
        setWrapperHeight(Math.ceil(naturalH * s) + 48); // +48 for padding

        // Safe centering without clipping:
        const scaledWidth = naturalW * s;
        if (scaledWidth < containerW) {
            bracket.style.marginLeft = `${(containerW - scaledWidth) / 2}px`;
        } else {
            bracket.style.marginLeft = '0px';
        }
    }, []);

    useLayoutEffect(() => {
        fitBracket();
    }, [fitBracket, matchesByRound]);

    useEffect(() => {
        window.addEventListener('resize', fitBracket);
        return () => window.removeEventListener('resize', fitBracket);
    }, [fitBracket]);

    // ─── ORDERED ROUNDS ───
    const orderedRounds = useMemo(() => {
        if (!matchesByRound || Object.keys(matchesByRound).length === 0) return [];

        const roundPriority = {
            'Preliminary': 0,
            'Round of 128': 0.5,
            'Round of 64': 1,
            'Round of 32': 2,
            'Round of 16': 3,
            'Quarter-Final': 4,
            'Semi-Final': 5,
            'Final': 6,
        };

        const allRounds = Object.keys(matchesByRound);

        return allRounds.sort((a, b) => {
            const aIsPrelim = a.toLowerCase().includes('preliminary') || a.toLowerCase().includes('qualifying');
            const bIsPrelim = b.toLowerCase().includes('preliminary') || b.toLowerCase().includes('qualifying');
            if (aIsPrelim && !bIsPrelim) return -1;
            if (!aIsPrelim && bIsPrelim) return 1;

            const aOrder = matchesByRound[a]?.[0]?.roundOrder;
            const bOrder = matchesByRound[b]?.[0]?.roundOrder;
            if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;

            const aPriority = roundPriority[a] || 0;
            const bPriority = roundPriority[b] || 0;
            if (aPriority !== bPriority) return aPriority - bPriority;

            return a.localeCompare(b);
        });
    }, [matchesByRound]);

    const getTeamInfo = (teamName) => {
        return tournamentTeams.find(t => t.name === teamName);
    };

    // ─────────────────────────────────────────────
    // MATCH CARD — tightly packed 
    // ─────────────────────────────────────────────
    const CARD_W = 140;        // Standard card width (reduced again)
    const FINAL_CARD_W = 160;  // Final card width 
    const CONNECTOR = 16;      // Horizontal connector line width 
    const ROUND_GAP = 12;      // Gap between round columns
    const MATCH_GAP = 8;       // Gap between match cards in a column
    const LOGO_SIZE = 14;      // Team logo size 
    const TEAM_FONT = 9;       // Team name font size
    const SCORE_FONT = 10;     // Score font size
    const HEADER_FONT = 7;     // Match header (time/date) font size
    const ROUND_LABEL_FONT = 8; // Round name label font size

    const renderMatchCard = (match, isFinal = false, side = 'left') => {
        if (!match) return null;

        const teamAInfo = getTeamInfo(match.teamA);
        const teamBInfo = getTeamInfo(match.teamB);
        const w = isFinal ? FINAL_CARD_W : CARD_W;

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
                    "relative group/card flex items-center shrink-0",
                    side === 'right' ? "flex-row-reverse" : "flex-row",
                )}
                style={{ width: w }}
            >
                {/* Connector line */}
                {!isFinal && (
                    <div
                        className={cn(
                            "absolute top-1/2 h-[2px]",
                            side === 'left'
                                ? "left-full bg-gradient-to-r from-slate-600/60 to-brand-500/30"
                                : "right-full bg-gradient-to-r from-brand-500/30 to-slate-600/60"
                        )}
                        style={{ width: CONNECTOR }}
                    />
                )}

                <div className={cn(
                    "w-full rounded-xl overflow-hidden border transition-all duration-300 relative bg-white/90 dark:bg-slate-900/90 z-10",
                    isFinal
                        ? "border-2 border-brand-500/50 shadow-[0_0_20px_rgba(14,165,233,0.15)]"
                        : "border-slate-200/10 dark:border-white/10 hover:border-brand-500/30",
                    match.isPlaceholder && "opacity-50 grayscale",
                    match.status === 'live' && "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                )}>
                    {/* Header */}
                    <div className={cn(
                        "px-3 flex justify-between items-center font-black uppercase tracking-wider",
                        match.status === 'live'
                            ? "bg-red-500/10 text-red-500"
                            : isFinal
                                ? "bg-brand-500/10 text-brand-400"
                                : "bg-white/5 text-slate-500"
                    )} style={{ fontSize: HEADER_FONT, paddingTop: 4, paddingBottom: 4 }}>
                        <span className="flex items-center gap-1">
                            {match.status === 'live' && <span className="bg-red-500 rounded-full animate-pulse" style={{ width: 5, height: 5 }} />}
                            {match.status === 'live' ? 'LIVE' : match.time || 'Match'}
                        </span>
                        <span>{match.date}</span>
                    </div>

                    {/* Teams */}
                    <div style={{ padding: 6 }}>
                        {teams.map((t, i) => (
                            <div key={i} className={cn(
                                "flex items-center justify-between gap-2 rounded-lg transition-colors",
                                t.win && "bg-brand-500/5"
                            )} style={{ padding: '3px 4px' }}>
                                <div className={cn(
                                    "flex items-center gap-2 overflow-hidden flex-1",
                                    side === 'right' && "flex-row-reverse"
                                )}>
                                    <div className={cn(
                                        "rounded-md shrink-0 flex items-center justify-center border overflow-hidden",
                                        isFinal ? "bg-brand-500/10 border-brand-500/20" : "bg-slate-50 dark:bg-slate-800 border-slate-200/5 dark:border-white/5"
                                    )} style={{ width: LOGO_SIZE, height: LOGO_SIZE }}>
                                        {t.info?.logoUrl
                                            ? <img src={t.info.logoUrl} className="w-full h-full object-contain" alt="" />
                                            : <span className="font-bold text-slate-500 dark:text-slate-400" style={{ fontSize: LOGO_SIZE * 0.45 }}>{t.name?.[0] || '?'}</span>
                                        }
                                    </div>
                                    <span className={cn(
                                        "font-bold truncate leading-tight",
                                        t.win ? "text-brand-400" : "text-slate-600 dark:text-slate-300"
                                    )} style={{ fontSize: TEAM_FONT }}>
                                        {t.name || 'TBD'}
                                    </span>
                                </div>
                                <span className={cn(
                                    "font-black tabular-nums",
                                    t.win ? "text-brand-400" : "text-slate-100"
                                )} style={{ fontSize: SCORE_FONT }}>
                                    {match.status !== 'scheduled' ? t.score : '-'}
                                </span>
                            </div>
                        ))}
                    </div>

                    {canEdit && (
                        <Link to={`/live/${match.id}`} className="absolute top-0 right-0 p-1 bg-brand-500 text-slate-900 rounded-bl-lg opacity-0 group-hover/card:opacity-100 transition-all z-20">
                            <Edit3 size={12} />
                        </Link>
                    )}
                </div>
            </motion.div>
        );
    };

    // ─── EMPTY STATE ───
    if (!matchesByRound || Object.keys(matchesByRound).length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-slate-200/10 dark:border-white/10">
                <Trophy size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                <div className="text-slate-500 mb-2 font-display font-bold">No Bracket Structure</div>
                <div className="text-xs text-slate-600 italic">Create a tournament with "Auto-Seed" or add matches manually.</div>
            </div>
        );
    }

    const wingRounds = orderedRounds.filter(r => r !== 'Final');
    const finalMatch = matchesByRound['Final']?.[0];

    return (
        <div className="relative">
            {/* Bracket wrapper — safely left-aligned, centered via javascript margin to fix clipping */}
            <div
                ref={containerRef}
                className="overflow-hidden rounded-2xl border border-slate-200/5 dark:border-white/5 bg-slate-950/40 w-full"
                style={{ height: wrapperHeight !== 'auto' ? wrapperHeight : undefined }}
            >
                <div
                    ref={bracketRef}
                    style={{ ...scaledStyle, paddingTop: 24, paddingBottom: 24 }}
                    className="flex-shrink-0"
                >
                    <div className="flex items-center justify-center" style={{ whiteSpace: 'nowrap', display: 'inline-flex', minWidth: 'max-content' }}>

                        {/* ─── Left Wing (Pool A) ─── */}
                        <div style={{ display: 'flex', gap: ROUND_GAP }}>
                            {wingRounds.map((roundName) => {
                                const matches = matchesByRound[roundName] || [];
                                const poolAMatches = matches.filter(m => m.pool === 'A' || (!m.pool && matches.indexOf(m) < matches.length / 2));

                                if (poolAMatches.length === 0) return null;

                                return (
                                    <div key={`left-${roundName}`} className="flex flex-col items-center">
                                        <span className="font-black text-slate-500 uppercase tracking-widest whitespace-nowrap" style={{ fontSize: ROUND_LABEL_FONT, marginBottom: 12 }}>{roundName}</span>
                                        <div className="flex flex-col justify-around h-full" style={{ gap: MATCH_GAP }}>
                                            {poolAMatches.map((m) => renderMatchCard(m, false, 'left'))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ─── Spacer ─── */}
                        <div style={{ width: ROUND_GAP }} />

                        {/* ─── Center Piece (Final) ─── */}
                        <div className="relative flex flex-col items-center">
                            <span className="font-black text-brand-500 uppercase tracking-widest whitespace-nowrap" style={{ fontSize: ROUND_LABEL_FONT + 1, marginBottom: 14 }}>
                                Championship Final
                            </span>
                            <div className="relative">
                                <div className="absolute inset-0 bg-brand-500/10 blur-2xl rounded-full scale-150 -z-10" />
                                {finalMatch ? renderMatchCard(finalMatch, true) : (
                                    <div className="flex flex-col items-center justify-center bg-slate-950/50 rounded-xl border-2 border-dashed border-slate-200/10 dark:border-white/10" style={{ width: FINAL_CARD_W, height: 80 }}>
                                        <Trophy size={20} className="text-slate-700 mb-1" />
                                        <span className="text-slate-600 font-bold uppercase tracking-widest" style={{ fontSize: 8 }}>Final Match</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── Spacer ─── */}
                        <div style={{ width: ROUND_GAP }} />

                        {/* ─── Right Wing (Pool B) ─── */}
                        <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: ROUND_GAP }}>
                            {wingRounds.map((roundName) => {
                                const matches = matchesByRound[roundName] || [];
                                const poolBMatches = matches.filter(m => m.pool === 'B' || (!m.pool && matches.indexOf(m) >= matches.length / 2));

                                if (poolBMatches.length === 0) return null;

                                let displayRoundName = roundName;
                                if (roundName.toLowerCase().includes('preliminary')) {
                                    const poolAFirstRound = wingRounds.find(r => 
                                        !r.toLowerCase().includes('preliminary') && 
                                        (matchesByRound[r] || []).some(m => m.pool === 'A' || (!m.pool && matchesByRound[r].indexOf(m) < matchesByRound[r].length / 2))
                                    );
                                    if (poolAFirstRound) displayRoundName = poolAFirstRound;
                                }

                                return (
                                    <div key={`right-${roundName}`} className="flex flex-col items-center">
                                        <span className="font-black text-slate-500 uppercase tracking-widest whitespace-nowrap" style={{ fontSize: ROUND_LABEL_FONT, marginBottom: 12 }}>{displayRoundName}</span>
                                        <div className="flex flex-col justify-around h-full" style={{ gap: MATCH_GAP }}>
                                            {poolBMatches.map((m) => renderMatchCard(m, false, 'right'))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Legend ─── */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-6 pt-4 border-t border-slate-200/5 dark:border-white/5 mx-auto max-w-2xl">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-brand-500/20 border border-brand-500/30" />
                    <span className="text-[10px] md:text-xs text-slate-500 font-extrabold uppercase tracking-widest">Champion Pathway</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30 animate-pulse" />
                    <span className="text-[10px] md:text-xs text-slate-500 font-extrabold uppercase tracking-widest">Live Action</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200/5 dark:border-white/5 opacity-50" />
                    <span className="text-[10px] md:text-xs text-slate-500 font-extrabold uppercase tracking-widest">Unscheduled</span>
                </div>
            </div>
        </div>
    );
};

export default MatchBracket;
