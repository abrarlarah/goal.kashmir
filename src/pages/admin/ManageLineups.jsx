import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Users, Shield, UserPlus } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../utils/auditLogger';

const ManageLineups = () => {
    const { matchId, teamName } = useParams();
    const { matches, players, teams, lineups, tournaments } = useData();
    const { currentUser, isSuperAdmin, isTeamAdmin } = useAuth();
    const [selectedMatch, setSelectedMatch] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [lineup, setLineup] = useState({
        id: '',
        matchId: '',
        teamName: '',
        starting11: [],
        bench: []
    });

    // Manual lineup mode state
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualPlayerName, setManualPlayerName] = useState('');
    const [manualPlayerPosition, setManualPlayerPosition] = useState('');
    const [manualLineup, setManualLineup] = useState({
        id: '',
        matchId: '',
        teamName: '',
        starting11: [], // Array of { name, position } objects
        bench: []       // Array of { name, position } objects
    });

    useEffect(() => {
        if (matchId) {
            setSelectedMatch(matchId);
            if (teamName) {
                handleTeamChange(teamName, matchId);
            }
        }
    }, [matchId, teamName, lineups, matches]);

    // Auto-detect if manual mode should be on (quick match teams have no registered players)
    useEffect(() => {
        if (selectedTeam && selectedMatch) {
            const currentMatchData = matches.find(m => m.id === selectedMatch);
            const teamPlayers = players.filter(p => p.team === selectedTeam);
            
            // Enable manual mode if it's a quick match or team has no registered players
            if (currentMatchData?.isQuickMatch || teamPlayers.length === 0) {
                setIsManualMode(true);
            }
        }
    }, [selectedTeam, selectedMatch, matches, players]);

    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Get match details
    const currentMatch = matches.find(m => m.id === selectedMatch);

    // Scope matches: tournament admin only sees their tournament's matches; team admin sees their created matches
    const scopedMatches = useMemo(() => {
        if (isSuperAdmin) return matches;
        const myTournamentNames = tournaments
            .filter(t => t.createdBy === currentUser?.uid)
            .map(t => t.name);
        return matches.filter(m => 
            myTournamentNames.includes(m.competition) || 
            (m.isQuickMatch && m.createdBy === currentUser?.uid)
        );
    }, [matches, tournaments, currentUser, isSuperAdmin]);

    // Get players for the selected team with search
    const teamPlayers = players.filter(p => {
        const matchesTeam = p.team === selectedTeam;
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTeam && matchesSearch;
    });

    // Get already selected player IDs
    const selectedPlayerIds = [...lineup.starting11, ...lineup.bench];

    const handleMatchChange = (matchId) => {
        setSelectedMatch(matchId);
        setSelectedTeam('');
        setLineup({ id: '', matchId: '', teamName: '', starting11: [], bench: [] });
        setManualLineup({ id: '', matchId: '', teamName: '', starting11: [], bench: [] });
        setIsManualMode(false);
    };

    const handleTeamChange = (teamName, mId = selectedMatch) => {
        setSelectedTeam(teamName);

        // Check if lineup already exists for this match and team
        const existingLineup = lineups.find(l => l.matchId === mId && l.teamName === teamName);

        if (existingLineup) {
            // Check if lineup uses manual names (array of objects) or player IDs (array of strings)
            const isManual = existingLineup.starting11?.length > 0 && typeof existingLineup.starting11[0] === 'object';
            
            if (isManual) {
                setIsManualMode(true);
                setManualLineup({
                    id: existingLineup.id,
                    matchId: existingLineup.matchId,
                    teamName: existingLineup.teamName,
                    starting11: existingLineup.starting11 || [],
                    bench: existingLineup.bench || []
                });
                setLineup({ id: '', matchId: mId, teamName: teamName, starting11: [], bench: [] });
            } else {
                setIsManualMode(false);
                setLineup({
                    id: existingLineup.id,
                    matchId: existingLineup.matchId,
                    teamName: existingLineup.teamName,
                    starting11: existingLineup.starting11 || [],
                    bench: existingLineup.bench || []
                });
                setManualLineup({ id: '', matchId: mId, teamName: teamName, starting11: [], bench: [] });
            }
        } else {
            setLineup({
                id: '',
                matchId: mId,
                teamName: teamName,
                starting11: [],
                bench: []
            });
            setManualLineup({
                id: '',
                matchId: mId,
                teamName: teamName,
                starting11: [],
                bench: []
            });
        }
    };

    // ─── STANDARD (PLAYER-ID) MODE HANDLERS ───
    const addToStarting11 = (playerId) => {
        {
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

    // ─── MANUAL MODE HANDLERS ───
    const addManualToStarting = () => {
        if (!manualPlayerName.trim()) return;
        setManualLineup(prev => ({
            ...prev,
            starting11: [...prev.starting11, { name: manualPlayerName.trim(), position: manualPlayerPosition.trim() || 'Player' }]
        }));
        setManualPlayerName('');
        setManualPlayerPosition('');
    };

    const addManualToBench = () => {
        if (!manualPlayerName.trim()) return;
        if (manualLineup.bench.length >= 6) return;
        setManualLineup(prev => ({
            ...prev,
            bench: [...prev.bench, { name: manualPlayerName.trim(), position: manualPlayerPosition.trim() || 'Sub' }]
        }));
        setManualPlayerName('');
        setManualPlayerPosition('');
    };

    const removeManualFromStarting = (index) => {
        setManualLineup(prev => ({
            ...prev,
            starting11: prev.starting11.filter((_, i) => i !== index)
        }));
    };

    const removeManualFromBench = (index) => {
        setManualLineup(prev => ({
            ...prev,
            bench: prev.bench.filter((_, i) => i !== index)
        }));
    };

    // ─── SAVE HANDLERS ───
    const handleSaveLineup = async () => {
        if (isManualMode) {
            await saveManualLineup();
        } else {
            await saveStandardLineup();
        }
    };

    const saveStandardLineup = async () => {
        if (lineup.starting11.length < 1) {
            alert('Please select at least 1 starting player');
            return;
        }

        const matchLabel = currentMatch ? `${currentMatch.teamA} vs ${currentMatch.teamB}` : selectedMatch;

        try {
            if (lineup.id) {
                await updateDoc(doc(db, 'lineups', lineup.id), {
                    starting11: lineup.starting11,
                    bench: lineup.bench,
                    updatedAt: new Date()
                });
                logAuditEvent('UPDATE_LINEUP', {
                    entityType: 'lineup',
                    entityId: lineup.id,
                    entityName: `${selectedTeam} — ${matchLabel}`,
                });
                setSuccessMessage('Lineup updated successfully!');
            } else {
                const docRef = await addDoc(collection(db, 'lineups'), {
                    matchId: lineup.matchId,
                    teamName: lineup.teamName,
                    starting11: lineup.starting11,
                    bench: lineup.bench,
                    createdAt: new Date()
                });
                
                // CRITICAL FIX: Save the new ID in state so future saves update instead of creating duplicates
                setLineup(prev => ({ ...prev, id: docRef.id }));

                logAuditEvent('CREATE_LINEUP', {
                    entityType: 'lineup',
                    entityId: docRef.id,
                    entityName: `${selectedTeam} — ${matchLabel}`,
                });
                setSuccessMessage('Lineup saved successfully!');
            }

            setTimeout(() => setSuccessMessage(''), 3000);
            // setLineup({ id: '', matchId: '', teamName: '', starting11: [], bench: [] });
            // setSelectedMatch('');
            // setSelectedTeam('');
        } catch (error) {
            console.error('Error saving lineup:', error);
            alert('Error saving lineup: ' + error.message);
        }
    };

    const handleSaveDefault = async () => {
        if (!selectedTeam) return;
        
        try {
            const team = teams.find(t => t.name === selectedTeam);
            if (!team) return;

            const isManualData = isManualMode;
            const lineupData = isManualData 
                ? { starting11: manualLineup.starting11, bench: manualLineup.bench, isManual: true }
                : { starting11: lineup.starting11, bench: lineup.bench, isManual: false };

            await updateDoc(doc(db, 'teams', team.id), {
                defaultLineup: lineupData
            });

            setSuccessMessage(`Default lineup saved for ${selectedTeam}!`);
            setTimeout(() => setSuccessMessage(''), 3000);
            
            logAuditEvent('SAVE_DEFAULT_LINEUP', {
                entityType: 'team',
                entityId: team.id,
                entityName: selectedTeam,
            });
        } catch (error) {
            console.error('Error saving default lineup:', error);
            alert('Error saving default: ' + error.message);
        }
    };

    const handleLoadDefault = () => {
        const team = teams.find(t => t.name === selectedTeam);
        if (!team || !team.defaultLineup) {
            alert('No default lineup found for this team.');
            return;
        }

        const def = team.defaultLineup;
        if (def.isManual) {
            setIsManualMode(true);
            setManualLineup(prev => ({
                ...prev,
                starting11: def.starting11 || [],
                bench: def.bench || []
            }));
            setLineup(prev => ({ ...prev, starting11: [], bench: [] }));
        } else {
            setIsManualMode(false);
            setLineup(prev => ({
                ...prev,
                starting11: def.starting11 || [],
                bench: def.bench || []
            }));
            setManualLineup(prev => ({ ...prev, starting11: [], bench: [] }));
        }
        setSuccessMessage('Default lineup loaded!');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const saveManualLineup = async () => {
        if (manualLineup.starting11.length < 1) {
            alert('Please add at least 1 starting player');
            return;
        }

        const matchLabel = currentMatch ? `${currentMatch.teamA} vs ${currentMatch.teamB}` : selectedMatch;

        try {
            const lineupData = {
                matchId: selectedMatch,
                teamName: selectedTeam,
                starting11: manualLineup.starting11,
                bench: manualLineup.bench,
                isManual: true,
            };

            if (manualLineup.id) {
                await updateDoc(doc(db, 'lineups', manualLineup.id), {
                    ...lineupData,
                    updatedAt: new Date()
                });
                logAuditEvent('UPDATE_LINEUP', {
                    entityType: 'lineup',
                    entityId: manualLineup.id,
                    entityName: `${selectedTeam} — ${matchLabel} (Manual)`,
                });
                setSuccessMessage('Manual lineup updated successfully!');
            } else {
                const docRef = await addDoc(collection(db, 'lineups'), {
                    ...lineupData,
                    createdAt: new Date()
                });
                
                // CRITICAL FIX: Save the new ID in state so future saves update instead of creating duplicates
                setManualLineup(prev => ({ ...prev, id: docRef.id }));

                logAuditEvent('CREATE_LINEUP', {
                    entityType: 'lineup',
                    entityId: docRef.id,
                    entityName: `${selectedTeam} — ${matchLabel} (Manual)`,
                });
                setSuccessMessage('Manual lineup saved successfully!');
            }

            setTimeout(() => setSuccessMessage(''), 3000);
            // setManualLineup({ id: '', matchId: '', teamName: '', starting11: [], bench: [] });
            // setSelectedMatch('');
            // setSelectedTeam('');
        } catch (error) {
            console.error('Error saving manual lineup:', error);
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
            <div className="bg-[#0B1220] dark:bg-gray-800 p-6 rounded-lg mb-6">
                <h3 className="text-xl mb-4">Select Match</h3>
                <select
                    value={selectedMatch}
                    onChange={(e) => handleMatchChange(e.target.value)}
                    className="bg-[#101827] dark:bg-gray-700 p-3 rounded text-white w-full mb-4"
                >
                    <option value="">Select a match</option>
                    {scopedMatches.filter(m => m.status !== 'finished').map(match => (
                        <option key={match.id} value={match.id}>
                            {match.isQuickMatch ? '⚡ ' : ''}{match.competition} - {match.teamA} vs {match.teamB}
                            {match.date && ` (${new Date(match.date).toLocaleDateString()})`}
                        </option>
                    ))}
                </select>

                {currentMatch && (
                    <div className="mt-4">
                        <h4 className="text-lg mb-2">Select Team</h4>
                        <div className="flex flex-wrap gap-2">
                            {/* Team Selection Buttons */}
                            {[currentMatch.teamA, currentMatch.teamB].map(teamName => (
                                <button
                                    key={teamName}
                                    onClick={() => handleTeamChange(teamName)}
                                    className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                        selectedTeam === teamName 
                                        ? 'bg-brand-500/10 border-brand-500 text-brand-500' 
                                        : 'bg-[#131D31]/50 border-white/5 hover:bg-[#131D31]/10 hover:border-white/20'
                                    }`}
                                >
                                    <Shield size={32} />
                                    <span className="font-bold">{teamName}</span>
                                </button>
                            ))}
                        </div>

                        {/* Template Controls */}
                        {selectedTeam && (
                            <div className="mt-4 p-4 bg-[#101827] dark:bg-gray-700/50 rounded-xl flex items-center justify-between gap-4 border border-white/5">
                                <div className="flex items-center gap-2 text-[#64748B] dark:text-gray-400">
                                    <Users size={18} />
                                    <span className="text-sm font-medium">Lineup Templates</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleLoadDefault}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                                    >
                                        💾 Load Team Default
                                    </button>
                                    <button
                                        onClick={handleSaveDefault}
                                        className="px-4 py-2 bg-brand-500/20 hover:bg-brand-500/30 text-brand-500 border border-brand-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                                    >
                                        ⭐ Save as Default
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Mode toggle when team is selected */}
            {selectedTeam && (
                <div className="mb-6">
                    <div className="flex rounded-xl overflow-hidden border border-[#24344D] bg-[#0B1220] dark:bg-gray-800">
                        <button
                            onClick={() => setIsManualMode(false)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-all ${
                                !isManualMode
                                    ? 'bg-brand-500 text-white shadow-lg'
                                    : 'text-[#94A3B8] hover:text-white hover:text-white hover:bg-[#18253C] hover:bg-[#18253C]'
                            }`}
                        >
                            <Users size={16} />
                            <span>Select from Roster</span>
                        </button>
                        <button
                            onClick={() => setIsManualMode(true)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-all ${
                                isManualMode
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                                    : 'text-[#94A3B8] hover:text-white hover:text-white hover:bg-[#18253C] hover:bg-[#18253C]'
                            }`}
                        >
                            <UserPlus size={16} />
                            <span>Manual Entry</span>
                        </button>
                    </div>
                    {isManualMode && (
                        <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
                            <UserPlus size={14} />
                            Manual Mode: Type player names directly — perfect for quick matches and unregistered teams.
                        </div>
                    )}
                </div>
            )}

            {/* ═══ MANUAL MODE ═══ */}
            {selectedTeam && isManualMode && (
                <div className="space-y-6">
                    {/* Manual Player Input */}
                    <div className="bg-[#0B1220] dark:bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl mb-4 flex items-center gap-2">
                            <UserPlus size={20} className="text-amber-500" />
                            Add Player Manually
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Player Name *"
                                value={manualPlayerName}
                                onChange={(e) => setManualPlayerName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (manualLineup.starting11.length < 11) addManualToStarting();
                                        else if (manualLineup.bench.length < 6) addManualToBench();
                                    }
                                }}
                                className="flex-1 bg-[#131D31] dark:bg-gray-700 border border-[#24344D] dark:border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                            />
                            <select
                                value={manualPlayerPosition}
                                onChange={(e) => setManualPlayerPosition(e.target.value)}
                                className="bg-[#131D31] dark:bg-gray-700 border border-[#24344D] dark:border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none font-bold w-full sm:w-40"
                            >
                                <option value="">Position</option>
                                <option value="GK">GK</option>
                                <option value="CB">CB</option>
                                <option value="LB">LB</option>
                                <option value="RB">RB</option>
                                <option value="CDM">CDM</option>
                                <option value="CM">CM</option>
                                <option value="CAM">CAM</option>
                                <option value="LM">LM</option>
                                <option value="RM">RM</option>
                                <option value="LW">LW</option>
                                <option value="RW">RW</option>
                                <option value="ST">ST</option>
                                <option value="CF">CF</option>
                            </select>
                            <div className="flex gap-2">
                                <button
                                    onClick={addManualToStarting}
                                    disabled={!manualPlayerName.trim()}
                                    className="flex-1 sm:flex-initial px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    Starting
                                </button>
                                <button
                                    onClick={addManualToBench}
                                    disabled={!manualPlayerName.trim() || manualLineup.bench.length >= 6}
                                    className="flex-1 sm:flex-initial px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    Bench
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Manual Starting 11 */}
                        <div className="bg-[#0B1220] dark:bg-gray-800 p-6 rounded-lg">
                            <h3 className="text-xl mb-4 flex items-center gap-2">
                                <Shield size={18} className="text-green-500" />
                                Starting Lineup
                                <span className={`ml-2 text-sm text-[#64748B]`}>
                                    ({manualLineup.starting11.length})
                                </span>
                            </h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {manualLineup.starting11.map((player, index) => (
                                    <div key={index} className="bg-green-900/30 dark:bg-green-900 p-3 rounded-lg flex justify-between items-center border border-green-500/20">
                                        <div>
                                            <div className="font-bold">#{index + 1} {player.name}</div>
                                            <div className="text-xs text-green-400">{player.position}</div>
                                        </div>
                                        <button
                                            onClick={() => removeManualFromStarting(index)}
                                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {manualLineup.starting11.length === 0 && (
                                    <p className="text-[#64748B] dark:text-gray-400 text-sm text-center py-4">No players added yet. Type a name above.</p>
                                )}
                            </div>
                        </div>

                        {/* Manual Bench */}
                        <div className="bg-[#0B1220] dark:bg-gray-800 p-6 rounded-lg">
                            <h3 className="text-xl mb-4 flex items-center gap-2">
                                Bench
                                <span className={`ml-2 text-sm ${manualLineup.bench.length === 6 ? 'text-green-400' : 'text-[#64748B] dark:text-gray-400'}`}>
                                    ({manualLineup.bench.length}/6)
                                </span>
                            </h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {manualLineup.bench.map((player, index) => (
                                    <div key={index} className="bg-blue-900/30 dark:bg-blue-900 p-3 rounded-lg flex justify-between items-center border border-blue-500/20">
                                        <div>
                                            <div className="font-bold">{player.name}</div>
                                            <div className="text-xs text-blue-400">{player.position}</div>
                                        </div>
                                        <button
                                            onClick={() => removeManualFromBench(index)}
                                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {manualLineup.bench.length === 0 && (
                                    <p className="text-[#64748B] dark:text-gray-400 text-sm text-center py-4">No bench players</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ STANDARD MODE (FROM ROSTER) ═══ */}
            {selectedTeam && !isManualMode && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Available Players */}
                    <div className="bg-[#0B1220] dark:bg-gray-800 p-6 rounded-lg">
                        <div className="flex flex-col mb-4">
                            <h3 className="text-xl mb-2">Available Players</h3>
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-gray-500" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search team players..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-[#101827] dark:bg-gray-700 border border-gray-600 rounded pl-8 pr-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-green-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {teamPlayers
                                .filter(p => !selectedPlayerIds.includes(p.id))
                                .map(player => (
                                    <div key={player.id} className="bg-[#101827] dark:bg-gray-700 p-3 rounded flex justify-between items-center">
                                        <div>
                                            <div className="font-medium">{player.name}</div>
                                            <div className="text-xs text-[#64748B] dark:text-gray-400">{player.position}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => addToStarting11(player.id)}
                                                disabled={false}
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
                                <div className="text-center py-4">
                                    <p className="text-[#64748B] dark:text-gray-400 text-sm">
                                        {teamPlayers.length === 0 ? 'No registered players for this team.' : 'All players assigned'}
                                    </p>
                                    {teamPlayers.length === 0 && (
                                        <button
                                            onClick={() => setIsManualMode(true)}
                                            className="mt-3 px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-all"
                                        >
                                            Switch to Manual Entry →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Starting 11 */}
                    <div className="bg-[#0B1220] dark:bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl mb-4">
                            Starting Lineup
                            <span className={`ml-2 text-sm text-[#64748B]`}>
                                ({lineup.starting11.length})
                            </span>
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {lineup.starting11.map((playerId, index) => {
                                const player = getPlayerById(playerId);
                                return player ? (
                                    <div key={playerId} className="bg-green-900 p-3 rounded flex justify-between items-center">
                                        <div>
                                            <div className="font-medium">#{index + 1} {player.name}</div>
                                            <div className="text-xs text-[#94A3B8] dark:text-gray-300">{player.position}</div>
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
                                <p className="text-[#64748B] dark:text-gray-400 text-sm text-center py-4">No players selected</p>
                            )}
                        </div>
                    </div>

                    {/* Bench */}
                    <div className="bg-[#0B1220] dark:bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl mb-4">
                            Bench
                            <span className={`ml-2 text-sm ${lineup.bench.length === 6 ? 'text-green-400' : 'text-[#64748B] dark:text-gray-400'}`}>
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
                                            <div className="text-xs text-[#94A3B8] dark:text-gray-300">{player.position}</div>
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
                                <p className="text-[#64748B] dark:text-gray-400 text-sm text-center py-4">No bench players</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button */}
            {selectedTeam && (
                <div className="mt-6 flex flex-col items-center gap-4">
                    {successMessage && (
                        <div className="bg-green-600/20 border border-green-600/50 text-green-400 px-6 py-2 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-bottom-2">
                             ✓ {successMessage}
                        </div>
                    )}
                    <button
                        onClick={handleSaveLineup}
                        disabled={isManualMode ? manualLineup.starting11.length < 1 : lineup.starting11.length < 1}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-12 py-3 rounded-xl text-lg font-black transition-all shadow-lg shadow-green-600/20 active:scale-95"
                    >
                        {isManualMode ? 'Save Manual Lineup' : 'Save Lineup'}
                    </button>
                </div>
            )}

            {/* Instructions */}
            {!selectedMatch && (
                <div className="bg-[#0B1220] dark:bg-gray-800 p-6 rounded-lg mt-6">
                    <h3 className="text-xl mb-4">📋 How to Create a Lineup</h3>
                    <ol className="list-decimal list-inside space-y-2 text-[#94A3B8] dark:text-gray-300">
                        <li>Select a match from the dropdown</li>
                        <li>Choose which team you want to create a lineup for</li>
                        <li>Toggle <strong>"Manual Entry"</strong> to type player names directly, or <strong>"Select from Roster"</strong> to pick from registered players</li>
                        <li>Add players to the Starting lineup (any number — even 3 or 5 players work!)</li>
                        <li>Add up to 6 players to the Bench (optional)</li>
                        <li>Click "Save Lineup" to confirm</li>
                    </ol>
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-sm font-medium">
                        💡 <strong>Tip:</strong> For Quick Matches with unregistered teams, Manual Entry mode is auto-enabled so you can type player names directly!
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageLineups;
