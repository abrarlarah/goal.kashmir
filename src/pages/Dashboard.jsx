import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { calculateStandings } from '../utils/soccerUtils';
import LineupDisplay from '../components/common/LineupDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Shirt, ChevronRight, Trophy, TrendingUp, Users, Activity } from 'lucide-react';
import { cn } from '../utils/cn';

const Dashboard = () => {
  const { matches, players, teams, tournaments, lineups, loading } = useData();
  const [dashboardCompetition, setDashboardCompetition] = useState('');
  const [expandedMatch, setExpandedMatch] = useState(null);

  // Animation constants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Automatically select the first tournament when data loads
  useEffect(() => {
    // Only set if we haven't selected one yet (or it is stuck on 'All') and we have tournaments
    if ((!dashboardCompetition || dashboardCompetition === 'All') && tournaments.length > 0) {
      setDashboardCompetition(tournaments[0].name);
    }
  }, [tournaments, dashboardCompetition]);

  // Data Filtering
  const filteredMatches = dashboardCompetition && dashboardCompetition !== 'All'
    ? matches.filter(m => m.competition === dashboardCompetition)
    : matches;

  const relevantTeamNames = dashboardCompetition && dashboardCompetition !== 'All'
    ? teams.filter(team => {
      const teamTournaments = Array.isArray(team.tournaments)
        ? team.tournaments
        : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
      return teamTournaments.includes(dashboardCompetition);
    }).map(t => t.name)
    : null;

  const filteredPlayers = relevantTeamNames
    ? players.filter(p => relevantTeamNames.includes(p.team))
    : players;

  const liveMatches = filteredMatches.filter(m => m.status === 'live');
  const upcomingMatches = filteredMatches.filter(m => m.status === 'scheduled');
  const finishedMatches = filteredMatches.filter(m => m.status === 'finished').slice(0, 5);

  const topScorers = [...filteredPlayers]
    .sort((a, b) => (b.goals || 0) - (a.goals || 0))
    .slice(0, 5);

  const standings = (dashboardCompetition && dashboardCompetition !== 'All')
    ? calculateStandings(teams, matches, dashboardCompetition)
    : [];
  const topTeams = standings.slice(0, 5);

  const getMatchLineups = (matchId) => lineups.filter(l => l.matchId === matchId);
  const getTeamInfo = (teamName) => teams.find(t => t.name === teamName) || {};

  if (loading && matches.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <div className="text-slate-400 font-medium animate-pulse">Loading Match Data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Header & Filters */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Match Center</h1>
          <p className="text-slate-400">Track live scores, fixtures, and statistics in real-time.</p>
        </div>

        <div className="flex flex-wrap gap-2 bg-dark-card/50 backdrop-blur-sm p-1.5 rounded-xl border border-white/5">
          <button
            onClick={() => setDashboardCompetition('All')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
              dashboardCompetition === 'All'
                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            All matches
          </button>
          {tournaments.map(t => (
            <button
              key={t.id}
              onClick={() => setDashboardCompetition(t.name)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                dashboardCompetition === t.name
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
      >

        {/* LEFT COLUMN: Matches (8 cols) */}
        <div className="lg:col-span-8 space-y-8">

          {/* Live Matches Section */}
          <motion.section variants={item}>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <span className="h-3 w-3 absolute -top-1 -right-1 bg-red-500 rounded-full animate-ping" />
                <Activity className="text-red-500" />
              </div>
              <h2 className="text-xl font-display font-bold text-white">Live Now</h2>
            </div>

            {liveMatches.length > 0 ? (
              <div className="grid gap-4">
                {liveMatches.map(match => {
                  const isExpanded = expandedMatch === match.id;
                  const matchLineups = getMatchLineups(match.id);
                  const teamA = getTeamInfo(match.teamA);
                  const teamB = getTeamInfo(match.teamB);

                  return (
                    <motion.div
                      layout
                      key={match.id}
                      className="glass-card rounded-2xl overflow-hidden group hover:border-brand-500/30 transition-colors"
                    >
                      {/* Match Header */}
                      <div className="p-5 md:p-6">
                        <div className="flex justify-between items-start mb-6">
                          <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-wider border border-red-500/20 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                            Live • {match.currentMinute}'
                          </span>
                          <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400">
                            {match.stadium && (
                              <span className="flex items-center gap-1.5">
                                <MapPin size={14} /> {match.stadium}
                              </span>
                            )}
                            <span className="px-2 py-1 bg-white/5 rounded text-slate-300">{match.competition}</span>
                          </div>
                        </div>

                        {/* Score Board */}
                        <div className="flex items-center justify-between gap-4 md:gap-8">
                          {/* Team A */}
                          <div className="flex-1 flex flex-col items-center md:flex-row md:items-center gap-4 text-center md:text-left">
                            <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-400 ring-2 ring-white/5">
                              {match.teamA.charAt(0)}
                            </div>
                            <div>
                              <div className="text-lg md:text-xl font-bold text-white">{match.teamA}</div>
                              {teamA.manager && <div className="text-xs text-slate-500 hidden md:block">Mgr: {teamA.manager}</div>}
                            </div>
                          </div>

                          {/* Score */}
                          <div className="px-6 py-3 bg-black/40 rounded-xl border border-white/5 backdrop-blur-md">
                            <span className="font-impact text-4xl md:text-5xl tracking-wider text-white">
                              {match.scoreA} <span className="text-slate-600 mx-2">-</span> {match.scoreB}
                            </span>
                          </div>

                          {/* Team B */}
                          <div className="flex-1 flex flex-col items-center md:flex-row-reverse md:items-center gap-4 text-center md:text-right">
                            <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-400 ring-2 ring-white/5">
                              {match.teamB.charAt(0)}
                            </div>
                            <div>
                              <div className="text-lg md:text-xl font-bold text-white">{match.teamB}</div>
                              {teamB.manager && <div className="text-xs text-slate-500 hidden md:block">Mgr: {teamB.manager}</div>}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex justify-center gap-3">
                          <Link
                            to={`/live/${match.id}`}
                            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-brand-500/20"
                          >
                            <Activity size={16} /> Match Center
                          </Link>
                          {matchLineups.length > 0 && (
                            <button
                              onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                              className="flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-all border border-white/5"
                            >
                              <Shirt size={16} /> {isExpanded ? 'Hide Lineups' : 'Lineups'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lineups Expansion */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/5 bg-black/20"
                          >
                            <div className="p-6 grid md:grid-cols-2 gap-8">
                              {matchLineups.map(lineup => (
                                <div key={lineup.id}>
                                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                                    {lineup.teamName} XI
                                  </h4>
                                  <LineupDisplay lineup={lineup} players={players} />
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-center">
                <Clock className="w-10 h-10 text-slate-500 mb-3" />
                <h3 className="text-slate-300 font-medium">No Live Matches</h3>
                <p className="text-slate-500 text-sm">Check upcoming fixtures below.</p>
              </div>
            )}
          </motion.section>

          {/* Upcoming Matches */}
          <motion.section variants={item}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Calendar className="text-brand-400" size={20} /> Upcoming
              </h2>
            </div>

            <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {upcomingMatches.length > 0 ? upcomingMatches.map(match => (
                <div key={match.id} className="group relative bg-dark-card hover:bg-dark-surface p-4 rounded-xl border border-white/5 hover:border-brand-500/30 transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                  {/* Date Badge */}
                  <div className="flex-shrink-0 flex sm:flex-col items-center gap-2 sm:gap-0 px-3 py-2 bg-white/5 rounded-lg border border-white/5 min-w-[70px] text-center">
                    <span className="text-xs font-bold text-brand-400 uppercase">
                      {match.date ? new Date(match.date).toLocaleDateString('en-US', { month: 'short' }) : 'TBA'}
                    </span>
                    <span className="text-lg font-bold text-white">
                      {match.date ? new Date(match.date).toLocaleDateString('en-US', { day: 'numeric' }) : '-'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{match.time || 'TBD'}</span>
                  </div>

                  {/* Match Info */}
                  <div className="flex-grow flex flex-col md:flex-row items-center gap-6 justify-center">
                    <div className="flex items-center gap-3 w-1/3 justify-end text-right">
                      <span className="font-bold text-slate-200">{match.teamA}</span>
                    </div>

                    <div className="px-3 py-1 bg-black/30 rounded text-xs font-medium text-slate-500">VS</div>

                    <div className="flex items-center gap-3 w-1/3 justify-start text-left">
                      <span className="font-bold text-slate-200">{match.teamB}</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex-shrink-0 flex items-center gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded">{match.competition}</span>
                  </div>

                  <Link to={`/live/${match.id}`} className="absolute inset-0" />
                </div>
              )) : (
                <div className="text-slate-500 text-sm text-center py-6">No upcoming matches scheduled.</div>
              )}
            </div>
          </motion.section>

          {/* Recent Results Preview (Horizontal) */}
          <motion.section variants={item}>
            <h2 className="text-xl font-display font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="text-slate-400" size={20} /> Recent Results
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {finishedMatches.length > 0 ? finishedMatches.map(match => (
                <div key={match.id} className="p-4 rounded-xl bg-dark-card border border-white/5 flex flex-col gap-3 group hover:bg-dark-surface hover:border-brand-500/30 transition-all cursor-pointer">
                  <Link to={`/live/${match.id}`} className="block">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{match.competition}</span>
                      <span>{match.date && new Date(match.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex justify-between items-center">
                          <span className={cn("font-medium", match.scoreA > match.scoreB ? "text-white" : "text-slate-400")}>{match.teamA}</span>
                          <span className={cn("font-bold px-2 py-0.5 rounded", match.scoreA > match.scoreB ? "bg-brand-500/10 text-brand-400" : "bg-white/5 text-slate-500")}>{match.scoreA}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={cn("font-medium", match.scoreB > match.scoreA ? "text-white" : "text-slate-400")}>{match.teamB}</span>
                          <span className={cn("font-bold px-2 py-0.5 rounded", match.scoreB > match.scoreA ? "bg-brand-500/10 text-brand-400" : "bg-white/5 text-slate-500")}>{match.scoreB}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/5 text-center">
                      <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest group-hover:text-brand-300 transition-colors">Match Report &rarr;</span>
                    </div>
                  </Link>
                </div>
              )) : (
                <div className="text-slate-500 text-sm">No recent matches.</div>
              )}
            </div>
          </motion.section>
        </div>

        {/* RIGHT COLUMN: Stats & Standings (4 cols) */}
        <div className="lg:col-span-4 space-y-8">

          {/* Standings Widget */}
          <motion.div variants={item} className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-white flex items-center gap-2">
                <Trophy size={18} className="text-yellow-500" /> Standings
              </h3>
              <Link to="/leaderboard" className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center">
                View All <ChevronRight size={14} />
              </Link>
            </div>

            {dashboardCompetition === 'All' ? (
              <div className="text-center py-8 px-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                <p className="text-sm text-slate-400 mb-2">Select a tournament filter</p>
                <p className="text-xs text-slate-500">Choose a competition from the top to view its table.</p>
              </div>
            ) : topTeams.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-white/5">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="py-2.5 px-3 text-left font-semibold">Club</th>
                      <th className="py-2.5 px-3 text-center font-semibold">P</th>
                      <th className="py-2.5 px-3 text-center font-semibold text-white">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/20">
                    {topTeams.map((team, idx) => (
                      <tr key={team.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-xs font-bold w-4 text-slate-500",
                              idx === 0 && "text-yellow-500",
                              idx === 1 && "text-slate-300",
                              idx === 2 && "text-amber-700"
                            )}>{idx + 1}</span>
                            <span className="font-medium text-slate-200 truncate max-w-[100px]">{team.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-400 text-xs">{team.played}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-white">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-slate-500 text-sm text-center">No standings data.</div>
            )}
          </motion.div>

          {/* Top Scorers Widget */}
          <motion.div variants={item} className="glass-card rounded-2xl p-6">
            <h3 className="font-display font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-400" /> Top Performers
            </h3>

            <div className="space-y-4">
              {topScorers.length > 0 ? topScorers.map((player, idx) => (
                <div key={player.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold border border-white/5">
                        {player.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-dark-bg border border-white/10 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                        {idx + 1}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-brand-400 transition-colors">{player.name}</div>
                      <div className="text-xs text-slate-500">{player.team}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-impact text-brand-500">{player.goals}</span>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Goals</span>
                  </div>
                </div>
              )) : (
                <div className="text-slate-500 text-sm">No player stats available.</div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5">
              <Link to="/players" className="block w-full text-center py-2 text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                View Player Stats
              </Link>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
