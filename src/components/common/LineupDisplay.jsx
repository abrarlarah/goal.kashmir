import React from 'react';

const LineupDisplay = ({ lineup, players }) => {
    if (!lineup || !lineup.starting11 || lineup.starting11.length === 0) {
        return (
            <div className="text-center text-gray-400 py-8">
                <p>No lineup available</p>
            </div>
        );
    }

    // Get player details by ID
    const getPlayer = (playerId) => {
        return players.find(p => p.id === playerId);
    };

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
        <div className="flex flex-col items-center gap-1 group">
            <div className="relative">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full border-2 border-white/80 overflow-hidden bg-slate-900/50 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {player.photoUrl ? (
                        <img src={player.photoUrl} alt={player.name} className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-white font-bold text-sm">{player.name.charAt(0)}</span>
                    )}
                </div>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-brand-500 rounded-full border border-white flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white leading-none">
                        {player.number || '#'}
                    </span>
                </div>
            </div>
            <div className="text-center">
                <div className="text-[10px] md:text-xs font-bold text-white drop-shadow-md leading-tight">
                    {player.name.split(' ').pop()}
                </div>
                <div className="text-[8px] text-green-200 font-medium tracking-wider opacity-80 uppercase">
                    {player.position.slice(0, 3)}
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-lg p-4 relative overflow-hidden">
            {/* Football pitch lines */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-px h-full bg-white"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white rounded-full"></div>
            </div>

            {/* Formation Display */}
            <div className="relative space-y-4">
                {/* Forwards */}
                {positionGroups.Forward.length > 0 && (
                    <div className="flex justify-center gap-2 flex-wrap">
                        {positionGroups.Forward.map(player => (
                            <PlayerCard key={player.id} player={player} />
                        ))}
                    </div>
                )}

                {/* Midfielders */}
                {positionGroups.Midfielder.length > 0 && (
                    <div className="flex justify-center gap-2 flex-wrap">
                        {positionGroups.Midfielder.map(player => (
                            <PlayerCard key={player.id} player={player} />
                        ))}
                    </div>
                )}

                {/* Defenders */}
                {positionGroups.Defender.length > 0 && (
                    <div className="flex justify-center gap-2 flex-wrap">
                        {positionGroups.Defender.map(player => (
                            <PlayerCard key={player.id} player={player} />
                        ))}
                    </div>
                )}

                {/* Goalkeeper */}
                {positionGroups.Goalkeeper.length > 0 && (
                    <div className="flex justify-center gap-2 flex-wrap">
                        {positionGroups.Goalkeeper.map(player => (
                            <PlayerCard key={player.id} player={player} />
                        ))}
                    </div>
                )}
            </div>

            {/* Bench */}
            {lineup.bench && lineup.bench.length > 0 && (
                <div className="mt-4 pt-4 border-t border-green-700">
                    <div className="text-xs text-green-200 mb-2 font-semibold">Bench</div>
                    <div className="flex gap-2 flex-wrap">
                        {lineup.bench.map(playerId => {
                            const player = getPlayer(playerId);
                            return player ? (
                                <div key={player.id} className="flex items-center gap-2 bg-black/30 rounded-full pl-1 pr-3 py-1 text-xs text-white border border-white/5">
                                    <div className="h-6 w-6 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center shrink-0">
                                        {player.photoUrl ? (
                                            <img src={player.photoUrl} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] text-white/50">{player.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <span className="font-medium whitespace-nowrap">{player.name}</span>
                                </div>
                            ) : null;
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LineupDisplay;
