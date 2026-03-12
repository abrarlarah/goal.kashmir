import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { MapPinned, Trophy, Users, ShieldAlert, Award, Search, ChevronRight, Target, Handshake, ShieldCheck, Flame, TrendingUp, Zap, Medal } from 'lucide-react';
import { cn } from '../utils/cn';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Districts of Jammu and Kashmir
const DISTRICTS = {
  JAMMU: ['Jammu', 'Samba', 'Kathua', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar'],
  KASHMIR: ['Srinagar', 'Ganderbal', 'Budgam', 'Baramulla', 'Bandipora', 'Kupwara', 'Pulwama', 'Shopian', 'Kulgam', 'Anantnag']
};

const Leaderboard = () => {
  const { teams, matches, tournaments, loading, players } = useData();
  const [activeTab, setActiveTab] = useState('table');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('Baramulla');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [playerSearch, setPlayerSearch] = useState('');

  // Filter tournaments by district and year
  const availableYears = useMemo(() => {
    const years = tournaments
      .map(t => t.startDate ? new Date(t.startDate).getFullYear().toString() : null)
      .filter(Boolean);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    let ts = tournaments;
    if (selectedDistrict !== 'All') {
      ts = ts.filter(t => t.district === selectedDistrict);
    }
    if (selectedYear !== 'All') {
      ts = ts.filter(t => t.startDate && new Date(t.startDate).getFullYear().toString() === selectedYear);
    }
    return ts;
  }, [tournaments, selectedDistrict, selectedYear]);

  // Handle default tournament selection
  useEffect(() => {
    if (filteredTournaments.length > 0) {
      if (selectedCompetitionId === 'All' || !filteredTournaments.find(t => t.id === selectedCompetitionId)) {
        setSelectedCompetitionId(filteredTournaments[0].id);
      }
    } else {
      setSelectedCompetitionId('All');
    }
  }, [filteredTournaments]);

  // Competitions
  const competitions = [{ id: 'All', name: 'All' }, ...filteredTournaments];

  const getProcessedStandings = () => {
    if (loading || teams.length === 0) return [];

    const stats = {};
    teams
      .filter(team => {
        if (selectedCompetitionId === 'All') return true;
        const tourney = tournaments.find(t => t.id === selectedCompetitionId);
        if (!tourney) return false;
        const teamTournaments = Array.isArray(team.tournaments)
          ? team.tournaments
          : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
        return teamTournaments.includes(tourney.name);
      })
      .forEach(team => {
        stats[team.name] = {
          id: team.id,
          name: team.name,
          shortName: team.shortName || team.name.substring(0, 3).toUpperCase(),
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
          form: [],
          cleanSheets: 0
        };
      });

    const filteredMatches = matches.filter(m => {
      if (selectedCompetitionId === 'All' || !selectedCompetitionId) return m.status === 'finished';
      const tourney = tournaments.find(t => t.id === selectedCompetitionId);
      if (!tourney) return false;
      return (m.tournamentId === selectedCompetitionId || (!m.tournamentId && m.competition === tourney.name)) && m.status === 'finished';
    });

    filteredMatches.forEach(match => {
      const teamA = stats[match.teamA];
      const teamB = stats[match.teamB];

      if (!teamA || !teamB) return;

      teamA.played++;
      teamB.played++;

      const gA = Number(match.scoreA);
      const gB = Number(match.scoreB);

      teamA.goalsFor += gA;
      teamA.goalsAgainst += gB;
      teamB.goalsFor += gB;
      teamB.goalsAgainst += gA;

      // Track clean sheets
      if (gB === 0) teamA.cleanSheets++;
      if (gA === 0) teamB.cleanSheets++;

      if (gA > gB) {
        teamA.wins++;
        teamA.points += 3;
        teamB.losses++;
        teamA.form.push('W');
        teamB.form.push('L');
      } else if (gA < gB) {
        teamB.wins++;
        teamB.points += 3;
        teamA.losses++;
        teamB.form.push('W');
        teamA.form.push('L');
      } else {
        teamA.draws++;
        teamB.draws++;
        teamA.points += 1;
        teamB.points += 1;
        teamA.form.push('D');
        teamB.form.push('D');
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });
  };

  const tableData = getProcessedStandings();

  // ═══ SEASON STATS ═══
  const topScorers = useMemo(() => {
    return (players || [])
      .filter(p => p.goals > 0)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 20);
  }, [players]);

  const topAssists = useMemo(() => {
    return (players || [])
      .filter(p => (p.assists || 0) > 0)
      .sort((a, b) => (b.assists || 0) - (a.assists || 0))
      .slice(0, 20);
  }, [players]);

  const topDisciplined = useMemo(() => {
    return (players || [])
      .filter(p => (p.yellowCards || 0) > 0 || (p.redCards || 0) > 0)
      .sort((a, b) => (b.redCards * 2 + b.yellowCards) - (a.redCards * 2 + a.yellowCards))
      .slice(0, 20);
  }, [players]);

  const cleanSheetTeams = useMemo(() => {
    return tableData
      .filter(t => t.cleanSheets > 0)
      .sort((a, b) => b.cleanSheets - a.cleanSheets);
  }, [tableData]);

  // Summary stats
  const seasonSummary = useMemo(() => {
    const finishedMatches = matches.filter(m => m.status === 'finished');
    const totalGoals = finishedMatches.reduce((sum, m) => sum + (Number(m.scoreA) || 0) + (Number(m.scoreB) || 0), 0);
    const totalMatches = finishedMatches.length;
    const avgGoals = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : '0.0';

    return {
      totalMatches,
      totalGoals,
      avgGoals,
      totalPlayers: (players || []).length,
      totalTeams: (teams || []).length
    };
  }, [matches, players, teams]);

  if (loading && teams.length === 0) return <div className="text-center text-slate-900 dark:text-white py-20">Loading Standings...</div>;

  // Player card component for reuse
  const PlayerCard = ({ player, idx, statValue, statLabel, statColor, icon: Icon }) => (
    <Link
      key={player.id}
      to={`/players/${player.id}`}
      className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 block bg-gradient-to-br from-[#0f172a] via-[#1e1b4b]/80 to-[#0f172a] ring-1 ring-white/5"
    >
      <div className="relative z-10 p-5 flex items-center gap-4">
        {/* Rank */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border",
          idx < 3
            ? "bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-300 border-amber-500/30 shadow-sm shadow-amber-500/10"
            : "bg-white/5 text-slate-500 border-white/5"
        )}>
          {idx + 1}
        </div>

        {/* Player photo */}
        <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden border border-white/10 group-hover:border-brand-500/30 transition-colors shrink-0">
          {player.photoUrl ? (
            <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-black text-white/30">
              {player.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-white text-sm group-hover:text-brand-400 transition-colors truncate">{player.name}</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">{player.team}</p>
        </div>

        {/* Stat */}
        <div className="text-center shrink-0">
          <div className={cn("text-2xl font-black", statColor)}>{statValue}</div>
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{statLabel}</div>
        </div>
      </div>

      {/* Top 3 glow */}
      {idx < 3 && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.03] to-transparent pointer-events-none"></div>
      )}
    </Link>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ═══ HERO HEADER ═══ */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent"></div>

        <div className="relative z-10 p-4 sm:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold mb-3">
                <TrendingUp size={12} /> Season Statistics
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-1">
                Stats <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Dashboard</span>
              </h1>
              <p className="text-slate-500 text-sm">Comprehensive rankings, statistics and season records.</p>
            </div>
            <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedCompetitionId('All');
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs md:text-sm font-medium text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all flex-shrink-0"
              >
                <option value="All">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedCompetitionId('All');
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs md:text-sm font-medium text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all flex-shrink-0"
              >
                <option value="All">All Districts</option>
                <optgroup label="Jammu Division">
                  {DISTRICTS.JAMMU.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </optgroup>
                <optgroup label="Kashmir Division">
                  {DISTRICTS.KASHMIR.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </optgroup>
              </select>

              <select
                value={selectedCompetitionId}
                onChange={(e) => setSelectedCompetitionId(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs md:text-sm font-medium text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all flex-shrink-0 min-w-[140px] max-w-[180px] md:max-w-none"
              >
                {competitions.map(comp => (
                  <option key={comp.id} value={comp.id}>{comp.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ═══ SEASON SUMMARY CARDS ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            {[
              { label: 'Matches', value: seasonSummary.totalMatches, icon: Zap, color: 'from-violet-500/20 to-violet-500/5', textColor: 'text-violet-300', borderColor: 'border-violet-500/20' },
              { label: 'Goals', value: seasonSummary.totalGoals, icon: Target, color: 'from-emerald-500/20 to-emerald-500/5', textColor: 'text-emerald-300', borderColor: 'border-emerald-500/20' },
              { label: 'Avg/Match', value: seasonSummary.avgGoals, icon: Flame, color: 'from-orange-500/20 to-orange-500/5', textColor: 'text-orange-300', borderColor: 'border-orange-500/20' },
              { label: 'Players', value: seasonSummary.totalPlayers, icon: Users, color: 'from-cyan-500/20 to-cyan-500/5', textColor: 'text-cyan-300', borderColor: 'border-cyan-500/20' },
              { label: 'Teams', value: seasonSummary.totalTeams, icon: ShieldCheck, color: 'from-fuchsia-500/20 to-fuchsia-500/5', textColor: 'text-fuchsia-300', borderColor: 'border-fuchsia-500/20' }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "rounded-xl p-4 bg-gradient-to-br border backdrop-blur-sm",
                  stat.color, stat.borderColor
                )}
              >
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <stat.icon size={14} className={stat.textColor} />
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stat.label}</span>
                </div>
                <div className={cn("text-xl sm:text-2xl lg:text-3xl font-black", stat.textColor)}>{stat.value}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="relative">
        <div className="flex flex-wrap sm:flex-nowrap gap-1.5 p-1.5 bg-gradient-to-r from-[#0f172a] to-[#1e1b4b] rounded-2xl border border-white/5 sm:overflow-x-auto scrollbar-none">
          {[
          { id: 'table', label: 'League Table', icon: Trophy },
          { id: 'scorers', label: 'Top Scorers', icon: Target },
          { id: 'assists', label: 'Top Assists', icon: Handshake },
          { id: 'discipline', label: 'Cards', icon: ShieldAlert },
          { id: 'cleansheets', label: 'Clean Sheets', icon: ShieldCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 justify-center sm:flex-none sm:justify-start flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-xs font-black transition-all whitespace-nowrap min-w-[calc(33.33%-4px)] sm:min-w-0 uppercase tracking-wider",
              activeTab === tab.id
                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20"
                : "text-slate-500 hover:text-white hover:bg-white/5"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
        </div>
      </div>

      {/* ═══ LEAGUE TABLE ═══ */}
      {activeTab === 'table' && (
        <div className="rounded-2xl overflow-hidden ring-1 ring-white/5 shadow-2xl bg-gradient-to-br from-[#0f172a] to-[#020617]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5">
                <tr>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-[9px] sm:text-[10px] uppercase font-black text-violet-300/60 tracking-widest">#</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-[9px] sm:text-[10px] uppercase font-black text-violet-300/60 tracking-widest min-w-[120px]">Team</th>
                  <th className="px-2 sm:px-3 py-3 sm:py-4 text-center text-[9px] sm:text-[10px] uppercase font-black text-violet-300/60 tracking-widest">P</th>
                  <th className="px-2 sm:px-3 py-3 sm:py-4 text-center text-[9px] sm:text-[10px] uppercase font-black text-violet-300/60 tracking-widest">W</th>
                  <th className="px-2 sm:px-3 py-3 sm:py-4 text-center text-[9px] sm:text-[10px] uppercase font-black text-violet-300/60 tracking-widest">D</th>
                  <th className="px-2 sm:px-3 py-3 sm:py-4 text-center text-[9px] sm:text-[10px] uppercase font-black text-violet-300/60 tracking-widest">L</th>
                  <th className="px-2 sm:px-3 py-3 sm:py-4 text-center text-[9px] sm:text-[10px] uppercase font-black text-violet-300/60 tracking-widest">GD</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-[9px] sm:text-[10px] uppercase font-black text-violet-300/60 tracking-widest">PTS</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-[9px] sm:text-[10px] uppercase font-black text-violet-300/60 tracking-widest min-w-[100px]">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-gradient-to-br from-[#0f172a] to-[#020617]">
                {tableData.map((team, index) => {
                  const gd = team.goalsFor - team.goalsAgainst;
                  return (
                    <tr key={team.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-black text-slate-500">{index + 1}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <Link to={`/teams/${team.id}`} className="flex items-center gap-2 sm:gap-3 group-hover:translate-x-1 transition-transform">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-violet-300 border border-violet-500/20">
                            {team.shortName}
                          </div>
                          <span className="font-bold text-sm sm:text-base text-white group-hover:text-violet-300 transition-colors truncate max-w-[120px] sm:max-w-[200px]">{team.name}</span>
                        </Link>
                      </td>
                      <td className="px-2 sm:px-3 py-3 sm:py-4 text-center text-xs sm:text-sm text-slate-400 font-medium">{team.played}</td>
                      <td className="px-2 sm:px-3 py-3 sm:py-4 text-center text-xs sm:text-sm text-emerald-400 font-bold">{team.wins}</td>
                      <td className="px-2 sm:px-3 py-3 sm:py-4 text-center text-xs sm:text-sm text-slate-400 font-medium">{team.draws}</td>
                      <td className="px-2 sm:px-3 py-3 sm:py-4 text-center text-xs sm:text-sm text-red-400 font-medium">{team.losses}</td>
                      <td className={`px-2 sm:px-3 py-3 sm:py-4 text-center text-xs sm:text-sm font-bold ${gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                        {gd > 0 ? '+' : ''}{gd}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                        <span className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300">{team.points}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex justify-center gap-1">
                          {team.form.slice(-5).map((res, i) => (
                            <span key={i} className={cn(
                              "w-5 h-5 flex items-center justify-center rounded-md text-[9px] font-black",
                              res === 'W' ? 'bg-emerald-500/20 text-emerald-400' :
                                res === 'D' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                            )}>
                              {res}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tableData.length === 0 && (
              <div className="text-center py-20 text-slate-500 font-medium italic bg-[#0f172a]">
                No standings data available for this selection.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TOP SCORERS ═══ */}
      {activeTab === 'scorers' && (
        <div className="space-y-3">
          {topScorers.length > 0 ? (
            <>
              {/* Top 3 Podium */}
              {topScorers.length >= 3 && (
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 mb-6">
                  {/* On mobile, show 1st place first, then 2nd, then 3rd. On desktop, keep 2-1-3 layout */}
                  <div className="hidden sm:contents">
                    {[topScorers[1], topScorers[0], topScorers[2]].map((player, podiumIdx) => {
                      const rank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
                      const isGold = rank === 1;
                      return (
                        <Link
                          key={player.id}
                          to={`/players/${player.id}`}
                          className={cn(
                            "relative rounded-2xl overflow-hidden text-center group transition-all duration-300 hover:-translate-y-1 block",
                            isGold ? "ring-2 ring-amber-400/30 sm:-mt-4" : "ring-1 ring-white/5"
                          )}
                        >
                          <div className={cn(
                            "absolute inset-0 z-0",
                            isGold
                              ? "bg-gradient-to-b from-amber-500/10 via-[#1e1b4b]/80 to-[#0f172a]"
                              : "bg-gradient-to-b from-violet-500/5 via-[#1e1b4b]/80 to-[#0f172a]"
                          )}></div>
                          <div className="relative z-10 p-4 sm:p-5 pt-5 sm:pt-6">
                            <div className={cn(
                              "w-8 h-8 rounded-full mx-auto mb-3 flex items-center justify-center font-black text-sm shadow-lg",
                              rank === 1 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-900 shadow-amber-500/20" :
                              rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900 shadow-white/10" :
                              "bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-orange-500/10"
                            )}>
                              {rank}
                            </div>
                            <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto rounded-2xl bg-white/5 overflow-hidden border border-white/10 mb-3 group-hover:border-amber-400/30 transition-colors">
                              {player.photoUrl ? (
                                <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white/20">{player.name.charAt(0)}</div>
                              )}
                            </div>
                            <h4 className="font-black text-white text-xs sm:text-sm truncate group-hover:text-amber-300 transition-colors px-2">{player.name}</h4>
                            <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase mb-2 sm:mb-3 truncate px-2">{player.team}</p>
                            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">{player.goals}</div>
                            <p className="text-[8px] sm:text-[9px] text-emerald-400/60 font-bold uppercase tracking-widest">Goals</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Mobile linear layout */}
                  <div className="sm:hidden space-y-3 contents">
                    {[topScorers[0], topScorers[1], topScorers[2]].map((player, podiumIdx) => {
                      const rank = podiumIdx + 1;
                      const isGold = rank === 1;
                      return (
                        <Link
                          key={player.id}
                          to={`/players/${player.id}`}
                          className={cn(
                            "relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 block",
                            isGold ? "ring-2 ring-amber-400/30" : "ring-1 ring-white/5"
                          )}
                        >
                          <div className={cn(
                            "absolute inset-0 z-0",
                            isGold
                              ? "bg-gradient-to-br from-amber-500/10 via-[#1e1b4b]/80 to-[#0f172a]"
                              : "bg-gradient-to-br from-violet-500/5 via-[#1e1b4b]/80 to-[#0f172a]"
                          )}></div>
                          <div className="relative z-10 p-4 flex items-center gap-4">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-lg shrink-0",
                              rank === 1 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-900 shadow-amber-500/20" :
                              rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900 shadow-white/10" :
                              "bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-orange-500/10"
                            )}>
                              {rank}
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden border border-white/10 shrink-0">
                              {player.photoUrl ? (
                                <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg font-black text-white/20">{player.name.charAt(0)}</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-white text-sm truncate group-hover:text-amber-300 transition-colors">{player.name}</h4>
                              <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{player.team}</p>
                            </div>
                            <div className="text-center shrink-0">
                              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">{player.goals}</div>
                              <p className="text-[8px] text-emerald-400/60 font-bold uppercase tracking-widest">Goals</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              {topScorers.slice(3).map((player, idx) => (
                <PlayerCard key={player.id} player={player} idx={idx + 3} statValue={player.goals} statLabel="Goals" statColor="text-emerald-300" icon={Target} />
              ))}
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 font-medium italic rounded-2xl bg-[#0f172a] border border-dashed border-white/10">
              No goal records found yet.
            </div>
          )}
        </div>
      )}

      {/* ═══ TOP ASSISTS ═══ */}
      {activeTab === 'assists' && (
        <div className="space-y-3">
          {topAssists.length > 0 ? (
            topAssists.map((player, idx) => (
              <PlayerCard key={player.id} player={player} idx={idx} statValue={player.assists || 0} statLabel="Assists" statColor="text-cyan-300" icon={Handshake} />
            ))
          ) : (
            <div className="text-center py-20 text-slate-500 font-medium italic rounded-2xl bg-[#0f172a] border border-dashed border-white/10">
              No assist records found yet.
            </div>
          )}
        </div>
      )}

      {/* ═══ DISCIPLINARY ═══ */}
      {activeTab === 'discipline' && (
        <div className="space-y-3">
          {topDisciplined.length > 0 ? (
            topDisciplined.map((player, idx) => (
              <Link
                key={player.id}
                to={`/players/${player.id}`}
                className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 block"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b]/80 to-[#0f172a] ring-1 ring-white/5"></div>
                <div className="relative z-10 p-5 flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border",
                    "bg-white/5 text-slate-500 border-white/5"
                  )}>
                    {idx + 1}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden border border-white/10 group-hover:border-brand-500/30 transition-colors shrink-0">
                    {player.photoUrl ? (
                      <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-black text-white/30">
                        {player.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-white text-sm group-hover:text-brand-400 transition-colors truncate">{player.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">{player.team}</p>
                  </div>
                  <div className="flex gap-4 shrink-0">
                    {(player.yellowCards || 0) > 0 && (
                      <div className="text-center">
                        <div className="w-5 h-7 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-sm mx-auto mb-1 shadow-sm shadow-yellow-500/20" />
                        <div className="text-sm font-black text-yellow-300">{player.yellowCards}</div>
                      </div>
                    )}
                    {(player.redCards || 0) > 0 && (
                      <div className="text-center">
                        <div className="w-5 h-7 bg-gradient-to-b from-red-400 to-red-600 rounded-sm mx-auto mb-1 shadow-sm shadow-red-500/20" />
                        <div className="text-sm font-black text-red-300">{player.redCards}</div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-20 text-slate-500 font-medium italic rounded-2xl bg-[#0f172a] border border-dashed border-white/10">
              No disciplinary records found yet.
            </div>
          )}
        </div>
      )}

      {/* ═══ CLEAN SHEETS ═══ */}
      {activeTab === 'cleansheets' && (
        <div className="space-y-3">
          {cleanSheetTeams.length > 0 ? (
            cleanSheetTeams.map((team, idx) => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 block"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b]/80 to-[#0f172a] ring-1 ring-white/5"></div>
                <div className="relative z-10 p-5 flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border",
                    idx < 3
                      ? "bg-gradient-to-br from-emerald-400/20 to-cyan-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-white/5 text-slate-500 border-white/5"
                  )}>
                    {idx + 1}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-white text-sm group-hover:text-emerald-300 transition-colors truncate">{team.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {team.played} matches played • {team.goalsAgainst} goals conceded
                    </p>
                  </div>
                  <div className="text-center shrink-0">
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">{team.cleanSheets}</div>
                    <div className="text-[9px] text-emerald-400/60 font-bold uppercase tracking-wider">Clean Sheets</div>
                  </div>
                </div>
                {idx < 3 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.03] to-transparent pointer-events-none"></div>
                )}
              </Link>
            ))
          ) : (
            <div className="text-center py-20 text-slate-500 font-medium italic rounded-2xl bg-[#0f172a] border border-dashed border-white/10">
              No clean sheet records for this tournament yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
