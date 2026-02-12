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
        <div className="bg-green-700 rounded-lg p-2 text-center shadow-lg border-2 border-green-500 min-w-[70px]">
            <div className="text-xs font-bold text-white truncate">{player.name.split(' ').pop()}</div>
            <div className="text-[10px] text-green-200">{player.position.substring(0, 3).toUpperCase()}</div>
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
                                <div key={player.id} className="bg-gray-700 rounded px-2 py-1 text-xs text-white">
                                    {player.name.split(' ').pop()}
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
