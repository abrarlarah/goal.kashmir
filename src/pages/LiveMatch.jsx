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
import { motion } from 'framer-motion';
import { UserPlus, Settings, Play, Pause, Square, Info, ShieldAlert, Plus, Minus, RotateCcw, Edit3, X, Check, Activity, Shield, Trash2, Clock, Trophy, AlertTriangle, Share2 } from 'lucide-react';
import { handleShare } from '../utils/shareUtils';

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
    setShowScorerSelect({ team, step: 'scorer', scorer: null, goalType: 'regular' });
  };

  const confirmGoal = async (team, scorerPlayer, assistPlayer = null, goalType = 'regular') => {
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
        player: scorerPlayer ? scorerPlayer.name : 'Unknown Player',
        playerId: scorerPlayer ? scorerPlayer.id : null,
        assist: assistPlayer ? assistPlayer.name : null,
        assistId: assistPlayer ? assistPlayer.id : null,
        goalType: goalType,
        isFreekick: goalType === 'freekick',
        isPenalty: goalType === 'penalty',
        timestamp: Date.now()
      });

      // 3. Update Player Total Goals and Assists
      if (scorerPlayer && scorerPlayer.id) {
        const playerRef = doc(db, 'players', scorerPlayer.id);
        const currentPlayer = players.find(p => p.id === scorerPlayer.id);
        if (currentPlayer) {
          await updateDoc(playerRef, {
            goals: (currentPlayer.goals || 0) + 1
          });
        }
      }

      if (assistPlayer && assistPlayer.id) {
        const assistRef = doc(db, 'players', assistPlayer.id);
        const currentAssistPlayer = players.find(p => p.id === assistPlayer.id);
        if (currentAssistPlayer) {
          await updateDoc(assistRef, {
            assists: (currentAssistPlayer.assists || 0) + 1
          });
        }
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

      // 4. Decrement Assist (if assistId exists)
      if (goalEvent.assistId) {
        const assistRef = doc(db, 'players', goalEvent.assistId);
        const currentAssistPlayer = players.find(p => p.id === goalEvent.assistId);
        if (currentAssistPlayer) {
          await updateDoc(assistRef, {
            assists: Math.max(0, (currentAssistPlayer.assists || 0) - 1)
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
    // Current rotation: Scheduled -> Live -> Half Time -> Live -> Finished -> Scheduled
    // But since this button starts/ends, we might want a separate Half Time button.
    // Let's modify toggleMatchStatus to be Start/End, and add a separate toggleHalfTime.
    
    const isEnding = match.status === 'live' || match.status === 'halftime';
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
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const toggleHalfTime = async () => {
    const isCurrentlyHT = match.status === 'halftime';
    const newStatus = isCurrentlyHT ? 'live' : 'halftime';

    const updates = { status: newStatus };

    // If entering Halftime, stop timer
    if (!isCurrentlyHT && match.timerRunning) {
      const elapsedMs = Date.now() - (match.timerLastStarted || Date.now());
      const additionalSeconds = Math.floor(elapsedMs / 1000);
      const currentBaseSeconds = match.elapsedSeconds !== undefined ? match.elapsedSeconds : (match.currentMinute || 0) * 60;
      const totalSeconds = currentBaseSeconds + additionalSeconds;
      updates.elapsedSeconds = totalSeconds;
      updates.currentMinute = Math.floor(totalSeconds / 60);
      updates.timerRunning = false;
      updates.timerLastStarted = null;
    } 
    // If ending halftime, don't automatically restart clock, let user press play

    try {
      await updateDoc(doc(db, 'matches', matchId), updates);
    } catch (err) {
      console.error("Error toggling halftime:", err);
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* ═══ HEADER ═══ */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-sm font-medium mb-4">
              <Activity size={14} className="animate-pulse" /> Live Coverage
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Match <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Center</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-sm md:text-base">
              Track live scores, fixtures and statistics in real-time.
            </p>
          </div>
          <div className="flex items-center gap-3">
              <button
                  onClick={() => handleShare(
                      `${match.teamA} vs ${match.teamB}`,
                      `Check out the match between ${match.teamA} and ${match.teamB} on Goal Kashmir!`,
                      `/live/${matchId}`
                  )}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-500/10 hover:bg-brand-500 text-brand-600 dark:text-brand-400 hover:text-slate-900 dark:text-white rounded-xl font-bold transition-all"
              >
                  <Share2 size={18} />
                  Share Match
              </button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto">

        {/* Admin Controls (Match Control Center) */}
        {canEditMatch && (
          <div className="mb-8 rounded-3xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/10 dark:border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 border-b border-slate-200/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-500/20 text-brand-400 rounded-lg border border-brand-500/30">
                  <Activity size={20} className={match.status === 'live' ? "animate-pulse" : ""} />
                </div>
                <h3 className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-lg drop-shadow-md">Match Control Center</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full border",
                  match.status === 'live' ? "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse" : 
                  match.status === 'finished' ? "bg-green-500/10 text-green-400 border-green-500/30" : 
                  "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30"
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
                  className="p-2 hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors border border-transparent hover:border-slate-200/10 dark:border-white/10"
                  title="Edit Match Details"
                >
                  <Edit3 size={18} />
                </button>
              </div>
            </div>

            <div className="p-2 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">

                {/* Team A Score Controls */}
                <div className="bg-slate-950/50 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/5 dark:border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    <Trophy size={64} />
                  </div>
                  <div className="text-center mb-3 sm:mb-6">
                    <span className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Home Team</span>
                    <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate leading-tight mt-0.5 sm:mt-1" title={match.teamA}>{match.teamA}</h2>
                    <div className="text-3xl sm:text-6xl font-black text-brand-400 my-2 sm:my-4 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">{match.scoreA || 0}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                    <button 
                      onClick={() => updateScore('A', -1)} 
                      className="flex items-center justify-center gap-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all text-[10px] sm:text-base"
                    >
                      <Minus size={12} className="sm:w-4 sm:h-4" /> Goal
                    </button>
                    <button 
                      onClick={() => updateScore('A', 1)} 
                      className="flex items-center justify-center gap-1 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/30 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(14,165,233,0.1)] hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] text-[10px] sm:text-base"
                    >
                      <Plus size={12} className="sm:w-4 sm:h-4" /> Goal
                    </button>
                  </div>

                  <div className="flex gap-2 border-t border-slate-200/5 dark:border-white/5 pt-4">
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
                <div className="flex flex-col gap-2 sm:gap-4 order-first lg:order-none sm:col-span-2 lg:col-span-1">
                  {/* Timer Display */}
                  <div className="bg-slate-950/80 rounded-xl sm:rounded-2xl p-3 sm:p-6 border-2 border-slate-800 text-center flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent pointer-events-none" />
                    
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Clock size={14} /> Match Clock
                    </span>
                    
                    <div className={cn(
                      "text-3xl sm:text-6xl font-mono font-black tracking-tighter tabular-nums drop-shadow-xl",
                      match.timerRunning ? "text-brand-400" : "text-slate-900 dark:text-white"
                    )}>
                      <MatchTimer match={match} />
                    </div>

                    {/* Clock manipulation */}
                    <div className="flex items-center justify-center gap-1 sm:gap-2 mt-2 sm:mt-6 w-full">
                      <button onClick={() => updateMinute(-1)} className="flex-1 h-8 sm:h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded sm:rounded-lg text-[10px] sm:text-sm font-bold border border-slate-200 dark:border-slate-700 transition-colors">-1</button>
                      <button onClick={() => updateMinute(1)} className="flex-1 h-8 sm:h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded sm:rounded-lg text-[10px] sm:text-sm font-bold border border-slate-200 dark:border-slate-700 transition-colors">+1</button>
                      <button onClick={() => updateMinute(5)} className="flex-1 h-8 sm:h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded sm:rounded-lg text-[10px] sm:text-sm font-bold border border-slate-200 dark:border-slate-700 transition-colors">+5m</button>
                      <button onClick={resetTimer} className="flex-1 h-8 sm:h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded sm:rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-500/30 transition-colors" title="Reset Clock to 00:00">
                        <RotateCcw size={12} className="sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 h-full">
                    <button
                      onClick={toggleTimer}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 py-2 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all border shadow-lg",
                        match.timerRunning 
                          ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20" 
                          : "bg-brand-500/10 text-brand-400 border-brand-500/30 hover:bg-brand-500/20 shadow-[0_0_20px_rgba(14,165,233,0.1)] hover:shadow-[0_0_20px_rgba(14,165,233,0.2)]"
                      )}
                    >
                      {match.timerRunning ? <Pause size={16} className="sm:w-[28px] sm:h-[28px]" /> : <Play size={16} className="sm:w-[28px] sm:h-[28px]" />}
                      <span className="text-[8px] sm:text-[10px]">{match.timerRunning ? 'Pause Clock' : 'Current Time'}</span>
                    </button>
                    
                    <button
                      onClick={toggleHalfTime}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 py-1 sm:py-2 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all border shadow-lg",
                        match.status === 'halftime' 
                          ? "bg-orange-500/10 text-orange-500 border-orange-500/30 hover:bg-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)] hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]" 
                          : "bg-slate-100/30 dark:bg-slate-700/30 text-slate-600 dark:text-slate-300 border-slate-600/30 hover:bg-slate-600/40"
                      )}
                    >
                      <Clock size={16} className="sm:w-[26px] sm:h-[26px]" />
                      <span className="text-[8px] sm:text-[10px] text-center leading-tight">
                        {match.status === 'halftime' ? 'End HalfTime' : 'Half Time'}
                      </span>
                    </button>

                    <button
                      onClick={toggleMatchStatus}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 py-2 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all border shadow-lg",
                        (match.status === 'live' || match.status === 'halftime')
                          ? "bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
                          : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
                      )}
                    >
                      {(match.status === 'live' || match.status === 'halftime') ? <Square size={16} fill="currentColor" className="sm:w-[26px] sm:h-[26px]" /> : <Play size={16} className="sm:w-[28px] sm:h-[28px]" />}
                      <span className="text-[8px] sm:text-[10px]">{(match.status === 'live' || match.status === 'halftime') ? 'End Match' : 'Start Match'}</span>
                    </button>
                  </div>
                </div>

                {/* Team B Score Controls */}
                <div className="bg-slate-950/50 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/5 dark:border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    <Trophy size={64} />
                  </div>
                  <div className="text-center mb-3 sm:mb-6">
                    <span className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Away Team</span>
                    <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate leading-tight mt-0.5 sm:mt-1" title={match.teamB}>{match.teamB}</h2>
                    <div className="text-3xl sm:text-6xl font-black text-brand-400 my-2 sm:my-4 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">{match.scoreB || 0}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                    <button 
                      onClick={() => updateScore('B', -1)} 
                      className="flex items-center justify-center gap-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all text-[10px] sm:text-base"
                    >
                      <Minus size={12} className="sm:w-4 sm:h-4" /> Goal
                    </button>
                    <button 
                      onClick={() => updateScore('B', 1)} 
                      className="flex items-center justify-center gap-1 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/30 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(14,165,233,0.1)] hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] text-[10px] sm:text-base"
                    >
                      <Plus size={12} className="sm:w-4 sm:h-4" /> Goal
                    </button>
                  </div>

                  <div className="flex gap-2 border-t border-slate-200/5 dark:border-white/5 pt-4">
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
              <div className="border-t border-brand-500/30 bg-white/90 dark:bg-slate-900/90 p-6 animate-in slide-in-from-top-4 relative">
                <button onClick={() => setIsEditingTeams(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 dark:text-white rounded-full hover:bg-white/5 transition-colors">
                  <X size={20} />
                </button>
                <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-brand-400 mb-6">
                  <Settings size={16} /> Edit Match Details
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2">
                    <label className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-bold mb-1.5 block">Home Team</label>
                    <select
                      value={editFormData.teamA}
                      onChange={(e) => setEditFormData({ ...editFormData, teamA: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
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
                    <label className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-bold mb-1.5 block">Away Team</label>
                    <select
                      value={editFormData.teamB}
                      onChange={(e) => setEditFormData({ ...editFormData, teamB: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
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
                    <label className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-bold mb-1.5 block">Date</label>
                    <input
                      type="date"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-bold mb-1.5 block">Time</label>
                    <input
                      type="time"
                      value={editFormData.time}
                      onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-bold mb-1.5 block">Venue</label>
                    <input
                      type="text"
                      placeholder="Stadium"
                      value={editFormData.stadium}
                      onChange={(e) => setEditFormData({ ...editFormData, stadium: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-brand-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Popups for Goal Scorer and Cards */}
            {(showScorerSelect || showCardSelect || showCancelSelect) && (
              <div className="border-t border-slate-200/10 dark:border-white/10 bg-slate-950/80 p-6 animate-in slide-in-from-bottom-4 relative">
                
                {/* Cancel Goal Context */}
                {showCancelSelect && (
                  <div className="border border-red-500/30 bg-red-500/5 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-5">
                      <h4 className="text-red-400 font-bold flex items-center gap-2">
                        <Trash2 size={18} /> Cancel Goal for {showCancelSelect.team === 'A' ? match.teamA : match.teamB}
                      </h4>
                      <button onClick={() => setShowCancelSelect(null)} className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400"><X size={16} /></button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {events.filter(e => e.type === 'goal' && e.team === (showCancelSelect.team === 'A' ? match.teamA : match.teamB)).length > 0 ? (
                        events.filter(e => e.type === 'goal' && e.team === (showCancelSelect.team === 'A' ? match.teamA : match.teamB)).map(goal => (
                          <div key={goal.id} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200/5 dark:border-white/5 p-3 rounded-xl hover:border-red-500/30 transition-colors">
                            <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
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
                        <div className="text-center text-slate-500 py-6 border border-dashed border-slate-200/10 dark:border-white/10 rounded-xl font-bold">
                          No goal events recorded yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Confirm Goal Scorer Context */}
                {showScorerSelect && (
                  <div className="border border-brand-500/30 bg-brand-500/5 rounded-2xl p-5 mb-4">
                    <div className="flex justify-between items-center mb-5">
                      <h4 className="font-bold flex items-center gap-2 text-lg text-brand-400">
                        <Trophy size={20} />
                        {showScorerSelect.step === 'scorer' ? 'Select Goal Scorer' : 'Select Assist'}
                        <span className="text-slate-900 dark:text-white ml-2 opacity-50 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded text-xs uppercase tracking-widest border border-slate-200/10 dark:border-white/10">
                          {showScorerSelect.team === 'A' ? match.teamA : match.teamB}
                        </span>
                      </h4>
                      <button onClick={() => setShowScorerSelect(null)} className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400"><X size={16} /></button>
                    </div>

                    {showScorerSelect.step === 'scorer' && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        <label className={cn("flex flex-1 items-center justify-center gap-2 text-xs sm:text-sm font-bold p-3 rounded-xl border cursor-pointer transition-colors min-w-[100px]", showScorerSelect.goalType === 'regular' || !showScorerSelect.goalType ? "bg-brand-500/10 border-brand-500/30 text-brand-400" : "bg-white/50 dark:bg-slate-900/50 border-slate-200/5 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-brand-500/30")}>
                          <input 
                            type="radio" 
                            name="goalType"
                            className="hidden"
                            checked={showScorerSelect.goalType === 'regular' || !showScorerSelect.goalType}
                            onChange={() => setShowScorerSelect(prev => ({ ...prev, goalType: 'regular' }))}
                          />
                          Regular Goal
                        </label>
                        <label className={cn("flex flex-1 items-center justify-center gap-2 text-xs sm:text-sm font-bold p-3 rounded-xl border cursor-pointer transition-colors min-w-[100px]", showScorerSelect.goalType === 'freekick' ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "bg-white/50 dark:bg-slate-900/50 border-slate-200/5 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-orange-500/30")}>
                          <input 
                            type="radio" 
                            name="goalType"
                            className="hidden"
                            checked={showScorerSelect.goalType === 'freekick'}
                            onChange={() => setShowScorerSelect(prev => ({ ...prev, goalType: 'freekick' }))}
                          />
                          Free Kick
                        </label>
                        <label className={cn("flex flex-1 items-center justify-center gap-2 text-xs sm:text-sm font-bold p-3 rounded-xl border cursor-pointer transition-colors min-w-[100px]", showScorerSelect.goalType === 'penalty' ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-white/50 dark:bg-slate-900/50 border-slate-200/5 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-red-500/30")}>
                          <input 
                            type="radio" 
                            name="goalType"
                            className="hidden"
                            checked={showScorerSelect.goalType === 'penalty'}
                            onChange={() => setShowScorerSelect(prev => ({ ...prev, goalType: 'penalty' }))}
                          />
                          Penalty Goal
                        </label>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {players
                        .filter(p => p.team === (showScorerSelect.team === 'A' ? match.teamA : match.teamB))
                        .filter(p => showScorerSelect.step === 'scorer' || p.id !== showScorerSelect.scorer?.id)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(player => (
                          <button
                            key={player.id}
                            onClick={() => {
                              if (showScorerSelect.step === 'scorer') {
                                setShowScorerSelect(prev => ({ ...prev, step: 'assist', scorer: player }));
                              } else {
                                confirmGoal(showScorerSelect.team, showScorerSelect.scorer, player, showScorerSelect.goalType || 'regular');
                              }
                            }}
                            className="text-left p-3 rounded-xl border font-bold text-sm transition-all flex items-center gap-2 truncate bg-white dark:bg-slate-900 border-slate-200/5 dark:border-white/5 hover:border-brand-500 text-slate-600 dark:text-slate-300 hover:text-brand-400"
                            title={player.name}
                          >
                            <span className="w-6 h-6 shrink-0 bg-slate-50 dark:bg-slate-800 rounded-md flex items-center justify-center text-[10px] text-slate-500">{player.number || '#'}</span>
                            <span className="truncate">{player.name}</span>
                          </button>
                        ))}
                      <button
                        onClick={() => {
                          if (showScorerSelect.step === 'scorer') {
                            setShowScorerSelect(prev => ({ ...prev, step: 'assist', scorer: null }));
                          } else {
                            confirmGoal(showScorerSelect.team, showScorerSelect.scorer, null, showScorerSelect.goalType || 'regular');
                          }
                        }}
                        className="p-3 rounded-xl border border-dashed border-slate-200/20 dark:border-white/20 hover:border-slate-200/50 dark:border-white/50 bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white font-bold text-sm transition-all flex items-center justify-center italic"
                      >
                        {showScorerSelect.step === 'scorer' ? 'Select Unknown / Other' : 'No Assist'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm Card Context */}
                {showCardSelect && (
                  <div className={cn(
                    "border rounded-2xl p-5 mb-4",
                    showCardSelect.type === 'yellow' ? "bg-yellow-500/5 border-yellow-500/30" : "bg-red-500/5 border-red-500/30"
                  )}>
                    <div className="flex justify-between items-center mb-5">
                      <h4 className={cn(
                        "font-bold flex items-center gap-2 text-lg",
                        showCardSelect.type === 'yellow' ? "text-yellow-500" : "text-red-500"
                      )}>
                        <AlertTriangle size={20} />
                        Select Player for {showCardSelect.type} Card
                        <span className="text-slate-900 dark:text-white ml-2 opacity-50 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded text-xs uppercase tracking-widest border border-slate-200/10 dark:border-white/10">
                          {showCardSelect.team === 'A' ? match.teamA : match.teamB}
                        </span>
                      </h4>
                      <button onClick={() => setShowCardSelect(null)} className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400"><X size={16} /></button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {players
                        .filter(p => p.team === (showCardSelect.team === 'A' ? match.teamA : match.teamB))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(player => (
                          <button
                            key={player.id}
                            onClick={() => confirmCard(showCardSelect.team, player, showCardSelect.type)}
                            className={cn(
                              "text-left p-3 rounded-xl border font-bold text-sm transition-all flex items-center gap-2 truncate",
                              showCardSelect.type === 'yellow' ? "bg-white dark:bg-slate-900 border-slate-200/5 dark:border-white/5 hover:border-yellow-500 text-slate-600 dark:text-slate-300 hover:text-yellow-500" :
                              "bg-white dark:bg-slate-900 border-slate-200/5 dark:border-white/5 hover:border-red-500 text-slate-600 dark:text-slate-300 hover:text-red-500"
                            )}
                            title={player.name}
                          >
                            <span className="w-6 h-6 shrink-0 bg-slate-50 dark:bg-slate-800 rounded-md flex items-center justify-center text-[10px] text-slate-500">{player.number || '#'}</span>
                            <span className="truncate">{player.name}</span>
                          </button>
                        ))}
                      <button
                        onClick={() => confirmCard(showCardSelect.team, null, showCardSelect.type)}
                        className="p-3 rounded-xl border border-dashed border-slate-200/20 dark:border-white/20 hover:border-slate-200/50 dark:border-white/50 bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white font-bold text-sm transition-all flex items-center justify-center italic"
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

        {/* ═══ PREMIUM MATCH SCOREBOARD ═══ */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-brand-500/10">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/15 via-brand-500/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-emerald-500/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-500/5 to-transparent"></div>

          <div className="relative z-10 p-6 sm:p-8">
            {/* Competition & Status */}
            <div className="text-center mb-6">
              <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-[0.3em] font-bold mb-1">
                {match.competition}
                {match.status === 'live' && <span className="text-red-400 ml-2 animate-pulse">● LIVE</span>}
                {match.status === 'halftime' && <span className="text-orange-400 ml-2">● HALF TIME</span>}
                {match.status === 'finished' && <span className="text-emerald-400 ml-2">● FULL TIME</span>}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <span>🏟️</span>
                <span>{match.stadium || getTeamInfo(match.teamA).stadium || 'Stadium TBD'}</span>
              </div>
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6">
              {/* Team A */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-400/20 flex items-center justify-center shadow-lg shadow-emerald-500/10 backdrop-blur-sm">
                  {getTeamInfo(match.teamA).logoUrl ? (
                    <img src={getTeamInfo(match.teamA).logoUrl} alt={match.teamA} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black text-emerald-300">{match.teamA?.charAt(0)}</span>
                  )}
                </div>
                <h2 className="text-base sm:text-xl font-black text-white truncate max-w-[140px] sm:max-w-[200px] mx-auto">{match.teamA}</h2>
                <p className="text-[10px] sm:text-xs text-emerald-400/60 italic">Manager: {match.managerA || 'N/A'}</p>
              </div>

              {/* Score Center */}
              <div className="text-center flex-shrink-0">
                <div className="relative">
                  <div className="text-5xl sm:text-7xl font-black tracking-tight tabular-nums">
                    <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-[0_0_40px_rgba(16,185,129,0.3)]">{match.scoreA || 0}</span>
                    <span className="text-violet-400/40 text-4xl sm:text-5xl mx-2">-</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-[0_0_40px_rgba(59,130,246,0.3)]">{match.scoreB || 0}</span>
                  </div>
                </div>
                <div className="mt-3">
                  {(match.status === 'live' || match.status === 'halftime') ? (
                    <div className={cn(
                      "inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-sm border backdrop-blur-sm",
                      match.status === 'halftime'
                        ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                      {match.status === 'live' && (
                        <span className="relative flex h-2 w-2">
                          <span className={cn("absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75", match.timerRunning && "animate-ping")}></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                      {match.status === 'halftime' ? <span>HT</span> : <MatchTimer match={match} />}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                      <Trophy size={12} /> Full Time
                    </span>
                  )}
                </div>
              </div>

              {/* Team B */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-400/20 flex items-center justify-center shadow-lg shadow-blue-500/10 backdrop-blur-sm">
                  {getTeamInfo(match.teamB).logoUrl ? (
                    <img src={getTeamInfo(match.teamB).logoUrl} alt={match.teamB} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black text-blue-300">{match.teamB?.charAt(0)}</span>
                  )}
                </div>
                <h2 className="text-base sm:text-xl font-black text-white truncate max-w-[140px] sm:max-w-[200px] mx-auto">{match.teamB}</h2>
                <p className="text-[10px] sm:text-xs text-blue-400/60 italic">Manager: {match.managerB || 'N/A'}</p>
              </div>
            </div>

            {/* Goal Scorers */}
            <div className="flex gap-4 sm:gap-8 mb-2">
              {/* Team A Scorers */}
              <div className="flex-1 space-y-1">
                {events
                  .filter(e => e.type === 'goal' && e.team === match.teamA)
                  .sort((a, b) => a.minute - b.minute)
                  .map((goal, idx) => (
                    <div key={idx} className="text-[11px] text-slate-300 flex items-center justify-end gap-1.5">
                      <span className="truncate max-w-[120px] font-semibold" title={goal.player}>{goal.player}</span>
                      {goal.isFreekick && <span className="text-orange-400 font-bold text-[9px]">(FK)</span>}
                      {goal.isPenalty && <span className="text-red-400 font-bold text-[9px]">(PK)</span>}
                      {goal.assist && <span className="text-slate-500 text-[9px] truncate max-w-[80px]">({goal.assist})</span>}
                      <span className="text-brand-400 font-mono text-[10px] bg-brand-500/10 px-1.5 py-0.5 rounded">{goal.minute}'</span>
                      <span>⚽</span>
                    </div>
                  ))}
              </div>
              {/* Team B Scorers */}
              <div className="flex-1 space-y-1">
                {events
                  .filter(e => e.type === 'goal' && e.team === match.teamB)
                  .sort((a, b) => a.minute - b.minute)
                  .map((goal, idx) => (
                    <div key={idx} className="text-[11px] text-slate-300 flex items-center justify-start gap-1.5">
                      <span>⚽</span>
                      <span className="text-brand-400 font-mono text-[10px] bg-brand-500/10 px-1.5 py-0.5 rounded">{goal.minute}'</span>
                      <span className="truncate max-w-[120px] font-semibold" title={goal.player}>{goal.player}</span>
                      {goal.isFreekick && <span className="text-orange-400 font-bold text-[9px]">(FK)</span>}
                      {goal.isPenalty && <span className="text-red-400 font-bold text-[9px]">(PK)</span>}
                      {goal.assist && <span className="text-slate-500 text-[9px] truncate max-w-[80px]">({goal.assist})</span>}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* ═══ MATCH STATISTICS BAR ═══ */}
          <div className="relative z-10 border-t border-violet-500/10 bg-gradient-to-r from-emerald-500/5 via-black/30 to-blue-500/5 backdrop-blur-sm px-6 py-5">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-[10px] text-violet-300/60 uppercase tracking-widest font-bold mb-2">Possession</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-black text-emerald-300 w-10 text-right">{match.possessionA || 50}%</span>
                  <div className="flex-1 max-w-[120px] h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${match.possessionA || 50}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                    />
                  </div>
                  <span className="text-sm font-black text-blue-300 w-10 text-left">{match.possessionB || 50}%</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-violet-300/60 uppercase tracking-widest font-bold mb-2">Shots</div>
                <div className="text-lg font-black">
                  <span className="text-emerald-300">{match.shotsA || 0}</span> <span className="text-violet-500/40 text-sm">-</span> <span className="text-blue-300">{match.shotsB || 0}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-violet-300/60 uppercase tracking-widest font-bold mb-2">On Target</div>
                <div className="text-lg font-black">
                  <span className="text-emerald-300">{match.shotsOnTargetA || 0}</span> <span className="text-violet-500/40 text-sm">-</span> <span className="text-blue-300">{match.shotsOnTargetB || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Match Predictions / Voting */}
        <div className="mt-8">
          <MatchPredictions matchId={matchId} teamA={match.teamA} teamB={match.teamB} />
        </div>

        {/* ═══ TEAM LINEUPS SECTION ═══ */}
        <div className="mt-8 relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/95 via-[#1e1b4b]/90 to-[#0f172a]/95 backdrop-blur-xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent"></div>
          <div className="relative z-10 p-6 sm:p-8">
            {/* Header with Admin Manage Button */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-display font-black text-white flex items-center gap-3">
                <div className="w-1.5 h-7 bg-gradient-to-b from-emerald-400 to-cyan-500 rounded-full"></div>
                <Shield size={20} className="text-emerald-400" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80">Team Lineups</span>
              </h3>
              {canEditMatch && (
                <Link
                  to={`/admin/lineups/${matchId}`}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-brand-500/20 hover:border-brand-500/40"
                >
                  <Settings size={14} /> Manage Lineups
                </Link>
              )}
            </div>

            {matchLineups.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {matchLineups.map(lineup => (
                  <div key={lineup.id} className="space-y-4">
                    <div className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                      <h4 className="text-lg font-black text-white">{lineup.teamName}</h4>
                      {canEditMatch && match.status === 'live' && (
                        <button
                          onClick={() => setShowSubstitution(showSubstitution === lineup.id ? null : lineup.id)}
                          className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          {showSubstitution === lineup.id ? 'Hide Sub' : '🔄 Sub'}
                        </button>
                      )}
                    </div>

                    {/* Substitution Manager */}
                    {canEditMatch && showSubstitution === lineup.id && (
                      <div className="bg-black/30 p-4 rounded-xl border border-white/5 mb-4">
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
              <div className="py-16 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center bg-white/[0.02]">
                <UserPlus className="w-12 h-12 text-slate-600 mb-4 opacity-30" />
                <p className="text-slate-500 text-sm mb-5 font-medium">No lineups have been added for this match yet.</p>
                {canEditMatch && (
                  <Link
                    to={`/admin/lineups/${matchId}`}
                    className="px-6 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-slate-900 rounded-xl font-black text-sm hover:from-brand-400 hover:to-brand-500 transition-all shadow-lg shadow-brand-500/20"
                  >
                    Add Match Lineup
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══ MATCH TIMELINE ═══ */}
        <div className="mt-8 relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/95 via-[#1e1b4b]/90 to-[#0f172a]/95 backdrop-blur-xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent"></div>
          <div className="relative z-10 p-6 sm:p-8">
            <h3 className="text-xl font-display font-black text-white mb-8 flex items-center gap-3">
              <div className="w-1.5 h-7 bg-gradient-to-b from-violet-400 to-fuchsia-500 rounded-full"></div>
              <Activity size={20} className="text-violet-400" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80">Match Timeline</span>
            </h3>
            {events.length > 0 ? (
              <div className="relative ml-4 pl-8 space-y-6">
                {/* Timeline line */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/60 via-fuchsia-500/30 to-transparent"></div>

                {events.sort((a, b) => b.minute - a.minute).map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[33px] top-3 flex items-center justify-center z-10">
                      <div className="h-3 w-3 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-[0_0_12px_rgba(139,92,246,0.6)]"></div>
                    </div>

                    <div className="flex items-stretch gap-3">
                      {/* Minute badge */}
                      <div className="bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg text-xs font-black text-violet-300 whitespace-nowrap min-w-[50px] text-center self-start mt-1.5">
                        {event.minute}'
                      </div>

                      {/* Event card */}
                      <div className="flex-1 bg-white/[0.03] hover:bg-white/[0.06] p-4 sm:p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300 group">
                        {event.type === 'goal' && (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 border border-emerald-400/20 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/10">
                              <span className="text-lg">⚽</span>
                            </div>
                            <div>
                              <span className="font-black text-white text-base sm:text-lg block">
                                {event.player}
                                {event.isFreekick && <span className="text-orange-400 text-xs ml-2 font-bold">(Free Kick)</span>}
                                {event.isPenalty && <span className="text-red-400 text-xs ml-2 font-bold">(Penalty)</span>}
                              </span>
                              <span className="text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                                Goal for {event.team} {event.assist && `• Assist: ${event.assist}`}
                              </span>
                            </div>
                          </div>
                        )}
                        {(event.type === 'yellow' || event.type === 'red') && (
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                              event.type === 'yellow'
                                ? "bg-yellow-500/10 border-yellow-500/20"
                                : "bg-red-500/10 border-red-500/20"
                            )}>
                              <div className={cn(
                                "h-6 w-4 rounded-sm shadow-sm",
                                event.type === 'yellow' ? "bg-yellow-400" : "bg-red-600"
                              )} />
                            </div>
                            <div>
                              <span className="font-black text-white text-base sm:text-lg block">{event.player}</span>
                              <span className="text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                                {event.type === 'yellow' ? 'Yellow Card' : 'Red Card'} ({event.team})
                              </span>
                            </div>
                          </div>
                        )}
                        {event.type === 'substitution' && (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                              <span className="text-lg">🔄</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-emerald-400 font-black text-sm">⬆️ {event.playerIn}</span>
                                <span className="text-slate-600 text-xs">/</span>
                                <span className="text-red-400 font-black text-sm opacity-80">⬇️ {event.playerOut}</span>
                              </div>
                              <span className="text-slate-500 text-[11px] uppercase tracking-wider font-bold block mt-0.5">
                                Substitution ({event.team})
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                <Activity size={32} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold text-sm">Awaiting match events...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMatch;