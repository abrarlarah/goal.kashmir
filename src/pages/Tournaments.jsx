import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Calendar, MapPin, Filter } from 'lucide-react';

const Tournaments = () => {
  const { tournaments, loading } = useData();
  const { isAdmin } = useAuth();
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');

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
      return matchesYear && matchesDistrict;
    });
  }, [tournaments, selectedYear, selectedDistrict]);

  if (loading && tournaments.length === 0) return <div className="text-center text-slate-900 dark:text-white py-20">Loading Tournaments...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Tournaments</h1>
          <p className="text-slate-600 dark:text-slate-400">Explore local football competitions and leagues.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Year Filter */}
          <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-white/5">
            <Calendar size={16} className="text-brand-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-sm text-slate-900 dark:text-white outline-none"
            >
              <option value="All" className="bg-slate-900">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year} className="bg-slate-900">{year}</option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-white/5">
            <MapPin size={16} className="text-brand-400" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-transparent text-sm text-slate-900 dark:text-white outline-none"
            >
              <option value="All" className="bg-slate-900">All Districts</option>
              {availableDistricts.map(district => (
                <option key={district} value={district} className="bg-slate-900">{district}</option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <Link to="/admin/tournaments" className="bg-brand-600 hover:bg-brand-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg flex items-center font-bold text-sm transition-all shadow-lg shadow-brand-500/20">
              <span className="mr-2">+</span> Add Tournament
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTournaments.map((tournament) => (
          <div key={tournament.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{tournament.name}</h2>
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
                  <p className="text-slate-900 dark:text-white">{tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : 'TBD'}</p>
                </div>
                <div>
                  <p className="text-gray-400">End Date</p>
                  <p className="text-slate-900 dark:text-white">{tournament.endDate ? new Date(tournament.endDate).toLocaleDateString() : 'TBD'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Teams</p>
                  <p className="text-slate-900 dark:text-white">{tournament.teamsCount}</p>
                </div>
                <div>
                  <p className="text-gray-400">Matches</p>
                  <p className="text-slate-900 dark:text-white">{tournament.matchesCount}</p>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to={`/tournaments/${tournament.id}`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-slate-900 dark:text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
