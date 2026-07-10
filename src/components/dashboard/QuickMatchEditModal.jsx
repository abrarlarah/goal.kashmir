import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trophy, Save, Activity, Trash2, Loader2 } from 'lucide-react';
import { updateDoc, doc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const QuickMatchEditModal = ({ match, isOpen, onClose, isSuperAdmin }) => { // Added isSuperAdmin prop
    const [scoreA, setScoreA] = useState(match?.scoreA || 0);
    const [scoreB, setScoreB] = useState(match?.scoreB || 0);
    const [teamA, setTeamA] = useState(match?.teamA || '');
    const [teamB, setTeamB] = useState(match?.teamB || '');
    const [minute, setMinute] = useState(match?.currentMinute || 0); // Renamed from currentMinute
    const [status, setStatus] = useState(match?.status || 'live');
    const [location, setLocation] = useState(match?.location || '');
    const [isLoading, setIsLoading] = useState(false); // Renamed from isSaving
    const [error, setError] = useState(''); // New state for error handling

    if (!isOpen || !match) return null;

    const handleUpdateMatch = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Changed from setIsSaving
        setError(''); // Clear previous errors
        try {
            const matchRef = doc(db, 'matches', match.id);
            await updateDoc(matchRef, { // Changed to use matchRef directly
                teamA: teamA.trim(), // Added teamA
                teamB: teamB.trim(), // Added teamB
                scoreA: Number(scoreA),
                scoreB: Number(scoreB),
                currentMinute: Number(minute), // Changed to minute
                status,
                location: location.trim(),
                updatedAt: serverTimestamp() // Added serverTimestamp
            });
            onClose();
        } catch (error) {
            console.error("Error updating quick match", error);
            setError("Error saving: " + error.message); // Set error state
            alert("Error saving: " + error.message);
        } finally {
            setIsLoading(false); // Changed from setIsSaving
        }
    };

    const handleDeleteMatch = async () => {
        if (!window.confirm("Are you sure you want to delete this match? This action cannot be undone and will delete all associated lineups and events.")) {
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const deletePromises = [];
            
            // 1. Cascade delete lineups
            const lineupsQ = query(collection(db, 'lineups'), where('matchId', '==', match.id));
            const lineupsSnap = await getDocs(lineupsQ);
            lineupsSnap.forEach(docSnap => deletePromises.push(deleteDoc(docSnap.ref)));

            // 2. Cascade delete events
            const eventsQ = collection(db, 'matches', match.id, 'events');
            const eventsSnap = await getDocs(eventsQ);
            eventsSnap.forEach(docSnap => deletePromises.push(deleteDoc(docSnap.ref)));

            await Promise.all(deletePromises);

            // 3. Delete match
            await deleteDoc(doc(db, 'matches', match.id));
            
            onClose();
        } catch (error) {
            console.error("Error deleting match", error);
            setError("Error deleting: " + error.message);
            alert("Error deleting: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-200/50 dark:border-white/10"
            >
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors z-20"
                >
                    <X size={20} />
                </button>

                <div className="relative z-10 p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="px-3 py-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white font-display mb-1">Manage Match</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">{match.teamA} VS {match.teamB}</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateMatch} className="space-y-6">
                        {/* Removed old score input section */}

                        {/* Teams and Scores */}
                        <div className="grid grid-cols-2 gap-6 items-center">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Team A Name</label>
                                    <input
                                        type="text"
                                        value={teamA}
                                        onChange={(e) => setTeamA(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center block">Score A</label>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => setScoreA(Math.max(0, scoreA - 1))} className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">-</button>
                                        <input
                                            type="number"
                                            value={scoreA}
                                            onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                                            className="flex-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-white/10 p-2 text-center text-xl font-black text-emerald-500 rounded-lg"
                                        />
                                        <button type="button" onClick={() => setScoreA(scoreA + 1)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">+</button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Team B Name</label>
                                    <input
                                        type="text"
                                        value={teamB}
                                        onChange={(e) => setTeamB(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center block">Score B</label>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => setScoreB(Math.max(0, scoreB - 1))} className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">-</button>
                                        <input
                                            type="number"
                                            value={scoreB}
                                            onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                                            className="flex-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-white/10 p-2 text-center text-xl font-black text-emerald-500 rounded-lg"
                                        />
                                        <button type="button" onClick={() => setScoreB(scoreB + 1)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">+</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black tracking-wider text-slate-500 uppercase block mb-1.5 ml-1">Match Minute</label>
                                <input 
                                    type="number" 
                                    value={minute} // Changed to minute
                                    onChange={e => setMinute(e.target.value)} // Changed to setMinute
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-black text-center" 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black tracking-wider text-slate-500 uppercase block mb-1.5 ml-1">Status</label>
                                <select 
                                    value={status} 
                                    onChange={e => setStatus(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-bold appearance-none text-center uppercase text-xs tracking-wider"
                                >
                                    <option value="live">Live</option>
                                    <option value="halftime">Half Time</option>
                                    <option value="finished">Finished</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black tracking-wider text-slate-500 uppercase block mb-1.5 ml-1">Location / Ground</label>
                            <input 
                                type="text" 
                                value={location} 
                                onChange={e => setLocation(e.target.value)} 
                                placeholder="e.g. City Ground"
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-bold" 
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                        <div className="flex gap-3 pt-4">
                            {isSuperAdmin && (
                                <button
                                    type="button"
                                    onClick={handleDeleteMatch}
                                    disabled={isLoading}
                                    className="flex-1 px-6 py-3.5 rounded-xl font-black text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`flex-[2] px-6 py-3.5 rounded-xl font-black text-white uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${
                                    isLoading 
                                    ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg shadow-emerald-500/25'
                                }`}
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                                Update Match
                            </button>
                        </div>
                        {/* Removed old save button and disabled delete message */}
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default QuickMatchEditModal;
