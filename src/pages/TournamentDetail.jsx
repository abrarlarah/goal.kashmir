import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Trophy, Calendar, Users, MapPin, ChevronRight, Info, LayoutGrid, List, Plus, Search, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';

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

    const tournament = useMemo(() => tournaments.find(t => t.id === id), [tournaments, id]);

    const tournamentMatches = useMemo(() => {
        if (!tournament) return [];
        return matches.filter(m => m.competition === tournament.name);
    }, [matches, tournament]);

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
                competition: tournament.name
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

    // Calculate Standings for League Type
    const standings = useMemo(() => {
        if (!tournament || tournament.type !== 'league') return [];

        const stats = {};
        tournamentTeams.forEach(team => {
            stats[team.name] = {
                id: team.id,
                name: team.name,
                logoUrl: team.logoUrl,
                played: 0, wins: 0, draws: 0, losses: 0,
                gf: 0, ga: 0, pts: 0, gd: 0
            };
        });

        tournamentMatches.filter(m => m.status === 'finished').forEach(match => {
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
    }, [tournament, tournamentTeams, tournamentMatches]);

    // Group matches by Round for Brackets or Schedule
    const matchesByRound = useMemo(() => {
        const groups = {};
        tournamentMatches.forEach(m => {
            const round = m.round || 'General';
            if (!groups[round]) groups[round] = [];
            groups[round].push(m);
        });
        return groups;
    }, [tournamentMatches]);

    if (loading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>;
    if (!tournament) return <div className="text-white p-20 text-center">Tournament not found</div>;

    const tabs = [
        { id: 'fixtures', label: 'Fixtures', icon: Calendar },
        ...(tournament.type === 'league' ? [{ id: 'standings', label: 'Standings', icon: List }] : []),
        ...(tournament.type === 'knockout' ? [{ id: 'bracket', label: 'Bracket', icon: Trophy }] : []),
        { id: 'teams', label: 'Teams', icon: Users },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 to-slate-900 border border-white/10 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Trophy size={200} />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="h-32 w-32 rounded-2xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30 shadow-lg">
                        <Trophy size={64} className="text-brand-400" />
                    </div>

                    <div className="text-center md:text-left flex-1">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                            <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold uppercase tracking-wider border border-brand-500/20">
                                {tournament.type}
                            </span>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                                tournament.status === 'live' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"
                            )}>
                                {tournament.status}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 italic">
                            {tournament.name}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-400">
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
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/5 text-center">
                            <div className="text-2xl font-black text-white">{tournament.teamsCount}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Teams</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/5 text-center">
                            <div className="text-2xl font-black text-white">{tournament.matchesCount}</div>
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
                                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                                : "bg-white/5 text-slate-400 hover:bg-white/10"
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
                            <h3 className="text-xl font-display font-black text-white flex items-center gap-3">
                                <span className="h-6 w-1 bg-brand-500 rounded-full"></span>
                                Match Schedule
                            </h3>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowScheduleMatch(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-all shadow-lg"
                                >
                                    <Plus size={18} />
                                    Schedule Match
                                </button>
                            )}
                        </div>

                        {Object.keys(matchesByRound).length > 0 ? (
                            Object.entries(matchesByRound).map(([round, matches]) => (
                                <div key={round} className="space-y-4">
                                    <h3 className="text-xl font-display font-black text-white flex items-center gap-3">
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
                                                    className="group bg-slate-900 border border-white/5 rounded-2xl p-5 hover:border-brand-500/30 transition-all shadow-lg"
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex-1 flex flex-col items-center">
                                                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2 overflow-hidden border border-white/5 group-hover:border-brand-500/30 transition-colors p-2">
                                                                {teamA?.logoUrl ? (
                                                                    <img src={teamA.logoUrl} alt="" className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <span className="text-sm font-black text-slate-500">{match.teamA.substring(0, 2).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-bold text-white text-center group-hover:text-brand-400 transition-colors truncate w-full">{match.teamA}</span>
                                                        </div>

                                                        <div className="text-center px-4">
                                                            <div className="text-2xl font-black text-white mb-1 tracking-tighter">
                                                                {match.status === 'scheduled' ? `${match.time}` : `${match.scoreA} - ${match.scoreB}`}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest whitespace-nowrap">
                                                                {match.status === 'scheduled' ? match.date : match.status}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 flex flex-col items-center">
                                                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2 overflow-hidden border border-white/5 group-hover:border-brand-500/30 transition-colors p-2">
                                                                {teamB?.logoUrl ? (
                                                                    <img src={teamB.logoUrl} alt="" className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <span className="text-sm font-black text-slate-500">{match.teamB.substring(0, 2).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-bold text-white text-center group-hover:text-brand-400 transition-colors truncate w-full">{match.teamB}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <Calendar size={48} className="mx-auto text-slate-600 mb-4" />
                                <h3 className="text-lg font-bold text-white">No fixtures found</h3>
                                <p className="text-slate-500">Wait for the organizers to schedule matches.</p>
                            </div>
                        )}
                        {/* Schedule Match Modal */}
                        {showScheduleMatch && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                                <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-500/5">
                                        <h3 className="text-xl font-black text-white italic">Schedule New Match</h3>
                                        <button onClick={() => setShowScheduleMatch(false)} className="text-slate-400 hover:text-white transition-colors">
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
                                                    className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-500 transition-all"
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
                                                    className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-500 transition-all"
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
                                                    className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-500 transition-all"
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
                                                    className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-500 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Round / Group</label>
                                            <input
                                                type="text"
                                                name="round"
                                                placeholder="e.g. Round 1, Semi-Final, Group A"
                                                value={matchFormData.round}
                                                onChange={handleMatchInputChange}
                                                className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-500 transition-all"
                                                required
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSavingMatch}
                                            className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-brand-500/20"
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
                    <div className="bg-slate-900 rounded-3xl border border-white/10 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase font-black text-slate-500 tracking-widest">
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
                                            <div className="flex items-center gap-3 text-white font-bold">
                                                {team.logoUrl ? (
                                                    <img src={team.logoUrl} className="w-8 h-8 object-contain" alt="" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-brand-500 rounded flex items-center justify-center text-[10px]">
                                                        {team.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                {team.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-400">{team.played}</td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-400">{team.wins}</td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-400">{team.draws}</td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-400">{team.losses}</td>
                                        <td className="px-4 py-4 text-center font-bold text-brand-400">{team.gd}</td>
                                        <td className="px-6 py-4 text-center font-black text-white bg-brand-500/5">{team.pts}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'bracket' && (
                    <div className="space-y-12 py-8 overflow-x-auto">
                        <div className="flex gap-16 min-w-[800px] justify-center">
                            {/* Simple Bracket Logic: assuming rounds are named 'Final', 'Semi-Final', 'Quarter-Final' */}
                            {['Quarter-Final', 'Semi-Final', 'Final'].map(round => (
                                matchesByRound[round] ? (
                                    <div key={round} className="flex flex-col gap-8">
                                        <h4 className="text-center text-xs font-black uppercase tracking-widest text-slate-500">{round}</h4>
                                        <div className="flex flex-col gap-8 justify-around flex-1">
                                            {matchesByRound[round].map(match => (
                                                <div key={match.id} className="w-48 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                                                    <div className={cn("p-2 border-b border-white/5 flex justify-between items-center", match.scoreA > match.scoreB && "bg-brand-500/10")}>
                                                        <span className="text-xs font-bold text-white truncate max-w-[100px]">{match.teamA}</span>
                                                        <span className="text-xs font-black text-white">{match.scoreA}</span>
                                                    </div>
                                                    <div className={cn("p-2 flex justify-between items-center", match.scoreB > match.scoreA && "bg-brand-500/10")}>
                                                        <span className="text-xs font-bold text-white truncate max-w-[100px]">{match.teamB}</span>
                                                        <span className="text-xs font-black text-white">{match.scoreB}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'teams' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-display font-black text-white flex items-center gap-3">
                                <span className="h-6 w-1 bg-brand-500 rounded-full"></span>
                                Participating Teams ({tournamentTeams.length})
                            </h3>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowAddTeam(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20"
                                >
                                    <Plus size={18} />
                                    Add Team
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {tournamentTeams.map(team => (
                                <div key={team.id} className="relative group bg-slate-900 border border-white/5 p-6 rounded-3xl hover:border-brand-500/20 transition-all text-center flex flex-col items-center">
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleRemoveTeam(team)}
                                            className="absolute top-2 right-2 p-2 bg-red-500/10 text-red-500 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    {team.logoUrl ? (
                                        <img src={team.logoUrl} className="w-20 h-20 object-contain mb-4" alt="" />
                                    ) : (
                                        <div className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center text-2xl font-black text-white mb-4 shadow-xl">
                                            {team.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <h4 className="text-lg font-bold text-white mb-1">{team.name}</h4>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{team.shortName || 'Club'}</p>
                                </div>
                            ))}
                        </div>

                        {/* Add Team Modal */}
                        {showAddTeam && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                                <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-500/5">
                                        <h3 className="text-xl font-black text-white italic">Add Team to {tournament.name}</h3>
                                        <button onClick={() => setShowAddTeam(false)} className="text-slate-400 hover:text-white transition-colors">
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
                                                className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white placeholder:text-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
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
                                                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5">
                                                                {team.logoUrl ? (
                                                                    <img src={team.logoUrl} className="w-6 h-6 object-contain" alt="" />
                                                                ) : (
                                                                    <span className="text-xs font-black text-slate-500">{team.name.substring(0, 2).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="font-bold text-white">{team.name}</div>
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
