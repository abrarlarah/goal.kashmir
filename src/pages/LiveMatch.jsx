// src/pages/LiveMatch.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import LineupDisplay from '../components/common/LineupDisplay';
import SubstitutionManager from '../components/common/SubstitutionManager';
import MatchPredictions from '../components/common/MatchPredictions';
import MatchTimer from '../components/common/MatchTimer';
import { cn } from '../utils/cn';

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
  const { isAdmin } = useAuth();
  const { players, lineups, teams } = useData();

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

        {/* Admin Controls */}
        {isAdmin && (
          <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-green-600">
            <h3 className="text-green-400 font-bold mb-2">Admin Controls (Live Updates)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">

              {/* Team A Controls */}
              <div className="p-2 border border-gray-600 rounded">
                <p className="text-slate-900 dark:text-white mb-2">{match.teamA}</p>
                <button onClick={() => updateScore('A', 1)} className="bg-green-600 text-slate-900 dark:text-white px-3 py-1 rounded mx-1 hover:bg-green-700">+ Goal</button>
                <button onClick={() => updateScore('A', -1)} className="bg-red-600 text-slate-900 dark:text-white px-3 py-1 rounded mx-1 hover:bg-red-700">- Goal</button>
              </div>

              {/* Clock Controls */}
              <div className="p-2 border border-gray-600 rounded">
                <p className="text-slate-900 dark:text-white mb-2 font-mono text-3xl font-bold">
                  <MatchTimer match={match} /> {match.timerRunning && <span className="text-red-500 animate-pulse text-sm">LIVE</span>}
                </p>
                <div className="flex justify-center gap-1 mb-3">
                  <button onClick={() => updateMinute(-1)} className="bg-gray-700 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 transition-colors text-sm font-bold">-1m</button>
                  <button onClick={() => updateMinute(1)} className="bg-gray-700 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 transition-colors text-sm font-bold">+1m</button>
                  <button onClick={() => updateMinute(5)} className="bg-gray-700 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 transition-colors text-sm font-bold">+5m</button>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={toggleTimer}
                    className={`w-full py-2 rounded font-bold text-slate-900 dark:text-white transition-colors ${match.timerRunning ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {match.timerRunning ? '⏸ Pause Timer' : '▶️ Start Timer'}
                  </button>
                  <button
                    onClick={toggleMatchStatus}
                    className={`w-full py-1 rounded text-xs font-bold text-slate-900 dark:text-white transition-colors ${match.status === 'live' ? 'bg-red-900/50 hover:bg-red-800 border border-red-500/30' : 'bg-green-900/50 hover:bg-green-800 border border-green-500/30'}`}
                  >
                    {match.status === 'live' ? 'END MATCH' : 'START MATCH'}
                  </button>
                  <button
                    onClick={resetTimer}
                    className="w-full py-1 rounded text-[10px] font-bold text-gray-400 hover:text-slate-900 dark:text-white hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors uppercase tracking-widest"
                  >
                    Reset Clock
                  </button>
                </div>
              </div>

              {/* Team B Controls */}
              <div className="p-2 border border-gray-600 rounded">
                <p className="text-slate-900 dark:text-white mb-2">{match.teamB}</p>
                <button onClick={() => updateScore('B', 1)} className="bg-green-600 text-slate-900 dark:text-white px-3 py-1 rounded mx-1 hover:bg-green-700">+ Goal</button>
                <button onClick={() => updateScore('B', -1)} className="bg-red-600 text-slate-900 dark:text-white px-3 py-1 rounded mx-1 hover:bg-red-700">- Goal</button>
              </div>
            </div>

            {/* Card Controls */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex justify-center gap-2">
                <button onClick={() => setShowCardSelect({ team: 'A', type: 'yellow' })} className="bg-yellow-500 text-black font-bold px-3 py-1 rounded text-xs">Y-Card (A)</button>
                <button onClick={() => setShowCardSelect({ team: 'A', type: 'red' })} className="bg-red-600 text-slate-900 dark:text-white font-bold px-3 py-1 rounded text-xs">R-Card (A)</button>
              </div>
              <div className="flex justify-center gap-2">
                <button onClick={() => setShowCardSelect({ team: 'B', type: 'yellow' })} className="bg-yellow-500 text-black font-bold px-3 py-1 rounded text-xs">Y-Card (B)</button>
                <button onClick={() => setShowCardSelect({ team: 'B', type: 'red' })} className="bg-red-600 text-slate-900 dark:text-white font-bold px-3 py-1 rounded text-xs">R-Card (B)</button>
              </div>
            </div>

            {/* Goal Scorer Selection UI */}
            {showScorerSelect && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-yellow-500 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-yellow-400 font-bold uppercase tracking-wider">
                    Select Scorer for {showScorerSelect.team === 'A' ? match.teamA : match.teamB}
                  </h4>
                  <button
                    onClick={() => setShowScorerSelect(null)}
                    className="text-gray-400 hover:text-slate-900 dark:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {players
                    .filter(p => p.team === (showScorerSelect.team === 'A' ? match.teamA : match.teamB))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(player => (
                      <button
                        key={player.id}
                        onClick={() => confirmGoal(showScorerSelect.team, player)}
                        className="bg-gray-600 hover:bg-green-600 text-slate-900 dark:text-white text-xs py-2 px-3 rounded transition-colors text-left truncate"
                        title={player.name}
                      >
                        {player.name}
                      </button>
                    ))}
                  <button
                    onClick={() => confirmGoal(showScorerSelect.team, null)}
                    className="bg-gray-500 hover:bg-gray-400 text-slate-900 dark:text-white text-xs py-2 px-3 rounded transition-colors"
                  >
                    Unknown Player
                  </button>
                </div>
              </div>
            )}

            {/* Card Selection UI */}
            {showCardSelect && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-red-500 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h4 className={`${showCardSelect.type === 'yellow' ? 'text-yellow-400' : 'text-red-500'} font-bold uppercase tracking-wider`}>
                    Select Player for {showCardSelect.type.toUpperCase()} Card ({showCardSelect.team === 'A' ? match.teamA : match.teamB})
                  </h4>
                  <button
                    onClick={() => setShowCardSelect(null)}
                    className="text-gray-400 hover:text-slate-900 dark:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {players
                    .filter(p => p.team === (showCardSelect.team === 'A' ? match.teamA : match.teamB))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(player => (
                      <button
                        key={player.id}
                        onClick={() => confirmCard(showCardSelect.team, player, showCardSelect.type)}
                        className="bg-gray-600 hover:bg-brand-500 text-slate-900 dark:text-white text-xs py-2 px-3 rounded transition-colors text-left truncate"
                        title={player.name}
                      >
                        {player.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Goal Cancellation UI */}
            {showCancelSelect && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-red-500 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-red-400 font-bold uppercase tracking-wider">
                    Cancel Goal for {showCancelSelect.team === 'A' ? match.teamA : match.teamB}
                  </h4>
                  <button
                    onClick={() => setShowCancelSelect(null)}
                    className="text-gray-400 hover:text-slate-900 dark:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {events
                    .filter(e => e.type === 'goal' && e.team === (showCancelSelect.team === 'A' ? match.teamA : match.teamB))
                    .length > 0 ? (
                    events
                      .filter(e => e.type === 'goal' && e.team === (showCancelSelect.team === 'A' ? match.teamA : match.teamB))
                      .map(goal => (
                        <div key={goal.id} className="flex justify-between items-center bg-gray-600 p-2 rounded">
                          <span className="text-sm text-slate-900 dark:text-white">
                            {goal.player} ({goal.minute}')
                          </span>
                          <button
                            onClick={() => confirmCancelGoal(goal)}
                            className="bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white text-[10px] py-1 px-3 rounded font-bold uppercase transition-colors"
                          >
                            Revoke
                          </button>
                        </div>
                      ))
                  ) : (
                    <div className="text-center text-gray-400 py-4 text-sm">
                      No goal events found to cancel.
                    </div>
                  )
                  }
                </div>
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

        {/* Team Lineups */}
        {matchLineups.length > 0 && (
          <div className="bg-gray-800 p-6 mt-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Team Lineups</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {matchLineups.map(lineup => (
                <div key={lineup.id} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold">{lineup.teamName}</h4>
                    {isAdmin && match.status === 'live' && (
                      <button
                        onClick={() => setShowSubstitution(showSubstitution === lineup.id ? null : lineup.id)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-slate-900 dark:text-white px-3 py-1 rounded text-sm"
                      >
                        {showSubstitution === lineup.id ? 'Hide Substitution' : '🔄 Make Substitution'}
                      </button>
                    )}
                  </div>

                  {/* Substitution Manager */}
                  {isAdmin && showSubstitution === lineup.id && (
                    <SubstitutionManager
                      lineup={lineup}
                      players={players}
                      onSubstitutionComplete={() => setShowSubstitution(null)}
                    />
                  )}

                  {/* Lineup Display */}
                  <LineupDisplay lineup={lineup} players={players} />
                </div>
              ))}
            </div>
          </div>
        )}

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