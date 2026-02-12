import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const Teams = () => {
  const { teams, loading } = useData();
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  if (loading && teams.length === 0) {
    return <div className="text-center text-white py-20">Loading Teams...</div>;
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Teams</h1>
        {isAdmin && (
          <Link to="/admin/teams" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center">
            <span className="mr-2">+</span> Add Team
          </Link>
        )}
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search teams..."
          className="bg-gray-700 text-white rounded px-4 py-2 w-full md:w-1/3"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <div key={team.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="p-6 flex items-center space-x-4">
              <div className="flex-shrink-0 h-16 w-16 bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt={team.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span>{team.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{team.name}</h2>
                <p className="text-gray-400 text-sm">
                  <span className="text-gray-500 font-semibold uppercase text-xs mr-2">Stadium:</span>
                  {team.stadium || 'Unknown'}
                </p>
              </div>
            </div>
            <div className="bg-gray-750 px-6 py-3 border-t border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-400">
                <span className="text-gray-500 font-semibold mr-1">Coach:</span>{team.manager || team.coach || 'N/A'}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${team.status === 'Inactive' ? 'bg-gray-900 text-gray-400 border-gray-700' :
                  team.status === 'Suspended' ? 'bg-red-900/30 text-red-500 border-red-500/20' :
                    team.status === 'Dissolved' ? 'bg-black text-gray-600 border-gray-800' :
                      'bg-green-900/30 text-green-400 border-green-500/20'
                }`}>
                {team.status || 'Active'}
              </span>
            </div>
          </div>
        ))}
      </div>
      {filteredTeams.length === 0 && (
        <div className="text-center text-gray-400 py-10">
          No teams found matching your search.
        </div>
      )}
    </div>
  );
};

export default Teams;
