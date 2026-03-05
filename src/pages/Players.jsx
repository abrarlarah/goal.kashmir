import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { motion } from 'framer-motion';
import { Search, Filter, Save, X, Edit2, Plus, User, Shield, Users, MapPinned, Calendar } from 'lucide-react';
import { cn } from '../utils/cn';
import { calculateAge } from '../utils/ageUtils';

// Districts of Jammu and Kashmir
const DISTRICTS = {
  JAMMU: ['Jammu', 'Samba', 'Kathua', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar'],
  KASHMIR: ['Srinagar', 'Ganderbal', 'Budgam', 'Baramulla', 'Bandipora', 'Kupwara', 'Pulwama', 'Shopian', 'Kulgam', 'Anantnag']
};

const Players = () => {
  const { players, tournaments, loading } = useData();
  const navigate = useNavigate();
  const [positionFilter, setPositionFilter] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('Baramulla');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 8;
  const { isAdmin, isSuperAdmin, currentUser } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [editedPlayers, setEditedPlayers] = useState({});

  const positions = ['All', 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

  const handleStatChange = (id, field, value) => {
    setEditedPlayers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: Number(value)
      }
    }));
  };

  const saveChanges = async () => {
    if (!window.confirm('Save all changes?')) return;

    try {
      const updates = Object.entries(editedPlayers).map(([id, changes]) =>
        updateDoc(doc(db, 'players', id), changes)
      );
      await Promise.all(updates);
      setEditedPlayers({});
      setEditMode(false);
      alert('Changes saved!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Error saving changes');
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesPosition =
      positionFilter === 'All' || player.position === positionFilter;
    const matchesSearch =
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.team.toLowerCase().includes(searchQuery.toLowerCase());

    // District filter - now using player's own district field
    const matchesDistrict =
      selectedDistrict === 'All' || player.district === selectedDistrict;

    return matchesPosition && matchesSearch && matchesDistrict;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
  const indexOfLastPlayer = currentPage * playersPerPage;
  const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
  const currentPlayers = filteredPlayers.slice(indexOfFirstPlayer, indexOfLastPlayer);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine if this user is allowed to edit a specific player
  const canEditPlayer = (player) => {
    if (!isAdmin || !player) return false;
    if (isSuperAdmin) return true;

    const playerTeamName = player.team;
    return tournaments.some(t => {
      const isAssignedToMe = t.createdBy === currentUser?.uid;
      const isTeamInTournament = Array.isArray(t.teamsList) && t.teamsList.includes(playerTeamName);
      return isAssignedToMe && isTeamInTournament;
    });
  };

  if (loading && players.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <div className="text-slate-600 dark:text-slate-400 font-medium animate-pulse">Loading Players...</div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white mb-2">Players</h1>
            <p className="text-slate-600 dark:text-slate-400">View performance stats and player details.</p>
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

            {isSuperAdmin && (
              <Link to="/admin/players" className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-slate-900 dark:text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95">
                <Plus size={18} /> Add Player
              </Link>
            )}
          </div>
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            {editMode ? (
              <>
                <button
                  onClick={saveChanges}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Save size={16} /> Save
                </button>
                <button
                  onClick={() => { setEditMode(false); setEditedPlayers({}); }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium transition-colors"
                >
                  <X size={16} /> Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/5 rounded-lg text-sm font-medium transition-colors"
              >
                <Edit2 size={16} /> Edit Stats
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search players or teams..."
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl leading-5 bg-white/5 text-slate-700 dark:text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50 sm:text-sm transition-colors"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="relative max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-4 w-4 text-slate-500" />
          </div>
          <select
            className="block w-full pl-9 pr-10 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-dark-card text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500/50 sm:text-sm appearance-none cursor-pointer"
            value={positionFilter}
            onChange={e => {
              setPositionFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            {positions.map(pos => (
              <option key={pos} value={pos}>
                {pos === 'All' ? 'All Positions' : pos}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Player</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Team</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Position</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kit #</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Age</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Matches</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Goals</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Assists</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cards</th>
                {isAdmin && <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-transparent">
              {currentPlayers.map((player) => {
                const edited = editedPlayers[player.id];
                const display = { ...player, ...edited };

                return (
                  <tr key={player.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/players/${player.id}`} className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 overflow-hidden border border-slate-200 dark:border-white/10 group-hover:border-brand-500/30 transition-colors">
                          {player.photoUrl ? (
                            <img src={player.photoUrl} alt={player.name} className="h-full w-full object-cover" />
                          ) : (
                            player.name.charAt(0)
                          )}
                        </div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors">{player.name}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <Shield size={14} className="text-slate-500" />
                        {player.team}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                        player.position === 'Forward' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          player.position === 'Midfielder' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                            player.position === 'Defender' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              "bg-green-500/10 text-green-400 border-green-500/20"
                      )}>
                        {player.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-bold text-brand-500">
                        {player.number ? `#${player.number}` : '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm text-slate-900 dark:text-white font-medium">
                          {player.dob ? calculateAge(player.dob) : (player.age || '-')}
                        </span>
                        {player.dob && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar size={10} /> {new Date(player.dob).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {editMode && canEditPlayer(player) ? (
                        <input
                          type="number"
                          className="w-16 bg-black/50 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-slate-900 dark:text-white text-center focus:ring-1 focus:ring-brand-500 outline-none"
                          value={display.matches || 0}
                          onChange={e => handleStatChange(player.id, 'matches', e.target.value)}
                        />
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-slate-400">{display.matches}</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {editMode && canEditPlayer(player) ? (
                        <input
                          type="number"
                          className="w-16 bg-black/50 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-slate-900 dark:text-white text-center focus:ring-1 focus:ring-brand-500 outline-none"
                          value={display.goals || 0}
                          onChange={e => handleStatChange(player.id, 'goals', e.target.value)}
                        />
                      ) : (
                        <span className={cn("text-sm font-bold", display.goals > 0 ? "text-brand-400" : "text-slate-600")}>
                          {display.goals || 0}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {editMode && canEditPlayer(player) ? (
                        <input
                          type="number"
                          className="w-16 bg-black/50 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-slate-900 dark:text-white text-center focus:ring-1 focus:ring-brand-500 outline-none"
                          value={display.assists || 0}
                          onChange={e => handleStatChange(player.id, 'assists', e.target.value)}
                        />
                      ) : (
                        <span className={cn("text-sm font-medium", display.assists > 0 ? "text-blue-400" : "text-slate-600")}>
                          {display.assists || 0}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex justify-center gap-1">
                        {Array(display.yellowCards || 0).fill(0).map((_, i) => (
                          <div key={`y-${i}`} className="h-4 w-3 bg-yellow-400 rounded-sm shadow-sm" />
                        ))}
                        {Array(display.redCards || 0).fill(0).map((_, i) => (
                          <div key={`r-${i}`} className="h-4 w-3 bg-red-500 rounded-sm shadow-sm" />
                        ))}
                        {(!display.yellowCards && !display.redCards) && <span className="text-slate-700">-</span>}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {canEditPlayer(player) && (
                          <button
                            onClick={() => navigate('/admin/players', { state: { editPlayer: player } })}
                            className="p-2 bg-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-white rounded-lg transition-all"
                            title="Edit Player Details"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 text-slate-500 mb-4">
              <Users size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No players found</h3>
            <p className="text-slate-600 dark:text-slate-400">Try adjusting your filters.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 bg-white/2">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Showing <span className="text-brand-400">{indexOfFirstPlayer + 1}</span> to <span className="text-brand-400">{Math.min(indexOfLastPlayer, filteredPlayers.length)}</span> of <span className="text-brand-400">{filteredPlayers.length}</span> players
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => paginate(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs font-bold text-slate-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                First
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show current page, and pages around it
                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="text-slate-600 px-1">...</span>
                      )}
                      <button
                        onClick={() => paginate(page)}
                        className={cn(
                          "w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all",
                          currentPage === page
                            ? "bg-brand-500 text-slate-900 shadow-lg shadow-brand-500/20"
                            : "bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10"
                        )}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                onClick={() => paginate(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs font-bold text-slate-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Players;
