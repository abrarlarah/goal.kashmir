import React, { useState, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Sparkles, Zap, Edit3, Trash2, Plus, Trophy, Clock, Search, Filter, X, Shield, MapPin, Calendar, Layout, Hash } from 'lucide-react';
import { logAuditEvent } from '../../utils/auditLogger';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

const ManageMatches = () => {
  const { matches, teams, tournaments } = useData();
  const { currentUser, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false); // Form loading
  const [formData, setFormData] = useState({
    teamA: '',
    teamB: '',
    scoreA: 0,
    scoreB: 0,
    status: 'scheduled', // scheduled, live, finished
    currentMinute: 0,
    competition: '',
    date: '',
    time: '',
    managerA: '',
    managerB: '',
    round: '', // e.g., 'Group A', 'Semi-Final', 'Round 1'
    matchNumber: '' // e.g., '#1', '45', 'Final'
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTournament, setFilterTournament] = useState('all');

  // Global match numbers: sort ALL matches by date ascending and assign 1, 2, 3...
  const globalMatchNumbers = useMemo(() => {
    const sorted = [...matches].sort((a, b) => {
      const dateA = new Date(`${a.date || '2000-01-01'}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date || '2000-01-01'}T${b.time || '00:00'}`);
      return dateA - dateB; // Oldest first
    });
    const map = {};
    sorted.forEach((m, idx) => {
      map[m.id] = idx + 1;
    });
    return map;
  }, [matches]);

  // Helper to filter teams by selected competition
  const getFilteredTeams = () => {
    if (!formData.competition) return [];
    return teams.filter(team => {
      const tTournaments = Array.isArray(team.tournaments)
        ? team.tournaments
        : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
      return tTournaments.includes(formData.competition);
    });
  };

  const [editingId, setEditingId] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev };
      newData[name] = name.includes('score') || name === 'currentMinute' ? parseInt(value) || 0 : value;

      // Reset teams if competition changes
      if (name === 'competition') {
        newData.teamA = '';
        newData.teamB = '';
        newData.managerA = '';
        newData.managerB = '';
        
        // Auto-assign match number for new matches globally across all tournaments
        if (!editingId) {
          let maxNum = 0;
          matches.forEach(m => {
            const num = parseInt(m.matchNumber);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          });
          newData.matchNumber = (maxNum + 1).toString();
        }
      }

      // Auto-populate manager when a team is selected
      if (name === 'teamA' && value) {
        const team = teams.find(t => t.name === value);
        if (team) newData.managerA = team.manager || '';
      }
      if (name === 'teamB' && value) {
        const team = teams.find(t => t.name === value);
        if (team) newData.managerB = team.manager || '';
      }

      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    const request = editingId
      ? updateDoc(doc(db, 'matches', editingId), formData)
      : addDoc(collection(db, 'matches'), formData);

    request.then((docRef) => {
      const matchLabel = `${formData.teamA} vs ${formData.teamB}`;
      logAuditEvent(editingId ? 'UPDATE_MATCH' : 'CREATE_MATCH', {
        entityType: 'match',
        entityId: editingId || docRef?.id,
        entityName: matchLabel,
        details: { competition: formData.competition, round: formData.round },
      });
      setSuccessMessage(editingId ? 'Match updated successfully!' : 'Match added successfully!');
      setFormData({
        teamA: '',
        teamB: '',
        scoreA: 0,
        scoreB: 0,
        status: 'scheduled',
        currentMinute: 0,
        competition: '',
        date: '',
        time: '',
        managerA: '',
        managerB: '',
        round: '',
        matchNumber: ''
      });
      setEditingId(null);
      window.scrollTo(0, 0);
      setTimeout(() => setSuccessMessage(''), 3000);
    }).catch((error) => {
      console.error("Error saving match: ", error);
      alert("Error saving: " + error.message);
    }).finally(() => {
      setLoading(false);
    });
  };

  const handleEdit = (match) => {
    setFormData({
      ...match,
      managerA: match.managerA || '',
      managerB: match.managerB || '',
      round: match.round || '',
      matchNumber: match.matchNumber || ''
    });
    setEditingId(match.id);
    setSuccessMessage('');
    // Scroll to form
    setTimeout(() => {
      const formEl = document.getElementById('match-form-section');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      const match = matches.find(m => m.id === id);
      try {
        await deleteDoc(doc(db, 'matches', id));
        logAuditEvent('DELETE_MATCH', {
          entityType: 'match',
          entityId: id,
          entityName: match ? `${match.teamA} vs ${match.teamB}` : 'Unknown',
        });
        setSuccessMessage('Match deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error("Error deleting match: ", error);
      }
    }
  };


  const updateMatchScore = async (id, team, increment) => {
    const match = matches.find(m => m.id === id);
    if (!match) return;

    const newScore = team === 'A' ? (match.scoreA || 0) + increment : (match.scoreB || 0) + increment;
    if (newScore < 0) return;

    try {
      await updateDoc(doc(db, 'matches', id), {
        [team === 'A' ? 'scoreA' : 'scoreB']: newScore
      });
    } catch (error) {
      console.error("Error updating score: ", error);
    }
  };

  const updateMatchStatus = async (id, status) => {
    const match = matches.find(m => m.id === id);
    try {
      await updateDoc(doc(db, 'matches', id), { status });
      logAuditEvent('UPDATE_MATCH_STATUS', {
        entityType: 'match',
        entityId: id,
        entityName: match ? `${match.teamA} vs ${match.teamB}` : 'Unknown',
        details: { newStatus: status },
      });
      setSuccessMessage(`Match marked as ${status}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error("Error updating status: ", error);
    }
  };

  // Filter matches based on role (superadmin sees all, admin sees only their tournaments' matches)
  const myTournamentNames = useMemo(() => {
    if (isSuperAdmin) return null; // null = show all
    return tournaments
      .filter(t => t.createdBy === currentUser?.uid)
      .map(t => t.name);
  }, [tournaments, currentUser, isSuperAdmin]);

  const scopedMatches = useMemo(() => {
    if (!myTournamentNames) return matches; // superadmin
    return matches.filter(m => myTournamentNames.includes(m.competition));
  }, [matches, myTournamentNames]);

  const filteredScopedMatches = useMemo(() => {
    return scopedMatches.filter(match => {
      // Status filter
      if (filterStatus !== 'all' && match.status !== filterStatus) return false;

      // Tournament filter
      if (filterTournament !== 'all' && match.competition !== filterTournament) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const globalNum = globalMatchNumbers[match.id];
        const matchesTeamA = match.teamA?.toLowerCase().includes(query);
        const matchesTeamB = match.teamB?.toLowerCase().includes(query);
        const matchesCompetition = match.competition?.toLowerCase().includes(query);
        const matchesNumber = match.matchNumber?.toString().includes(query);
        const matchesGlobalNumber = globalNum?.toString().includes(query);
        
        if (!matchesTeamA && !matchesTeamB && !matchesCompetition && !matchesNumber && !matchesGlobalNumber) return false;
      }

      return true;
    });
  }, [scopedMatches, filterStatus, filterTournament, searchQuery]);

  const liveMatches = filteredScopedMatches.filter(m => m.status === 'live' || m.status === 'halftime');
  const otherMatches = filteredScopedMatches.filter(m => m.status !== 'live' && m.status !== 'halftime');

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 10;
  const totalPages = Math.ceil(otherMatches.length / matchesPerPage);

  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const currentMatches = otherMatches.slice(indexOfFirstMatch, indexOfLastMatch);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    const listElement = document.getElementById('match-list-top');
    if (listElement) listElement.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto px-4 py-8 text-slate-900 dark:text-white">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c0a1d] via-[#1a103d] to-[#0c0a1d]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-600/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500/15 via-transparent to-transparent"></div>
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-400/20 text-violet-300 text-xs font-bold mb-3">
                <Sparkles size={12} className="text-violet-400" /> Match Control Panel
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white">
                Manage <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400">Matches</span>
              </h2>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
                <div className="text-xl font-black text-white">{scopedMatches.length}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total</div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-md text-center">
                <div className="text-xl font-black text-red-400">{liveMatches.length}</div>
                <div className="text-[10px] font-bold text-red-400/60 uppercase">Live</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          {successMessage}
        </div>
      )}

      {/* Live Matches Control */}
      {liveMatches.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-red-500">Live Control Center</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {liveMatches.map((match) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={match.id}
                  className="relative group rounded-3xl overflow-hidden border border-red-500/20 bg-white dark:bg-white/[0.02] shadow-xl shadow-red-500/5 dark:shadow-none backdrop-blur-md"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="text-center md:text-left flex-1">
                        <div className="font-medium text-slate-400 text-[10px] flex items-center justify-center md:justify-start gap-2 uppercase tracking-wider font-black">
                          <Trophy size={12} className="text-violet-500" />
                          <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/20">
                            M#{globalMatchNumbers[match.id]}
                          </span>
                          {match.matchNumber && match.matchNumber !== globalMatchNumbers[match.id]?.toString() && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                              {match.matchNumber}
                            </span>
                          )}
                          <span className="truncate max-w-[120px]">{match.competition}</span>
                        </div>
                        
                        <div className="mt-4 flex items-center justify-center md:justify-start gap-4">
                          <div className="flex-1 flex flex-col items-center md:items-start min-w-0">
                            <span className="text-sm font-black text-slate-900 dark:text-white uppercase truncate w-full">{match.teamA}</span>
                          </div>
                          
                          <div className="px-4 py-2 bg-slate-900 dark:bg-black rounded-2xl border border-white/5 flex items-center gap-3 shadow-inner">
                            <span className="text-2xl font-impact text-white tracking-widest">{match.scoreA}</span>
                            <div className="flex flex-col items-center leading-none">
                              <span className="text-red-500 text-[8px] font-black animate-pulse">{match.status === 'halftime' ? 'HT' : `${match.currentMinute}'`}</span>
                              <span className="text-slate-700 text-lg">-</span>
                            </div>
                            <span className="text-2xl font-impact text-white tracking-widest">{match.scoreB}</span>
                          </div>

                          <div className="flex-1 flex flex-col items-center md:items-end min-w-0 text-right">
                            <span className="text-sm font-black text-slate-900 dark:text-white uppercase truncate w-full">{match.teamB}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 dark:border-white/5 pt-4 md:pt-0 md:pl-6">
                        <div className="grid grid-cols-2 gap-3 mb-1">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Home Goals</span>
                            <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-xl p-1 border border-slate-200 dark:border-white/10">
                              <button onClick={() => updateMatchScore(match.id, 'A', -1)} className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-500 transition-all active:scale-90 font-black">-</button>
                              <button onClick={() => updateMatchScore(match.id, 'A', 1)} className="w-8 h-8 rounded-lg bg-red-500 text-white shadow-lg shadow-red-500/20 transition-all active:scale-90 font-black">+</button>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Away Goals</span>
                            <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-xl p-1 border border-slate-200 dark:border-white/10">
                              <button onClick={() => updateMatchScore(match.id, 'B', -1)} className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-500 transition-all active:scale-90 font-black">-</button>
                              <button onClick={() => updateMatchScore(match.id, 'B', 1)} className="w-8 h-8 rounded-lg bg-red-500 text-white shadow-lg shadow-red-500/20 transition-all active:scale-90 font-black">+</button>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(match)}
                            className="flex-1 px-4 py-2 rounded-xl bg-violet-600 dark:bg-violet-500/10 text-white dark:text-violet-400 border border-violet-500/20 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-violet-500 active:scale-95 shadow-lg shadow-violet-500/10"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => updateMatchStatus(match.id, 'finished')}
                            className="flex-1 px-4 py-2 rounded-xl bg-slate-900 dark:bg-red-500/10 text-white dark:text-red-400 border border-white/5 dark:border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-black active:scale-95"
                          >
                            Finalize
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      <motion.div 
        id="match-form-section" 
        className="rounded-3xl mb-12 overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-2xl bg-white dark:bg-[#0f172a] relative"
      >
        <div className={`h-1.5 w-full ${editingId ? 'bg-gradient-to-r from-violet-600 via-cyan-500 to-violet-600' : 'bg-gradient-to-r from-emerald-600 via-cyan-500 to-emerald-600'}`}></div>
        
        <div className="p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                {editingId ? (
                  <><Edit3 size={24} className="text-violet-500" /> <span>Edit Match Details</span></>
                ) : (
                  <><Plus size={24} className="text-emerald-500" /> <span>Create New Match</span></>
                )}
              </h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Configure teams, time, and tournament details below.</p>
            </div>
            {editingId && (
              <span className="px-4 py-1.5 rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/20 font-black text-[10px] uppercase tracking-widest animate-pulse">
                Editing Session Active
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Competition Details */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Layout size={12} className="text-violet-500" /> Tournament Info
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 block mb-1.5 uppercase">Competition</label>
                      <select
                        name="competition"
                        value={formData.competition}
                        onChange={handleInputChange}
                        className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-slate-900 dark:text-white w-full focus:ring-2 focus:ring-violet-500/50 outline-none transition-all font-bold"
                        required
                      >
                        <option value="" disabled>Select Competition</option>
                        {tournaments.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 block mb-1.5 uppercase">Round / Phase</label>
                      <input
                        type="text"
                        name="round"
                        placeholder="e.g. Semi Final"
                        value={formData.round}
                        onChange={handleInputChange}
                        className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-slate-900 dark:text-white w-full focus:ring-2 focus:ring-violet-500/50 outline-none transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                        <Hash size={10} /> Custom Match No.
                      </label>
                      <input 
                        type="text" 
                        name="matchNumber" 
                        placeholder="Optional manual index" 
                        value={formData.matchNumber} 
                        onChange={handleInputChange} 
                        className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-slate-900 dark:text-white w-full focus:ring-2 focus:ring-violet-500/50 outline-none text-sm font-bold" 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Calendar size={12} className="text-emerald-500" /> Schedule
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 block mb-1.5 uppercase">Date</label>
                      <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-2.5 rounded-xl text-slate-900 dark:text-white w-full focus:ring-2 focus:ring-emerald-500/50 outline-none text-center font-bold text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 block mb-1.5 uppercase">Time</label>
                      <input type="time" name="time" value={formData.time} onChange={handleInputChange} className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-2.5 rounded-xl text-slate-900 dark:text-white w-full focus:ring-2 focus:ring-emerald-500/50 outline-none text-center font-bold text-xs" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 block mb-1.5 uppercase flex items-center gap-1.5"><MapPin size={10} /> Stadium / Venue</label>
                    <input type="text" name="stadium" placeholder="Venues name" value={formData.stadium} onChange={handleInputChange} className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-slate-900 dark:text-white w-full focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm font-bold" />
                  </div>
                </div>
              </div>

              {/* Teams & Score */}
              <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                  {/* Decorative VS */}
                  <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white dark:bg-[#0f172a] border-4 border-slate-50 dark:border-[#1e293b] items-center justify-center z-10 font-black text-slate-300 italic text-xl">VS</div>

                  {/* Home Team */}
                  <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-violet-500/5 to-transparent dark:from-violet-500/10 dark:to-transparent border border-violet-500/10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
                        <Shield size={24} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em]">Home Contender</h4>
                        <span className="text-xl font-black text-slate-900 dark:text-white">Selection</span>
                      </div>
                    </div>
                    
                    <select
                      name="teamA"
                      value={formData.teamA}
                      onChange={handleInputChange}
                      className="bg-white dark:bg-black/40 border-2 border-slate-200 dark:border-white/5 p-4 rounded-2xl text-slate-900 dark:text-white w-full focus:border-violet-500 outline-none transition-all font-black text-lg mb-6 shadow-xl"
                      required
                    >
                      <option value="" disabled>Select Home Team</option>
                      {getFilteredTeams().map(team => (
                        <option key={team.id} value={team.name} disabled={team.name === formData.teamB}>{team.name}</option>
                      ))}
                    </select>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Manager</label>
                          <input type="text" name="managerA" placeholder="Chief Manager" value={formData.managerA || ''} onChange={handleInputChange} className="bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/5 p-3 rounded-xl text-slate-900 dark:text-white w-full text-sm font-bold" />
                        </div>
                        <div className="w-24">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-center">Score</label>
                          <input type="number" name="scoreA" value={formData.scoreA} onChange={handleInputChange} className="bg-violet-500/10 border-2 border-violet-500/30 p-3 rounded-xl text-violet-600 dark:text-violet-400 w-full text-center font-impact text-2xl" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-cyan-500/5 to-transparent dark:from-cyan-500/10 dark:to-transparent border border-cyan-500/10">
                    <div className="flex items-center gap-3 mb-6 justify-end text-right">
                      <div>
                        <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em]">Away Challenger</h4>
                        <span className="text-xl font-black text-slate-900 dark:text-white">Selection</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                        <Shield size={24} />
                      </div>
                    </div>

                    <select
                      name="teamB"
                      value={formData.teamB}
                      onChange={handleInputChange}
                      className="bg-white dark:bg-black/40 border-2 border-slate-200 dark:border-white/5 p-4 rounded-2xl text-slate-900 dark:text-white w-full focus:border-cyan-500 outline-none transition-all font-black text-lg mb-6 shadow-xl text-right"
                      required
                    >
                      <option value="" disabled>Select Away Team</option>
                      {getFilteredTeams().map(team => (
                        <option key={team.id} value={team.name} disabled={team.name === formData.teamA}>{team.name}</option>
                      ))}
                    </select>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="w-24">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-center">Score</label>
                          <input type="number" name="scoreB" value={formData.scoreB} onChange={handleInputChange} className="bg-cyan-500/10 border-2 border-cyan-500/30 p-3 rounded-xl text-cyan-600 dark:text-cyan-400 w-full text-center font-impact text-2xl" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-right">Manager</label>
                          <input type="text" name="managerB" placeholder="Chief Manager" value={formData.managerB || ''} onChange={handleInputChange} className="bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/5 p-3 rounded-xl text-slate-900 dark:text-white w-full text-sm font-bold text-right" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Selection */}
                <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 bg-white dark:bg-black/20 p-2 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-inner">
                      {['scheduled', 'live', 'halftime', 'finished'].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, status: s }))}
                          className={cn(
                            "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                            formData.status === s 
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl scale-105" 
                              : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {['live', 'halftime'].includes(formData.status) && (
                      <div className="flex items-center gap-4 px-6 py-3 bg-red-500/10 border-2 border-red-500/20 rounded-2xl animate-pulse">
                        <label className="text-[10px] font-black text-red-500 uppercase tracking-widest whitespace-nowrap">Match Minute:</label>
                        <input type="number" name="currentMinute" value={formData.currentMinute} onChange={handleInputChange} className="w-16 bg-transparent text-xl font-black text-red-500 focus:outline-none text-center" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-end items-center gap-4 pt-8 border-t border-slate-100 dark:border-white/5">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      teamA: '', teamB: '', scoreA: 0, scoreB: 0, status: 'scheduled', currentMinute: 0, competition: '', date: '', time: '', managerA: '', managerB: '', round: '', matchNumber: ''
                    });
                  }}
                  className="w-full md:w-auto px-8 py-4 rounded-2xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full md:w-auto px-16 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-[0.3em] transition-all transform active:scale-95 shadow-2xl",
                  editingId 
                    ? "bg-gradient-to-r from-violet-600 to-cyan-500 hover:shadow-violet-600/30" 
                    : "bg-gradient-to-r from-emerald-600 to-cyan-500 hover:shadow-emerald-600/30",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? 'Processing...' : editingId ? '✓ Update Match Data' : '🚀 Launch Match'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Filters and List Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 id="match-list-top" className="text-xl font-black flex items-center gap-2">
            <Trophy size={20} className="text-violet-500" /> 
            All Matches
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-bold">
              {otherMatches.length + liveMatches.length}
            </span>
          </h3>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search by team, competition, or match #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-white placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
              <div className="flex items-center pl-2 text-slate-400">
                <Filter size={12} />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none px-2 py-1 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors capitalize appearance-none"
              >
                <option value="all" className="bg-white dark:bg-[#1a103d]">All States</option>
                <option value="scheduled" className="bg-white dark:bg-[#1a103d]">Scheduled</option>
                <option value="live" className="bg-white dark:bg-[#1a103d]">Live</option>
                <option value="halftime" className="bg-white dark:bg-[#1a103d]">Half Time</option>
                <option value="finished" className="bg-white dark:bg-[#1a103d]">Finished</option>
              </select>
              <div className="w-px h-4 bg-slate-200 dark:bg-white/10"></div>
              <select
                value={filterTournament}
                onChange={(e) => setFilterTournament(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none px-2 py-1 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors appearance-none"
              >
                <option value="all" className="bg-white dark:bg-[#1a103d]">All Tournaments</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.name} className="bg-white dark:bg-[#1a103d]">{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(searchQuery || filterStatus !== 'all' || filterTournament !== 'all') && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mr-1">Active Filters:</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold hover:bg-violet-500/20 transition-all"
              >
                Search: {searchQuery} <X size={10} />
              </button>
            )}
            {filterStatus !== 'all' && (
              <button
                onClick={() => setFilterStatus('all')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold hover:bg-cyan-500/20 transition-all"
              >
                Status: {filterStatus} <X size={10} />
              </button>
            )}
            {filterTournament !== 'all' && (
              <button
                onClick={() => setFilterTournament('all')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-all"
              >
                Tournament: {filterTournament} <X size={10} />
              </button>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setFilterTournament('all');
              }}
              className="text-[10px] font-black text-red-400 hover:text-red-300 transition-colors uppercase ml-2"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
      <div className="grid gap-4 min-h-[400px]">
        <AnimatePresence mode="popLayout" initial={false}>
          {currentMatches.length > 0 ? currentMatches.map(match => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={match.id}
              className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-violet-500/30 transition-all group shadow-sm hover:shadow-xl dark:shadow-none"
            >
              <div className={`h-1 ${
                match.status === 'live' || match.status === 'halftime' ? 'bg-red-500' : 
                match.status === 'finished' ? 'bg-emerald-500' : 
                'bg-gradient-to-r from-violet-500 to-cyan-500'
              }`}></div>
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg sm:text-xl flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-500 dark:text-violet-400 border border-violet-500/20 font-black tracking-widest">
                      M#{globalMatchNumbers[match.id]}
                    </span>
                    {match.matchNumber && match.matchNumber !== globalMatchNumbers[match.id]?.toString() && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 font-black">
                        {match.matchNumber}
                      </span>
                    )}
                    <span className="text-slate-900 dark:text-white truncate">{match.teamA}</span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                      <span className="text-emerald-500 font-impact text-xl">{match.scoreA}</span>
                      <span className="text-slate-300">-</span>
                      <span className="text-emerald-500 font-impact text-xl">{match.scoreB}</span>
                    </div>
                    <span className="text-slate-900 dark:text-white truncate">{match.teamB}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-violet-500/5 text-violet-500 dark:text-violet-400 border border-violet-500/10 font-bold flex items-center gap-1.5">
                      <Trophy size={10} /> {match.competition}
                    </span>
                    {match.round && (
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 border border-cyan-500/10 font-bold flex items-center gap-1.5">
                        <Layout size={10} /> {match.round}
                      </span>
                    )}
                    <span className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider",
                      match.status === 'live' || match.status === 'halftime' ? "bg-red-500/10 text-red-500" :
                      match.status === 'finished' ? "bg-emerald-500/10 text-emerald-500" :
                      "bg-slate-100 dark:bg-white/10 text-slate-500"
                    )}>
                      {match.status}{match.status === 'live' && ` • ${match.currentMinute}'`}
                    </span>
                    {match.date && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium">
                        <Calendar size={10} className="text-violet-500" /> {match.date} {match.time && `• ${match.time}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleEdit(match)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-500 dark:text-violet-400 text-sm font-black transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(match.id)}
                    className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-sm font-bold transition-all flex items-center justify-center"
                    title="Delete Match"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )) : !loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center py-24 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Search className="text-slate-300 dark:text-slate-600" size={32} />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg">No matches found</h3>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search query.</p>
              <button 
                onClick={() => { setSearchQuery(''); setFilterStatus('all'); setFilterTournament('all'); }}
                className="mt-6 text-sm font-black text-violet-500 uppercase tracking-widest hover:text-violet-400 transition-colors"
              >
                Reset All Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination Controls */}
      {otherMatches.length > matchesPerPage && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-slate-200/5 dark:border-white/5">
          <div className="text-sm text-slate-500 dark:text-gray-400 font-medium">
            Showing <span className="text-slate-900 dark:text-white font-bold">{indexOfFirstMatch + 1}</span> to <span className="text-slate-900 dark:text-white font-bold">{Math.min(indexOfLastMatch, otherMatches.length)}</span> of <span className="text-slate-900 dark:text-white font-bold">{otherMatches.length}</span> matches
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => paginate(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200/5 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsLeft size={18} />
            </button>
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200/5 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1 mx-2">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${currentPage === pageNum
                        ? "bg-brand-500 text-slate-900 shadow-lg shadow-brand-500/20"
                        : "bg-slate-50 dark:bg-gray-800 border border-slate-200/5 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:text-white"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 2 ||
                  pageNum === currentPage + 2
                ) {
                  return <span key={pageNum} className="text-gray-600">...</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200/5 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => paginate(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200/5 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageMatches;
