import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Search as SearchIcon, Users, Trophy, Shield, Newspaper, Calendar, Filter, X, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Search = () => {
    const { teams, players, matches, tournaments, loading } = useData();
    // Assuming news might be available in the future or elsewhere, for now we search what we have
    // If news is in DataContext, we add it. Let's assume matches, teams, players, tournaments for now.

    // We'll also need news. Let's check if news is in DataContext.
    // Looking at DataContext.js previously... it has teams, players, matches, tournaments, lineups.
    // Let's assume news isn't in main DataContext yet, or I should add a news search placeholder.

    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // all, teams, players, matches, tournaments
    const [showFilters, setShowFilters] = useState(false);

    // Filters for deeper search
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const results = useMemo(() => {
        if (!query && activeFilter === 'all') return { teams: [], players: [], matches: [], tournaments: [] };

        const q = query.toLowerCase();

        const filteredTeams = (activeFilter === 'all' || activeFilter === 'teams')
            ? teams.filter(t => t.name.toLowerCase().includes(q) || t.shortName?.toLowerCase().includes(q))
            : [];

        const filteredPlayers = (activeFilter === 'all' || activeFilter === 'players')
            ? players.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q) || p.position?.toLowerCase().includes(q))
            : [];

        const filteredMatches = (activeFilter === 'all' || activeFilter === 'matches')
            ? matches.filter(m => {
                const matchName = `${m.teamA} vs ${m.teamB}`.toLowerCase();
                const dateMatch = (!dateFrom || m.date >= dateFrom) && (!dateTo || m.date <= dateTo);
                const statusMatch = statusFilter === 'all' || m.status === statusFilter;
                return (matchName.includes(q) || m.competition?.toLowerCase().includes(q) || m.stadium?.toLowerCase().includes(q)) && dateMatch && statusMatch;
            })
            : [];

        const filteredTournaments = (activeFilter === 'all' || activeFilter === 'tournaments')
            ? tournaments.filter(t => t.name.toLowerCase().includes(q) || t.district?.toLowerCase().includes(q))
            : [];

        return {
            teams: filteredTeams,
            players: filteredPlayers,
            matches: filteredMatches,
            tournaments: filteredTournaments
        };
    }, [query, activeFilter, teams, players, matches, tournaments, dateFrom, dateTo, statusFilter]);

    const totalResults = results.teams.length + results.players.length + results.matches.length + results.tournaments.length;

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 min-h-[80vh]">
            {/* Search Header */}
            <div className="flex flex-col gap-6 mb-12">
                <div className="relative group">
                    <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={24} />
                    <input
                        type="text"
                        placeholder="Search for teams, players, matches or tournaments..."
                        className="w-full bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl py-6 pl-16 pr-6 text-xl text-slate-900 dark:text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all shadow-2xl"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-600 dark:text-slate-400 transition-all"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {[
                            { id: 'all', label: 'All Results', icon: SearchIcon },
                            { id: 'matches', label: 'Matches', icon: Calendar },
                            { id: 'teams', label: 'Teams', icon: Shield },
                            { id: 'players', label: 'Players', icon: Users },
                            { id: 'tournaments', label: 'Tournaments', icon: Trophy },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setActiveFilter(f.id)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap border",
                                    activeFilter === f.id
                                        ? "bg-brand-500 text-slate-900 dark:text-white border-brand-500 shadow-lg shadow-brand-500/20"
                                        : "bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:bg-white/10"
                                )}
                            >
                                <f.icon size={16} />
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all border",
                            showFilters ? "bg-white/10 text-slate-900 dark:text-white border-slate-200 dark:border-white/20" : "bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:bg-white/10"
                        )}
                    >
                        <Filter size={16} />
                        Advanced Filters
                    </button>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10">
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-500 mb-2 block">Date From</label>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-500 mb-2 block">Date To</label>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-500 mb-2 block">Match Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all font-medium"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="live">Live</option>
                                        <option value="finished">Finished</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Results Section */}
            {totalResults > 0 ? (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-12"
                >
                    {/* Tournaments Results */}
                    {results.tournaments.length > 0 && (
                        <section>
                            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <Trophy size={16} />
                                Tournaments ({results.tournaments.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {results.tournaments.map(t => (
                                    <motion.div variants={item} key={t.id}>
                                        <Link to={`/tournaments/${t.id}`} className="block group p-4 bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl hover:border-brand-500/30 transition-all shadow-lg">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-400 group-hover:bg-brand-500 group-hover:text-slate-900 dark:text-white transition-all">
                                                    <Trophy size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors">{t.name}</h3>
                                                    <p className="text-xs text-slate-500">{t.district} • {t.type}</p>
                                                </div>
                                                <ChevronRight className="ml-auto text-slate-700 group-hover:text-brand-500 transition-colors" size={18} />
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Teams Results */}
                    {results.teams.length > 0 && (
                        <section>
                            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <Shield size={16} />
                                Teams ({results.teams.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {results.teams.map(t => (
                                    <motion.div variants={item} key={t.id}>
                                        <Link to={`/teams`} className="block group p-4 bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl hover:border-brand-500/30 transition-all shadow-lg">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/5">
                                                    {t.logoUrl ? (
                                                        <img src={t.logoUrl} className="w-8 h-8 object-contain" alt="" />
                                                    ) : (
                                                        <span className="text-[10px] font-black text-slate-500">{t.shortName || t.name.substring(0, 2).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors">{t.name}</h3>
                                                    <p className="text-xs text-slate-500">{t.stadium || 'Club'}</p>
                                                </div>
                                                <ChevronRight className="ml-auto text-slate-700 group-hover:text-brand-500 transition-colors" size={18} />
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Players Results */}
                    {results.players.length > 0 && (
                        <section>
                            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <Users size={16} />
                                Players ({results.players.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {results.players.map(p => (
                                    <motion.div variants={item} key={p.id}>
                                        <Link to={`/players`} className="block group p-4 bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl hover:border-brand-500/30 transition-all shadow-lg">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/5">
                                                    {p.photoUrl ? (
                                                        <img src={p.photoUrl} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <span className="text-xs font-black text-slate-500">{p.name.substring(0, 2).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors">{p.name}</h3>
                                                    <p className="text-xs text-slate-500">{p.team} • {p.position}</p>
                                                </div>
                                                <ChevronRight className="ml-auto text-slate-700 group-hover:text-brand-500 transition-colors" size={18} />
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Matches Results */}
                    {results.matches.length > 0 && (
                        <section>
                            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <Calendar size={16} />
                                Matches ({results.matches.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.matches.map(m => (
                                    <motion.div variants={item} key={m.id}>
                                        <Link to={`/live/${m.id}`} className="block group p-6 bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl hover:border-brand-500/30 transition-all shadow-lg">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.competition}</span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                                    m.status === 'live' ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" : "bg-white/5 text-slate-500 border-slate-200 dark:border-white/5"
                                                )}>{m.status}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1 flex flex-col items-center">
                                                    <span className="font-bold text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors text-center truncate w-full">{m.teamA}</span>
                                                </div>
                                                <div className="px-4 py-2 bg-black/40 rounded-xl border border-slate-200 dark:border-white/5">
                                                    <span className="font-black text-xl text-slate-900 dark:text-white">
                                                        {m.status === 'scheduled' ? m.time : `${m.scoreA} - ${m.scoreB}`}
                                                    </span>
                                                </div>
                                                <div className="flex-1 flex flex-col items-center">
                                                    <span className="font-bold text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors text-center truncate w-full">{m.teamB}</span>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 flex justify-between items-center">
                                                <div className="text-[10px] text-slate-500">
                                                    {m.date && new Date(m.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </div>
                                                <ChevronRight size={16} className="text-slate-700 group-hover:text-brand-500 transition-colors" />
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}
                </motion.div>
            ) : query && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-slate-500 mb-6 border border-slate-200 dark:border-white/5">
                        <SearchIcon size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white italic mb-2">No results found for "{query}"</h3>
                    <p className="text-slate-500 max-w-sm">Try searching with different keywords or check your spelling.</p>
                </div>
            )}

            {!query && (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <SearchIcon size={80} className="text-slate-700 mb-6" />
                    <h3 className="text-2xl font-black text-slate-700 italic">Start searching GoalKashmir...</h3>
                </div>
            )}
        </div>
    );
};

export default Search;
