import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
    Info,
    ExternalLink,
    Clock,
    User as UserIcon
} from 'lucide-react';
import { cn } from '../utils/cn';

const TeamDetail = () => {
    const { id } = useParams();
    const [team, setTeam] = useState(null);
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link
                to="/teams"
                className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors mb-8 group"
            >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-semibold">Back to Clubs</span>
            </Link>

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
                    </div>
                </motion.div>

                <div className="lg:col-span-3 space-y-8">
                    {/* Hero Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Squad Size', value: players.length, icon: <Users className="text-blue-500" /> },
                            { label: 'Total Matches', value: matches.length, icon: <Activity className="text-green-500" /> },
                            { label: 'Trophies', value: team.trophies || 0, icon: <Trophy className="text-yellow-500" /> },
                            { label: 'Season Rank', value: '#1', icon: <Clock className="text-purple-500" /> }
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
                            <h3 className="text-xl font-display font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <Activity size={20} className="text-blue-500" />
                                Recent Fixtures
                            </h3>
                            <div className="space-y-3">
                                {matches.slice(0, 5).map(match => (
                                    <div key={match.id} className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors group">
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
                                    </div>
                                ))}
                                {matches.length === 0 && <p className="text-slate-500 text-sm italic">No recent matches recorded.</p>}
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
                                Squad Members
                            </h3>
                            <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-blue-500 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">
                                <Trophy size={14} /> Multiple Honors
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
