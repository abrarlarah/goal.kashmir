import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { motion } from 'framer-motion';
import { Search, MapPin, User, Shield, Plus, Trophy, MapPinned } from 'lucide-react';
import { cn } from '../utils/cn';

// Districts of Jammu and Kashmir
const DISTRICTS = {
  JAMMU: ['Jammu', 'Samba', 'Kathua', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar'],
  KASHMIR: ['Srinagar', 'Ganderbal', 'Budgam', 'Baramulla', 'Bandipora', 'Kupwara', 'Pulwama', 'Shopian', 'Kulgam', 'Anantnag']
};

const Teams = () => {
  const { teams, tournaments, loading } = useData();
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Baramulla');

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

  if (loading && teams.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <div className="text-slate-600 dark:text-slate-400 font-medium animate-pulse">Loading Teams...</div>
        </div>
      </div>
    );
  }

  // Filter teams by district through their tournaments
  const filteredTeams = teams.filter(team => {
    // Search filter
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase());

    // District filter
    if (selectedDistrict === 'All') {
      return matchesSearch;
    }

    // Check if team participates in any tournament in the selected district
    const teamTournaments = Array.isArray(team.tournaments)
      ? team.tournaments
      : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);

    const hasDistrictMatch = teamTournaments.some(tournamentName => {
      const tournament = tournaments.find(t => t.name === tournamentName);
      return tournament && tournament.district === selectedDistrict;
    });

    return matchesSearch && hasDistrictMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white mb-2">Clubs</h1>
            <p className="text-slate-600 dark:text-slate-400">Manage and view all competing teams.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* District Filter */}
            <div className="flex items-center gap-2">
              <MapPinned className="text-brand-400" size={20} />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-white dark:bg-dark-card/50 backdrop-blur-sm border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
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

            {isAdmin && (
              <Link
                to="/admin/teams"
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-slate-900 dark:text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95"
              >
                <Plus size={18} /> Add New Team
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Search & Filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative max-w-md"
      >
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-500" />
        </div>
        <input
          type="text"
          placeholder="Search teams..."
          className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-white/10 rounded-xl leading-5 bg-white/5 text-slate-700 dark:text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50 sm:text-sm transition-colors"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </motion.div>

      {/* Teams Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredTeams.map((team) => (
          <motion.div
            key={team.id}
            variants={item}
            whileHover={{ y: -5 }}
            className="group relative glass-card rounded-2xl overflow-hidden hover:border-brand-500/30 transition-all duration-300"
          >
            <Link to={`/teams/${team.id}`} className="block">
              {/* Background Glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Team Logo/Name */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {team.logoUrl ? (
                      <div className="w-16 h-16 rounded-xl bg-white/5 border border-slate-200 dark:border-white/10 p-2 flex items-center justify-center overflow-hidden">
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-brand-500 flex items-center justify-center text-slate-900 dark:text-white text-2xl font-bold shadow-lg shadow-brand-500/20">
                        {team.shortName || team.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/10">
                        {team.status || 'Active'}
                      </span>
                      <span className="text-slate-500 text-xs font-medium">Est. {team.founded || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Footer Stats/Status */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/5 bg-black/20 flex justify-between items-center relative z-10">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Shield size={14} />
                <span>Squad: {team.players || 0}</span>
              </div>

              <span className={cn(
                "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border tracking-wide",
                team.status === 'Inactive' ? 'bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-700' :
                  team.status === 'Suspended' ? 'bg-red-900/20 text-red-500 border-red-500/20' :
                    team.status === 'Dissolved' ? 'bg-black text-slate-600 border-slate-800' :
                      'bg-green-500/10 text-brand-400 border-brand-500/20'
              )}>
                {team.status || 'Active'}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {filteredTeams.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 text-slate-500 mb-4">
            <Trophy size={32} strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No teams found</h3>
          <p className="text-slate-600 dark:text-slate-400">Try adjusting your search criteria.</p>
        </motion.div>
      )}
    </div>
  );
};

export default Teams;
