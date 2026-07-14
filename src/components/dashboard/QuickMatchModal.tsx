// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Shield, Plus, Lock, Trophy, Loader2, MapPin, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { addDoc, collection, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';

const QuickMatchModal = ({ isOpen, onClose }) => {
    const { currentUser, isTeamAdmin, requestTeamAdminAccess } = useAuth();
    const { teams } = useData();
    const navigate = useNavigate();
    
    // Form State
    const [teamA, setTeamA] = useState('');
    const [teamB, setTeamB] = useState('');
    const [location, setLocation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [showTeamASuggestions, setShowTeamASuggestions] = useState(false);
    const [showTeamBSuggestions, setShowTeamBSuggestions] = useState(false);

    const filteredTeamsA = useMemo(() => {
        if (!teamA) return [];
        return teams.filter(t => t.name.toLowerCase().includes(teamA.toLowerCase())).slice(0, 5);
    }, [teamA, teams]);

    const filteredTeamsB = useMemo(() => {
        if (!teamB) return [];
        return teams.filter(t => t.name.toLowerCase().includes(teamB.toLowerCase())).slice(0, 5);
    }, [teamB, teams]);

    if (!isOpen) return null;

    // Handle Unauthenticated State
    if (!currentUser) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-[#0B1220]/80 backdrop-blur-sm" onClick={onClose} />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative bg-[#0B1220] rounded-3xl w-full max-w-sm p-6 sm:p-8 text-center shadow-2xl overflow-hidden border border-[#24344D]"
                >
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white mb-2 font-display">Login Required</h2>
                    <p className="text-[#94A3B8] text-sm mb-6">You must be logged in to access the Quick Match features.</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-[#101827] bg-[#131D31] text-[#94A3B8] font-bold hover:bg-slate-200 dark:hover:bg-[#131D31] transition">Cancel</button>
                        <button onClick={() => { onClose(); navigate('/login'); }} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-amber-500/30">Login</button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Handle Request Access State
    if (!isTeamAdmin) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-[#0B1220]/80 backdrop-blur-sm" onClick={onClose} />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative bg-[#0B1220] rounded-3xl w-full max-w-sm p-6 sm:p-8 text-center shadow-2xl overflow-hidden border border-[#24344D]"
                >
                    <div className="w-16 h-16 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto mb-4 border border-brand-500/20 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
                        <Shield size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white mb-2 font-display">Team Admin Required</h2>
                    <p className="text-[#94A3B8] text-sm mb-6">Create instant quick matches exclusively managed by you. Request team admin access to get started instantly.</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-[#101827] bg-[#131D31] text-[#94A3B8] font-bold hover:bg-slate-200 dark:hover:bg-[#131D31] transition">Maybe Later</button>
                        <button 
                            onClick={async () => {
                                setIsLoading(true);
                                await requestTeamAdminAccess();
                                setIsLoading(false);
                            }}
                            disabled={isLoading}
                            className={`flex-1 flex justify-center items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 text-white font-black hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand-500/30 ${isLoading ? 'opacity-70' : ''}`}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Get Access'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const checkAndRegisterTeam = async (teamName) => {
        const teamLower = teamName.trim();
        const existing = teams.find(t => t.name.toLowerCase() === teamLower.toLowerCase());
        if (!existing) {
            // Register new team for Quick Match
            const teamData = {
                name: teamName.trim(),
                shortName: teamName.trim().substring(0, 3).toUpperCase(),
                district: 'Quick Match',
                status: 'Active',
                isQuickMatch: true,
                createdBy: currentUser.uid,
                createdAt: serverTimestamp()
            };
            await addDoc(collection(db, 'teams'), teamData);
        }
    };

    // Form submission
    const handleCreateMatch = async (e) => {
        e.preventDefault();
        if (!teamA.trim() || !teamB.trim()) return;
        setIsLoading(true);

        try {
            // Register teams if they are new
            await Promise.all([
                checkAndRegisterTeam(teamA),
                checkAndRegisterTeam(teamB)
            ]);
            
            const matchData = {
                teamA: teamA.trim(),
                teamB: teamB.trim(),
                location: location.trim() || 'TBD',
                competition: 'Quick Match', 
                scoreA: 0,
                scoreB: 0,
                status: 'live', 
                currentMinute: 0,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().split(' ')[0],
                managerA: '',
                managerB: '',
                round: 'Quick Match',
                matchNumber: 'Q',
                isQuickMatch: true,
                createdBy: currentUser.uid,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'matches'), matchData);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2000);
        } catch (error) {
            console.error("Quick Match Error", error);
            alert("Error creating quick match");
        } finally {
            setIsLoading(false);
        }
    };

    // Quick Match Creation State
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0B1220]/80 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-[#0B1220] rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-[#24344D]/50 border-[#24344D]"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
                
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-[#101827] bg-[#131D31]/50 text-[#94A3B8] hover:bg-slate-200 hover:bg-[#18253C] hover:text-white hover:text-white transition-colors z-20"
                >
                    <X size={20} />
                </button>

                <div className="relative z-10 p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="px-3 py-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
                            <Zap size={24} className="fill-current" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white font-display leading-none mb-1">Quick Match</h2>
                            <p className="text-[#94A3B8] text-xs font-bold uppercase tracking-widest">Instant Setup Mode</p>
                        </div>
                    </div>

                    {success ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-emerald-500 text-green-400 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                            >
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            </motion.div>
                            <h3 className="text-xl font-black text-white">Match Started!</h3>
                            <p className="text-[#64748B] text-sm mt-2">Find it on your dashboard to manage score.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateMatch} className="space-y-6">
                            <div className="relative p-6 rounded-[1.5rem] bg-[#0B1220] bg-[#0B1220] border border-[#24344D]/50 border-[#24344D]/50 shadow-inner">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#0B1220] rounded-full border border-[#24344D] flex items-center justify-center z-10 font-black text-[#64748B] italic text-sm shadow-md">
                                    VS
                                </div>
                                
                                <div className="space-y-5">
                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest pl-1 flex justify-between">
                                            <span>Team 1</span>
                                            {filteredTeamsA.length > 0 && <span className="text-brand-500 lowercase">found {filteredTeamsA.length} teams...</span>}
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. FC Local"
                                                value={teamA}
                                                onFocus={() => setShowTeamASuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowTeamASuggestions(false), 200)}
                                                onChange={(e) => setTeamA(e.target.value)}
                                                className="w-full bg-[#131D31] dark:bg-gray-800/50 border border-[#24344D] p-3.5 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-sm font-bold placeholder:font-normal"
                                            />
                                            {showTeamASuggestions && filteredTeamsA.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full mt-1 bg-[#131D31] bg-[#131D31] rounded-xl shadow-xl border border-[#24344D] z-50 overflow-hidden">
                                                    {filteredTeamsA.map(t => (
                                                        <button key={t.id} type="button" onClick={() => setTeamA(t.name)} className="w-full text-left p-3 hover:bg-[#18253C] hover:bg-[#18253C] text-sm font-bold border-b border-[#24344D]/50 border-[#24344D]/50 last:border-0 flex items-center justify-between">
                                                            {t.name}
                                                            {t.isQuickMatch && <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-black uppercase">Saved</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest pr-1 text-right block flex justify-between">
                                            {filteredTeamsB.length > 0 && <span className="text-brand-500 lowercase">found {filteredTeamsB.length} teams...</span>}
                                            <span>Team 2</span>
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. United Boys"
                                                value={teamB}
                                                onFocus={() => setShowTeamBSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowTeamBSuggestions(false), 200)}
                                                onChange={(e) => setTeamB(e.target.value)}
                                                className="w-full bg-[#131D31] dark:bg-gray-800/50 border border-[#24344D] p-3.5 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all shadow-sm font-bold text-right placeholder:font-normal"
                                            />
                                            {showTeamBSuggestions && filteredTeamsB.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full mt-1 bg-[#131D31] bg-[#131D31] rounded-xl shadow-xl border border-[#24344D] z-50 overflow-hidden">
                                                    {filteredTeamsB.map(t => (
                                                        <button key={t.id} type="button" onClick={() => setTeamB(t.name)} className="w-full text-right p-3 hover:bg-[#18253C] hover:bg-[#18253C] text-sm font-bold border-b border-[#24344D]/50 border-[#24344D]/50 last:border-0 flex items-center justify-between">
                                                            {t.isQuickMatch && <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-black uppercase">Saved</span>}
                                                            {t.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                        <MapPin size={10} className="text-orange-500" /> Ground / Location
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Srinagar Sports Stadium"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full bg-[#0B1220] bg-[#131D31]/50 border border-[#24344D] p-3.5 rounded-xl text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all font-medium text-sm"
                                    />
                                </div>
                                
                                <p className="text-center text-[10px] sm:text-xs font-bold text-[#94A3B8]">
                                    New teams will be registered automatically. You can manage lineups after creation.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !teamA.trim() || !teamB.trim()}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-white text-sm uppercase tracking-widest transition-all ${
                                    isLoading || !teamA.trim() || !teamB.trim() 
                                    ? 'bg-slate-300 dark:bg-[#131D31] cursor-not-allowed text-[#94A3B8]' 
                                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-500/30'
                                }`}
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Launch Match</>}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default QuickMatchModal;
