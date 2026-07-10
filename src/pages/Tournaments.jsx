import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { motion } from 'framer-motion';
import {
  Calendar, MapPin, Users, Trophy, ChevronRight, Search,
  Swords, Flag, Clock, CheckCircle, Filter, Plus, ArrowRight, Edit3
} from 'lucide-react';

const statusConfig = {
  upcoming: { label: 'Upcoming', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', dot: 'bg-blue-400' },
  ongoing: { label: 'Live', color: 'bg-green-500/15 text-green-400 border-green-500/20', dot: 'bg-green-400 animate-pulse' },
  finished: { label: 'Completed', color: 'bg-[#0B1220]0/15 text-[#94A3B8] border-[#64748B]/20', dot: 'bg-[#64748B]' },
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
  const { isSuperAdmin, currentUser } = useAuth();
  const navigate = useNavigate();
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
          <div className="text-[#94A3B8] font-display font-medium animate-pulse">Loading Tournaments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12 space-y-5 sm:space-y-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0B1220] via-[#101827] to-brand-50/50 from-[#0B1220] via-[#101827] to-[#0B1220] border border-[#24344D]/50 border-brand-500/20 shadow-xl shadow-2xl shadow-brand-900/20 p-4 sm:p-8 md:p-10"
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
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white">Tournaments</h1>
                <p className="text-[#64748B] text-sm mt-0.5">Explore local football competitions across J&K</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="text-center px-2 sm:px-4 py-2">
              <div className="text-xl sm:text-2xl font-display font-bold text-green-400">{ongoingCount}</div>
              <div className="text-[9px] sm:text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Live</div>
            </div>
            <div className="w-px h-8 sm:h-10 bg-[#1E2B42]" />
            <div className="text-center px-2 sm:px-4 py-2">
              <div className="text-xl sm:text-2xl font-display font-bold text-blue-400">{upcomingCount}</div>
              <div className="text-[9px] sm:text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Upcoming</div>
            </div>
            <div className="w-px h-8 sm:h-10 bg-[#1E2B42]" />
            <div className="text-center px-2 sm:px-4 py-2">
              <div className="text-xl sm:text-2xl font-display font-bold text-[#94A3B8]">{finishedCount}</div>
              <div className="text-[9px] sm:text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Done</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0B1220] to-[#0B1220] from-[#0B1220] to-[#0B1220] ring-1 ring-[#24344D]/50 ring-[#24344D]/50 shadow-sm p-3 sm:p-4"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 sm:gap-3 md:gap-4">
          {/* Search */}
          <div className="relative flex-1 w-full lg:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131D31]/50 border border-[#24344D] rounded-lg md:rounded-xl pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-[#64748B] focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all"
            />
          </div>

          {/* Tab Filters */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-[#131D31]/50 rounded-lg md:rounded-xl p-0.5 sm:p-1 border border-[#24344D]/40 overflow-x-auto scrollbar-none w-full sm:w-auto">
            {[
              { key: 'all', label: 'All', count: tournaments.length },
              { key: 'ongoing', label: 'Live', count: ongoingCount },
              { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
              { key: 'finished', label: 'Done', count: finishedCount },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 rounded-md md:rounded-lg text-[9px] sm:text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.key
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-[#64748B] hover:text-white hover:bg-[#131D31]/5'
                  }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Dropdowns */}
          <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none w-full sm:w-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-[#131D31]/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg md:rounded-xl border border-[#24344D]/40 flex-shrink-0">
              <Calendar size={14} className="text-brand-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-[10px] sm:text-xs text-white outline-none font-medium"
              >
                <option value="All" className="bg-[#0B1220]">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year} className="bg-[#0B1220]">{year}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 bg-[#131D31]/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg md:rounded-xl border border-[#24344D]/40 flex-shrink-0">
              <MapPin size={14} className="text-brand-400" />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-transparent text-[10px] sm:text-xs text-white outline-none font-medium"
              >
                <option value="All" className="bg-[#0B1220]">All Districts</option>
                {availableDistricts.map(district => (
                  <option key={district} value={district} className="bg-[#0B1220]">{district}</option>
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
          className="text-center py-20 rounded-3xl bg-gradient-to-br from-[#0B1220] to-[#0B1220] from-[#0B1220] to-[#0B1220] ring-1 ring-[#24344D]/50 ring-[#24344D]/50 shadow-sm"
        >
          <Trophy size={56} className="mx-auto text-[#94A3B8] dark:text-slate-700 mb-4" strokeWidth={1.5} />
          <h3 className="text-xl font-display font-bold text-white mb-2">No Tournaments Found</h3>
          <p className="text-[#64748B] text-sm max-w-md mx-auto">
            {searchQuery ? `No results for "${searchQuery}". Try a different search.` : 'No tournaments match your current filters.'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {filteredTournaments.map((tournament) => {
            const status = statusConfig[tournament.status] || statusConfig.upcoming;
            const type = typeConfig[tournament.type] || typeConfig.league;
            const matchCount = getMatchCount(tournament);

            return (
              <motion.div key={tournament.id} variants={item}>
                <Link
                  to={`/tournaments/${tournament.id}`}
                  className="block rounded-3xl bg-gradient-to-br from-[#0B1220] to-[#0B1220] from-[#0B1220] to-[#0B1220] ring-1 ring-[#24344D]/50 ring-[#24344D]/50 overflow-hidden group transition-all duration-300 hover:shadow-xl shadow-md hover:ring-2 hover:ring-brand-500/30 hover:shadow-brand-500/10 hover:-translate-y-1"
                >
                  {/* Card Top Gradient Bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${type.gradient}`} />

                  <div className="p-4 sm:p-6">
                    {/* Status & Type */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${status.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </div>
                      <div className="flex items-center gap-2">
                        {(isSuperAdmin || (currentUser && tournament.createdBy === currentUser.uid)) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              navigate('/admin/tournaments', { state: { editTournament: tournament } });
                            }}
                            className="p-1.5 rounded-lg bg-[#131D31]/50 hover:bg-brand-500/20 text-[#64748B] hover:text-brand-400 border border-[#24344D]/40 transition-colors shadow-sm"
                            title="Edit Tournament"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#131D31]/50 text-[#94A3B8] border border-[#24344D]/40`}>
                          {type.icon} {type.label}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-base sm:text-xl font-display font-bold text-white mb-1 group-hover:text-brand-400 transition-colors leading-tight line-clamp-2">
                      {tournament.name}
                    </h2>

                    {/* Location */}
                    {tournament.district && (
                      <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-4">
                        <MapPin size={12} className="text-brand-400" />
                        {tournament.district}
                      </div>
                    )}

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                      <div className="bg-[#131D31]/50 rounded-xl p-2 sm:p-3 text-center border border-[#24344D]/40">
                        <Users size={14} className="mx-auto text-blue-400 mb-1" />
                        <div className="text-lg font-display font-bold text-white">{tournament.teamsCount || 0}</div>
                        <div className="text-[9px] text-[#64748B] uppercase font-bold tracking-wider">Teams</div>
                      </div>
                      <div className="bg-[#131D31]/50 rounded-xl p-2 sm:p-3 text-center border border-[#24344D]/40">
                        <Swords size={14} className="mx-auto text-brand-400 mb-1" />
                        <div className="text-lg font-display font-bold text-white">{matchCount}</div>
                        <div className="text-[9px] text-[#64748B] uppercase font-bold tracking-wider">Matches</div>
                      </div>
                      <div className="bg-[#131D31]/50 rounded-xl p-2 sm:p-3 text-center border border-[#24344D]/40">
                        <Calendar size={14} className="mx-auto text-yellow-400 mb-1" />
                        <div className="text-sm font-bold text-white">
                          {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBD'}
                        </div>
                        <div className="text-[9px] text-[#64748B] uppercase font-bold tracking-wider">Start</div>
                      </div>
                    </div>

                    {/* Teams List Preview */}
                    {tournament.teamsList && tournament.teamsList.length > 0 && (
                      <div className="mb-4 pt-3 border-t border-[#24344D]/40">
                        <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
                          <Users size={10} /> Registered Teams
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {tournament.teamsList.slice(0, 5).map((team, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#131D31]/50 text-[#94A3B8] border border-[#24344D]/40">
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
                    <div className="flex items-center justify-between pt-3 border-t border-[#24344D]/40">
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
          className="text-center text-xs text-[#64748B] py-4"
        >
          Showing {filteredTournaments.length} of {tournaments.length} tournaments
        </motion.div>
      )}
    </div>
  );
};

export default Tournaments;
