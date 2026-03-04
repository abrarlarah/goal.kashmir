import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Trophy, Calendar, Users, MapPin, List, Plus, Search, X, Edit3 } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import MatchTimer from '../components/common/MatchTimer';
import MatchBracket from '../components/common/MatchBracket';
import { doc, updateDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { generateKnockoutMatches, generatePoolMatches, generateDualKnockoutMatches, generateLeagueMatches } from '../utils/bracketGenerator';

const TournamentDetail = () => {
    const { id } = useParams();
    const { tournaments, matches, teams, loading } = useData();
    const { isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('fixtures');
    const [showAddTeam, setShowAddTeam] = useState(false);
    const [showScheduleMatch, setShowScheduleMatch] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [matchFormData, setMatchFormData] = useState({
        teamA: '',
        teamB: '',
        date: '',
        time: '',
        round: '',
        scoreA: 0,
        scoreB: 0,
        status: 'scheduled',
        currentMinute: 0,
        managerA: '',
        managerB: ''
    });
    const [isSavingMatch, setIsSavingMatch] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const tournament = useMemo(() => tournaments.find(t => t.id === id), [tournaments, id]);

    const tournamentMatches = useMemo(() => {
        if (!tournament) return [];
        return matches.filter(m => m.tournamentId === id || (!m.tournamentId && m.competition === tournament.name));
    }, [matches, tournament, id]);

    const tournamentTeams = useMemo(() => {
        if (!tournament) return [];
        return teams.filter(team => {
            const tTournaments = Array.isArray(team.tournaments)
                ? team.tournaments
                : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
            return tTournaments.includes(tournament.name);
        });
    }, [teams, tournament]);

    const availableTeams = useMemo(() => {
        if (!tournament) return [];
        return teams.filter(team => {
            const tTournaments = Array.isArray(team.tournaments)
                ? team.tournaments
                : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
            return !tTournaments.includes(tournament.name);
        }).filter(team =>
            team.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [teams, tournament, searchTerm]);

    const handleAddTeam = async (team) => {
        try {
            const teamRef = doc(db, 'teams', team.id);
            const currentTournaments = Array.isArray(team.tournaments) ? team.tournaments : [];
            await updateDoc(teamRef, {
                tournaments: [...currentTournaments, tournament.name]
            });
            setShowAddTeam(false);
        } catch (err) {
            console.error("Error adding team to tournament:", err);
            alert("Error adding team");
        }
    };

    const handleRemoveTeam = async (team) => {
        if (!window.confirm(`Are you sure you want to remove ${team.name} from this tournament?`)) return;
        try {
            const teamRef = doc(db, 'teams', team.id);
            const currentTournaments = Array.isArray(team.tournaments) ? team.tournaments : [];
            await updateDoc(teamRef, {
                tournaments: currentTournaments.filter(t => t !== tournament.name)
            });
        } catch (err) {
            console.error("Error removing team from tournament:", err);
            alert("Error removing team");
        }
    };

    const handleMatchInputChange = (e) => {
        const { name, value } = e.target;
        setMatchFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === 'teamA') {
                const team = tournamentTeams.find(t => t.name === value);
                if (team) newData.managerA = team.manager || '';
            }
            if (name === 'teamB') {
                const team = tournamentTeams.find(t => t.name === value);
                if (team) newData.managerB = team.manager || '';
            }
            return newData;
        });
    };

    const handleScheduleMatch = async (e) => {
        e.preventDefault();
        if (!matchFormData.teamA || !matchFormData.teamB) {
            alert("Please select both teams");
            return;
        }
        setIsSavingMatch(true);
        try {
            await addDoc(collection(db, 'matches'), {
                ...matchFormData,
                competition: tournament.name,
                tournamentId: tournament.id
            });
            setShowScheduleMatch(false);
            setMatchFormData({
                teamA: '', teamB: '', date: '', time: '', round: '',
                scoreA: 0, scoreB: 0, status: 'scheduled', currentMinute: 0,
                managerA: '', managerB: ''
            });
        } catch (err) {
            console.error("Error scheduling match:", err);
            alert("Error scheduling match");
        } finally {
            setIsSavingMatch(false);
        }
    };

    const handleSeedBracket = async () => {
        const count = tournament.teamsCount || tournamentTeams.length || 10;
        const isPool = tournament.type === 'pool';
        const isDualKnockout = tournament.type === 'dual_knockout';

        let msg = `This will generate an automated ${count}-team knockout structure. Continue?`;
        if (isPool) msg = `This will generate a ${count}-team 2-Pool structure (Pool A + Pool B round-robin, Semi-Finals, Final). Continue?`;
        if (isDualKnockout) msg = `This will generate a ${count}-team 2-Pool Knockout structure (Left Wing vs Right Wing). Continue?`;

        if (!window.confirm(msg)) return;

        try {
            setIsSavingMatch(true);
            let matchesToCreate = [];
            if (tournament.type === 'league') {
                matchesToCreate = generateLeagueMatches(count, tournament.name, tournament.id, tournament.startDate, tournamentTeams);
            } else if (tournament.type === 'pool') {
                matchesToCreate = generatePoolMatches(count, tournament.name, tournament.id, tournament.startDate, tournamentTeams);
            } else if (tournament.type === 'dual_knockout') {
                matchesToCreate = generateDualKnockoutMatches(count, tournament.name, tournament.id, tournament.startDate, tournamentTeams);
            } else {
                matchesToCreate = generateKnockoutMatches(count, tournament.name, tournament.id, tournament.startDate, tournamentTeams);
            }

            const batchPromises = matchesToCreate.map(matchData =>
                addDoc(collection(db, 'matches'), matchData)
            );
            await Promise.all(batchPromises);

            const typeLabel = tournament.type === 'league' ? 'league' : (tournament.type === 'pool' ? 'pool' : 'bracket');
            alert(`Success! Generated ${matchesToCreate.length} matches for a ${count}-team ${typeLabel}.`);
        } catch (err) {
            console.error("Error seeding:", err);
            alert("Error seeding structure");
        } finally {
            setIsSavingMatch(false);
        }
    };

    const handleSyncTeamNames = async () => {
        if (!window.confirm("This will replace 'Team 1', 'Team 2', etc. in your matches with the actual teams registered in this tournament. Continue?")) return;

        try {
            setIsSavingMatch(true);
            const updates = [];

            // Map "Team X" to actual team names
            tournamentMatches.forEach(match => {
                let matchUpdate = {};
                let changed = false;

                // Check Team A
                if (match.teamA && match.teamA.startsWith('Team ')) {
                    const idx = parseInt(match.teamA.replace('Team ', '')) - 1;
                    if (tournamentTeams[idx]) {
                        matchUpdate.teamA = tournamentTeams[idx].name;
                        matchUpdate.managerA = tournamentTeams[idx].manager || '';
                        changed = true;
                    }
                }

                // Check Team B
                if (match.teamB && match.teamB.startsWith('Team ')) {
                    const idx = parseInt(match.teamB.replace('Team ', '')) - 1;
                    if (tournamentTeams[idx]) {
                        matchUpdate.teamB = tournamentTeams[idx].name;
                        matchUpdate.managerB = tournamentTeams[idx].manager || '';
                        changed = true;
                    }
                }

                if (changed) {
                    updates.push(updateDoc(doc(db, 'matches', match.id), matchUpdate));
                }
            });

            if (updates.length > 0) {
                await Promise.all(updates);
                setSuccessMessage(`Successfully synced names for ${updates.length} matches!`);
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                alert("No matches with 'Team X' placeholders were found or teams are already synced.");
            }
        } catch (err) {
            console.error("Error syncing teams:", err);
            alert("Error syncing team names");
        } finally {
            setIsSavingMatch(false);
        }
    };

    // Helper to compute standings from a set of matches and team names
    const computeStandings = (matchList, teamNames) => {
        const stats = {};
        teamNames.forEach(name => {
            stats[name] = {
                name,
                played: 0, wins: 0, draws: 0, losses: 0,
                gf: 0, ga: 0, pts: 0, gd: 0
            };
        });

        matchList.filter(m => m.status === 'finished').forEach(match => {
            const teamA = stats[match.teamA];
            const teamB = stats[match.teamB];
            if (!teamA || !teamB) return;

            teamA.played++; teamB.played++;
            teamA.gf += match.scoreA; teamA.ga += match.scoreB;
            teamB.gf += match.scoreB; teamB.ga += match.scoreA;

            if (match.scoreA > match.scoreB) {
                teamA.wins++; teamA.pts += 3; teamB.losses++;
            } else if (match.scoreB > match.scoreA) {
                teamB.wins++; teamB.pts += 3; teamA.losses++;
            } else {
                teamA.draws++; teamA.pts += 1; teamB.draws++; teamB.pts += 1;
            }
            teamA.gd = teamA.gf - teamA.ga;
            teamB.gd = teamB.gf - teamB.ga;
        });

        return Object.values(stats).sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
        });
    };

    // Calculate Standings for League Type
    const standings = useMemo(() => {
        if (!tournament || tournament.type !== 'league') return [];
        const teamNames = tournamentTeams.map(t => t.name);
        return computeStandings(tournamentMatches, teamNames);
    }, [tournament, tournamentTeams, tournamentMatches]);

    // Calculate Pool Standings for Pool Type
    const poolAStandings = useMemo(() => {
        if (!tournament || tournament.type !== 'pool') return [];
        const poolAMatches = tournamentMatches.filter(m => m.pool === 'A' || m.round === 'Pool A');
        const poolATeamNames = [...new Set(poolAMatches.flatMap(m => [m.teamA, m.teamB]))];
        return computeStandings(poolAMatches, poolATeamNames);
    }, [tournament, tournamentMatches]);

    const poolBStandings = useMemo(() => {
        if (!tournament || tournament.type !== 'pool') return [];
        const poolBMatches = tournamentMatches.filter(m => m.pool === 'B' || m.round === 'Pool B');
        const poolBTeamNames = [...new Set(poolBMatches.flatMap(m => [m.teamA, m.teamB]))];
        return computeStandings(poolBMatches, poolBTeamNames);
    }, [tournament, tournamentMatches]);

    // Knockout matches for pool type (Everything that isn't a pool round-robin match)
    const knockoutMatchesByRound = useMemo(() => {
        if (!tournament || tournament.type !== 'pool') return {};
        // Filter out Pool A/B matches to only show the bracket part
        const knockoutMatches = tournamentMatches.filter(m =>
            m.round !== 'Pool A' && m.round !== 'Pool B' && m.pool === undefined
        );

        const groups = {};
        knockoutMatches.forEach(m => {
            const round = m.round || 'General';
            if (!groups[round]) groups[round] = [];
            groups[round].push(m);
        });

        // Ensure rounds are ordered correctly
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => (a.matchOrder || 0) - (b.matchOrder || 0));
        });
        return groups;
    }, [tournament, tournamentMatches]);

    // Group matches by Round for Brackets or Schedule
    const matchesByRound = useMemo(() => {
        const groups = {};
        tournamentMatches.forEach(m => {
            const round = m.round || 'General';
            if (!groups[round]) groups[round] = [];
            groups[round].push(m);
        });

        // Sort matches within each round by matchOrder to preserve correct left/right placement
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => (a.matchOrder || 0) - (b.matchOrder || 0));
        });

        return groups;
    }, [tournamentMatches]);

    if (loading) return <div className="flex h-screen items-center justify-center text-slate-900 dark:text-white">Loading...</div>;
    if (!tournament) return <div className="text-slate-900 dark:text-white p-20 text-center">Tournament not found</div>;

    const tabs = [
        { id: 'fixtures', label: 'Fixtures', icon: Calendar },
        ...(tournament.type === 'league' ? [{ id: 'standings', label: 'Standings', icon: List }] : []),
        ...(tournament.type === 'knockout' || tournament.type === 'dual_knockout' ? [{ id: 'bracket', label: 'Bracket', icon: Trophy }] : []),
        ...(tournament.type === 'pool' ? [
            { id: 'pools', label: 'Pool Standings', icon: List },
            { id: 'bracket', label: 'Knockout', icon: Trophy }
        ] : []),
        { id: 'teams', label: 'Teams', icon: Users },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            {successMessage && (
                <div className="fixed top-24 right-4 z-50 animate-bounce">
                    <div className="bg-green-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-sm border border-white/20 flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        {successMessage}
                    </div>
                </div>
            )}
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 to-slate-900 border border-slate-200 dark:border-white/10 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Trophy size={200} />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="h-32 w-32 rounded-2xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30 shadow-lg">
                        <Trophy size={64} className="text-brand-400" />
                    </div>

                    <div className="text-center md:text-left flex-1">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                            <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-[10px] font-black uppercase tracking-widest border border-brand-500/20">
                                {tournament.type === 'knockout' ? '🏆 Knockout' :
                                    tournament.type === 'pool' ? '🏊 Pool + Knockout' :
                                        tournament.type === 'dual_knockout' ? '🌱 2-Pool Knockout' : '📋 League'}
                            </span>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                                tournament.status === 'live' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"
                            )}>
                                {tournament.status}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 dark:text-white mb-4 italic">
                            {tournament.name}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                                <MapPin size={18} className="text-brand-500" />
                                <span>{tournament.district}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-brand-500" />
                                <span>{tournament.startDate} - {tournament.endDate}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 dark:border-white/5 text-center">
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{tournament.teamsCount || 0}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Teams</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 dark:border-white/5 text-center">
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{tournamentMatches.length || tournament.matchesCount || 0}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Matches</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-brand-500 text-slate-900 dark:text-white shadow-lg shadow-brand-500/20"
                                : "bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-white/10"
                        )}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'fixtures' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <span className="h-6 w-1 bg-brand-500 rounded-full"></span>
                                Match Schedule
                            </h3>
                            {isAdmin && (
                                <div className="flex gap-2">
                                    {tournamentMatches.length > 0 && isAdmin && (
                                        <button
                                            onClick={handleSyncTeamNames}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-500 rounded-xl font-bold text-sm hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                                            title="Sync 'Team 1, 2...' with actual team names"
                                        >
                                            <Users size={18} />
                                            Sync Teams
                                        </button>
                                    )}
                                    {tournamentMatches.length === 0 && (
                                        <button
                                            onClick={handleSeedBracket}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                                        >
                                            <List size={18} />
                                            Generate {tournament.type === 'league' ? 'League' : 'Bracket'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowScheduleMatch(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-slate-900 dark:text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-all shadow-lg"
                                    >
                                        <Plus size={18} />
                                        Schedule Match
                                    </button>
                                </div>
                            )}
                        </div>

                        {Object.keys(matchesByRound).length > 0 ? (
                            Object.entries(matchesByRound).map(([round, matches]) => (
                                <div key={round} className="space-y-4">
                                    <h3 className="text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-3">
                                        <span className="h-6 w-1 bg-brand-500 rounded-full"></span>
                                        {round}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {matches.map(match => {
                                            const teamA = tournamentTeams.find(t => t.name === match.teamA);
                                            const teamB = tournamentTeams.find(t => t.name === match.teamB);
                                            return (
                                                <Link
                                                    key={match.id}
                                                    to={`/live/${match.id}`}
                                                    className="group relative bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-5 hover:border-brand-500/30 transition-all shadow-lg"
                                                >
                                                    {isAdmin && (
                                                        <div className="absolute top-2 right-2 p-2 bg-brand-500 text-slate-900 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20">
                                                            <Edit3 size={14} />
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex-1 flex flex-col items-center">
                                                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2 overflow-hidden border border-slate-200 dark:border-white/5 group-hover:border-brand-500/30 transition-colors p-2">
                                                                {teamA?.logoUrl ? (
                                                                    <img src={teamA.logoUrl} alt="" className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <span className="text-sm font-black text-slate-500">{match.teamA.substring(0, 2).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-900 dark:text-white text-center group-hover:text-brand-400 transition-colors truncate w-full">{match.teamA}</span>
                                                        </div>

                                                        <div className="text-center px-4">
                                                            <div className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tighter">
                                                                {match.status === 'scheduled' ? `${match.time}` :
                                                                    match.status === 'live' ? <div className="text-brand-400 font-mono"><MatchTimer match={match} /></div> :
                                                                        `${match.scoreA} - ${match.scoreB}`}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest whitespace-nowrap flex flex-col items-center">
                                                                {match.status === 'scheduled' && <span>{match.date}</span>}
                                                                {match.status === 'live' && (
                                                                    <span className="flex items-center gap-1 text-red-500">
                                                                        <span className="h-1 w-1 bg-red-500 rounded-full animate-pulse" />
                                                                        LIVE • {match.scoreA} - {match.scoreB}
                                                                    </span>
                                                                )}
                                                                {match.status === 'finished' && <span>{match.status}</span>}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 flex flex-col items-center">
                                                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2 overflow-hidden border border-slate-200 dark:border-white/5 group-hover:border-brand-500/30 transition-colors p-2">
                                                                {teamB?.logoUrl ? (
                                                                    <img src={teamB.logoUrl} alt="" className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <span className="text-sm font-black text-slate-500">{match.teamB.substring(0, 2).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-900 dark:text-white text-center group-hover:text-brand-400 transition-colors truncate w-full">{match.teamB}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                                <Calendar size={48} className="mx-auto text-slate-600 mb-4" />
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No fixtures found</h3>
                                <p className="text-slate-500">Wait for the organizers to schedule matches.</p>
                            </div>
                        )}
                        {/* Schedule Match Modal */}
                        {showScheduleMatch && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                                <div className="bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
                                    <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-brand-500/5">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white italic">Schedule New Match</h3>
                                        <button onClick={() => setShowScheduleMatch(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleScheduleMatch} className="p-6 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Home Team</label>
                                                <select
                                                    name="teamA"
                                                    value={matchFormData.teamA}
                                                    onChange={handleMatchInputChange}
                                                    className="w-full bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all"
                                                    required
                                                >
                                                    <option value="">Select Home Team</option>
                                                    {tournamentTeams.map(team => (
                                                        <option key={team.id} value={team.name} disabled={team.name === matchFormData.teamB}>
                                                            {team.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Away Team</label>
                                                <select
                                                    name="teamB"
                                                    value={matchFormData.teamB}
                                                    onChange={handleMatchInputChange}
                                                    className="w-full bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all"
                                                    required
                                                >
                                                    <option value="">Select Away Team</option>
                                                    {tournamentTeams.map(team => (
                                                        <option key={team.id} value={team.name} disabled={team.name === matchFormData.teamA}>
                                                            {team.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Date</label>
                                                <input
                                                    type="date"
                                                    name="date"
                                                    value={matchFormData.date}
                                                    onChange={handleMatchInputChange}
                                                    className="w-full bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Time</label>
                                                <input
                                                    type="time"
                                                    name="time"
                                                    value={matchFormData.time}
                                                    onChange={handleMatchInputChange}
                                                    className="w-full bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Round / Stage</label>
                                            <select
                                                name="round"
                                                value={matchFormData.round}
                                                onChange={handleMatchInputChange}
                                                className="w-full bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all"
                                                required
                                            >
                                                <option value="">Select Stage</option>
                                                {tournament.type === 'knockout' ? (
                                                    <>
                                                        <option value="Round of 32">Round of 32</option>
                                                        <option value="Round of 16">Round of 16 (Prelims)</option>
                                                        <option value="Quarter-Final">Quarter-Final</option>
                                                        <option value="Semi-Final">Semi-Final</option>
                                                        <option value="Final">Final</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="Round 1">Round 1</option>
                                                        <option value="Round 2">Round 2</option>
                                                        <option value="Round 3">Round 3</option>
                                                        <option value="Finals week">Finals week</option>
                                                    </>
                                                )}
                                                <option value="General">General/Friendly</option>
                                            </select>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSavingMatch}
                                            className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-slate-900 dark:text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-brand-500/20"
                                        >
                                            {isSavingMatch ? 'Scheduling...' : 'Create Match'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'standings' && (
                    <div className="bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-slate-200 dark:border-white/10 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Pos</th>
                                    <th className="px-6 py-4">Team</th>
                                    <th className="px-4 py-4 text-center">P</th>
                                    <th className="px-4 py-4 text-center">W</th>
                                    <th className="px-4 py-4 text-center">D</th>
                                    <th className="px-4 py-4 text-center">L</th>
                                    <th className="px-4 py-4 text-center">GD</th>
                                    <th className="px-6 py-4 text-center">Pts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {standings.map((team, idx) => (
                                    <tr key={team.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-black text-slate-500">{idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <Link to={`/teams/${team.id}`} className="flex items-center gap-3 text-slate-900 dark:text-white font-bold hover:text-brand-400 transition-colors">
                                                {team.logoUrl ? (
                                                    <img src={team.logoUrl} className="w-8 h-8 object-contain" alt="" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-brand-500 rounded flex items-center justify-center text-[10px]">
                                                        {team.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                {team.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-600 dark:text-slate-400">{team.played}</td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-600 dark:text-slate-400">{team.wins}</td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-600 dark:text-slate-400">{team.draws}</td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-600 dark:text-slate-400">{team.losses}</td>
                                        <td className="px-4 py-4 text-center font-bold text-brand-400">{team.gd}</td>
                                        <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white bg-brand-500/5">{team.pts}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pool Standings Tab (for pool type) */}
                {activeTab === 'pools' && tournament.type === 'pool' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Pool A */}
                            <div className="bg-slate-900 rounded-3xl border border-white/10 overflow-hidden">
                                <div className="px-6 py-4 bg-indigo-500/10 border-b border-white/5">
                                    <h3 className="text-lg font-display font-black text-white flex items-center gap-2">
                                        <span className="h-6 w-6 bg-indigo-500 rounded-lg flex items-center justify-center text-xs font-black text-white">A</span>
                                        Pool A
                                    </h3>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                                        <tr>
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Team</th>
                                            <th className="px-3 py-3 text-center">P</th>
                                            <th className="px-3 py-3 text-center">W</th>
                                            <th className="px-3 py-3 text-center">D</th>
                                            <th className="px-3 py-3 text-center">L</th>
                                            <th className="px-3 py-3 text-center">GD</th>
                                            <th className="px-4 py-3 text-center">Pts</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {poolAStandings.map((team, idx) => (
                                            <tr key={team.name} className={cn(
                                                "hover:bg-white/5 transition-colors",
                                                idx < 2 && "border-l-2 border-l-green-500"
                                            )}>
                                                <td className="px-4 py-3 font-black text-slate-500">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-white">{team.name}</span>
                                                    {idx < 2 && <span className="ml-2 text-[8px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full font-bold">Q</span>}
                                                </td>
                                                <td className="px-3 py-3 text-center text-slate-400">{team.played}</td>
                                                <td className="px-3 py-3 text-center text-slate-400">{team.wins}</td>
                                                <td className="px-3 py-3 text-center text-slate-400">{team.draws}</td>
                                                <td className="px-3 py-3 text-center text-slate-400">{team.losses}</td>
                                                <td className="px-3 py-3 text-center font-bold text-brand-400">{team.gd}</td>
                                                <td className="px-4 py-3 text-center font-black text-white bg-brand-500/5">{team.pts}</td>
                                            </tr>
                                        ))}
                                        {poolAStandings.length === 0 && (
                                            <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">No matches played yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pool B */}
                            <div className="bg-slate-900 rounded-3xl border border-white/10 overflow-hidden">
                                <div className="px-6 py-4 bg-orange-500/10 border-b border-white/5">
                                    <h3 className="text-lg font-display font-black text-white flex items-center gap-2">
                                        <span className="h-6 w-6 bg-orange-500 rounded-lg flex items-center justify-center text-xs font-black text-white">B</span>
                                        Pool B
                                    </h3>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                                        <tr>
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Team</th>
                                            <th className="px-3 py-3 text-center">P</th>
                                            <th className="px-3 py-3 text-center">W</th>
                                            <th className="px-3 py-3 text-center">D</th>
                                            <th className="px-3 py-3 text-center">L</th>
                                            <th className="px-3 py-3 text-center">GD</th>
                                            <th className="px-4 py-3 text-center">Pts</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {poolBStandings.map((team, idx) => (
                                            <tr key={team.name} className={cn(
                                                "hover:bg-white/5 transition-colors",
                                                idx < 2 && "border-l-2 border-l-green-500"
                                            )}>
                                                <td className="px-4 py-3 font-black text-slate-500">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-white">{team.name}</span>
                                                    {idx < 2 && <span className="ml-2 text-[8px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full font-bold">Q</span>}
                                                </td>
                                                <td className="px-3 py-3 text-center text-slate-400">{team.played}</td>
                                                <td className="px-3 py-3 text-center text-slate-400">{team.wins}</td>
                                                <td className="px-3 py-3 text-center text-slate-400">{team.draws}</td>
                                                <td className="px-3 py-3 text-center text-slate-400">{team.losses}</td>
                                                <td className="px-3 py-3 text-center font-bold text-brand-400">{team.gd}</td>
                                                <td className="px-4 py-3 text-center font-black text-white bg-brand-500/5">{team.pts}</td>
                                            </tr>
                                        ))}
                                        {poolBStandings.length === 0 && (
                                            <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">No matches played yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Qualification Info */}
                        <div className="flex items-center justify-center gap-6 py-3 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-1 bg-green-500 rounded" />
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Qualifies to Semi-Finals</span>
                            </div>
                            <span className="text-slate-600">•</span>
                            <span className="text-[10px] text-slate-500">Semi-Finals: A1 vs B2, B1 vs A2 → Final</span>
                        </div>
                    </div>
                )}

                {activeTab === 'bracket' && (
                    <div className="space-y-6">
                        {isAdmin && (
                            <div className="flex justify-end gap-3 mb-4">
                                {tournamentMatches.length > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (window.confirm("ARE YOU SURE? This will permanently delete ALL matches for this tournament and let you start over.")) {
                                                try {
                                                    setIsSavingMatch(true);
                                                    const deletePromises = tournamentMatches.map(m => deleteDoc(doc(db, 'matches', m.id)));
                                                    await Promise.all(deletePromises);
                                                    setSuccessMessage("Bracket cleared. You can now re-seed.");
                                                    setTimeout(() => setSuccessMessage(''), 3000);
                                                } catch (e) {
                                                    console.error(e);
                                                } finally {
                                                    setIsSavingMatch(false);
                                                }
                                            }
                                        }}
                                        className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl font-bold text-xs hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                    >
                                        Delete & Reset Bracket
                                    </button>
                                )}
                                {tournamentMatches.length === 0 && (
                                    <button
                                        onClick={handleSeedBracket}
                                        className="px-4 py-2 bg-brand-500 text-slate-900 dark:text-white rounded-xl font-black text-xs hover:scale-105 transition-all shadow-lg shadow-brand-500/20"
                                    >
                                        <Plus size={14} className="inline mr-1" />
                                        Initialize {tournament.type === 'league' ? 'League' : (tournament.type === 'dual_knockout' ? '2-Pool' : 'Bracket')}
                                    </button>
                                )}
                            </div>
                        )}

                        {tournamentMatches.length === 0 && !isAdmin && (
                            <div className="text-center py-20 text-slate-500 italic">
                                Bracket has not been initialized by admin yet.
                            </div>
                        )}
                        <MatchBracket
                            matchesByRound={tournament.type === 'pool' ? knockoutMatchesByRound : matchesByRound}
                            tournamentTeams={tournamentTeams}
                        />
                    </div>
                )}

                {activeTab === 'teams' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <span className="h-6 w-1 bg-brand-500 rounded-full"></span>
                                Participating Teams ({tournamentTeams.length})
                            </h3>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowAddTeam(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-slate-900 dark:text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20"
                                >
                                    <Plus size={18} />
                                    Add Team
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {tournamentTeams.map(team => (
                                <Link
                                    key={team.id}
                                    to={`/teams/${team.id}`}
                                    className="relative group bg-slate-900 border border-slate-200 dark:border-white/5 p-6 rounded-3xl hover:border-brand-500/20 transition-all text-center flex flex-col items-center shadow-lg"
                                >
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault(); // Prevent navigating to team detail
                                                handleRemoveTeam(team);
                                            }}
                                            className="absolute top-2 right-2 p-2 bg-red-500/10 text-red-500 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-slate-900 dark:text-white transition-all z-20"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    {team.logoUrl ? (
                                        <img src={team.logoUrl} className="w-20 h-20 object-contain mb-4" alt="" />
                                    ) : (
                                        <div className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center text-2xl font-black text-slate-900 dark:text-white mb-4 shadow-xl">
                                            {team.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-brand-400 transition-colors">{team.name}</h4>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{team.shortName || 'Club'}</p>
                                </Link>
                            ))}
                        </div>

                        {/* Add Team Modal */}
                        {showAddTeam && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                                <div className="bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                                    <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-brand-500/5">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white italic">Add Team to {tournament.name}</h3>
                                        <button onClick={() => setShowAddTeam(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Search available teams..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-200 dark:border-white/5 rounded-2xl py-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                                            />
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                            {availableTeams.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {availableTeams.map(team => (
                                                        <button
                                                            key={team.id}
                                                            onClick={() => handleAddTeam(team)}
                                                            className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-brand-500/10 border border-transparent hover:border-brand-500/20 transition-all text-left"
                                                        >
                                                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/5">
                                                                {team.logoUrl ? (
                                                                    <img src={team.logoUrl} className="w-6 h-6 object-contain" alt="" />
                                                                ) : (
                                                                    <span className="text-xs font-black text-slate-500">{team.name.substring(0, 2).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="font-bold text-slate-900 dark:text-white">{team.name}</div>
                                                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{team.shortName}</div>
                                                            </div>
                                                            <Plus size={18} className="text-brand-500" />
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-slate-500 font-medium">
                                                    No available teams found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TournamentDetail;
