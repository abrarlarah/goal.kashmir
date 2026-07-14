// @ts-nocheck
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { motion } from 'framer-motion';
import { Search, MapPin, User, Shield, Plus, Trophy, MapPinned, Edit2, Zap } from 'lucide-react';
import { cn } from '../utils/cn';

// Districts of Jammu and Kashmir
const DISTRICTS = {
  JAMMU: ['Jammu', 'Samba', 'Kathua', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar'],
  KASHMIR: ['Srinagar', 'Ganderbal', 'Budgam', 'Baramulla', 'Bandipora', 'Kupwara', 'Pulwama', 'Shopian', 'Kulgam', 'Anantnag']
};

const Teams = () => {
  const { teams, tournaments, matches, loading } = useData();
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [activeTab, setActiveTab] = useState('registered'); // 'registered' or 'quick'

  // Determine if this user is allowed to edit a specific team
  const canEditTeam = (team) => {
    if (!isAdmin || !team) return false;
    if (isSuperAdmin) return true;

    // Check if team is part of any tournament this admin created
    const tTournaments = Array.isArray(team.tournaments)
      ? team.tournaments
      : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);

    return tTournaments.some(teamTournamentName => {
      const tournament = tournaments.find(t => t.name === teamTournamentName);
      return tournament && tournament.createdBy === currentUser?.uid;
    });
  };

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
          <div className="text-[#94A3B8] font-medium animate-pulse">Loading Teams...</div>
        </div>
      </div>
    );
  }

  // Filter teams by tab AND district
  const filteredTeams = teams.filter(team => {
    // Search filter
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Tab filter
    const isQuickMatchTeam = team.isQuickMatch || team.district === 'Quick Match' || (team.tournaments && team.tournaments.includes('Quick Match'));
    
    if (activeTab === 'registered' && isQuickMatchTeam) return false;
    if (activeTab === 'quick' && !isQuickMatchTeam) return false;

    // District filter (ignore district filter for Quick Match tab if user wants to see all QMs)
    if (selectedDistrict === 'All') return true;
    
    // Direct match on team's district field
    return team.district === selectedDistrict;
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
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Clubs</h1>
            <p className="text-[#94A3B8]">Manage and view all competing teams.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Tabs */}
            <div className="flex bg-[#101827] bg-[#131D31]/50 p-1 rounded-xl border border-[#24344D]">
              <button 
                onClick={() => setActiveTab('registered')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  activeTab === 'registered' 
                    ? "bg-[#131D31] dark:bg-brand-500 text-brand-400 text-white shadow-sm" 
                    : "text-[#64748B] hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Registered
              </button>
              <button 
                onClick={() => setActiveTab('quick')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  activeTab === 'quick' 
                    ? "bg-[#131D31] dark:bg-amber-500 text-amber-600 text-white shadow-sm" 
                    : "text-[#64748B] hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Quick Match
              </button>
            </div>

            {/* District Filter */}
            <div className="flex items-center gap-2">
              <MapPinned className="text-brand-400" size={20} />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-[#131D31] bg-[#131D31]/60 backdrop-blur-sm border border-[#24344D] rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              >
                <option value="All">All Districts</option>
                <option value="Quick Match">Quick Match Special</option>
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

            {(isAdmin || isSuperAdmin) && (
              <Link
                to="/admin/teams"
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95"
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
          <Search className="h-5 w-5 text-[#64748B]" />
        </div>
        <input
          type="text"
          placeholder="Search teams..."
          className="block w-full pl-10 pr-3 py-3 border border-[#24344D] rounded-xl leading-5 bg-[#131D31]/50 text-[#94A3B8] placeholder-[#64748B] focus:outline-none focus:bg-[#131D31]/10 focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50 sm:text-sm transition-colors"
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
            className="group relative rounded-2xl bg-gradient-to-br from-[#0B1220] to-[#0B1220] from-[#0B1220] to-[#0B1220] ring-1 ring-[#24344D]/50 ring-[#24344D]/50 overflow-hidden transition-all duration-300 hover:shadow-xl shadow-md hover:ring-2 hover:ring-brand-500/30 hover:shadow-brand-500/10"
          >
            <Link to={`/teams/${team.id}`} className="block">
              {/* Background Glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Quick Match Badge */}
              {(team.isQuickMatch || team.district === 'Quick Match') && (
                <div className="absolute top-3 right-3 z-10">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-tighter border border-amber-500/30 shadow-sm backdrop-blur-md">
                    <Zap size={10} className="fill-current" /> Quick Match
                  </span>
                </div>
              )}

              {/* Team Logo/Name */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {team.logoUrl ? (
                      <div className="w-16 h-16 rounded-xl bg-[#131D31]/50 border border-[#24344D] p-2 flex items-center justify-center overflow-hidden">
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-brand-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-500/20">
                        {team.shortName || team.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-white group-hover:text-brand-400 transition-colors">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/10">
                        {team.status || 'Active'}
                      </span>
                      <span className="text-[#64748B] text-xs font-medium">Est. {team.founded || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Match Stats Summary */}
                <div className="grid grid-cols-3 gap-2 mt-6">
                  {[
                    {
                      label: 'Won',
                      val: matches.filter(m => m.status === 'finished' && ((m.teamA === team.name && Number(m.scoreA) > Number(m.scoreB)) || (m.teamB === team.name && Number(m.scoreB) > Number(m.scoreA)))).length,
                      color: 'text-green-500',
                      bg: 'bg-green-500/5'
                    },
                    {
                      label: 'Lost',
                      val: matches.filter(m => m.status === 'finished' && ((m.teamA === team.name && Number(m.scoreA) < Number(m.scoreB)) || (m.teamB === team.name && Number(m.scoreB) < Number(m.scoreA)))).length,
                      color: 'text-red-500',
                      bg: 'bg-red-500/5'
                    },
                    {
                      label: 'Pending',
                      val: matches.filter(m => m.status !== 'finished' && (m.teamA === team.name || m.teamB === team.name)).length,
                      color: 'text-blue-500',
                      bg: 'bg-blue-500/5'
                    }
                  ].map((s, i) => (
                    <div key={i} className={cn("flex flex-col items-center py-2 rounded-xl border border-[#24344D]/40", s.bg)}>
                      <span className={cn("text-lg font-black", s.color)}>{s.val}</span>
                      <span className="text-[8px] uppercase font-bold tracking-tighter text-[#64748B]">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>

            {/* Footer Stats/Status */}
            <div className="px-6 py-4 border-t border-[#24344D]/50 border-[#24344D]/50 bg-[#0B1220]/60 bg-[#0B1220] flex justify-between items-center relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <Shield size={14} />
                  <span>Squad: {team.players || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <Trophy size={14} />
                  <span>Tournaments: {Array.isArray(team.tournaments) ? team.tournaments.length : 0}</span>
                </div>
                {canEditTeam(team) && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/admin/teams', { state: { editTeam: team } });
                    }}
                    className="p-1.5 bg-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-white rounded-lg transition-all"
                    title="Edit Team Details"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>

              <span className={cn(
                "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border tracking-wide",
                team.status === 'Inactive' ? 'bg-[#0B1220] bg-[#131D31] text-[#94A3B8] border-[#24344D]' :
                  team.status === 'Suspended' ? 'bg-red-900/20 text-red-500 border-red-500/20' :
                    team.status === 'Dissolved' ? 'bg-black text-[#94A3B8] border-slate-800' :
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#131D31]/50 text-[#64748B] mb-4">
            <Trophy size={32} strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">No teams found</h3>
          <p className="text-[#94A3B8]">Try adjusting your search criteria.</p>
        </motion.div>
      )}
    </div>
  );
};

export default Teams;
