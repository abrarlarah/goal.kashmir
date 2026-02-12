import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../context/DataContext';

const ManageLineups = () => {
    const { matches, players, teams, lineups } = useData();
    const [selectedMatch, setSelectedMatch] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [lineup, setLineup] = useState({
        id: '', // Add id to track existing lineup
        matchId: '',
        teamName: '',
        starting11: [],
        bench: []
    });
    const [successMessage, setSuccessMessage] = useState('');

    // Get match details
    const currentMatch = matches.find(m => m.id === selectedMatch);

    // Get players for the selected team
    const teamPlayers = players.filter(p => p.team === selectedTeam);

    // Get already selected player IDs
    const selectedPlayerIds = [...lineup.starting11, ...lineup.bench];

    const handleMatchChange = (matchId) => {
        setSelectedMatch(matchId);
        setSelectedTeam('');
        setLineup({ id: '', matchId: '', teamName: '', starting11: [], bench: [] });
    };

    const handleTeamChange = (teamName) => {
        setSelectedTeam(teamName);

        // Check if lineup already exists for this match and team
        const existingLineup = lineups.find(l => l.matchId === selectedMatch && l.teamName === teamName);

        if (existingLineup) {
            setLineup({
                id: existingLineup.id,
                matchId: existingLineup.matchId,
                teamName: existingLineup.teamName,
                starting11: existingLineup.starting11 || [],
                bench: existingLineup.bench || []
            });
        } else {
            setLineup({
                id: '',
                matchId: selectedMatch,
                teamName: teamName,
                starting11: [],
                bench: []
            });
        }
    };

    const addToStarting11 = (playerId) => {
        if (lineup.starting11.length < 11) {
            setLineup(prev => ({
                ...prev,
                starting11: [...prev.starting11, playerId]
            }));
        }
    };

    const removeFromStarting11 = (playerId) => {
        setLineup(prev => ({
            ...prev,
            starting11: prev.starting11.filter(id => id !== playerId)
        }));
    };

    const addToBench = (playerId) => {
        if (lineup.bench.length < 6) {
            setLineup(prev => ({
                ...prev,
                bench: [...prev.bench, playerId]
            }));
        }
    };

    const removeFromBench = (playerId) => {
        setLineup(prev => ({
            ...prev,
            bench: prev.bench.filter(id => id !== playerId)
        }));
    };

    const handleSaveLineup = async () => {
        if (lineup.starting11.length !== 11) {
            alert('Please select exactly 11 starting players');
            return;
        }

        try {
            if (lineup.id) {
                // Update existing lineup
                await updateDoc(doc(db, 'lineups', lineup.id), {
                    starting11: lineup.starting11,
                    bench: lineup.bench,
                    updatedAt: new Date()
                });
                setSuccessMessage('Lineup updated successfully!');
            } else {
                // Save new lineup
                await addDoc(collection(db, 'lineups'), {
                    matchId: lineup.matchId,
                    teamName: lineup.teamName,
                    starting11: lineup.starting11,
                    bench: lineup.bench,
                    createdAt: new Date()
                });
                setSuccessMessage('Lineup saved successfully!');
            }

            setTimeout(() => setSuccessMessage(''), 3000);

            // Reset
            setLineup({ id: '', matchId: '', teamName: '', starting11: [], bench: [] });
            setSelectedMatch('');
            setSelectedTeam('');
        } catch (error) {
            console.error('Error saving lineup:', error);
            alert('Error saving lineup: ' + error.message);
        }
    };

    const getPlayerById = (playerId) => {
        return players.find(p => p.id === playerId);
    };

    return (
        <div className="container mx-auto px-4 py-8 text-white">
            <h2 className="text-3xl font-bold mb-6">⚽ Manage Match Lineups</h2>

            {successMessage && (
                <div className="bg-green-600 text-white p-3 rounded mb-4 animate-pulse">
                    {successMessage}
                </div>
            )}

            {/* Match Selection */}
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h3 className="text-xl mb-4">Select Match</h3>
                <select
                    value={selectedMatch}
                    onChange={(e) => handleMatchChange(e.target.value)}
                    className="bg-gray-700 p-3 rounded text-white w-full mb-4"
                >
                    <option value="">Select a match</option>
                    {matches.filter(m => m.status !== 'finished').map(match => (
                        <option key={match.id} value={match.id}>
                            {match.competition} - {match.teamA} vs {match.teamB}
                            {match.date && ` (${new Date(match.date).toLocaleDateString()})`}
                        </option>
                    ))}
                </select>

                {currentMatch && (
                    <div className="mt-4">
                        <h4 className="text-lg mb-2">Select Team</h4>
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleTeamChange(currentMatch.teamA)}
                                className={`flex-1 p-3 rounded ${selectedTeam === currentMatch.teamA ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                {currentMatch.teamA}
                            </button>
                            <button
                                onClick={() => handleTeamChange(currentMatch.teamB)}
                                className={`flex-1 p-3 rounded ${selectedTeam === currentMatch.teamB ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                {currentMatch.teamB}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Lineup Builder */}
            {selectedTeam && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Available Players */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl mb-4">Available Players</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {teamPlayers
                                .filter(p => !selectedPlayerIds.includes(p.id))
                                .map(player => (
                                    <div key={player.id} className="bg-gray-700 p-3 rounded flex justify-between items-center">
                                        <div>
                                            <div className="font-medium">{player.name}</div>
                                            <div className="text-xs text-gray-400">{player.position}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => addToStarting11(player.id)}
                                                disabled={lineup.starting11.length >= 11}
                                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-1 rounded text-xs"
                                            >
                                                Starting
                                            </button>
                                            <button
                                                onClick={() => addToBench(player.id)}
                                                disabled={lineup.bench.length >= 6}
                                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-1 rounded text-xs"
                                            >
                                                Bench
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            {teamPlayers.filter(p => !selectedPlayerIds.includes(p.id)).length === 0 && (
                                <p className="text-gray-400 text-sm text-center py-4">All players assigned</p>
                            )}
                        </div>
                    </div>

                    {/* Starting 11 */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl mb-4">
                            Starting 11
                            <span className={`ml-2 text-sm ${lineup.starting11.length === 11 ? 'text-green-400' : 'text-yellow-400'}`}>
                                ({lineup.starting11.length}/11)
                            </span>
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {lineup.starting11.map((playerId, index) => {
                                const player = getPlayerById(playerId);
                                return player ? (
                                    <div key={playerId} className="bg-green-900 p-3 rounded flex justify-between items-center">
                                        <div>
                                            <div className="font-medium">#{index + 1} {player.name}</div>
                                            <div className="text-xs text-gray-300">{player.position}</div>
                                        </div>
                                        <button
                                            onClick={() => removeFromStarting11(playerId)}
                                            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : null;
                            })}
                            {lineup.starting11.length === 0 && (
                                <p className="text-gray-400 text-sm text-center py-4">No players selected</p>
                            )}
                        </div>
                    </div>

                    {/* Bench */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl mb-4">
                            Bench
                            <span className={`ml-2 text-sm ${lineup.bench.length === 6 ? 'text-green-400' : 'text-gray-400'}`}>
                                ({lineup.bench.length}/6)
                            </span>
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {lineup.bench.map((playerId) => {
                                const player = getPlayerById(playerId);
                                return player ? (
                                    <div key={playerId} className="bg-blue-900 p-3 rounded flex justify-between items-center">
                                        <div>
                                            <div className="font-medium">{player.name}</div>
                                            <div className="text-xs text-gray-300">{player.position}</div>
                                        </div>
                                        <button
                                            onClick={() => removeFromBench(playerId)}
                                            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : null;
                            })}
                            {lineup.bench.length === 0 && (
                                <p className="text-gray-400 text-sm text-center py-4">No bench players</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button */}
            {selectedTeam && (
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={handleSaveLineup}
                        disabled={lineup.starting11.length !== 11}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-8 py-3 rounded-lg text-lg font-medium"
                    >
                        Save Lineup
                    </button>
                </div>
            )}

            {/* Instructions */}
            {!selectedMatch && (
                <div className="bg-gray-800 p-6 rounded-lg mt-6">
                    <h3 className="text-xl mb-4">📋 How to Create a Lineup</h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-300">
                        <li>Select a match from the dropdown</li>
                        <li>Choose which team you want to create a lineup for</li>
                        <li>Add 11 players to the Starting 11</li>
                        <li>Add up to 6 players to the Bench (optional)</li>
                        <li>Click "Save Lineup" to confirm</li>
                    </ol>
                </div>
            )}
        </div>
    );
};

export default ManageLineups;
