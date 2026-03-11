import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { calculateStandings } from '../utils/soccerUtils';
import LineupDisplay from '../components/common/LineupDisplay';
import MatchTimer from '../components/common/MatchTimer';
import SponsorsCarousel from '../components/common/SponsorsCarousel';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Shirt, ChevronRight, Trophy, Activity, MapPinned, UserPlus, Zap, Target } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const DISTRICTS = {
  JAMMU: ['Jammu', 'Samba', 'Kathua', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar'],
  KASHMIR: ['Srinagar', 'Ganderbal', 'Budgam', 'Baramulla', 'Bandipora', 'Kupwara', 'Pulwama', 'Shopian', 'Kulgam', 'Anantnag']
};

const Dashboard = () => {
  const { isAdmin, isSuperAdmin, currentUser } = useAuth();
  const { matches, players, tournaments, lineups, teams, loading } = useData();
  const [dashboardCompetitionId, setDashboardCompetitionId] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('Baramulla');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [liveMatchEvents, setLiveMatchEvents] = useState({});

  useEffect(() => {
    // Fetch events (like goals) for live matches so we can display them
    const fetchLiveEvents = async () => {
      if (!matches) return;
      
      const currentLive = matches.filter(m => m.status === 'live' || m.status === 'halftime');
      if (currentLive.length === 0) return;
      
      const newEvents = {};
      for (const m of currentLive) {
        try {
          // Getting events collection for each live/halftime match to find goals
          const eventsRef = collection(db, 'matches', m.id, 'events');
          const q = query(eventsRef, where('type', '==', 'goal'));
          const snapshot = await getDocs(q);
          const goals = snapshot.docs.map(doc => doc.data()).sort((a, b) => a.minute - b.minute);
          newEvents[m.id] = goals;
        } catch (error) {
           console.error("Error fetching live events:", error);
        }
      }
      setLiveMatchEvents(newEvents);
    };
    
    fetchLiveEvents();
    // Poll every 30 seconds for live event updates
    const interval = setInterval(fetchLiveEvents, 30000);
    return () => clearInterval(interval);
  }, [matches]);

  const canEditMatch = (match) => {
    if (!isAdmin || !match) return false;
    if (isSuperAdmin) return true;
    const tournament = tournaments?.find(t => t.name === match.competition || t.id === match.tournamentId);
    return tournament ? tournament.createdBy === currentUser?.uid : false;
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

  const availableYears = useMemo(() => {
    const years = tournaments.map(t => t.startDate ? new Date(t.startDate).getFullYear().toString() : null).filter(Boolean);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    let ts = tournaments;
    if (selectedDistrict !== 'All') ts = ts.filter(t => t.district === selectedDistrict);
    if (selectedYear !== 'All') ts = ts.filter(t => t.startDate && new Date(t.startDate).getFullYear().toString() === selectedYear);
    return ts;
  }, [tournaments, selectedDistrict, selectedYear]);

  useEffect(() => {
    const isCurrentInFiltered = filteredTournaments.some(t => t.id === dashboardCompetitionId);
    if (!isCurrentInFiltered && dashboardCompetitionId !== 'All' && filteredTournaments.length > 0) {
      setDashboardCompetitionId(filteredTournaments[0].id);
    }
  }, [filteredTournaments, dashboardCompetitionId]);

  const filteredMatches = useMemo(() => {
    if (dashboardCompetitionId && dashboardCompetitionId !== 'All') {
      const tourney = tournaments.find(t => t.id === dashboardCompetitionId);
      return matches.filter(m => (m.tournamentId === dashboardCompetitionId) || (!m.tournamentId && m.competition === tourney?.name));
    }
    const activeTourneyIds = new Set(filteredTournaments.map(t => t.id));
    const activeTourneyNames = new Set(filteredTournaments.map(t => t.name));
    return matches.filter(m => activeTourneyIds.has(m.tournamentId) || (!m.tournamentId && activeTourneyNames.has(m.competition)));
  }, [matches, dashboardCompetitionId, filteredTournaments, tournaments]);

  const relevantTeamNames = dashboardCompetitionId && dashboardCompetitionId !== 'All'
    ? teams.filter(team => {
      const teamTournaments = Array.isArray(team.tournaments) ? team.tournaments : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
      const tourney = tournaments.find(t => t.id === dashboardCompetitionId);
      return tourney && teamTournaments.includes(tourney.name);
    }).map(t => t.name) : null;

  const filteredPlayers = relevantTeamNames ? players.filter(p => relevantTeamNames.includes(p.team)) : players;
  const liveMatches = filteredMatches.filter(m => m.status === 'live' || m.status === 'halftime');
  const upcomingMatches = filteredMatches.filter(m => m.status === 'scheduled');
  const finishedMatches = filteredMatches.filter(m => m.status === 'finished').slice(0, 5);
  const topScorers = [...filteredPlayers].sort((a, b) => (b.goals || 0) - (a.goals || 0)).slice(0, 5);
  const topAssists = [...filteredPlayers].sort((a, b) => (b.assists || 0) - (a.assists || 0)).slice(0, 5);
  const standings = (dashboardCompetitionId && dashboardCompetitionId !== 'All') ? calculateStandings(teams, matches, tournaments.find(t => t.id === dashboardCompetitionId)?.name) : [];
  const topTeams = standings.slice(0, 5);
  const getMatchLineups = (matchId) => lineups.filter(l => l.matchId === matchId);
  const getTeamInfo = (teamName) => teams.find(t => t.name === teamName) || {};
  const getTournamentId = (name) => tournaments.find(t => t.name === name)?.id;

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  const weeklyFixtures = matches.filter(m => m.date > today && m.date <= nextWeekStr).sort((a, b) => a.date.localeCompare(b.date));

  const districtStats = useMemo(() => {
    const stats = {};
    const availableDistricts = [...new Set(tournaments.map(t => t.district))].filter(Boolean);
    availableDistricts.forEach(d => { stats[d] = { matches: 0, tournaments: 0, teams: 0 }; });
    tournaments.forEach(t => { if (stats[t.district]) stats[t.district].tournaments++; });
    matches.forEach(m => { const tourney = tournaments.find(t => t.name === m.competition); if (tourney && tourney.district && stats[tourney.district]) stats[tourney.district].matches++; });
    teams.forEach(team => {
      const tourneyNames = Array.isArray(team.tournaments) ? team.tournaments : [];
      const teamDistricts = new Set();
      tourneyNames.forEach(tn => { const tourney = tournaments.find(t => t.name === tn); if (tourney && tourney.district) teamDistricts.add(tourney.district); });
      teamDistricts.forEach(d => { if (stats[d]) stats[d].teams++; });
    });
    return Object.entries(stats).filter(([_, data]) => data.tournaments > 0 || data.matches > 0).sort((a, b) => b[1].matches - a[1].matches);
  }, [tournaments, matches, teams]);

  if (loading && matches.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500"></div>
            <Zap className="absolute inset-0 m-auto text-brand-400" size={20} />
          </div>
          <div className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading Match Data...</div>
        </div>
      </div>
    );
  }



  const TeamLogo = ({ teamName, size = 'md' }) => {
    const team = getTeamInfo(teamName);
    const sizes = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-10 w-10 text-xs' };
    return (
      <div className={cn(sizes[size], "rounded-full bg-slate-50/80 dark:bg-slate-800/80 flex items-center justify-center ring-2 ring-white/10 overflow-hidden flex-shrink-0")}>
        {team.logoUrl ? <img src={team.logoUrl} alt={teamName} className="h-full w-full object-contain p-1 bg-white" /> : <span className="font-bold text-slate-500 dark:text-slate-400">{teamName?.substring(0, 2).toUpperCase()}</span>}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">

      {/* ═══ HERO HEADER ═══ */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-brand-950 dark:to-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.15),transparent_60%)]" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="relative px-4 sm:px-8 py-6 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    {liveMatches.length > 0 && <span className="flex items-center w-fit gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-bold uppercase tracking-wider"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />{liveMatches.length} Live</span>}
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-1">Match Center</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Track live scores, fixtures and statistics in real-time.</p>
                </div>
              </div>
            </div>

            {/* ═══ FILTERS ═══ */}
            <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-4 w-full">
              {/* Year filter */}
              <div className="relative flex-1 min-w-[80px]">
                <select
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(e.target.value); setDashboardCompetitionId('All'); }}
                  className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-xl pl-3 pr-8 py-2 text-[11px] sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer appearance-none shadow-sm h-10"
                >
                  <option value="All">Year</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 rotate-90 pointer-events-none" />
              </div>

              {/* District filter */}
              <div className="relative flex-1 min-w-[110px]">
                <select
                  value={selectedDistrict}
                  onChange={(e) => { setSelectedDistrict(e.target.value); setDashboardCompetitionId('All'); }}
                  className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-xl pl-3 pr-8 py-2 text-[11px] sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer appearance-none shadow-sm h-10"
                >
                  <option value="All">District</option>
                  <optgroup label="Kashmir">{DISTRICTS.KASHMIR.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>
                  <optgroup label="Jammu">{DISTRICTS.JAMMU.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>
                </select>
                <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 rotate-90 pointer-events-none" />
              </div>

              {/* Tournament filter */}
              <div className="relative flex-1 min-w-[130px]">
                <select
                  value={dashboardCompetitionId}
                  onChange={(e) => setDashboardCompetitionId(e.target.value)}
                  className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-xl pl-3 pr-8 py-2 text-[11px] sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer appearance-none shadow-sm h-10"
                >
                  <option value="All">Tournament</option>
                  {filteredTournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 rotate-90 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>


      {/* ═══ MAIN GRID ═══ */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-5 sm:space-y-8">

          {/* ── LIVE MATCHES ── */}
          <motion.section variants={item}>
            <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
              <div className="relative"><span className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 bg-red-500 rounded-full animate-ping opacity-75" /><Activity className="text-red-500" size={20} /></div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-white">Live Now</h2>
            </div>

            {liveMatches.length > 0 ? (
              <div className="space-y-4">
                {liveMatches.map(match => {
                  const isExpanded = expandedMatch === match.id;
                  const matchLineups = getMatchLineups(match.id);
                  return (
                    <motion.div layout key={match.id} className="relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700/50 hover:border-brand-500/50 transition-all shadow-2xl shadow-black/40 group">
                      {/* Premium Top Glow */}
                      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-70 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="p-3 sm:p-5 relative z-10">
                        {/* Status bar with Actions - Single Line Layout */}
                        <div className="flex flex-row justify-between items-center gap-1.5 sm:gap-2 mb-3 bg-slate-50/40 dark:bg-slate-800/40 p-1.5 sm:p-2.5 rounded-xl border border-slate-200/5 dark:border-white/5 shadow-inner">
                          {/* Left: Status */}
                          <div className="flex items-center flex-shrink-0">
                            {match.status === 'halftime' ? (
                              <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-orange-500/20 text-orange-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-orange-500/30 flex items-center gap-1 sm:gap-1.5 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                                Half Time
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-red-500/20 text-red-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-red-500/30 flex items-center gap-1 sm:gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> <span className="hidden xs:inline">Live • </span><MatchTimer match={match} />
                              </span>
                            )}
                          </div>
                          
                          {/* Center: Tournament Name */}
                          <div className="flex-1 flex justify-center items-center text-center px-1 overflow-hidden min-w-[50px]">
                            {getTournamentId(match.competition) ? (
                              <Link to={`/tournaments/${getTournamentId(match.competition)}`} className="text-[9px] sm:text-[10px] font-bold sm:font-black uppercase tracking-wider sm:tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500 hover:from-brand-200 hover:to-brand-400 transition-colors drop-shadow-sm truncate max-w-full">
                                {match.competition}
                              </Link>
                            ) : (
                              <span className="text-[9px] sm:text-[10px] font-bold sm:font-black uppercase tracking-wider sm:tracking-[0.2em] text-slate-500 dark:text-slate-400 truncate max-w-full">
                                {match.competition}
                              </span>
                            )}
                          </div>
                          
                          {/* Right: Actions - Icons only on Mobile */}
                          <div className="flex justify-end items-center gap-1 sm:gap-1.5 flex-shrink-0">
                            <Link to={`/live/${match.id}`} className="flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 bg-brand-500 hover:bg-brand-600 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 text-white dark:text-brand-400 border border-brand-500/20 rounded-md sm:rounded-lg transition-all shadow-sm active:scale-95" title="Match Center">
                              <Activity size={12} /> <span className="hidden md:inline ml-1.5 text-[10px] font-bold">Match Center</span>
                            </Link>
                            {matchLineups.length > 0 && (
                              <button onClick={() => setExpandedMatch(isExpanded ? null : match.id)} className="flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md sm:rounded-lg transition-all active:scale-95" title={isExpanded ? 'Hide Lineups' : 'Show Lineups'}>
                                <Shirt size={12} /> <span className="hidden md:inline ml-1.5 text-[10px] font-bold">{isExpanded ? 'Hide Lineups' : 'Lineups'}</span>
                              </button>
                            )}
                            {canEditMatch(match) && (
                              <Link to={`/admin/lineups/${match.id}`} className="flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-md sm:rounded-lg transition-all active:scale-95" title="Edit Lineup">
                                <UserPlus size={12} /> <span className="hidden md:inline ml-1.5 text-[10px] font-bold">Edit Lineup</span>
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Scoreboard */}
                        <div className="flex items-center justify-center gap-3 sm:gap-6 w-full max-w-sm mx-auto">
                          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                            <TeamLogo teamName={match.teamA} size="md" />
                            <span className="text-xs font-bold text-slate-900 dark:text-white text-center truncate w-full">{match.teamA}</span>
                          </div>
                          <div className="px-3 sm:px-4 py-1.5 bg-black/40 rounded-xl border border-slate-200/5 dark:border-white/5 backdrop-blur-md flex-shrink-0">
                            <span className="font-impact text-xl sm:text-3xl tracking-wider text-slate-900 dark:text-white">{match.scoreA}<span className="text-slate-600 mx-1 sm:mx-2">-</span>{match.scoreB}</span>
                          </div>
                          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                            <TeamLogo teamName={match.teamB} size="md" />
                            <span className="text-xs font-bold text-slate-900 dark:text-white text-center truncate w-full">{match.teamB}</span>
                          </div>
                        </div>
                        
                        {/* Goal Events Display */}
                        {liveMatchEvents[match.id] && liveMatchEvents[match.id].length > 0 && (
                          <div className="mt-3 flex justify-between px-2 sm:px-6 max-w-sm mx-auto">
                            {/* Team A Goals */}
                            <div className="flex-1 pr-1.5 text-right">
                              {liveMatchEvents[match.id].filter(e => e.team === match.teamA).map((goal, idx) => (
                                <div key={idx} className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-300 font-medium truncate">
                                  {goal.player}
                                  {goal.isFreekick && <span className="text-orange-400 font-bold ml-0.5" title="Free Kick">(FK)</span>}
                                  {goal.isPenalty && <span className="text-red-400 font-bold ml-0.5" title="Penalty">(PK)</span>}
                                  {goal.assist && <span className="text-slate-500 ml-1 text-[8px]" title="Assist">({goal.assist})</span>}
                                  <span className="text-brand-400 font-bold ml-1">{goal.minute}'</span>
                                </div>
                              ))}
                            </div>
                            <div className="w-12 sm:w-16 flex-shrink-0" /> {/* Spacer under score */}
                            {/* Team B Goals */}
                            <div className="flex-1 pl-1.5 text-left">
                              {liveMatchEvents[match.id].filter(e => e.team === match.teamB).map((goal, idx) => (
                                <div key={idx} className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-300 font-medium truncate">
                                  <span className="text-brand-400 font-bold mr-1">{goal.minute}'</span> 
                                  {goal.player}
                                  {goal.isFreekick && <span className="text-orange-400 font-bold ml-0.5" title="Free Kick">(FK)</span>}
                                  {goal.isPenalty && <span className="text-red-400 font-bold ml-0.5" title="Penalty">(PK)</span>}
                                  {goal.assist && <span className="text-slate-500 ml-1 text-[8px]" title="Assist">({goal.assist})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-200/5 dark:border-white/5 bg-black/20">
                            <div className="p-4 sm:p-6 grid sm:grid-cols-2 gap-6">
                              {matchLineups.map(lineup => (<div key={lineup.id}><h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-200/5 dark:border-white/5 pb-2">{lineup.teamName} XI</h4><LineupDisplay lineup={lineup} players={players} /></div>))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 sm:p-8 rounded-2xl border border-dashed border-slate-200/10 dark:border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3"><Clock className="text-slate-500" size={22} /></div>
                <h3 className="text-slate-600 dark:text-slate-300 font-semibold text-sm">No Live Matches</h3>
                <p className="text-slate-500 text-xs mt-1">Check upcoming fixtures below</p>
              </div>
            )}
          </motion.section>

          {/* ── UPCOMING MATCHES ── */}
          <motion.section variants={item}>
            <h2 className="text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2"><Calendar className="text-brand-400" size={20} /> Upcoming</h2>
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {upcomingMatches.length > 0 ? upcomingMatches.map(match => (
                <Link to={`/live/${match.id}`} key={match.id} className="group block">
                  <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 hover:border-brand-500/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                    {/* Date */}
                    <div className="flex-shrink-0 w-12 text-center px-1 py-1.5 bg-slate-100/50 dark:bg-white/5 rounded-lg border border-slate-200/50 dark:border-white/5">
                      <div className="text-[10px] font-bold text-brand-500 dark:text-brand-400 uppercase">{match.date ? new Date(match.date).toLocaleDateString('en-US', { month: 'short' }) : 'TBA'}</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{match.date ? new Date(match.date).getDate() : '-'}</div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400">{match.time || 'TBD'}</div>
                    </div>
                    {/* Teams */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
                        <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{match.teamA}</span>
                        <TeamLogo teamName={match.teamA} size="sm" />
                       </div>
                       <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-[10px] font-bold text-slate-500 flex-shrink-0 border border-slate-200/50 dark:border-transparent">VS</span>
                       <div className="flex-1 flex items-center gap-2 min-w-0">
                         <TeamLogo teamName={match.teamB} size="sm" />
                         <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{match.teamB}</span>
                       </div>
                     </div>
                     <ChevronRight size={14} className="text-slate-400 dark:text-slate-600 group-hover:text-brand-500 dark:group-hover:text-brand-400 flex-shrink-0 transition-colors" />
                   </div>
                 </Link>
              )) : <div className="text-slate-500 text-sm text-center py-8">No upcoming matches scheduled.</div>}
            </div>
          </motion.section>

          {/* ── RECENT RESULTS ── */}
          <motion.section variants={item}>
            <h2 className="text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2"><Clock className="text-slate-500 dark:text-slate-400" size={20} /> Recent Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {finishedMatches.length > 0 ? finishedMatches.map(match => (
                <Link to={`/live/${match.id}`} key={match.id} className="block group">
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/5 dark:border-white/5 hover:border-brand-500/30 hover:bg-slate-50/50 dark:bg-slate-800/50 transition-all">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-2.5">
                      <span className="text-brand-400 font-bold">{match.competition}</span>
                      <span>{match.date && new Date(match.date).toLocaleDateString()}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2"><TeamLogo teamName={match.teamA} size="sm" /><span className={cn("text-xs sm:text-sm font-semibold", match.scoreA > match.scoreB ? "text-slate-900 dark:text-white" : "text-slate-500")}>{match.teamA}</span></div>
                        <span className={cn("text-sm font-bold px-2 py-0.5 rounded", match.scoreA > match.scoreB ? "bg-brand-500/15 text-brand-400" : "bg-white/5 text-slate-500")}>{match.scoreA}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2"><TeamLogo teamName={match.teamB} size="sm" /><span className={cn("text-xs sm:text-sm font-semibold", match.scoreB > match.scoreA ? "text-slate-900 dark:text-white" : "text-slate-500")}>{match.teamB}</span></div>
                        <span className={cn("text-sm font-bold px-2 py-0.5 rounded", match.scoreB > match.scoreA ? "bg-brand-500/15 text-brand-400" : "bg-white/5 text-slate-500")}>{match.scoreB}</span>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/5 dark:border-white/5 text-center"><span className="text-[10px] font-bold text-brand-400/70 uppercase tracking-widest group-hover:text-brand-400 transition-colors">Match Report →</span></div>
                  </div>
                </Link>
              )) : <div className="text-slate-500 text-sm">No recent matches.</div>}
            </div>
          </motion.section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-5 sm:space-y-6">

          {/* Standings */}
          <motion.div variants={item} className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/5 dark:border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200/5 dark:border-white/5">
              <h3 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base"><Trophy size={16} className="text-yellow-500" /> Standings</h3>
              <div className="flex items-center gap-2">
                {dashboardCompetitionId !== 'All' && <Link to={`/tournaments/${dashboardCompetitionId}`} className="text-[10px] font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300 bg-brand-500/5 px-2 py-1 rounded-lg border border-brand-500/10">Details</Link>}
                <Link to="/leaderboard" className="text-xs text-slate-500 hover:text-slate-600 dark:text-slate-300 font-medium flex items-center">All <ChevronRight size={14} /></Link>
              </div>
            </div>
            <div className="p-3 sm:p-4">
              {dashboardCompetitionId === 'All' ? (
                <div className="text-center py-6 px-3"><p className="text-xs text-slate-500">Select a tournament to view standings</p></div>
              ) : topTeams.length > 0 ? (
                <div className="space-y-1">
                  {topTeams.map((team, idx) => (
                    <div key={team.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("text-xs font-bold w-5 text-center", idx === 0 ? "text-yellow-500" : idx === 1 ? "text-slate-600 dark:text-slate-300" : idx === 2 ? "text-amber-700" : "text-slate-600")}>{idx + 1}</span>
                        <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-slate-200/5 dark:border-white/5">{team.logoUrl ? <img src={team.logoUrl} alt="" className="h-full w-full object-contain p-0.5" /> : <span className="text-[8px] text-slate-500">{team.name.substring(0, 2)}</span>}</div>
                        <span className="text-xs sm:text-sm font-medium text-slate-200 truncate max-w-[100px]">{team.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-500">{team.played}P</span>
                        <span className="font-bold text-slate-900 dark:text-white min-w-[24px] text-right">{team.points}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-slate-500 text-xs text-center py-4">No standings data.</div>}
            </div>
          </motion.div>

          {/* Top Scorers */}
          <motion.div variants={item} className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/5 dark:border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200/5 dark:border-white/5">
              <h3 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base"><Target size={16} className="text-brand-400" /> Top Scorers</h3>
              <Link to="/players" className="text-xs text-slate-500 hover:text-slate-600 dark:text-slate-300 font-medium flex items-center">All <ChevronRight size={14} /></Link>
            </div>
            <div className="p-3 sm:p-4 space-y-1">
              {topScorers.length > 0 ? topScorers.map((player, idx) => (
                <div key={player.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex-shrink-0">
                      <div className="h-9 w-9 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-bold border border-slate-200/10 dark:border-white/10 overflow-hidden text-slate-500 dark:text-slate-400 text-xs">
                        {player.photoUrl ? <img src={player.photoUrl} alt={player.name} className="h-full w-full object-cover" /> : player.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white dark:bg-slate-900 border border-slate-200/10 dark:border-white/10 flex items-center justify-center text-[9px] text-slate-500 font-bold">{idx + 1}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors truncate">{player.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{player.team}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-impact text-brand-500">{player.goals}</span>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Goals</span>
                  </div>
                </div>
              )) : <div className="text-slate-500 text-xs text-center py-4">No player stats available.</div>}
            </div>
          </motion.div>

          {/* Top Assists */}
          <motion.div variants={item} className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/5 dark:border-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200/5 dark:border-white/5">
              <h3 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-400">
                  <path d="M12 2v20"></path>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Top Assists
              </h3>
              <Link to="/players" className="text-xs text-slate-500 hover:text-slate-600 dark:text-slate-300 font-medium flex items-center">All <ChevronRight size={14} /></Link>
            </div>
            <div className="p-3 sm:p-4 space-y-1">
              {topAssists.length > 0 && topAssists[0].assists > 0 ? topAssists.filter(p => p.assists > 0).slice(0, 5).map((player, idx) => (
                <div key={player.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex-shrink-0">
                      <div className="h-9 w-9 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-bold border border-slate-200/10 dark:border-white/10 overflow-hidden text-slate-500 dark:text-slate-400 text-xs">
                        {player.photoUrl ? <img src={player.photoUrl} alt={player.name} className="h-full w-full object-cover" /> : player.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white dark:bg-slate-900 border border-slate-200/10 dark:border-white/10 flex items-center justify-center text-[9px] text-slate-500 font-bold">{idx + 1}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors truncate">{player.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{player.team}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-impact text-brand-500">{player.assists}</span>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Assists</span>
                  </div>
                </div>
              )) : <div className="text-slate-500 text-xs text-center py-4">No assist stats available.</div>}
            </div>
          </motion.div>

          {/* District Stats */}
          <motion.div variants={item} className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-brand-950/30 border border-slate-200/5 dark:border-white/5 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/5 dark:border-white/5">
              <h3 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base"><MapPinned size={16} className="text-brand-400" /> District Stats</h3>
            </div>
            <div className="p-3 sm:p-4 space-y-3.5">
              {districtStats.slice(0, 5).map(([district, data]) => (
                <div key={district} className="group">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{district}</span>
                    <span className="text-[10px] text-slate-500">{data.matches} matches</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-cyan-500 rounded-full group-hover:from-brand-400 group-hover:to-cyan-400 transition-all" style={{ width: `${Math.min(100, (data.matches / (districtStats[0]?.[1]?.matches || 1)) * 100)}%` }} />
                  </div>
                  <div className="flex gap-3 text-[10px] font-semibold text-slate-500 mt-1">{data.tournaments} Tourneys • {data.teams} Teams</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* This Week */}
          <motion.div variants={item} className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/5 dark:border-white/5 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/5 dark:border-white/5">
              <h3 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base"><Calendar size={16} className="text-indigo-400" /> This Week</h3>
            </div>
            <div className="p-3 sm:p-4 space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {weeklyFixtures.length > 0 ? weeklyFixtures.map(match => (
                <Link to={`/live/${match.id}`} key={match.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all group">
                  <div className="flex-shrink-0 w-9 text-center">
                    <div className="text-[9px] uppercase font-black text-indigo-400">{new Date(match.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-sm font-black text-slate-900 dark:text-white leading-tight">{new Date(match.date).getDate()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate">{match.teamA} vs {match.teamB}</div>
                    <div className="text-[10px] text-slate-500 truncate">{match.time || 'TBD'} • {match.competition}</div>
                  </div>
                  <ChevronRight size={12} className="text-slate-600 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                </Link>
              )) : <p className="text-slate-500 text-xs text-center py-4 italic">No fixtures this week</p>}
            </div>
          </motion.div>

        </div>
      </motion.div>

      {/* ═══ SPONSORS CAROUSEL ═══ */}
      <SponsorsCarousel />
    </div>
  );
};

export default Dashboard;
