import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { calculateStandings } from '../utils/soccerUtils';
import LineupDisplay from '../components/common/LineupDisplay';

const Dashboard = () => {
  const { matches, players, teams, tournaments, lineups, loading } = useData();
  const [dashboardCompetition, setDashboardCompetition] = useState('');
  const [expandedMatch, setExpandedMatch] = useState(null);

  // Automatically select the first tournament when data loads
  React.useEffect(() => {
    if ((!dashboardCompetition || dashboardCompetition === 'All') && tournaments.length > 0) {
      setDashboardCompetition('All'); // Default to showing all
    }
  }, [tournaments, dashboardCompetition]);

  // Filter Matches based on tournament
  const filteredMatches = dashboardCompetition && dashboardCompetition !== 'All'
    ? matches.filter(m => m.competition === dashboardCompetition)
    : matches;

  // Find teams participating in the selected tournament
  const relevantTeamNames = dashboardCompetition && dashboardCompetition !== 'All'
    ? teams.filter(team => {
      const teamTournaments = Array.isArray(team.tournaments)
        ? team.tournaments
        : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
      return teamTournaments.includes(dashboardCompetition);
    }).map(t => t.name)
    : null;

  // Filter players based on relevant teams
  const filteredPlayers = relevantTeamNames
    ? players.filter(p => relevantTeamNames.includes(p.team))
    : players;

  // Filter data directly from context
  const liveMatches = filteredMatches.filter(m => m.status === 'live');
  const upcomingMatches = filteredMatches.filter(m => m.status === 'scheduled');
  const finishedMatches = filteredMatches.filter(m => m.status === 'finished').slice(0, 10);

  // Top Scorers Logic
  const topScorers = [...filteredPlayers]
    .sort((a, b) => (b.goals || 0) - (a.goals || 0))
    .slice(0, 5);

  // Top Assisters Logic
  const topAssisters = [...filteredPlayers]
    .sort((a, b) => (b.assists || 0) - (a.assists || 0))
    .slice(0, 5);

  // Calculate Standings for Dashboard
  const standings = (dashboardCompetition && dashboardCompetition !== 'All') ? calculateStandings(teams, matches, dashboardCompetition) : [];
  const topTeams = standings.slice(0, 5);

  // Get lineups for a match
  const getMatchLineups = (matchId) => {
    return lineups.filter(l => l.matchId === matchId);
  };

  // Helper to get team details (Stadium, Manager) as fallback
  const getTeamInfo = (teamName) => {
    return teams.find(t => t.name === teamName) || {};
  };

  if (loading && matches.length === 0) {
    return <div className="text-center text-white py-20">Loading Dashboard...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 text-white">
      {/* Global Tournament Filter */}
      <div className="mb-8 bg-gray-800 p-4 rounded-lg shadow-lg border-l-4 border-green-500">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 font-medium">Tournament Filter:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDashboardCompetition('All')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-md ${dashboardCompetition === 'All'
                  ? 'bg-green-600 text-white scale-105'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                All
              </button>
              {tournaments.map(t => (
                <button
                  key={t.id}
                  onClick={() => setDashboardCompetition(t.name)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-md ${dashboardCompetition === t.name
                    ? 'bg-green-600 text-white scale-105'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm font-medium">
            <span className="text-gray-400">Viewing: </span>
            <span className="text-green-400">
              {dashboardCompetition === 'All' ? 'Everything' : dashboardCompetition}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Live Matches */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
            Live Matches
          </h2>
          <div className="space-y-4">
            {liveMatches.map(match => {
              const matchLineups = getMatchLineups(match.id);
              const isExpanded = expandedMatch === match.id;

              return (
                <div key={match.id} className="bg-gray-700 rounded">
                  <div className="p-3 flex justify-between items-center">
                    <div className="flex-1">
                      <div className="text-sm text-gray-300">{match.competition}</div>
                      <div className="font-bold">{match.teamA} vs {match.teamB}</div>
                      {(match.date || match.time || match.managerA || match.managerB || getTeamInfo(match.teamA).stadium) && (
                        <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                          {(match.date || match.time) && (
                            <div className="flex items-center gap-1">
                              <span>📅 {match.date && new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              {match.date && match.time && ' • '}
                              <span>{match.time}</span>
                            </div>
                          )}
                          <div className="flex flex-col gap-0.5">
                            {(match.managerA || getTeamInfo(match.teamA).manager) && (
                              <div className="italic text-blue-400">
                                Mgrs: {match.managerA || getTeamInfo(match.teamA).manager} vs {match.managerB || getTeamInfo(match.teamB).manager || 'N/A'}
                              </div>
                            )}
                            {(match.stadium || getTeamInfo(match.teamA).stadium) && (
                              <div className="text-gray-500 flex items-center gap-1">
                                <span>🏟️ {match.stadium || getTeamInfo(match.teamA).stadium}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-bold text-green-400 mr-2">
                      {match.scoreA} - {match.scoreB}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link to={`/live/${match.id}`} className="flex items-center justify-center gap-1 text-xs bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-full font-semibold transition-all shadow-md">
                        <span>WATCH</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </Link>
                      {matchLineups.length > 0 && (
                        <button
                          onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                          className="flex items-center justify-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-full font-semibold transition-all shadow-md"
                        >
                          <span>{isExpanded ? 'HIDE' : 'LINEUP'}</span>
                          <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Lineup View */}
                  {isExpanded && matchLineups.length > 0 && (
                    <div className="p-3 border-t border-gray-600">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matchLineups.map(lineup => (
                          <div key={lineup.id}>
                            <h4 className="text-sm font-semibold mb-2 text-center">{lineup.teamName}</h4>
                            <LineupDisplay lineup={lineup} players={players} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {liveMatches.length === 0 && <div className="text-gray-400 text-sm">No live matches currently.</div>}
          </div>
        </div>

        {/* Upcoming Matches */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-blue-400">Upcoming Matches</h2>
          <div className="max-h-[280px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            <div className="space-y-3">
              {upcomingMatches.map(match => (
                <div key={match.id} className="bg-gray-700 p-4 rounded flex justify-between items-center border border-transparent hover:border-blue-500 transition-all">
                  <div>
                    <div className="text-sm text-gray-300">{match.competition}</div>
                    <div className="font-bold text-white mb-1">{match.teamA} vs {match.teamB}</div>
                    <div className="text-[10px] text-gray-400 space-y-0.5">
                      {(match.date || match.time) && (
                        <div>
                          {match.date && new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {match.date && match.time && ' • '}
                          {match.time}
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5 italic mt-1">
                        {(match.managerA || getTeamInfo(match.teamA).manager) && (
                          <div className="text-blue-400">
                            Mgrs: {match.managerA || getTeamInfo(match.teamA).manager} / {match.managerB || getTeamInfo(match.teamB).manager || '?'}
                          </div>
                        )}
                        {(match.stadium || getTeamInfo(match.teamA).stadium) && (
                          <div className="text-gray-500">
                            🏟️ {match.stadium || getTeamInfo(match.teamA).stadium}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <Link to={`/live/${match.id}`} className="flex items-center gap-1 text-[10px] text-gray-300 hover:text-white bg-gray-600 hover:bg-gray-500 px-2.5 py-1 rounded-full transition-all">
                      <span>Details</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {upcomingMatches.length === 0 && <div className="text-gray-400 text-sm w-full text-center py-4">No upcoming matches scheduled.</div>}
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">Recent Results</h2>
          <div className="max-h-[310px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            <div className="space-y-3">
              {finishedMatches.map(match => (
                <div key={match.id} className="bg-gray-700 p-4 rounded border border-transparent hover:border-gray-500 transition-all">
                  <div className="text-[10px] text-gray-400 mb-1 flex justify-between">
                    <span>{match.competition}</span>
                    <span>{match.date && new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-white">{match.teamA}</span>
                    <span className={`font-bold ${match.scoreA > match.scoreB ? 'text-green-400' : 'text-gray-400'}`}>
                      {match.scoreA}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-white">{match.teamB}</span>
                    <span className={`font-bold ${match.scoreB > match.scoreA ? 'text-green-400' : 'text-gray-400'}`}>
                      {match.scoreB}
                    </span>
                  </div>
                  {(match.managerA || getTeamInfo(match.teamA).manager || match.stadium || getTeamInfo(match.teamA).stadium) && (
                    <div className="text-[9px] text-gray-500 italic mb-2 px-1 flex flex-col gap-0.5">
                      {(match.managerA || getTeamInfo(match.teamA).manager) && (
                        <div>Mgrs: {match.managerA || getTeamInfo(match.teamA).manager} vs {match.managerB || getTeamInfo(match.teamB).manager || 'N/A'}</div>
                      )}
                      {(match.stadium || getTeamInfo(match.teamA).stadium) && (
                        <div className="not-italic opacity-70">🏟️ {match.stadium || getTeamInfo(match.teamA).stadium}</div>
                      )}
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-600 flex justify-center">
                    <Link
                      to={`/live/${match.id}`}
                      className="text-[10px] font-bold text-gray-400 hover:text-white transition-colors"
                    >
                      MATCH REPORT
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {finishedMatches.length === 0 && (
              <div className="text-gray-400 text-sm w-full text-center py-4">No recent results available.</div>
            )}
          </div>
        </div>

        {/* Top Scorers */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>⚽</span> Top Scorers
          </h2>
          <ol className="space-y-2">
            {topScorers.map((player, index) => (
              <li key={player.id} className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="flex items-center">
                  <span className="font-bold mr-2 text-gray-400">{index + 1}.</span>
                  <span className="text-sm">{player.name}</span> <span className="text-[10px] text-gray-500 ml-1">({player.team})</span>
                </span>
                <span className="font-bold text-yellow-500 text-sm">{player.goals || 0} Goals</span>
              </li>
            ))}
            {topScorers.length === 0 && <div className="text-gray-400 text-sm">No goal data available.</div>}
          </ol>
        </div>

        {/* Top Assists */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>🎯</span> Top Assists
          </h2>
          <ol className="space-y-2">
            {topAssisters.map((player, index) => (
              <li key={player.id} className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="flex items-center">
                  <span className="font-bold mr-2 text-gray-400">{index + 1}.</span>
                  <span className="text-sm">{player.name}</span> <span className="text-[10px] text-gray-500 ml-1">({player.team})</span>
                </span>
                <span className="font-bold text-blue-400 text-sm">{player.assists || 0} Assists</span>
              </li>
            ))}
            {topAssisters.length === 0 && <div className="text-gray-400 text-sm">No assist data available.</div>}
          </ol>
        </div>

        {/* Leaderboard Preview */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg col-span-full md:col-span-1 min-w-full lg:col-span-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-xl font-bold">Leaderboard</h2>
            </div>
            <Link to="/leaderboard" className="text-sm text-green-400 hover:text-green-300">View Full</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-400 border-b border-gray-700 uppercase text-xs">
                <tr>
                  <th className="py-2 px-2" title="Position">Pos</th>
                  <th className="py-2 px-2" title="Team Name">Team</th>
                  <th className="py-2 px-2 text-center" title="Played">P</th>
                  <th className="py-2 px-2 text-center" title="Won">W</th>
                  <th className="py-2 px-2 text-center" title="Drawn">D</th>
                  <th className="py-2 px-2 text-center" title="Lost">L</th>
                  <th className="py-2 px-2 text-center" title="Goal Difference">GD</th>
                  <th className="py-2 px-2 text-center font-bold text-white" title="Points">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {topTeams.map((team, index) => {
                  const gd = team.goalsFor - team.goalsAgainst;
                  return (
                    <tr key={team.id} className="hover:bg-gray-700 transition-colors">
                      <td className="py-3 px-2 text-gray-400">{index + 1}</td>
                      <td className="py-3 px-2 font-medium">{team.name}</td>
                      <td className="py-3 px-2 text-center text-gray-300">{team.played}</td>
                      <td className="py-3 px-2 text-center text-gray-300">{team.wins}</td>
                      <td className="py-3 px-2 text-center text-gray-300">{team.draws}</td>
                      <td className="py-3 px-2 text-center text-gray-300">{team.losses}</td>
                      <td className={`py-3 px-2 text-center ${gd > 0 ? 'text-green-400' : gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {gd > 0 ? '+' : ''}{gd}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-yellow-400">{team.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {dashboardCompetition === 'All' ? (
              <div className="text-gray-400 text-center py-10">
                <p>Select a specific tournament above to view its standings.</p>
              </div>
            ) : topTeams.length === 0 && (
              <div className="text-gray-400 text-center py-6 text-sm">No standings available yet for {dashboardCompetition}.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
