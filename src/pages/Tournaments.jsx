import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { motion } from 'framer-motion';
import {
  Calendar, MapPin, Users, Trophy, ChevronRight, Search,
  Swords, Flag, Clock, CheckCircle, Filter, Plus, ArrowRight
} from 'lucide-react';

const statusConfig = {
  upcoming: { label: 'Upcoming', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', dot: 'bg-blue-400' },
  ongoing: { label: 'Live', color: 'bg-green-500/15 text-green-400 border-green-500/20', dot: 'bg-green-400 animate-pulse' },
  finished: { label: 'Completed', color: 'bg-slate-500/15 text-slate-400 border-slate-500/20', dot: 'bg-slate-400' },
};

const typeConfig = {
  league: { label: 'League', icon: '🏆', gradient: 'from-yellow-500/20 to-orange-500/10' },
  knockout: { label: 'Knockout', icon: '⚔️', gradient: 'from-red-500/20 to-pink-500/10' },
  pool: { label: 'Pool + KO', icon: '🏊', gradient: 'from-indigo-500/20 to-blue-500/10' },
  dual_knockout: { label: '2-Pool KO', icon: '🎯', gradient: 'from-purple-500/20 to-violet-500/10' },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const Tournaments = () => {
  const { tournaments, matches, loading } = useData();
  const { isSuperAdmin } = useAuth();
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const availableYears = useMemo(() => {
    const years = tournaments
      .map(t => t.startDate ? new Date(t.startDate).getFullYear().toString() : null)
      .filter(Boolean);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [tournaments]);

  const availableDistricts = useMemo(() => {
    const districts = tournaments.map(t => t.district).filter(Boolean);
    return [...new Set(districts)].sort();
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter(t => {
      const matchesYear = selectedYear === 'All' || (t.startDate && new Date(t.startDate).getFullYear().toString() === selectedYear);
      const matchesDistrict = selectedDistrict === 'All' || t.district === selectedDistrict;
      const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || (t.district && t.district.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTab = activeTab === 'all' || t.status === activeTab;
      return matchesYear && matchesDistrict && matchesSearch && matchesTab;
    });
  }, [tournaments, selectedYear, selectedDistrict, searchQuery, activeTab]);

  const getMatchCount = (tournament) => {
    return matches.filter(m => m.tournamentId === tournament.id || (!m.tournamentId && m.competition === tournament.name)).length || tournament.matchesCount || 0;
  };

  // Stats
  const ongoingCount = tournaments.filter(t => t.status === 'ongoing').length;
  const upcomingCount = tournaments.filter(t => t.status === 'upcoming').length;
  const finishedCount = tournaments.filter(t => t.status === 'finished').length;

  if (loading && tournaments.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent shadow-lg shadow-brand-500/20"></div>
          <div className="text-slate-600 dark:text-slate-400 font-display font-medium animate-pulse">Loading Tournaments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600/20 via-brand-500/10 to-transparent border border-brand-500/10 p-8 md:p-10"
      >
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <Trophy size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white">Tournaments</h1>
                <p className="text-slate-500 text-sm mt-0.5">Explore local football competitions across J&K</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2">
              <div className="text-2xl font-display font-bold text-green-400">{ongoingCount}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Live</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center px-4 py-2">
              <div className="text-2xl font-display font-bold text-blue-400">{upcomingCount}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Upcoming</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center px-4 py-2">
              <div className="text-2xl font-display font-bold text-slate-400">{finishedCount}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Completed</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl border border-slate-200 dark:border-white/5 p-4"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 w-full lg:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all"
            />
          </div>

          {/* Tab Filters */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-slate-200 dark:border-white/5">
            {[
              { key: 'all', label: 'All', count: tournaments.length },
              { key: 'ongoing', label: 'Live', count: ongoingCount },
              { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
              { key: 'finished', label: 'Done', count: finishedCount },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab.key
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Dropdowns */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5">
              <Calendar size={14} className="text-brand-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-xs text-slate-900 dark:text-white outline-none font-medium"
              >
                <option value="All" className="bg-slate-900">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year} className="bg-slate-900">{year}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5">
              <MapPin size={14} className="text-brand-400" />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-transparent text-xs text-slate-900 dark:text-white outline-none font-medium"
              >
                <option value="All" className="bg-slate-900">All Districts</option>
                {availableDistricts.map(district => (
                  <option key={district} value={district} className="bg-slate-900">{district}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Tournament (Super Admin) */}
          {isSuperAdmin && (
            <Link
              to="/admin/tournaments"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-500/20 whitespace-nowrap"
            >
              <Plus size={14} /> Add Tournament
            </Link>
          )}
        </div>
      </motion.div>

      {/* Tournament Grid */}
      {filteredTournaments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 glass-card rounded-3xl border border-slate-200 dark:border-white/5"
        >
          <Trophy size={56} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" strokeWidth={1.5} />
          <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2">No Tournaments Found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {searchQuery ? `No results for "${searchQuery}". Try a different search.` : 'No tournaments match your current filters.'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredTournaments.map((tournament) => {
            const status = statusConfig[tournament.status] || statusConfig.upcoming;
            const type = typeConfig[tournament.type] || typeConfig.league;
            const matchCount = getMatchCount(tournament);

            return (
              <motion.div key={tournament.id} variants={item}>
                <Link
                  to={`/tournaments/${tournament.id}`}
                  className="block glass-card rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden group hover:border-brand-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/5 hover:-translate-y-1"
                >
                  {/* Card Top Gradient Bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${type.gradient}`} />

                  <div className="p-6">
                    {/* Status & Type */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${status.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/5 text-slate-400 border border-white/5`}>
                        {type.icon} {type.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-1 group-hover:text-brand-400 transition-colors leading-tight">
                      {tournament.name}
                    </h2>

                    {/* Location */}
                    {tournament.district && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                        <MapPin size={12} className="text-brand-400" />
                        {tournament.district}
                      </div>
                    )}

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <Users size={14} className="mx-auto text-blue-400 mb-1" />
                        <div className="text-lg font-display font-bold text-slate-900 dark:text-white">{tournament.teamsCount || 0}</div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Teams</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <Swords size={14} className="mx-auto text-brand-400 mb-1" />
                        <div className="text-lg font-display font-bold text-slate-900 dark:text-white">{matchCount}</div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Matches</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <Calendar size={14} className="mx-auto text-yellow-400 mb-1" />
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBD'}
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Start</div>
                      </div>
                    </div>

                    {/* Teams List Preview */}
                    {tournament.teamsList && tournament.teamsList.length > 0 && (
                      <div className="mb-4 pt-3 border-t border-slate-200 dark:border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
                          <Users size={10} /> Registered Teams
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {tournament.teamsList.slice(0, 5).map((team, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 text-slate-400 border border-white/5">
                              {team}
                            </span>
                          ))}
                          {tournament.teamsList.length > 5 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold">
                              +{tournament.teamsList.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* View Details Button */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/5">
                      <span className="text-xs font-bold text-brand-400 group-hover:text-brand-300 transition-colors flex items-center gap-1">
                        View Tournament
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                      {tournament.status === 'ongoing' && (
                        <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Results Count */}
      {filteredTournaments.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-slate-500 py-4"
        >
          Showing {filteredTournaments.length} of {tournaments.length} tournaments
        </motion.div>
      )}
    </div>
  );
};

export default Tournaments;
