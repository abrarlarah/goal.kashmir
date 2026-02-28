import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { MapPinned, Trophy, Users, ShieldAlert, Award, Search, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { Link } from 'react-router-dom';

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

  // Competitions
  const competitions = [{ id: 'All', name: 'All' }, ...filteredTournaments];

  const getProcessedStandings = () => {
    if (loading || teams.length === 0) return [];

    // Initialize stats map from teams
    const stats = {};
    // Initialize stats map ONLY for teams participating in the selected competition
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
          form: []
        };
      });

    // Filter Matches
    const filteredMatches = matches.filter(m => {
      if (selectedCompetitionId === 'All' || !selectedCompetitionId) return m.status === 'finished';
      const tourney = tournaments.find(t => t.id === selectedCompetitionId);
      if (!tourney) return false;
      return (m.tournamentId === selectedCompetitionId || (!m.tournamentId && m.competition === tourney.name)) && m.status === 'finished';
    });

    filteredMatches.forEach(match => {
      // Find teams by name (assuming names are unique keys in matches)
      const teamA = stats[match.teamA];
      const teamB = stats[match.teamB];

      if (!teamA || !teamB) return; // Team not found

      // Update Played
      teamA.played++;
      teamB.played++;

      // Update Goals
      const gA = Number(match.scoreA);
      const gB = Number(match.scoreB);

      teamA.goalsFor += gA;
      teamA.goalsAgainst += gB;
      teamB.goalsFor += gB;
      teamB.goalsAgainst += gA;

      // Update Result
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

    // Convert to array and sort
    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });
  };

  const tableData = getProcessedStandings();

  const topScorers = useMemo(() => {
    return (players || [])
      .filter(p => p.goals > 0)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 20);
  }, [players]);

  const topDisciplined = useMemo(() => {
    return (players || [])
      .filter(p => (p.yellowCards || 0) > 0 || (p.redCards || 0) > 0)
      .sort((a, b) => (b.redCards * 2 + b.yellowCards) - (a.redCards * 2 + a.yellowCards))
      .slice(0, 20);
  }, [players]);

  if (loading && teams.length === 0) return <div className="text-center text-slate-900 dark:text-white py-20">Loading Standings...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white mb-2">Leaderboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Comprehensive statistics and rankings.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedCompetitionId('All');
            }}
            className="bg-white dark:bg-dark-card/50 backdrop-blur-sm border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
          >
            <option value="All">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedCompetitionId('All');
              }}
              className="bg-white dark:bg-dark-card/50 backdrop-blur-sm border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
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
          </div>

          <select
            value={selectedCompetitionId}
            onChange={(e) => setSelectedCompetitionId(e.target.value)}
            className="bg-white dark:bg-dark-card/50 backdrop-blur-sm border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all max-w-[200px]"
          >
            {competitions.map(comp => (
              <option key={comp.id} value={comp.id}>{comp.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/5 backdrop-blur-md rounded-2xl w-fit border border-slate-200 dark:border-white/5">
        {[
          { id: 'table', label: 'League Table', icon: Trophy },
          { id: 'scorers', label: 'Top Scorers', icon: Award },
          { id: 'discipline', label: 'Disciplinary', icon: ShieldAlert }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === tab.id
                ? "bg-brand-500 text-slate-900 dark:text-white shadow-lg shadow-brand-500/20"
                : "text-slate-500 hover:text-slate-900 dark:text-white hover:bg-white/5"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'table' && (
        <div className="glass-card rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] uppercase font-black text-slate-500 tracking-widest">#</th>
                  <th className="px-6 py-4 text-left text-[10px] uppercase font-black text-slate-500 tracking-widest">Team</th>
                  <th className="px-3 py-4 text-center text-[10px] uppercase font-black text-slate-500 tracking-widest">P</th>
                  <th className="px-3 py-4 text-center text-[10px] uppercase font-black text-slate-500 tracking-widest">W</th>
                  <th className="px-3 py-4 text-center text-[10px] uppercase font-black text-slate-500 tracking-widest">D</th>
                  <th className="px-3 py-4 text-center text-[10px] uppercase font-black text-slate-500 tracking-widest">L</th>
                  <th className="px-3 py-4 text-center text-[10px] uppercase font-black text-slate-500 tracking-widest">GD</th>
                  <th className="px-6 py-4 text-center text-[10px] uppercase font-black text-slate-500 tracking-widest">PTS</th>
                  <th className="px-6 py-4 text-center text-[10px] uppercase font-black text-slate-500 tracking-widest">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tableData.map((team, index) => {
                  const gd = team.goalsFor - team.goalsAgainst;
                  return (
                    <tr key={team.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/teams/${team.id}`} className="flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                          <div className="w-8 h-8 rounded bg-brand-500/10 flex items-center justify-center text-[10px] font-bold text-brand-400 border border-brand-500/10">
                            {team.shortName}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors">{team.name}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-4 text-center text-slate-500 font-medium">{team.played}</td>
                      <td className="px-3 py-4 text-center text-slate-500 font-medium">{team.wins}</td>
                      <td className="px-3 py-4 text-center text-slate-500 font-medium">{team.draws}</td>
                      <td className="px-3 py-4 text-center text-slate-500 font-medium">{team.losses}</td>
                      <td className={`px-3 py-4 text-center font-bold ${gd > 0 ? 'text-green-500' : gd < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                        {gd > 0 ? '+' : ''}{gd}
                      </td>
                      <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white bg-brand-500/5">{team.points}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1">
                          {team.form.slice(-5).map((res, i) => (
                            <span key={i} className={cn(
                              "w-5 h-5 flex items-center justify-center rounded-md text-[9px] font-black",
                              res === 'W' ? 'bg-green-500/20 text-green-500' :
                                res === 'D' ? 'bg-yellow-500/20 text-yellow-500' :
                                  'bg-red-500/20 text-red-500'
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
              <div className="text-center py-20 text-slate-500 font-medium italic">
                No standings data available for this selection.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'scorers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topScorers.map((player, idx) => (
            <Link
              key={player.id}
              to={`/players/${player.id}`}
              className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex items-center gap-6 hover:border-brand-500/30 group transition-all shadow-xl"
            >
              <div className="relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-slate-900 dark:text-white font-black text-xs shadow-lg z-10">
                  {idx + 1}
                </div>
                <div className="w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden border border-white/5 group-hover:border-brand-500/30 transition-colors">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-700 uppercase">
                      {player.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-brand-400 transition-colors mb-1 truncate">{player.name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                  <ShieldAlert size={12} className="text-brand-500" />
                  {player.team}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-slate-900 dark:text-white">{player.goals}</div>
                <div className="text-[10px] text-brand-500 font-black uppercase tracking-tighter">Goals</div>
              </div>
            </Link>
          ))}
          {topScorers.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-500 font-medium italic">
              No goal records found yet.
            </div>
          )}
        </div>
      )}

      {activeTab === 'discipline' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topDisciplined.map((player, idx) => (
            <Link
              key={player.id}
              to={`/players/${player.id}`}
              className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex items-center gap-6 hover:border-brand-500/30 group transition-all shadow-xl"
            >
              <div className="relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 font-black text-xs shadow-lg z-10 border border-white/10">
                  {idx + 1}
                </div>
                <div className="w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden border border-white/5 group-hover:border-brand-500/30 transition-colors">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-700 uppercase">
                      {player.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-brand-400 transition-colors mb-1 truncate">{player.name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                  {player.team}
                </div>
              </div>
              <div className="flex gap-4">
                {player.yellowCards > 0 && (
                  <div className="text-center">
                    <div className="w-4 h-6 bg-yellow-400 rounded-sm mx-auto mb-1 shadow-sm" />
                    <div className="text-sm font-black text-slate-900 dark:text-white">{player.yellowCards}</div>
                  </div>
                )}
                {player.redCards > 0 && (
                  <div className="text-center">
                    <div className="w-4 h-6 bg-red-600 rounded-sm mx-auto mb-1 shadow-sm" />
                    <div className="text-sm font-black text-slate-900 dark:text-white">{player.redCards}</div>
                  </div>
                )}
              </div>
            </Link>
          ))}
          {topDisciplined.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-500 font-medium italic">
              No disciplinary records found yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
