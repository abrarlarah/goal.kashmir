import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from '../context/DataContext';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    Shield,
    Target,
    Zap,
    Award,
    Calendar,
    MapPin,
    Trophy,
    Activity,
    User as UserIcon,
    History
} from 'lucide-react';
import { calculateAge } from '../utils/ageUtils';
import { cn } from '../utils/cn';

const PlayerDetail = () => {
    const { id } = useParams();
    const { teams, matches, lineups, loading: dataLoading } = useData();
    const [player, setPlayer] = useState(null);
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentEvents, setRecentEvents] = useState([]);

    useEffect(() => {
        const fetchPlayerData = async () => {
            if (dataLoading) return;
            setLoading(true);
            try {
                const playerRef = doc(db, 'players', id);
                const playerSnap = await getDoc(playerRef);

                if (playerSnap.exists()) {
                    const playerData = { id: playerSnap.id, ...playerSnap.data() };
                    setPlayer(playerData);

                    if (playerData.team) {
                        const t = teams.find(t => t.name === playerData.team);
                        if (t) setTeam(t);
                    }

                    // Fetch Activity Logic
                    const activity = [];

                    // 1. Get matches where the player's team played
                    const teamMatches = (matches || []).filter(m =>
                        m.teamA === playerData.team || m.teamB === playerData.team
                    ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

                    // 2. Get matches where player was in lineup (backup/extra)
                    const playerLineups = (lineups || []).filter(l =>
                        (l.starting11?.includes(id) || l.bench?.includes(id))
                    );

                    // 3. Consolidate match IDs to check for events
                    const allRelevantMatchIds = [...new Set([
                        ...teamMatches.map(m => m.id),
                        ...playerLineups.map(l => l.matchId)
                    ])];

                    const eventsPromises = allRelevantMatchIds.map(async (mId) => {
                        try {
                            const eventsRef = collection(db, 'matches', mId, 'events');
                            const q = query(eventsRef, where('playerId', '==', id));
                            const snap = await getDocs(q);

                            const match = matches.find(m => m.id === mId);
                            if (!match) return [];

                            return snap.docs.map(d => ({
                                id: d.id,
                                ...d.data(),
                                match: match
                            }));
                        } catch (err) {
                            console.error(`Error fetching events for match ${mId}:`, err);
                            return [];
                        }
                    });

                    const allEventResults = await Promise.all(eventsPromises);
                    const flattenedEvents = allEventResults.flat();

                    // 4. Combine and Sort
                    // Appearances from Lineups
                    playerLineups.forEach(l => {
                        const match = matches.find(m => m.id === l.matchId);
                        if (match) {
                            activity.push({
                                id: `app-${l.id}`,
                                type: 'appearance',
                                date: match.date,
                                timestamp: new Date(match.date).getTime(),
                                team: l.teamName,
                                opponent: match.teamA === l.teamName ? match.teamB : match.teamA,
                                role: l.starting11?.includes(id) ? 'Started' : 'Substituted'
                            });
                        }
                    });

                    // Goals/Cards from Events
                    flattenedEvents.forEach(e => {
                        activity.push({
                            id: e.id,
                            type: e.type,
                            date: e.match.date,
                            timestamp: e.timestamp || new Date(e.match.date).getTime(),
                            opponent: e.match.teamA === playerData.team ? e.match.teamB : e.match.teamA,
                            minute: e.minute
                        });
                    });

                    // Remove duplicates
                    const uniqueActivity = Array.from(new Map(activity.map(item => [item.id, item])).values());

                    setRecentEvents(uniqueActivity.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
                }
            } catch (error) {
                console.error("Error fetching player details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayerData();
    }, [id, dataLoading, teams, matches, lineups]);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent shadow-lg shadow-brand-500/20"></div>
                    <div className="text-slate-600 dark:text-slate-400 font-display font-medium animate-pulse">Scouting Player Details...</div>
                </div>
            </div>
        );
    }

    if (!player) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <UserIcon size={64} className="mx-auto text-slate-300 dark:text-slate-700 mb-6" strokeWidth={1.5} />
                <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-4">Player Not Found</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">We couldn't find the player you're looking for. They might have been transferred or retired.</p>
                <Link to="/players" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20">
                    <ChevronLeft size={20} /> Back to Players
                </Link>
            </div>
        );
    }

    const age = player.dob ? calculateAge(player.dob) : (player.age || 'N/A');

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {/* Back Button */}
            <Link
                to="/players"
                className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-brand-500 transition-colors mb-8 group"
            >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-semibold">Back to Players</span>
            </Link>

            {/* Profile Header Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Left: Identity Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-1 glass-card rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl"
                >
                    <div className="relative aspect-square bg-slate-800">
                        {player.photoUrl ? (
                            <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-8xl font-black text-white/5">
                                {player.name.charAt(0)}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-6 left-6 flex flex-col items-start">
                            <span className="px-3 py-1 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg mb-2 shadow-lg">
                                {player.position}
                            </span>
                            <h1 className="text-3xl font-display font-bold text-white drop-shadow-md">
                                {player.name}
                            </h1>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1">Squad Number</span>
                                <span className="text-xl font-display font-bold text-slate-900 dark:text-white">#{player.number || '--'}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1">Age</span>
                                <span className="text-xl font-display font-bold text-slate-900 dark:text-white">{age}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                <Shield className="text-brand-500" size={20} />
                                <div>
                                    <span className="text-xs text-slate-500 block">Current Team</span>
                                    <span className="font-bold">{player.team}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                <MapPin className="text-brand-500" size={20} />
                                <div>
                                    <span className="text-xs text-slate-500 block">From</span>
                                    <span className="font-bold">{player.district || 'Unspecified District'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                <Award className="text-brand-500" size={20} />
                                <div>
                                    <span className="text-xs text-slate-500 block">Status</span>
                                    <span className="font-bold text-green-500">Active Player</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right: Stats & Overview */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Performance Stats Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        {[
                            { label: 'Appearances', value: player.matches || 0, icon: <Activity className="text-blue-500" />, color: 'blue' },
                            { label: 'Goals', value: player.goals || 0, icon: <Target className="text-brand-500" />, color: 'brand' },
                            { label: 'Assists', value: player.assists || 0, icon: <Zap className="text-yellow-500" />, color: 'yellow' },
                            { label: 'Clean Sheets', value: player.cleanSheets || 0, icon: <Shield className="text-green-500" />, color: 'green', showIf: player.position === 'Goalkeeper' }
                        ].filter(stat => stat.showIf !== false).map((stat, idx) => (
                            <div key={idx} className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-white/5 text-center group hover:border-white/20 transition-all">
                                <div className="flex justify-center mb-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                                        `bg-${stat.color}-500/10`
                                    )}>
                                        {stat.icon}
                                    </div>
                                </div>
                                <div className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-1">{stat.value}</div>
                                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Discipline & Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Discipline */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-white/5"
                        >
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                                <Trophy size={20} className="text-brand-500" />
                                Discipline Record
                            </h3>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-8 bg-yellow-400 rounded-sm shadow-sm" />
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Yellow Cards</span>
                                    </div>
                                    <span className="text-2xl font-bold text-yellow-400">{player.yellowCards || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-8 bg-red-600 rounded-sm shadow-sm" />
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Red Cards</span>
                                    </div>
                                    <span className="text-2xl font-bold text-red-600">{player.redCards || 0}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Recent News or Match Activity placeholder */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-white/5"
                        >
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                                <History size={20} className="text-brand-500" />
                                Recent Activity
                            </h3>
                            <div className="space-y-4">
                                {recentEvents.map((event, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
                                            event.type === 'goal' ? "bg-brand-500/20 text-brand-500" :
                                                event.type === 'yellow' ? "bg-yellow-400/20 text-yellow-400" :
                                                    event.type === 'red' ? "bg-red-600/20 text-red-600" :
                                                        "bg-blue-500/20 text-blue-500"
                                        )}>
                                            {event.type === 'goal' ? '⚽' :
                                                event.type === 'yellow' ? '🟨' :
                                                    event.type === 'red' ? '🟥' : '👕'}
                                        </div>
                                        <div className="text-xs">
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {event.type === 'goal' ? `Scored a Goal (${event.minute}')` :
                                                    event.type === 'yellow' ? 'Yellow Card' :
                                                        event.type === 'red' ? 'Red Card' : `${event.role} Match`}
                                            </div>
                                            <div className="text-slate-500">v {event.opponent} • {event.date}</div>
                                        </div>
                                    </div>
                                ))}
                                {recentEvents.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 italic text-xs">
                                        No recent activity recorded yet.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Biography / Full Stats Detail */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-white/5 bg-gradient-to-br from-brand-500/5 to-transparent"
                    >
                        <h3 className="text-xl font-display font-bold mb-4 text-slate-900 dark:text-white">About {player.name.split(' ')[0]}</h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {player.bio || `${player.name} is a talented ${player.position.toLowerCase()} from ${player.district}. Currently representing ${player.team}, showing great promise on the field with ${player.goals || 0} goals and ${player.assists || 0} assists this season.`}
                        </p>

                        {/* Tags / Skills */}
                        <div className="flex flex-wrap gap-2 mt-6">
                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-slate-500">Precision Passing</span>
                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-slate-500">Leadership</span>
                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-slate-500">High Stamina</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetail;
