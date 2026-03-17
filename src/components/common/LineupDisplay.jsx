import React from 'react';
import { Link } from 'react-router-dom';

const LineupDisplay = ({ lineup, players }) => {
    if (!lineup || !lineup.starting11 || lineup.starting11.length === 0) {
        return (
            <div className="text-center text-slate-500 dark:text-gray-400 py-8">
                <p>No lineup available</p>
            </div>
        );
    }

    // Detect if this is a manual lineup (array of objects) vs standard (array of player IDs)
    const isManualLineup = lineup.starting11.length > 0 && typeof lineup.starting11[0] === 'object';

    // Get player details by ID (standard mode)
    const getPlayer = (playerId) => {
        return players.find(p => p.id === playerId);
    };

    // ═══ MANUAL LINEUP RENDERING ═══
    if (isManualLineup) {
        // Map short positions to groups
        const positionMap = {
            'GK': 'Goalkeeper',
            'CB': 'Defender', 'LB': 'Defender', 'RB': 'Defender', 'SW': 'Defender',
            'CDM': 'Midfielder', 'CM': 'Midfielder', 'CAM': 'Midfielder', 'LM': 'Midfielder', 'RM': 'Midfielder',
            'LW': 'Forward', 'RW': 'Forward', 'ST': 'Forward', 'CF': 'Forward',
        };

        const grouped = { Goalkeeper: [], Defender: [], Midfielder: [], Forward: [], Other: [] };
        lineup.starting11.forEach((entry, idx) => {
            const pos = entry.position?.toUpperCase() || '';
            const group = positionMap[pos] || 'Other';
            grouped[group].push({ ...entry, idx });
        });

        // If all ended up in "Other" (no positions set), just render a flat list
        const hasPositionGroups = grouped.Goalkeeper.length > 0 || grouped.Defender.length > 0 || grouped.Midfielder.length > 0 || grouped.Forward.length > 0;

        const ManualPlayerCard = ({ entry }) => (
            <div className="flex flex-col items-center z-10 w-14 sm:w-20">
                <div className="relative mb-0.5 sm:mb-1">
                    <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full border-2 border-white overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                        <span className="text-slate-900 dark:text-white font-bold text-sm sm:text-base">{entry.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    </div>
                    {entry.position && (
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 bg-white dark:bg-slate-900 rounded-full border border-white flex items-center justify-center shadow-md">
                            <span className="text-[7px] sm:text-[9px] font-black text-slate-900 dark:text-white leading-none">
                                {entry.position}
                            </span>
                        </div>
                    )}
                </div>
                <div className="text-center w-[120%] sm:w-[130%] px-0.5 -mx-[10%] sm:-mx-[15%] z-20">
                    <div className="bg-black/90 px-1 py-0.5 rounded shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-white font-black text-[9px] sm:text-[11px] truncate uppercase tracking-widest border border-slate-200/20 dark:border-white/20">
                        {entry.name?.split(' ').pop() || 'Unknown'}
                    </div>
                </div>
            </div>
        );

        return (
            <div className="flex flex-col gap-4">
                <div
                    className="rounded-xl sm:rounded-2xl relative overflow-hidden shadow-2xl border-[3px] border-green-300/50"
                    style={{
                        background: 'repeating-linear-gradient(0deg, #4ade80 0, #4ade80 10%, #22c55e 10%, #22c55e 20%)'
                    }}
                >
                    {/* Football pitch lines */}
                    <div className="absolute inset-0 pointer-events-none opacity-50">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-white"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 border-2 border-white rounded-full"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-48 sm:w-64 h-16 sm:h-24 border-2 border-t-0 border-white"></div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 sm:w-64 h-16 sm:h-24 border-2 border-b-0 border-white"></div>
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 sm:w-28 h-6 sm:h-8 border-2 border-t-0 border-white"></div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 sm:w-28 h-6 sm:h-8 border-2 border-b-0 border-white"></div>
                    </div>

                    <div className="relative z-10 flex flex-col justify-evenly min-h-[400px] sm:min-h-[550px] py-6 sm:py-10 h-full gap-4 sm:gap-8">
                        {hasPositionGroups ? (
                            <>
                                {grouped.Forward.length > 0 && (
                                    <div className="flex justify-center gap-1 sm:gap-4 flex-wrap w-full px-2">
                                        {grouped.Forward.map((entry, i) => <ManualPlayerCard key={`fwd-${i}`} entry={entry} />)}
                                    </div>
                                )}
                                {grouped.Midfielder.length > 0 && (
                                    <div className="flex justify-center gap-1 sm:gap-4 flex-wrap w-full px-2">
                                        {grouped.Midfielder.map((entry, i) => <ManualPlayerCard key={`mid-${i}`} entry={entry} />)}
                                    </div>
                                )}
                                {grouped.Defender.length > 0 && (
                                    <div className="flex justify-center gap-1 sm:gap-4 flex-wrap w-full px-2">
                                        {grouped.Defender.map((entry, i) => <ManualPlayerCard key={`def-${i}`} entry={entry} />)}
                                    </div>
                                )}
                                {grouped.Goalkeeper.length > 0 && (
                                    <div className="flex justify-center gap-1 sm:gap-4 flex-wrap w-full px-2">
                                        {grouped.Goalkeeper.map((entry, i) => <ManualPlayerCard key={`gk-${i}`} entry={entry} />)}
                                    </div>
                                )}
                                {grouped.Other.length > 0 && (
                                    <div className="flex justify-center gap-1 sm:gap-4 flex-wrap w-full px-2">
                                        {grouped.Other.map((entry, i) => <ManualPlayerCard key={`other-${i}`} entry={entry} />)}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* No positions → flat grid */
                            <div className="flex justify-center gap-1 sm:gap-4 flex-wrap w-full px-2">
                                {lineup.starting11.map((entry, i) => <ManualPlayerCard key={`p-${i}`} entry={entry} />)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Manual Bench */}
                {lineup.bench && lineup.bench.length > 0 && (
                    <div className="bg-white/40 dark:bg-slate-900/40 rounded-xl p-4 sm:p-5 border border-slate-200/5 dark:border-white/5 mt-2">
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-3 font-bold uppercase tracking-widest">Bench</div>
                        <div className="flex gap-2 flex-wrap">
                            {lineup.bench.map((entry, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 bg-black/60 rounded-full pl-1 pr-4 py-1.5 text-xs sm:text-sm text-white border border-slate-200/10 dark:border-white/10"
                                >
                                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                        <span className="text-[10px] sm:text-xs font-bold text-slate-900/50 dark:text-white/50">{entry.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                    </div>
                                    <span className="font-bold whitespace-nowrap">{entry.name}</span>
                                    {entry.position && <span className="text-[10px] text-slate-400 font-medium">({entry.position})</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ═══ STANDARD LINEUP RENDERING (Player IDs) ═══

    // Group players by position
    const groupByPosition = () => {
        const grouped = {
            Goalkeeper: [],
            Defender: [],
            Midfielder: [],
            Forward: []
        };

        lineup.starting11.forEach(playerId => {
            const player = getPlayer(playerId);
            if (player && grouped[player.position]) {
                grouped[player.position].push(player);
            }
        });

        return grouped;
    };

    const positionGroups = groupByPosition();

    // Player card component
    const PlayerCard = ({ player }) => (
        <Link to={`/players/${player.id}`} className="flex flex-col items-center group z-10 w-14 sm:w-20">
            <div className="relative mb-0.5 sm:mb-1">
                <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full border-2 border-white overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300">
                    {player.photoUrl ? (
                        <img src={player.photoUrl} alt={player.name} className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-slate-900 dark:text-white font-bold text-sm sm:text-base">{player.name.charAt(0)}</span>
                    )}
                </div>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 bg-white dark:bg-slate-900 rounded-full border border-white flex items-center justify-center shadow-md">
                    <span className="text-[8px] sm:text-[10px] font-black text-slate-900 dark:text-white leading-none">
                        {player.number || '#'}
                    </span>
                </div>
            </div>
            <div className="text-center w-[120%] sm:w-[130%] px-0.5 -mx-[10%] sm:-mx-[15%] z-20">
                <div className="bg-black/90 px-1 py-0.5 rounded shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-white font-black text-[9px] sm:text-[11px] truncate group-hover:text-brand-400 transition-colors uppercase tracking-widest border border-slate-200/20 dark:border-white/20">
                    {player.name.split(' ').pop()}
                </div>
            </div>
        </Link>
    );

    return (
        <div className="flex flex-col gap-4">
            <div
                className="rounded-xl sm:rounded-2xl relative overflow-hidden shadow-2xl border-[3px] border-green-300/50"
                style={{
                    background: 'repeating-linear-gradient(0deg, #4ade80 0, #4ade80 10%, #22c55e 10%, #22c55e 20%)'
                }}
            >
                {/* Football pitch lines */}
                <div className="absolute inset-0 pointer-events-none opacity-50">
                    {/* Center Line */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-white"></div>
                    {/* Center Circle */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 border-2 border-white rounded-full"></div>
                    {/* Center Point */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>

                    {/* Penalty areas */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-48 sm:w-64 h-16 sm:h-24 border-2 border-t-0 border-white"></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 sm:w-64 h-16 sm:h-24 border-2 border-b-0 border-white"></div>

                    {/* Goal areas */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 sm:w-28 h-6 sm:h-8 border-2 border-t-0 border-white"></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 sm:w-28 h-6 sm:h-8 border-2 border-b-0 border-white"></div>
                </div>

                {/* Formation Display */}
                <div className="relative z-10 flex flex-col justify-evenly min-h-[500px] sm:min-h-[650px] py-6 sm:py-10 h-full gap-4 sm:gap-8">
                    {/* Forwards */}
                    {positionGroups.Forward.length > 0 && (
                        <div className="flex justify-center gap-1 sm:gap-4 flex-nowrap w-full">
                            {positionGroups.Forward.map(player => (
                                <PlayerCard key={player.id} player={player} />
                            ))}
                        </div>
                    )}

                    {/* Midfielders */}
                    {positionGroups.Midfielder.length > 0 && (
                        <div className="flex justify-center gap-1 sm:gap-4 flex-nowrap w-full">
                            {positionGroups.Midfielder.map(player => (
                                <PlayerCard key={player.id} player={player} />
                            ))}
                        </div>
                    )}

                    {/* Defenders */}
                    {positionGroups.Defender.length > 0 && (
                        <div className="flex justify-center gap-1 sm:gap-4 flex-nowrap w-full">
                            {positionGroups.Defender.map(player => (
                                <PlayerCard key={player.id} player={player} />
                            ))}
                        </div>
                    )}

                    {/* Goalkeeper */}
                    {positionGroups.Goalkeeper.length > 0 && (
                        <div className="flex justify-center gap-1 sm:gap-4 flex-nowrap w-full">
                            {positionGroups.Goalkeeper.map(player => (
                                <PlayerCard key={player.id} player={player} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bench */}
            {lineup.bench && lineup.bench.length > 0 && (
                <div className="bg-white/40 dark:bg-slate-900/40 rounded-xl p-4 sm:p-5 border border-slate-200/5 dark:border-white/5 mt-2">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-3 font-bold uppercase tracking-widest">Bench</div>
                    <div className="flex gap-2 flex-wrap">
                        {lineup.bench.map(playerId => {
                            const player = getPlayer(playerId);
                            return player ? (
                                <Link
                                    key={player.id}
                                    to={`/players/${player.id}`}
                                    className="flex items-center gap-2 bg-black/60 rounded-full pl-1 pr-4 py-1.5 text-xs sm:text-sm text-white border border-slate-200/10 dark:border-white/10 hover:bg-black/80 hover:border-brand-500/50 transition-colors"
                                >
                                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                        {player.photoUrl ? (
                                            <img src={player.photoUrl} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] sm:text-xs font-bold text-slate-900/50 dark:text-white/50">{player.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <span className="font-bold whitespace-nowrap">{player.name}</span>
                                </Link>
                            ) : null;
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LineupDisplay;
