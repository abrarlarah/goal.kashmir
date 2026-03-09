// src/pages/LiveMatch.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, collection, addDoc, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import LineupDisplay from '../components/common/LineupDisplay';
import SubstitutionManager from '../components/common/SubstitutionManager';
import MatchPredictions from '../components/common/MatchPredictions';
import MatchTimer from '../components/common/MatchTimer';
import { cn } from '../utils/cn';
import { UserPlus, Settings, Play, Pause, Square, Info, ShieldAlert, Plus, Minus, RotateCcw, Edit3, X, Check, Activity, Shield, Trash2, Clock, Trophy, AlertTriangle } from 'lucide-react';

const LiveMatch = () => {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [matchLineups, setMatchLineups] = useState([]);
  const [showSubstitution, setShowSubstitution] = useState(null); // Track which team's substitution panel is open
  const [showScorerSelect, setShowScorerSelect] = useState(null); // { team: 'A' | 'B' }
  const [showCardSelect, setShowCardSelect] = useState(null); // { team: 'A' | 'B', type: 'yellow' | 'red' }
  const [showCancelSelect, setShowCancelSelect] = useState(null); // { team: 'A' | 'B' }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingTeams, setIsEditingTeams] = useState(false);
  const [editFormData, setEditFormData] = useState({ teamA: '', teamB: '', date: '', time: '', stadium: '' });
  const { isAdmin, isSuperAdmin, currentUser } = useAuth();
  const { players, lineups, teams, matches, tournaments } = useData();

  // Determine if this user is allowed to edit THIS match
  const canEditMatch = useMemo(() => {
    if (!isAdmin || !match) return false;
    if (isSuperAdmin) return true;
    const tournament = tournaments?.find(t => t.name === match.competition || t.id === match.tournamentId);
    return tournament ? tournament.createdBy === currentUser?.uid : false;
  }, [isAdmin, isSuperAdmin, currentUser, match, tournaments]);

  // Filter teams to only show those registered in THIS tournament
  const tournamentTeams = useMemo(() => {
    if (!match || !match.competition || !teams) return [];
    return teams.filter(team => {
      const tTournaments = Array.isArray(team.tournaments)
        ? team.tournaments
        : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
      return tTournaments.includes(match.competition);
    });
  }, [teams, match]);

  useEffect(() => {
    // Subscribe to match updates
    const matchRef = doc(db, 'matches', matchId);
    const unsubscribeMatch = onSnapshot(
      matchRef,
      (doc) => {
        if (doc.exists()) {
          setMatch({ id: doc.id, ...doc.data() });
          setLoading(false);
        } else {
          setError('Match not found');
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error getting match:', error);
        setError('Error loading match data');
        setLoading(false);
      }
    );

    // Subscribe to match events
    const eventsRef = collection(db, 'matches', matchId, 'events');
    const unsubscribeEvents = onSnapshot(
      eventsRef,
      (querySnapshot) => {
        const matchEvents = [];
        querySnapshot.forEach((doc) => {
          matchEvents.push({ id: doc.id, ...doc.data() });
        });
        setEvents(matchEvents.sort((a, b) => b.minute - a.minute)); // Sort newest first
      },
      (error) => {
        console.error('Error getting events:', error);
      }
    );

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeMatch();
      unsubscribeEvents();
    };
  }, [matchId]);

  // Update lineups when lineups data changes
  useEffect(() => {
    if (matchId && lineups) {
      const filteredLineups = lineups.filter(l => l.matchId === matchId);
      setMatchLineups(filteredLineups);
    }
  }, [matchId, lineups]);

  const getMinuteOnly = (totalSeconds) => {
    return Math.floor(totalSeconds / 60);
  };

  const calculateTotalSecondsSnapshot = (m) => {
    const baseSeconds = m.elapsedSeconds !== undefined ? m.elapsedSeconds : (m.currentMinute || 0) * 60;
    if (m.status === 'live' && m.timerRunning && m.timerLastStarted) {
      const elapsedMs = Date.now() - m.timerLastStarted;
      return baseSeconds + Math.floor(elapsedMs / 1000);
    }
    return baseSeconds;
  };

  const getTeamInfo = (teamName) => {
    return (teams || []).find(t => t.name === teamName) || {};
  };

  // Admin Functions
  const handleGoalScored = (team) => {
    setShowScorerSelect({ team });
  };

  const confirmGoal = async (team, player) => {
    const field = team === 'A' ? 'scoreA' : 'scoreB';
    const newScore = (match[field] || 0) + 1;

    try {
      // 1. Update Match Score
      await updateDoc(doc(db, 'matches', matchId), {
        [field]: newScore
      });

      // 2. Add Match Event
      const currentSecs = calculateTotalSecondsSnapshot(match);
      await addDoc(collection(db, 'matches', matchId, 'events'), {
        type: 'goal',
        team: team === 'A' ? match.teamA : match.teamB,
        minute: getMinuteOnly(currentSecs),
        seconds: currentSecs, // Exact seconds for precision sorting
        player: player ? player.name : 'Unknown Player',
        playerId: player ? player.id : null,
        timestamp: Date.now()
      });

      // 3. Update Player Total Goals (if player selected)
      if (player && player.id) {
        const playerRef = doc(db, 'players', player.id);
        const currentPlayer = players.find(p => p.id === player.id);
        await updateDoc(playerRef, {
          goals: (currentPlayer?.goals || 0) + 1
        });
      }

      setShowScorerSelect(null);
    } catch (err) {
      console.error("Error recording goal:", err);
      alert("Error recording goal. Check console.");
    }
  };

  const confirmCard = async (team, player, type) => {
    try {
      // 1. Add Match Event
      const currentSecs = calculateTotalSecondsSnapshot(match);
      await addDoc(collection(db, 'matches', matchId, 'events'), {
        type: type, // 'yellow' or 'red'
        team: team === 'A' ? match.teamA : match.teamB,
        minute: getMinuteOnly(currentSecs),
        seconds: currentSecs,
        player: player ? player.name : 'Unknown Player',
        playerId: player ? player.id : null,
        timestamp: Date.now()
      });

      // 2. Update Player Stats
      if (player && player.id) {
        const playerRef = doc(db, 'players', player.id);
        const currentPlayer = players.find(p => p.id === player.id);
        const field = type === 'yellow' ? 'yellowCards' : 'redCards';
        await updateDoc(playerRef, {
          [field]: (currentPlayer?.[field] || 0) + 1
        });
      }

      setShowCardSelect(null);
    } catch (err) {
      console.error("Error recording card:", err);
      alert("Error recording card. Check console.");
    }
  };

  const handleGoalCancelled = (team) => {
    setShowCancelSelect({ team });
  };

  const confirmCancelGoal = async (goalEvent) => {
    const teamLetter = goalEvent.team === match.teamA ? 'A' : 'B';
    const field = teamLetter === 'A' ? 'scoreA' : 'scoreB';
    const newScore = Math.max(0, (match[field] || 0) - 1);

    try {
      // 1. Update Match Score
      await updateDoc(doc(db, 'matches', matchId), {
        [field]: newScore
      });

      // 2. Delete Match Event
      await deleteDoc(doc(db, 'matches', matchId, 'events', goalEvent.id));

      // 3. Decrement Player Total Goals (if playerId exists)
      if (goalEvent.playerId) {
        const playerRef = doc(db, 'players', goalEvent.playerId);
        const currentPlayer = players.find(p => p.id === goalEvent.playerId);
        if (currentPlayer) {
          await updateDoc(playerRef, {
            goals: Math.max(0, (currentPlayer.goals || 0) - 1)
          });
        }
      }

      setShowCancelSelect(null);
    } catch (err) {
      console.error("Error cancelling goal:", err);
      alert("Error cancelling goal. Check console.");
    }
  };

  const updateScore = async (team, increment) => {
    if (increment > 0) {
      handleGoalScored(team);
      return;
    }

    if (increment < 0) {
      handleGoalCancelled(team);
      return;
    }

    const field = team === 'A' ? 'scoreA' : 'scoreB';
    const newScore = (match[field] || 0) + increment;
    if (newScore < 0) return;

    try {
      await updateDoc(doc(db, 'matches', matchId), {
        [field]: newScore
      });
    } catch (err) {
      console.error("Error updating score:", err);
    }
  };

  const updateMinute = async (incrementMins) => {
    const currentBaseSeconds = match.elapsedSeconds !== undefined ? match.elapsedSeconds : (match.currentMinute || 0) * 60;
    let newSeconds = currentBaseSeconds + (incrementMins * 60);
    if (newSeconds < 0) newSeconds = 0;

    const updates = {
      elapsedSeconds: newSeconds,
      currentMinute: Math.floor(newSeconds / 60) // Update legacy field too
    };

    // If timer is running, we need to reset the start time to now so the increment is relative to the new base
    if (match.timerRunning) {
      updates.timerLastStarted = Date.now();
    }

    try {
      await updateDoc(doc(db, 'matches', matchId), updates);
    } catch (err) {
      console.error("Error updating minute:", err);
    }
  };

  const handleUpdateTeams = async () => {
    try {
      const teamAInfo = teams.find(t => t.name === editFormData.teamA) || {};
      const teamBInfo = teams.find(t => t.name === editFormData.teamB) || {};

      const nameAChanged = match.teamA !== editFormData.teamA;
      const nameBChanged = match.teamB !== editFormData.teamB;

      // Primary match update
      await updateDoc(doc(db, 'matches', matchId), {
        teamA: editFormData.teamA,
        teamB: editFormData.teamB,
        date: editFormData.date,
        time: editFormData.time,
        stadium: editFormData.stadium,
        managerA: teamAInfo.manager || '',
        managerB: teamBInfo.manager || ''
      });

      // Optional cascading update for placeholders
      if (nameAChanged || nameBChanged) {
        let msg = "";
        if (nameAChanged && nameBChanged) msg = `Update all matches replacing "${match.teamA}" with "${editFormData.teamA}" AND "${match.teamB}" with "${editFormData.teamB}"?`;
        else if (nameAChanged) msg = `Update all matches replacing "${match.teamA}" with "${editFormData.teamA}"?`;
        else msg = `Update all matches replacing "${match.teamB}" with "${editFormData.teamB}"?`;

        if (window.confirm(msg)) {
          const batch = writeBatch(db);
          const qAList = [nameAChanged ? match.teamA : null, nameBChanged ? match.teamB : null].filter(Boolean);
          const qBList = [nameAChanged ? match.teamA : null, nameBChanged ? match.teamB : null].filter(Boolean);

          const qA = query(collection(db, 'matches'), where('tournamentId', '==', match.tournamentId), where('teamA', 'in', qAList));
          const qB = query(collection(db, 'matches'), where('tournamentId', '==', match.tournamentId), where('teamB', 'in', qBList));

          const [snapA, snapB] = await Promise.all([getDocs(qA), getDocs(qB)]);

          snapA.forEach(d => {
            const data = d.data();
            const updates = {};
            if (nameAChanged && data.teamA === match.teamA) { updates.teamA = editFormData.teamA; updates.managerA = teamAInfo.manager || ''; }
            if (nameBChanged && data.teamA === match.teamB) { updates.teamA = editFormData.teamB; updates.managerA = teamBInfo.manager || ''; }
            if (Object.keys(updates).length > 0) batch.update(d.ref, updates);
          });

          snapB.forEach(d => {
            const data = d.data();
            const updates = {};
            if (nameAChanged && data.teamB === match.teamA) { updates.teamB = editFormData.teamA; updates.managerB = teamAInfo.manager || ''; }
            if (nameBChanged && data.teamB === match.teamB) { updates.teamB = editFormData.teamB; updates.managerB = teamBInfo.manager || ''; }
            if (Object.keys(updates).length > 0) batch.update(d.ref, updates);
          });

          await batch.commit();
        }
      }

      setIsEditingTeams(false);
    } catch (err) {
      console.error("Error updating teams:", err);
      alert("Error updating team names: " + err.message);
    }
  };

  const toggleTimer = async () => {
    if (!match) return;

    try {
      if (match.timerRunning) {
        // Pause: Save exact elapsed seconds
        const elapsedMs = Date.now() - (match.timerLastStarted || Date.now());
        const additionalSeconds = Math.floor(elapsedMs / 1000);
        const currentBaseSeconds = match.elapsedSeconds !== undefined ? match.elapsedSeconds : (match.currentMinute || 0) * 60;
        const totalSeconds = currentBaseSeconds + additionalSeconds;

        await updateDoc(doc(db, 'matches', matchId), {
          timerRunning: false,
          elapsedSeconds: totalSeconds,
          currentMinute: Math.floor(totalSeconds / 60),
          timerLastStarted: null
        });
      } else {
        // Start/Resume
        await updateDoc(doc(db, 'matches', matchId), {
          timerRunning: true,
          timerLastStarted: Date.now(),
          status: 'live'
        });
      }
    } catch (err) {
      console.error("Error toggling timer:", err);
    }
  };

  const resetTimer = async () => {
    if (!window.confirm("Are you sure you want to reset the timer to 00:00?")) return;

    const updates = {
      elapsedSeconds: 0,
      currentMinute: 0,
      timerLastStarted: match.timerRunning ? Date.now() : null
    };

    try {
      await updateDoc(doc(db, 'matches', matchId), updates);
    } catch (err) {
      console.error("Error resetting timer:", err);
    }
  };

  const propagateWinner = async (currentMatch, isRemoving = false) => {
    // Only propagate for tournament knockout matches
    if (!currentMatch.tournamentId) return;
    const isKnockout = currentMatch.round !== 'Pool A' && currentMatch.round !== 'Pool B' && !currentMatch.round?.includes('Pool');
    if (!isKnockout) return;

    try {
      // 1. Determine winner name
      let winnerName = 'TBD';
      let winnerManager = '';
      if (!isRemoving) {
        if (currentMatch.scoreA > currentMatch.scoreB) {
          winnerName = currentMatch.teamA;
          winnerManager = currentMatch.managerA || '';
        } else if (currentMatch.scoreB > currentMatch.scoreA) {
          winnerName = currentMatch.teamB;
          winnerManager = currentMatch.managerB || '';
        } else {
          // It's a draw - knockout matches usually shouldn't end in a draw
          // We won't propagate if it's a draw unless there's winner logic
          return;
        }
      }

      // 2. Identify Next Match
      // Standard progression: next match is floor(matchOrder / 2) in next round
      // Handles wing offset (100+) for dual-wing brackets
      const isWingB = currentMatch.pool === 'B' || currentMatch.matchOrder >= 100;
      const baseOrder = currentMatch.matchOrder % 100;
      const nextBaseOrder = Math.floor(baseOrder / 2);

      let nextRoundOrder;
      if (currentMatch.round === 'Semi-Final') {
        nextRoundOrder = 99; // Final
      } else {
        nextRoundOrder = currentMatch.roundOrder + 1;
      }

      // Find the next match in the tournament matches list
      const nextMatch = matches.find(m =>
        m.tournamentId === currentMatch.tournamentId &&
        m.roundOrder === nextRoundOrder &&
        (nextRoundOrder === 99 ? true : (m.matchOrder === (isWingB ? nextBaseOrder + 100 : nextBaseOrder)))
      );

      if (nextMatch) {
        // Determine if winner goes to Team A or Team B of next match
        // In Final (99), Wing A is Team A, Wing B is Team B
        let teamField = 'teamA';
        let managerField = 'managerA';

        if (nextRoundOrder === 99) {
          teamField = isWingB ? 'teamB' : 'teamA';
          managerField = isWingB ? 'managerB' : 'managerA';
        } else {
          teamField = baseOrder % 2 === 0 ? 'teamA' : 'teamB';
          managerField = baseOrder % 2 === 0 ? 'managerA' : 'managerB';
        }

        await updateDoc(doc(db, 'matches', nextMatch.id), {
          [teamField]: winnerName,
          [managerField]: winnerManager
        });
      }
    } catch (err) {
      console.error("Error propagating winner:", err);
    }
  };

  const toggleMatchStatus = async () => {
    const isEnding = match.status === 'live';
    const newStatus = isEnding ? 'finished' : 'live';

    const updates = { status: newStatus };

    if (isEnding) {
      // If ending, stop timer and save final seconds
      if (match.timerRunning) {
        const elapsedMs = Date.now() - (match.timerLastStarted || Date.now());
        const additionalSeconds = Math.floor(elapsedMs / 1000);
        const currentBaseSeconds = match.elapsedSeconds !== undefined ? match.elapsedSeconds : (match.currentMinute || 0) * 60;
        const totalSeconds = currentBaseSeconds + additionalSeconds;
        updates.elapsedSeconds = totalSeconds;
        updates.currentMinute = Math.floor(totalSeconds / 60);
      }
      updates.timerRunning = false;
      updates.timerLastStarted = null;
    }

    try {
      await updateDoc(doc(db, 'matches', matchId), updates);

      // Auto-propagate winner in brackets
      if (newStatus === 'finished') {
        await propagateWinner(match);
      } else if (newStatus === 'live') {
        // If moving back to live, optionally clear the winner from the next round
        // await propagateWinner(match, true);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
        <p>Match data not available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* Admin Controls (Match Control Center) */}
        {canEditMatch && (
          <div className="mb-8 rounded-3xl overflow-hidden bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-500/20 text-brand-400 rounded-lg border border-brand-500/30">
                  <Activity size={20} className={match.status === 'live' ? "animate-pulse" : ""} />
                </div>
                <h3 className="text-white font-black uppercase tracking-widest text-lg drop-shadow-md">Match Control Center</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full border",
                  match.status === 'live' ? "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse" : 
                  match.status === 'finished' ? "bg-green-500/10 text-green-400 border-green-500/30" : 
                  "bg-slate-500/10 text-slate-400 border-slate-500/30"
                )}>
                  {match.status === 'live' ? "Live Now" : match.status === 'finished' ? "Match Ended" : "Scheduled"}
                </span>
                <button
                  onClick={() => {
                    setIsEditingTeams(!isEditingTeams);
                    setEditFormData({
                      teamA: match.teamA,
                      teamB: match.teamB,
                      date: match.date || '',
                      time: match.time || '',
                      stadium: match.stadium || ''
                    });
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
                  title="Edit Match Details"
                >
                  <Edit3 size={18} />
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Team A Score Controls */}
                <div className="bg-slate-950/50 rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    <Trophy size={64} />
                  </div>
                  <div className="text-center mb-6">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Home Team</span>
                    <h2 className="text-2xl font-black text-white truncate leading-tight mt-1" title={match.teamA}>{match.teamA}</h2>
                    <div className="text-6xl font-black text-brand-400 my-4 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">{match.scoreA || 0}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button 
                      onClick={() => updateScore('A', -1)} 
                      className="flex items-center justify-center gap-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 py-3 rounded-xl font-bold transition-all"
                    >
                      <Minus size={16} /> Goal
                    </button>
                    <button 
                      onClick={() => updateScore('A', 1)} 
                      className="flex items-center justify-center gap-1 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/30 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(14,165,233,0.1)] hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                    >
                      <Plus size={16} /> Goal
                    </button>
                  </div>

                  <div className="flex gap-2 border-t border-white/5 pt-4">
                    <button 
                      onClick={() => setShowCardSelect({ team: 'A', type: 'yellow' })} 
                      className="flex-1 flex items-center justify-center gap-1 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/30 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      <AlertTriangle size={14} /> Yellow
                    </button>
                    <button 
                      onClick={() => setShowCardSelect({ team: 'A', type: 'red' })} 
                      className="flex-1 flex items-center justify-center gap-1 bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-600/30 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      <ShieldAlert size={14} /> Red
                    </button>
                  </div>
                </div>

                {/* Main Match / Clock Controls */}
                <div className="flex flex-col gap-4">
                  {/* Timer Display */}
                  <div className="bg-slate-950/80 rounded-2xl p-6 border-2 border-slate-800 text-center flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent pointer-events-none" />
                    
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Clock size={14} /> Match Clock
                    </span>
                    
                    <div className={cn(
                      "text-6xl font-mono font-black tracking-tighter tabular-nums drop-shadow-xl",
                      match.timerRunning ? "text-brand-400" : "text-white"
                    )}>
                      <MatchTimer match={match} />
                    </div>

                    {/* Clock manipulation */}
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button onClick={() => updateMinute(-1)} className="w-12 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold border border-slate-700 transition-colors">-1</button>
                      <button onClick={() => updateMinute(1)} className="w-12 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold border border-slate-700 transition-colors">+1</button>
                      <button onClick={() => updateMinute(5)} className="px-3 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold border border-slate-700 transition-colors">+5m</button>
                      <button onClick={resetTimer} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg border border-slate-700 hover:border-red-500/30 transition-colors ml-2" title="Reset Clock to 00:00">
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Play/Pause & Match Status */}
                  <div className="grid grid-cols-2 gap-3 h-full">
                    <button
                      onClick={toggleTimer}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-wider transition-all border shadow-lg",
                        match.timerRunning 
                          ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20" 
                          : "bg-brand-500/10 text-brand-400 border-brand-500/30 hover:bg-brand-500/20 shadow-[0_0_20px_rgba(14,165,233,0.1)] hover:shadow-[0_0_20px_rgba(14,165,233,0.2)]"
                      )}
                    >
                      {match.timerRunning ? <Pause size={28} /> : <Play size={28} />}
                      <span className="text-[10px]">{match.timerRunning ? 'Pause Timer' : 'Start Timer'}</span>
                    </button>
                    
                    <button
                      onClick={toggleMatchStatus}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-wider transition-all border shadow-lg",
                        match.status === 'live' 
                          ? "bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
                          : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
                      )}
                    >
                      {match.status === 'live' ? <Square size={26} fill="currentColor" /> : <Play size={28} />}
                      <span className="text-[10px]">{match.status === 'live' ? 'End Match' : 'Start Match'}</span>
                    </button>
                  </div>
                </div>

                {/* Team B Score Controls */}
                <div className="bg-slate-950/50 rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    <Trophy size={64} />
                  </div>
                  <div className="text-center mb-6">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Away Team</span>
                    <h2 className="text-2xl font-black text-white truncate leading-tight mt-1" title={match.teamB}>{match.teamB}</h2>
                    <div className="text-6xl font-black text-brand-400 my-4 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">{match.scoreB || 0}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button 
                      onClick={() => updateScore('B', -1)} 
                      className="flex items-center justify-center gap-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 py-3 rounded-xl font-bold transition-all"
                    >
                      <Minus size={16} /> Goal
                    </button>
                    <button 
                      onClick={() => updateScore('B', 1)} 
                      className="flex items-center justify-center gap-1 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/30 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(14,165,233,0.1)] hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                    >
                      <Plus size={16} /> Goal
                    </button>
                  </div>

                  <div className="flex gap-2 border-t border-white/5 pt-4">
                    <button 
                      onClick={() => setShowCardSelect({ team: 'B', type: 'yellow' })} 
                      className="flex-1 flex items-center justify-center gap-1 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/30 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      <AlertTriangle size={14} /> Yellow
                    </button>
                    <button 
                      onClick={() => setShowCardSelect({ team: 'B', type: 'red' })} 
                      className="flex-1 flex items-center justify-center gap-1 bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-600/30 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      <ShieldAlert size={14} /> Red
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Editing Teams Panel (Drops down when hitting edit) */}
            {isEditingTeams && (
              <div className="border-t border-brand-500/30 bg-slate-900/90 p-6 animate-in slide-in-from-top-4 relative">
                <button onClick={() => setIsEditingTeams(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                  <X size={20} />
                </button>
                <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-brand-400 mb-6">
                  <Settings size={16} /> Edit Match Details
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2">
                    <label className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 block">Home Team</label>
                    <select
                      value={editFormData.teamA}
                      onChange={(e) => setEditFormData({ ...editFormData, teamA: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                    >
                      <option value="">Select Home Team</option>
                      {tournamentTeams.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                      {!tournamentTeams.find(t => t.name === (match.teamA || '')) && match.teamA && (
                        <option value={match.teamA}>{match.teamA} (Not in Tournament)</option>
                      )}
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 block">Away Team</label>
                    <select
                      value={editFormData.teamB}
                      onChange={(e) => setEditFormData({ ...editFormData, teamB: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                    >
                      <option value="">Select Away Team</option>
                      {tournamentTeams.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                      {!tournamentTeams.find(t => t.name === (match.teamB || '')) && match.teamB && (
                        <option value={match.teamB}>{match.teamB} (Not in Tournament)</option>
                      )}
                    </select>
                  </div>

                  <div className="flex items-end">
                     <button
                        onClick={handleUpdateTeams}
                        className="w-full h-[50px] bg-brand-500 hover:bg-brand-400 text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                      >
                        <Check size={16} /> Save
                      </button>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 block">Date</label>
                    <input
                      type="date"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 block">Time</label>
                    <input
                      type="time"
                      value={editFormData.time}
                      onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 block">Venue</label>
                    <input
                      type="text"
                      placeholder="Stadium"
                      value={editFormData.stadium}
                      onChange={(e) => setEditFormData({ ...editFormData, stadium: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Popups for Goal Scorer and Cards */}
            {(showScorerSelect || showCardSelect || showCancelSelect) && (
              <div className="border-t border-white/10 bg-slate-950/80 p-6 animate-in slide-in-from-bottom-4 relative">
                
                {/* Cancel Goal Context */}
                {showCancelSelect && (
                  <div className="border border-red-500/30 bg-red-500/5 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-5">
                      <h4 className="text-red-400 font-bold flex items-center gap-2">
                        <Trash2 size={18} /> Cancel Goal for {showCancelSelect.team === 'A' ? match.teamA : match.teamB}
                      </h4>
                      <button onClick={() => setShowCancelSelect(null)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400"><X size={16} /></button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {events.filter(e => e.type === 'goal' && e.team === (showCancelSelect.team === 'A' ? match.teamA : match.teamB)).length > 0 ? (
                        events.filter(e => e.type === 'goal' && e.team === (showCancelSelect.team === 'A' ? match.teamA : match.teamB)).map(goal => (
                          <div key={goal.id} className="flex justify-between items-center bg-slate-900 border border-white/5 p-3 rounded-xl hover:border-red-500/30 transition-colors">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                              <span className="text-brand-400 p-1 bg-brand-500/10 rounded">{goal.minute}'</span> {goal.player}
                            </span>
                            <button
                              onClick={() => confirmCancelGoal(goal)}
                              className="bg-red-500/20 hover:bg-red-500 border border-red-500/50 hover:text-slate-900 text-red-500 text-xs py-1.5 px-4 rounded-lg font-black uppercase tracking-widest transition-all"
                            >
                              Revoke Goal
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-slate-500 py-6 border border-dashed border-white/10 rounded-xl font-bold">
                          No goal events recorded yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Confirm Goal / Card Scorer Context */}
                {(showScorerSelect || showCardSelect) && (
                  <div className={cn(
                    "border rounded-2xl p-5",
                    showScorerSelect ? "bg-brand-500/5 border-brand-500/30" :
                    showCardSelect?.type === 'yellow' ? "bg-yellow-500/5 border-yellow-500/30" : "bg-red-500/5 border-red-500/30"
                  )}>
                    <div className="flex justify-between items-center mb-5">
                      <h4 className={cn(
                        "font-bold flex items-center gap-2 text-lg",
                        showScorerSelect ? "text-brand-400" : showCardSelect?.type === 'yellow' ? "text-yellow-500" : "text-red-500"
                      )}>
                        {showScorerSelect ? <Trophy size={20} /> : <AlertTriangle size={20} />}
                        Select Player for {showScorerSelect ? 'Goal' : `${showCardSelect.type} Card`}
                        <span className="text-white ml-2 opacity-50 px-2 py-0.5 bg-slate-800 rounded text-xs uppercase tracking-widest border border-white/10">
                          {showScorerSelect ? (showScorerSelect.team === 'A' ? match.teamA : match.teamB) : (showCardSelect.team === 'A' ? match.teamA : match.teamB)}
                        </span>
                      </h4>
                      <button onClick={() => {setShowScorerSelect(null); setShowCardSelect(null)}} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400"><X size={16} /></button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {players
                        .filter(p => p.team === (showScorerSelect ? (showScorerSelect.team === 'A' ? match.teamA : match.teamB) : (showCardSelect.team === 'A' ? match.teamA : match.teamB)))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(player => (
                          <button
                            key={player.id}
                            onClick={() => showScorerSelect ? confirmGoal(showScorerSelect.team, player) : confirmCard(showCardSelect.team, player, showCardSelect.type)}
                            className={cn(
                              "text-left p-3 rounded-xl border font-bold text-sm transition-all flex items-center gap-2 truncate",
                              showScorerSelect ? "bg-slate-900 border-white/5 hover:border-brand-500 text-slate-300 hover:text-brand-400" :
                              showCardSelect?.type === 'yellow' ? "bg-slate-900 border-white/5 hover:border-yellow-500 text-slate-300 hover:text-yellow-500" :
                              "bg-slate-900 border-white/5 hover:border-red-500 text-slate-300 hover:text-red-500"
                            )}
                            title={player.name}
                          >
                            <span className="w-6 h-6 shrink-0 bg-slate-800 rounded-md flex items-center justify-center text-[10px] text-slate-500">{player.number || '#'}</span>
                            <span className="truncate">{player.name}</span>
                          </button>
                        ))}
                      <button
                        onClick={() => showScorerSelect ? confirmGoal(showScorerSelect.team, null) : confirmCard(showCardSelect.team, null, showCardSelect.type)}
                        className="p-3 rounded-xl border border-dashed border-white/20 hover:border-white/50 bg-transparent text-slate-400 hover:text-white font-bold text-sm transition-all flex items-center justify-center italic"
                      >
                        Select Unknown / Other
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Match Header */}
        <div className="bg-gray-800 rounded-t-lg p-6 text-center shadow-lg border-b border-gray-700">
          <div className="text-sm text-gray-400 mb-2 uppercase tracking-[0.2em]">
            {match.competition} • {match.status === 'live' ? 'Live' : 'Finished'}
          </div>
          <div className="text-[11px] text-gray-500 mb-4 flex items-center justify-center gap-1">
            <span>🏟️ {match.stadium || getTeamInfo(match.teamA).stadium || 'Unknown Stadium'}</span>
          </div>
          <div className="flex items-start justify-center space-x-4">
            {/* Team A Info & Scorers */}
            <div className="flex-1 text-right">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{match.teamA}</div>
              <div className="text-xs text-gray-400 mb-3 italic">Manager: {match.managerA || 'N/A'}</div>

              {/* Scorers A */}
              <div className="space-y-1">
                {events
                  .filter(e => e.type === 'goal' && e.team === match.teamA)
                  .sort((a, b) => a.minute - b.minute)
                  .map((goal, idx) => (
                    <div key={idx} className="text-[11px] text-gray-300 flex items-center justify-end gap-1.5">
                      <span>{goal.player}</span>
                      <span className="text-gray-500 font-mono">{goal.minute}'</span>
                      <span className="text-yellow-500">⚽</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Score & Time */}
            <div className="mx-6 text-center min-w-[120px]">
              <div className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">
                {match.scoreA} - {match.scoreB}
              </div>
              <div className="text-sm">
                {match.status === 'live' ? (
                  <div className="inline-flex items-center gap-2 bg-red-900/30 text-red-500 px-3 py-1 rounded-full font-bold border border-red-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className={cn("absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75", match.timerRunning && "animate-ping")}></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <MatchTimer match={match} />
                  </div>
                ) : (
                  <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Full Time</span>
                )}
              </div>
            </div>

            {/* Team B Info & Scorers */}
            <div className="flex-1 text-left">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{match.teamB}</div>
              <div className="text-xs text-gray-400 mb-3 italic">Manager: {match.managerB || 'N/A'}</div>

              {/* Scorers B */}
              <div className="space-y-1">
                {events
                  .filter(e => e.type === 'goal' && e.team === match.teamB)
                  .sort((a, b) => a.minute - b.minute)
                  .map((goal, idx) => (
                    <div key={idx} className="text-[11px] text-gray-300 flex items-center justify-start gap-1.5">
                      <span className="text-yellow-500">⚽</span>
                      <span>{goal.player}</span>
                      <span className="text-gray-500 font-mono">{goal.minute}'</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Match Statistics */}
        <div className="bg-gray-700 p-4 grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="font-medium">Possession</div>
            <div className="flex items-center justify-center mt-1">
              <span className="w-10 text-right">{match.possessionA || 50}%</span>
              <div className="mx-2 w-32 h-2 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${match.possessionA || 50}%` }}
                ></div>
              </div>
              <span className="w-10 text-left">{match.possessionB || 50}%</span>
            </div>
          </div>
          <div>
            <div className="font-medium">Shots</div>
            <div>{match.shotsA || 0} - {match.shotsB || 0}</div>
          </div>
          <div>
            <div className="font-medium">Shots on Target</div>
            <div>{match.shotsOnTargetA || 0} - {match.shotsOnTargetB || 0}</div>
          </div>
        </div>

        {/* Match Predictions / Voting */}
        <div className="mb-8">
          <MatchPredictions matchId={matchId} teamA={match.teamA} teamB={match.teamB} />
        </div>

        {/* Team Lineups Section */}
        <div className="bg-gray-800 p-6 mt-6 rounded-lg relative overflow-hidden">
          {/* Header with Admin Manage Button */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-brand-500 rounded-full"></span>
              Team Lineups
            </h3>
            {canEditMatch && (
              <Link
                to={`/admin/lineups/${matchId}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 rounded-lg text-xs font-black uppercase tracking-wider transition-all border border-brand-500/20"
              >
                <Settings size={14} /> Manage Lineups
              </Link>
            )}
          </div>

          {matchLineups.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {matchLineups.map(lineup => (
                <div key={lineup.id} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{lineup.teamName}</h4>
                    {canEditMatch && match.status === 'live' && (
                      <button
                        onClick={() => setShowSubstitution(showSubstitution === lineup.id ? null : lineup.id)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-slate-900 dark:text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        {showSubstitution === lineup.id ? 'Hide Sub' : '🔄 Sub'}
                      </button>
                    )}
                  </div>

                  {/* Substitution Manager */}
                  {canEditMatch && showSubstitution === lineup.id && (
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-4">
                      <SubstitutionManager
                        lineup={lineup}
                        players={players}
                        onSubstitutionComplete={() => setShowSubstitution(null)}
                      />
                    </div>
                  )}

                  {/* Lineup Display */}
                  <LineupDisplay lineup={lineup} players={players} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center">
              <UserPlus className="w-10 h-10 text-slate-600 mb-3 opacity-20" />
              <p className="text-slate-500 text-sm mb-4">No lineups have been added for this match yet.</p>
              {canEditMatch && (
                <Link
                  to={`/admin/lineups/${matchId}`}
                  className="px-6 py-2 bg-brand-500 text-slate-900 rounded-lg font-bold text-sm hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/20"
                >
                  Add Match Lineup
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Match Timeline/Events */}
        <div className="bg-gray-800 rounded-b-lg p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="h-2 w-2 bg-brand-500 rounded-full"></span>
            Match Timeline
          </h3>
          {events.length > 0 ? (
            <div className="relative border-l-2 border-gray-700 ml-4 pl-8 space-y-8">
              {events.sort((a, b) => b.minute - a.minute).map((event) => (
                <div
                  key={event.id}
                  className="relative"
                >
                  <div className="absolute -left-[41px] top-1 h-4 w-4 rounded-full bg-gray-800 border-2 border-brand-500 flex items-center justify-center z-10">
                    <span className="h-1.5 w-1.5 bg-brand-500 rounded-full"></span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-900 px-3 py-1 rounded text-xs font-bold text-brand-400 whitespace-nowrap min-w-[50px] text-center">
                      {event.minute}'
                    </div>
                    <div className="flex-1 bg-gray-700/50 p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 transition-colors">
                      {event.type === 'goal' && (
                        <div className="flex items-center gap-3">
                          <span className="text-xl">⚽</span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white text-lg">{event.player}</span>
                            <span className="text-gray-400 ml-2 block text-xs uppercase tracking-wider">Goal for {event.team}</span>
                          </div>
                        </div>
                      )}
                      {(event.type === 'yellow' || event.type === 'red') && (
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-5 w-4 rounded-sm shadow-sm",
                            event.type === 'yellow' ? "bg-yellow-400" : "bg-red-600"
                          )} />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white text-lg">{event.player}</span>
                            <span className="text-gray-400 ml-2 block text-xs uppercase tracking-wider">
                              {event.type === 'yellow' ? 'Yellow Card' : 'Red Card'} ({event.team})
                            </span>
                          </div>
                        </div>
                      )}
                      {event.type === 'substitution' && (
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🔄</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-green-400 font-bold tracking-tight">⬆️ {event.playerIn}</span>
                              <span className="text-gray-600">/</span>
                              <span className="text-red-400 font-bold tracking-tight opacity-80">⬇️ {event.playerOut}</span>
                            </div>
                            <span className="text-gray-400 block text-xs uppercase tracking-wider mt-0.5">Substitution ({event.team})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 bg-gray-900/50 rounded-2xl border border-dashed border-gray-700">
              Awaiting match events...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveMatch;