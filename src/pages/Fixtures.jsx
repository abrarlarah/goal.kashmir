import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Calendar, Clock, MapPin, Trophy, Navigation, Filter, Trophy as TrophyIcon, ChevronLeft, ChevronRight, Search, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const Fixtures = () => {
  const { matches, tournaments, teams, loading } = useData();
  const [filterStatus, setFilterStatus] = useState('All'); // All, upcoming, live, finished
  const [filterTournament, setFilterTournament] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Memoize team logos for O(1) lookup
  const teamLogos = useMemo(() => {
    const map = {};
    if (teams) {
      teams.forEach(t => {
        map[t.name] = t.logoUrl || null;
      });
    }
    return map;
  }, [teams]);

  // Helper to get team logo
  const getTeamLogo = (teamName) => {
    return teamLogos[teamName] || null;
  };

  // Global match numbers: sort ALL matches by date ascending and assign 1, 2, 3...
  const globalMatchNumbers = useMemo(() => {
    const sorted = [...matches].sort((a, b) => {
      const dateA = new Date(`${a.date || '2000-01-01'}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date || '2000-01-01'}T${b.time || '00:00'}`);
      return dateA - dateB; // Oldest first
    });
    const map = {};
    sorted.forEach((m, idx) => {
      map[m.id] = idx + 1;
    });
    return map;
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      // Status filter
      if (filterStatus !== 'All') {
        if (filterStatus === 'live' && !['live', 'halftime'].includes(match.status)) return false;
        if (filterStatus !== 'live' && match.status !== filterStatus) return false;
      }
      
      // Tournament filter
      if (filterTournament !== 'All') {
        if (match.tournamentId !== filterTournament && match.competition !== tournaments.find(t => t.id === filterTournament)?.name) {
          return false;
        }
      }
      
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = globalMatchNumbers[match.id];
        const matchNumStr = matchNum ? matchNum.toString() : '';
        if (
          !match.teamA?.toLowerCase().includes(q) && 
          !match.teamB?.toLowerCase().includes(q) && 
          !match.competition?.toLowerCase().includes(q) &&
          !matchNumStr.includes(q)
        ) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => {
      const dateA = new Date(`${a.date || '2000-01-01'}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date || '2000-01-01'}T${b.time || '00:00'}`);
      return dateB - dateA;
    });
  }, [matches, filterStatus, filterTournament, searchQuery, tournaments, globalMatchNumbers]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterTournament, searchQuery]);

  // Group by Date for display (only mapping current page to prevent UI freeze)
  const groupedMatches = useMemo(() => {
    const groups = {};
    const startIndex = (currentPage - 1) * itemsPerPage;
    const visibleMatches = filteredMatches.slice(startIndex, startIndex + itemsPerPage);
    
    visibleMatches.forEach(match => {
      // Group by "YYYY-MM-DD"
      const dateKey = match.date || 'TBD';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);
    });
    
    // Convert to array and sort dates descending
    return Object.keys(groups).sort((a, b) => {
      if (a === 'TBD') return 1;
      if (b === 'TBD') return -1;
      return new Date(b) - new Date(a);
    }).map(date => ({
      date,
      matches: groups[date]
    }));
  }, [filteredMatches, currentPage]);

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'TBD') return 'Date To Be Decided';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading && matches.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 space-y-8">
      {/* ═══ HERO HEADER ═══ */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c0a1d] via-[#1a103d] to-[#0c0a1d]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-600/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500/15 via-transparent to-transparent"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-brand-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-violet-600/10 to-transparent rounded-full blur-3xl"></div>

        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          {/* Title Row */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-400/20 text-violet-300 text-xs font-bold mb-3">
                <Sparkles size={12} className="text-violet-400" /> Full Calendar
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-1">
                Match <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-brand-400">Fixtures</span>
              </h1>
              <p className="text-slate-400 text-sm max-w-xl">Browse all fixtures, live games, and past results across every tournament.</p>
            </div>

            {/* Stats Pills */}
            <div className="flex gap-3">
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
                <div className="text-xl font-black text-white">{matches.length}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md text-center">
                <div className="text-xl font-black text-emerald-400">{matches.filter(m => m.status === 'live' || m.status === 'halftime').length}</div>
                <div className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-wider">Live</div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 backdrop-blur-md text-center">
                <div className="text-xl font-black text-violet-400">{matches.filter(m => m.status === 'finished').length}</div>
                <div className="text-[10px] font-bold text-violet-400/60 uppercase tracking-wider">Played</div>
              </div>
            </div>
          </div>

          {/* Search + Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search team or tournament..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-xl pl-4 pr-9 py-2.5 text-sm font-medium text-white focus:ring-2 focus:ring-violet-500/50 outline-none transition-all cursor-pointer [&>option]:text-slate-900 w-full sm:w-auto"
              >
                <option value="All">All Matches</option>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live Now</option>
                <option value="finished">Finished</option>
              </select>
              <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
            </div>

            {/* Tournament Filter */}
            <div className="relative">
              <select
                value={filterTournament}
                onChange={(e) => setFilterTournament(e.target.value)}
                className="appearance-none bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-xl pl-4 pr-9 py-2.5 text-sm font-medium text-white focus:ring-2 focus:ring-violet-500/50 outline-none transition-all cursor-pointer [&>option]:text-slate-900 w-full sm:w-auto"
              >
                <option value="All">All Tournaments</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
            </div>
          </div>

          {/* Active Filter Tags */}
          {(filterStatus !== 'All' || filterTournament !== 'All' || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active:</span>
              {filterStatus !== 'All' && (
                <button onClick={() => setFilterStatus('All')} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/20 text-violet-300 text-[10px] font-bold hover:bg-violet-500/25 transition-colors">
                  {filterStatus} <X size={10} />
                </button>
              )}
              {filterTournament !== 'All' && (
                <button onClick={() => setFilterTournament('All')} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/20 text-cyan-300 text-[10px] font-bold hover:bg-cyan-500/25 transition-colors">
                  {tournaments.find(t => t.id === filterTournament)?.name || 'Tournament'} <X size={10} />
                </button>
              )}
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500/15 border border-brand-500/20 text-brand-300 text-[10px] font-bold hover:bg-brand-500/25 transition-colors">
                  "{searchQuery}" <X size={10} />
                </button>
              )}
              <button onClick={() => { setFilterStatus('All'); setFilterTournament('All'); setSearchQuery(''); }} className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors ml-1 underline underline-offset-2">
                Clear all
              </button>
            </div>
          )}

          {/* Results count */}
          <div className="mt-4 text-xs text-slate-500 font-medium">
            Showing {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''}
          </div>
        </div>
      </div>

      {/* ═══ FIXTURES LIST ═══ */}
      <div className="space-y-10">
        {groupedMatches.length > 0 ? (
          groupedMatches.map((group, groupIdx) => (
            <div key={group.date} className="space-y-5">
              {/* Date Header */}
              <div className="flex items-center gap-4">
                <div className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/15 dark:border-violet-400/15 text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2.5 shadow-sm">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                    <Calendar size={13} className="text-white" />
                  </div>
                  {formatDate(group.date)}
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-violet-500/20 via-slate-200 dark:via-white/10 to-transparent"></div>
              </div>

              {/* Matches Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {group.matches.map((match, matchIdx) => {
                  const isLive = match.status === 'live' || match.status === 'halftime';
                  const isFinished = match.status === 'finished';
                  
                  return (
                    <Link
                      key={match.id}
                      to={`/live/${match.id}`}
                      className="block group"
                    >
                      <div className={cn(
                        "relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-2xl",
                        "bg-gradient-to-br from-white via-white to-slate-50 dark:from-[#0f172a] dark:via-[#131b2e] dark:to-[#0c1220]",
                        "ring-1 ring-slate-200/80 dark:ring-white/[0.06] hover:ring-2",
                        isLive ? "hover:ring-red-500/40 hover:shadow-red-500/10" : "hover:ring-violet-500/30 hover:shadow-violet-500/10"
                      )}>
                        {/* Top Gradient Bar */}
                        <div className={cn(
                          "h-1 w-full",
                          isLive ? "bg-gradient-to-r from-red-500 via-orange-500 to-red-500" :
                          isFinished ? "bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500" :
                          "bg-gradient-to-r from-violet-500 via-cyan-400 to-violet-500"
                        )} />

                        <div className="p-4 sm:p-5">
                          {/* Match Header */}
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2.5">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-black",
                                isLive ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                isFinished ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                                "bg-violet-500/10 text-violet-500 dark:text-violet-400 border border-violet-500/20"
                              )}>
                                Match {globalMatchNumbers[match.id] || '—'}
                              </span>
                              <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate max-w-[140px] sm:max-w-[200px]">
                                {match.competition}
                              </span>
                            </div>
                            
                            {/* Status Badge */}
                            <div>
                              {isLive && (
                                <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Live
                                </span>
                              )}
                              {isFinished && (
                                <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                  Full Time
                                </span>
                              )}
                              {match.status === 'upcoming' && (
                                <span className="inline-flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-500 dark:text-violet-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                  Upcoming
                                </span>
                              )}
                              {match.status === 'scheduled' && (
                                <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                  Scheduled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Teams & Score */}
                          <div className="flex items-center justify-between gap-3">
                            {/* Team A */}
                            <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
                              <div className={cn(
                                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center p-2.5 transition-transform group-hover:scale-105",
                                "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/[0.06] dark:to-white/[0.02]",
                                "border border-slate-200/80 dark:border-white/10",
                                "shadow-sm"
                              )}>
                                {getTeamLogo(match.teamA) ? (
                                  <img src={getTeamLogo(match.teamA)} alt={match.teamA} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-2xl font-black text-slate-300 dark:text-slate-600">{match.teamA?.charAt(0)}</span>
                                )}
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white text-center line-clamp-2 leading-tight">{match.teamA}</span>
                            </div>

                            {/* Score / VS */}
                            <div className="flex-shrink-0 text-center px-2">
                              {isLive || isFinished ? (
                                <div className={cn(
                                  "px-4 py-2 rounded-xl border",
                                  isLive ? "bg-red-500/5 border-red-500/20" : "bg-slate-50 dark:bg-white/[0.03] border-slate-200/50 dark:border-white/5"
                                )}>
                                  <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {match.scoreA || 0} <span className="text-slate-300 dark:text-slate-600 mx-0.5">-</span> {match.scoreB || 0}
                                  </div>
                                </div>
                              ) : (
                                <div className="px-5 py-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/15 dark:border-violet-400/10">
                                  <span className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-cyan-500">VS</span>
                                </div>
                              )}
                            </div>

                            {/* Team B */}
                            <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
                              <div className={cn(
                                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center p-2.5 transition-transform group-hover:scale-105",
                                "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/[0.06] dark:to-white/[0.02]",
                                "border border-slate-200/80 dark:border-white/10",
                                "shadow-sm"
                              )}>
                                {getTeamLogo(match.teamB) ? (
                                  <img src={getTeamLogo(match.teamB)} alt={match.teamB} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-2xl font-black text-slate-300 dark:text-slate-600">{match.teamB?.charAt(0)}</span>
                                )}
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white text-center line-clamp-2 leading-tight">{match.teamB}</span>
                            </div>
                          </div>
                        </div>

                        {/* Match Footer */}
                        <div className="bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-200/60 dark:border-white/5 py-2.5 px-4 sm:px-5 flex items-center justify-between text-[10px] sm:text-xs text-slate-500 font-medium">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5">
                              <Clock size={11} className="text-violet-500" />
                              {match.time || 'TBD'}
                            </span>
                            {match.stadium && (
                              <span className="flex items-center gap-1.5 truncate max-w-[100px] sm:max-w-[160px]">
                                <MapPin size={11} className="text-cyan-500 flex-shrink-0" />
                                <span className="truncate">{match.stadium}</span>
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 text-violet-500 dark:text-violet-400 font-bold group-hover:translate-x-1 transition-transform">
                            {isLive || isFinished ? 'Details' : 'View'} <ChevronRight size={12} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-violet-300/30 dark:border-violet-500/20 bg-gradient-to-br from-violet-50/50 to-slate-50 dark:from-violet-950/20 dark:to-[#0f172a]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} className="text-violet-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Fixtures Found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">There are no matches matching your current filters. Try selecting a different status or tournament.</p>
          </div>
        )}

        {/* Pagination Block */}
        {filteredMatches.length > itemsPerPage && (() => {
          const totalPages = Math.ceil(filteredMatches.length / itemsPerPage);
          const maxPagesToShow = 5;
          let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
          let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
          
          if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
          }

          const pages = [];
          for (let i = startPage; i <= endPage; i++) {
            pages.push(
              <button
                key={i}
                onClick={() => {
                  setCurrentPage(i);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-xl font-bold flex items-center justify-center transition-all border text-sm sm:text-base",
                  currentPage === i 
                    ? "bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/30" 
                    : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-brand-500"
                )}
              >
                {i}
              </button>
            );
          }

          return (
            <div className="flex justify-center items-center gap-1 sm:gap-2 pt-8 pb-12">
              <button
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 hover:text-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              
              {startPage > 1 && (
                <>
                  <button onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hidden sm:flex w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-brand-500 hover:bg-slate-200 dark:hover:bg-white/10 font-bold items-center justify-center transition-all">1</button>
                  {startPage > 2 && <span className="hidden sm:inline text-slate-400 dark:text-slate-600 px-1">...</span>}
                </>
              )}
              
              {pages}
              
              {endPage < totalPages && (
                <>
                  {endPage < totalPages - 1 && <span className="hidden sm:inline text-slate-400 dark:text-slate-600 px-1">...</span>}
                  <button onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hidden sm:flex w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-brand-500 hover:bg-slate-200 dark:hover:bg-white/10 font-bold items-center justify-center transition-all">{totalPages}</button>
                </>
              )}

              <button
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 hover:text-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default Fixtures;
