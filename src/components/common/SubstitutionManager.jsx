import React, { useState } from 'react';
import { updateDoc, doc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';

const SubstitutionManager = ({ lineup, players, onSubstitutionComplete }) => {
    const [selectedStarter, setSelectedStarter] = useState('');
    const [selectedBench, setSelectedBench] = useState('');
    const [isSubstituting, setIsSubstituting] = useState(false);

    // Get player details by ID
    const getPlayer = (playerId) => {
        return players.find(p => p.id === playerId);
    };

    const handleSubstitution = async () => {
        if (!selectedStarter || !selectedBench) {
            alert('Please select both a player to replace and a substitute');
            return;
        }

        setIsSubstituting(true);

        try {
            const playerOut = getPlayer(selectedStarter);
            const playerIn = getPlayer(selectedBench);

            // Create new arrays with the substitution
            const newStarting11 = lineup.starting11.map(id =>
                id === selectedStarter ? selectedBench : id
            );
            const newBench = lineup.bench.map(id =>
                id === selectedBench ? selectedStarter : id
            );

            // Update Firestore
            await updateDoc(doc(db, 'lineups', lineup.id), {
                starting11: newStarting11,
                bench: newBench,
                lastSubstitution: {
                    playerOut: selectedStarter,
                    playerIn: selectedBench,
                    playerOutName: playerOut?.name,
                    playerInName: playerIn?.name,
                    timestamp: new Date()
                }
            });

            // Add substitution event to match events (if matchId exists)
            if (lineup.matchId) {
                try {
                    await addDoc(collection(db, 'matches', lineup.matchId, 'events'), {
                        type: 'substitution',
                        team: lineup.teamName,
                        playerOut: playerOut?.name || 'Unknown',
                        playerIn: playerIn?.name || 'Unknown',
                        minute: new Date().getMinutes(), // Using system minutes as a fallback
                        timestamp: new Date()
                    });
                } catch (error) {
                    console.error('Error adding substitution event:', error);
                }
            }

            // Reset selection
            setSelectedStarter('');
            setSelectedBench('');

            if (onSubstitutionComplete) {
                onSubstitutionComplete();
            }

            alert(`Substitution: ${playerOut?.name} ➡️ ${playerIn?.name}`);
        } catch (error) {
            console.error('Error making substitution:', error);
            alert('Error making substitution: ' + error.message);
        } finally {
            setIsSubstituting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg border-2 border-yellow-500">
            <h3 className="text-lg font-bold mb-4 text-yellow-400 flex items-center">
                🔄 Make Substitution
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Player to Replace (from Starting 11) */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                        Player to Replace (Starting 11)
                    </label>
                    <select
                        value={selectedStarter}
                        onChange={(e) => setSelectedStarter(e.target.value)}
                        className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
                    >
                        <option value="">Select player to replace</option>
                        {lineup.starting11.map(playerId => {
                            const player = getPlayer(playerId);
                            return player ? (
                                <option key={playerId} value={playerId}>
                                    {player.name} ({player.position})
                                </option>
                            ) : null;
                        })}
                    </select>
                </div>

                {/* Substitute (from Bench) */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                        Substitute (Bench)
                    </label>
                    <select
                        value={selectedBench}
                        onChange={(e) => setSelectedBench(e.target.value)}
                        className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
                    >
                        <option value="">Select substitute</option>
                        {lineup.bench && lineup.bench.map(playerId => {
                            const player = getPlayer(playerId);
                            return player ? (
                                <option key={playerId} value={playerId}>
                                    {player.name} ({player.position})
                                </option>
                            ) : null;
                        })}
                    </select>
                </div>
            </div>

            {/* Preview */}
            {selectedStarter && selectedBench && (
                <div className="bg-gray-700 p-3 rounded mb-4 text-sm">
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-red-400">
                            ⬇️ {getPlayer(selectedStarter)?.name}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-400">
                            ⬆️ {getPlayer(selectedBench)?.name}
                        </span>
                    </div>
                </div>
            )}

            {/* Action Button */}
            <button
                onClick={handleSubstitution}
                disabled={!selectedStarter || !selectedBench || isSubstituting}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
            >
                {isSubstituting ? 'Making Substitution...' : 'Confirm Substitution'}
            </button>

            <p className="text-xs text-gray-400 mt-2 text-center">
                This will swap the selected players between starting 11 and bench
            </p>
        </div>
    );
};

export default SubstitutionManager;
