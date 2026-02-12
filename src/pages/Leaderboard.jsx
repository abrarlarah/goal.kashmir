import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const Leaderboard = () => {
  const { teams, matches, tournaments, loading } = useData();
  const [selectedCompetition, setSelectedCompetition] = useState('All');

  // Competitions
  const competitions = ['All', ...tournaments.map(t => t.name)];

  const getProcessedStandings = () => {
    if (loading || teams.length === 0) return [];

    // Initialize stats map from teams
    const stats = {};
    // Initialize stats map ONLY for teams participating in the selected competition
    teams
      .filter(team => {
        if (selectedCompetition === 'All') return true;
        const teamTournaments = Array.isArray(team.tournaments)
          ? team.tournaments
          : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
        return teamTournaments.includes(selectedCompetition);
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
    const filteredMatches = matches.filter(m =>
      (selectedCompetition === 'All' || !selectedCompetition || m.competition === selectedCompetition) &&
      (m.status === 'finished')
    );

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

  if (loading && teams.length === 0) return <div className="text-center text-white py-20">Loading Standings...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-6">Leaderboard</h1>

        {/* Competition Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {competitions.length > 1 && competitions.map((comp) => (
            <button
              key={comp}
              onClick={() => setSelectedCompetition(comp === 'All' ? 'All' : comp)}
              className={`px-4 py-2 rounded-md font-medium ${selectedCompetition === comp || (selectedCompetition === 'All' && comp === 'All')
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              {comp}
            </button>
          ))}
          {tournaments.length === 0 && <div className="text-gray-400">No tournaments found.</div>}
        </div>

        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Team</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase">P</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase">W</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase">D</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase">L</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase">GF</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase">GA</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase">GD</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">PTS</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Form</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {tableData.map((team, index) => {
                  const gd = team.goalsFor - team.goalsAgainst;
                  return (
                    <tr key={team.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-300">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{team.name}</td>
                      <td className="px-3 py-4 text-center text-gray-300">{team.played}</td>
                      <td className="px-3 py-4 text-center text-gray-300">{team.wins}</td>
                      <td className="px-3 py-4 text-center text-gray-300">{team.draws}</td>
                      <td className="px-3 py-4 text-center text-gray-300">{team.losses}</td>
                      <td className="px-3 py-4 text-center text-gray-300">{team.goalsFor}</td>
                      <td className="px-3 py-4 text-center text-gray-300">{team.goalsAgainst}</td>
                      <td className={`px-3 py-4 text-center font-medium ${gd > 0 ? 'text-green-400' : gd < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                        {gd > 0 ? '+' : ''}{gd}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-yellow-400">{team.points}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center space-x-1">
                          {team.form.slice(-5).map((res, i) => (
                            <span key={i} className={`w-5 h-5 flex items-center justify-center rounded-full text-xs text-white ${res === 'W' ? 'bg-green-500' : res === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}>
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
            {tableData.length === 0 && <div className="text-center py-10 text-gray-400">No standings data available. Add teams and finish matches to see them here.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Leaderboard;
