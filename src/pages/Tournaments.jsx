import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const Tournaments = () => {
  const { tournaments, loading } = useData();
  const { isAdmin } = useAuth();

  if (loading && tournaments.length === 0) return <div className="text-center text-white py-20">Loading Tournaments...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Tournaments</h1>
        {isAdmin && (
          <Link to="/admin/tournaments" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center">
            <span className="mr-2">+</span> Add Tournament
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((tournament) => (
          <div key={tournament.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-white">{tournament.name}</h2>
                  <div className="mt-2 flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tournament.status === 'ongoing'
                      ? 'bg-green-100 text-green-800'
                      : tournament.status === 'finished' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Start Date</p>
                  <p className="text-white">{tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : 'TBD'}</p>
                </div>
                <div>
                  <p className="text-gray-400">End Date</p>
                  <p className="text-white">{tournament.endDate ? new Date(tournament.endDate).toLocaleDateString() : 'TBD'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Teams</p>
                  <p className="text-white">{tournament.teamsCount}</p>
                </div>
                <div>
                  <p className="text-gray-400">Matches</p>
                  <p className="text-white">{tournament.matchesCount}</p>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to={`/leaderboard`} /* Temporary redirect to leaderboard as generic view */
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
        {tournaments.length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-10">
            No tournaments found.
          </div>
        )}
      </div>
    </div>
  );
};

export default Tournaments;
