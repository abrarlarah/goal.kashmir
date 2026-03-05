import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    Shield,
    Users,
    Trophy,
    Calendar,
    MapPin,
    Activity,
    User as UserIcon,
    Edit2,
    Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { cn } from '../utils/cn';

const TeamDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAdmin, isSuperAdmin, currentUser } = useAuth();
    const { tournaments } = useData();
    const [team, setTeam] = useState(null);
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all'); // 'all', 'won', 'lost', 'drawn', 'pending'

    useEffect(() => {
        const fetchTeamData = async () => {
            setLoading(true);
            try {
                const teamRef = doc(db, 'teams', id);
                const teamSnap = await getDoc(teamRef);

                if (teamSnap.exists()) {
                    const teamData = { id: teamSnap.id, ...teamSnap.data() };
                    setTeam(teamData);

                    // Fetch squad members
                    const playersRef = collection(db, 'players');
                    const q_players = query(playersRef, where('team', '==', teamData.name));
                    const playersSnap = await getDocs(q_players);
                    const squad = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setPlayers(squad);

                    // Fetch recent matches
                    const matchesRef = collection(db, 'matches');
                    const q_matches_a = query(matchesRef, where('teamA', '==', teamData.name));
                    const q_matches_b = query(matchesRef, where('teamB', '==', teamData.name));

                    const [snapA, snapB] = await Promise.all([getDocs(q_matches_a), getDocs(q_matches_b)]);
                    const allMatches = [
                        ...snapA.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                        ...snapB.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    ].sort((a, b) => new Date(b.date) - new Date(a.date));

                    setMatches(allMatches);
                }
            } catch (error) {
                console.error("Error fetching team details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeamData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent shadow-lg shadow-blue-500/20"></div>
                </div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <Shield size={64} className="mx-auto text-slate-700 mb-6 opacity-20" />
                <h2 className="text-2xl font-bold mb-4">Club Not Found</h2>
                <Link to="/teams" className="text-blue-500 hover:underline">Back to Clubs</Link>
            </div>
        );
    }

    // Determine if this user is allowed to edit THIS team
    const canEditTeam = () => {
        if (!isAdmin || !team) return false;
        if (isSuperAdmin) return true;

        // Check if team is part of any tournament this admin created
        const tTournaments = Array.isArray(team.tournaments)
            ? team.tournaments
            : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);

        return tTournaments.some(teamTournamentName => {
            const tournament = tournaments.find(t => t.name === teamTournamentName);
            return tournament && tournament.createdBy === currentUser?.uid;
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <Link
                    to="/teams"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors group"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-semibold">Back to Clubs</span>
                </Link>

                {canEditTeam() && (
                    <button
                        onClick={() => navigate('/admin/teams', { state: { editTeam: team } })}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                        <Edit2 size={16} />
                        Edit Club Details
                    </button>
                )}
            </div>

            {/* Match Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {[
                    {
                        id: 'won',
                        label: 'Matches Won',
                        value: matches.filter(m => m.status === 'finished' && ((m.teamA === team.name && Number(m.scoreA) > Number(m.scoreB)) || (m.teamB === team.name && Number(m.scoreB) > Number(m.scoreA)))).length,
                        color: 'text-green-500',
                        bg: 'bg-green-500/10'
                    },
                    {
                        id: 'lost',
                        label: 'Matches Lost',
                        value: matches.filter(m => m.status === 'finished' && ((m.teamA === team.name && Number(m.scoreA) < Number(m.scoreB)) || (m.teamB === team.name && Number(m.scoreB) < Number(m.scoreA)))).length,
                        color: 'text-red-500',
                        bg: 'bg-red-500/10'
                    },
                    {
                        id: 'drawn',
                        label: 'Matches Drawn',
                        value: matches.filter(m => m.status === 'finished' && Number(m.scoreA) === Number(m.scoreB)).length,
                        color: 'text-yellow-500',
                        bg: 'bg-yellow-500/10'
                    },
                    {
                        id: 'pending',
                        label: 'Pending Matches',
                        value: matches.filter(m => m.status !== 'finished').length,
                        color: 'text-blue-500',
                        bg: 'bg-blue-500/10'
                    }
                ].map((stat, idx) => (
                    <button
                        key={idx}
                        onClick={() => setFilterType(filterType === stat.id ? 'all' : stat.id)}
                        className={cn(
                            `glass-card p-6 rounded-3xl border flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95`,
                            stat.bg,
                            filterType === stat.id ? "border-brand-500 shadow-[0_0_20px_rgba(var(--brand-500-rgb),0.2)] ring-2 ring-brand-500/50" : "border-slate-200 dark:border-white/5"
                        )}
                    >
                        <span className={`text-4xl font-black mb-1 ${stat.color}`}>{stat.value}</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{stat.label}</span>
                        {filterType === stat.id && (
                            <span className="mt-2 text-[8px] font-black uppercase tracking-tighter text-brand-400 animate-pulse">Viewing Report</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Header section with Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-1 glass-card p-8 rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center shadow-xl"
                >
                    <div className="w-32 h-32 rounded-3xl bg-white/5 p-4 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-6 overflow-hidden">
                        {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                        ) : (
                            <Shield className="w-16 h-16 text-slate-300 dark:text-slate-700" />
                        )}
                    </div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">{team.name}</h1>
                    <div className="flex items-center gap-2 mb-6">
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-500/20">
                            {team.shortName || team.name.substring(0, 3).toUpperCase()}
                        </span>
                        <span className="text-slate-500 text-sm">Founded {team.founded || 'N/A'}</span>
                    </div>

                    <div className="w-full pt-6 border-t border-slate-200 dark:border-white/5 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500 flex items-center gap-2"><UserIcon size={14} /> Manager</span>
                            <span className="font-bold text-slate-900 dark:text-white">{team.manager || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500 flex items-center gap-2"><MapPin size={14} /> Home Grounds</span>
                            <span className="font-bold text-slate-900 dark:text-white">{team.stadium || 'N/A'}</span>
                        </div>
                        <div className="pt-2">
                            <span className="text-slate-500 flex items-center gap-2 text-sm mb-2"><Trophy size={14} /> Registered In</span>
                            <div className="flex flex-wrap gap-1.5">
                                {Array.isArray(team.tournaments) && team.tournaments.length > 0 ? (
                                    team.tournaments.map((t, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded-md text-[10px] font-bold border border-brand-500/10">
                                            {t}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-slate-500 text-[10px] italic">No tournaments registered</span>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="lg:col-span-3 space-y-8">
                    {/* Hero Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Squad Size', value: players.length, icon: <Users className="text-blue-500" /> },
                            { label: 'Total Matches', value: matches.length, icon: <Activity className="text-green-500" /> },
                            { label: 'Trophies', value: team.trophies || 0, icon: <Trophy className="text-yellow-500" /> },
                            { label: 'Tournaments', value: Array.isArray(team.tournaments) ? team.tournaments.length : 0, icon: <Calendar className="text-purple-500" /> }
                        ].map((stat, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-white/5 text-center shadow-lg"
                            >
                                <div className="flex justify-center mb-3 text-2xl">{stat.icon}</div>
                                <div className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-1">{stat.value}</div>
                                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Content Tabs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Recent Matches */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <h3 className="text-xl font-display font-bold flex items-center justify-between gap-2 text-slate-900 dark:text-white">
                                <div className="flex items-center gap-2">
                                    <Activity size={20} className="text-blue-500" />
                                    {filterType === 'all' ? 'Recent Fixtures' : `${filterType.toUpperCase()} Matches Report`}
                                </div>
                                {filterType !== 'all' && (
                                    <button
                                        onClick={() => setFilterType('all')}
                                        className="text-[10px] uppercase font-black tracking-widest text-brand-500 hover:text-brand-400"
                                    >
                                        Clear Filter
                                    </button>
                                )}
                            </h3>
                            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                                {matches
                                    .filter(m => {
                                        if (filterType === 'all') return true;
                                        if (filterType === 'won') return m.status === 'finished' && ((m.teamA === team.name && Number(m.scoreA) > Number(m.scoreB)) || (m.teamB === team.name && Number(m.scoreB) > Number(m.scoreA)));
                                        if (filterType === 'lost') return m.status === 'finished' && ((m.teamA === team.name && Number(m.scoreA) < Number(m.scoreB)) || (m.teamB === team.name && Number(m.scoreB) < Number(m.scoreA)));
                                        if (filterType === 'drawn') return m.status === 'finished' && Number(m.scoreA) === Number(m.scoreB);
                                        if (filterType === 'pending') return m.status !== 'finished';
                                        return true;
                                    })
                                    .map(match => (
                                        <Link key={match.id} to={`/matches/${match.id}`} className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                            <div className="flex-1 text-right text-sm font-medium pr-4 truncate">
                                                {match.teamA}
                                            </div>
                                            <div className="flex flex-col items-center px-4 bg-slate-900/50 rounded-xl py-1 min-w-[80px]">
                                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {match.status === 'finished' ? `${match.scoreA} - ${match.scoreB}` : 'vs'}
                                                </span>
                                                <span className="text-[9px] uppercase tracking-tighter text-slate-500">{match.date}</span>
                                            </div>
                                            <div className="flex-1 text-left text-sm font-medium pl-4 truncate">
                                                {match.teamB}
                                            </div>
                                        </Link>
                                    ))}
                                {matches.length === 0 && <p className="text-slate-500 text-sm italic">No records found.</p>}
                            </div>
                        </motion.div>

                        {/* Squad Preview */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <h3 className="text-xl font-display font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <Users size={20} className="text-blue-500" />
                                Squad Members ({players.length})
                            </h3>
                            <div className="grid grid-cols-1 gap-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                                {players.sort((a, b) => (a.number || 99) - (b.number || 99)).map(player => (
                                    <Link
                                        key={player.id}
                                        to={`/players/${player.id}`}
                                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-slate-200 dark:border-white/5 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300 overflow-hidden shrink-0">
                                            {player.photoUrl ? <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" /> : player.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">{player.name}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wide">{player.position} • #{player.number || '--'}</div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {canEditTeam() && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        navigate('/admin/players', { state: { editPlayer: player } });
                                                    }}
                                                    className="p-1.5 bg-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-white rounded-lg transition-all"
                                                    title="Edit Player Details"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            )}
                                            <ChevronLeft className="rotate-180 text-blue-500" size={16} />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* About Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-white/5"
                    >
                        <h3 className="text-xl font-display font-bold mb-4 text-slate-900 dark:text-white">Club History & Identity</h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                            {team.description || `${team.name} is a competitive football club participating in multiple tournaments across the region. Known for their resilience and local fans, the club represents the spirit of ${team.district || 'their community'}.`}
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-blue-500 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">
                                <Trophy size={14} />
                                {team.trophies > 0 ? `${team.trophies} Official Titles` : 'Regional Contender'}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-green-500 bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/20">
                                <Users size={14} /> Community Driven
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default TeamDetail;
