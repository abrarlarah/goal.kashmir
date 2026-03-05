import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { generateKnockoutMatches, generatePoolMatches, generateDualKnockoutMatches, generateLeagueMatches, calcMatchesCount } from '../../utils/bracketGenerator';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, MapPin, Users, Swords, Crown, Plus, Edit3, Trash2, RefreshCw, ChevronDown, CheckCircle, Clock, Flag, X, Shield } from 'lucide-react';

// Districts of Jammu and Kashmir
const DISTRICTS = {
    JAMMU: ['Jammu', 'Samba', 'Kathua', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar'],
    KASHMIR: ['Srinagar', 'Ganderbal', 'Budgam', 'Baramulla', 'Bandipora', 'Kupwara', 'Pulwama', 'Shopian', 'Kulgam', 'Anantnag']
};

const statusConfig = {
    upcoming: { label: 'Upcoming', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock, dot: 'bg-blue-400' },
    ongoing: { label: 'Ongoing', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: Flag, dot: 'bg-green-400 animate-pulse' },
    finished: { label: 'Finished', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: CheckCircle, dot: 'bg-slate-400' },
};

const typeConfig = {
    league: { label: 'League', icon: '🏆' },
    knockout: { label: 'Knockout', icon: '⚔️' },
    pool: { label: 'Pool + Knockout', icon: '🏊' },
    dual_knockout: { label: '2-Pool Knockout', icon: '🎯' },
};

const ManageTournaments = () => {
    const { tournaments, matches: allMatches } = useData();
    const { currentUser, isSuperAdmin } = useAuth();
    const [adminUsers, setAdminUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        district: '',
        startDate: '',
        endDate: '',
        teamsCount: 0,
        matchesCount: 0,
        status: 'upcoming',
        type: 'league',
        autoSeed: false,
        createdBy: '',
        teamsList: []
    });
    const [editingId, setEditingId] = useState(null);

    // Fetch list of admins for assignment (superadmin only)
    useEffect(() => {
        if (isSuperAdmin) {
            const fetchAdmins = async () => {
                const snapshot = await getDocs(collection(db, 'users'));
                const admins = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(u => u.role === 'admin' || u.role === 'superadmin');
                setAdminUsers(admins);
            };
            fetchAdmins();
        }
    }, [isSuperAdmin]);

    const generateTeamsList = (count) => {
        const n = Number(count) || 0;
        return Array.from({ length: n }, (_, i) => `Team ${i + 1}`);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = {
                ...prev,
                [name]: (name === 'teamsCount' || name === 'matchesCount') ? Number(value) : (name === 'autoSeed' ? e.target.checked : value)
            };
            if (name === 'teamsCount') {
                updated.matchesCount = calcMatchesCount(value, updated.type);
                updated.teamsList = generateTeamsList(value);
            }
            if (name === 'type') {
                updated.matchesCount = calcMatchesCount(updated.teamsCount, value);
            }
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');

        try {
            const { autoSeed, ...tournamentData } = formData;
            if (!tournamentData.teamsList || tournamentData.teamsList.length === 0) {
                tournamentData.teamsList = generateTeamsList(tournamentData.teamsCount);
            }

            let currentTournamentId = editingId;
            if (editingId) {
                await updateDoc(doc(db, 'tournaments', editingId), tournamentData);
            } else {
                if (!tournamentData.createdBy) {
                    tournamentData.createdBy = currentUser?.uid || null;
                }
                const docRef = await addDoc(collection(db, 'tournaments'), tournamentData);
                currentTournamentId = docRef.id;

                if (autoSeed && formData.teamsCount > 0) {
                    let matches = [];
                    if (formData.type === 'league') {
                        matches = generateLeagueMatches(formData.teamsCount, formData.name, currentTournamentId, formData.startDate);
                    } else if (formData.type === 'knockout') {
                        matches = generateKnockoutMatches(formData.teamsCount, formData.name, currentTournamentId, formData.startDate);
                    } else if (formData.type === 'pool') {
                        matches = generatePoolMatches(formData.teamsCount, formData.name, currentTournamentId, formData.startDate);
                    } else if (formData.type === 'dual_knockout') {
                        matches = generateDualKnockoutMatches(formData.teamsCount, formData.name, currentTournamentId, formData.startDate);
                    }
                    if (matches.length > 0) {
                        await Promise.all(matches.map(match => addDoc(collection(db, 'matches'), match)));
                    }
                }
            }

            setSuccessMessage(editingId ? 'Tournament updated successfully!' : 'Tournament added successfully!');
            resetForm();
            window.scrollTo(0, 0);
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (error) {
            console.error("Error saving tournament: ", error);
            alert("Error saving: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', district: '', startDate: '', endDate: '', teamsCount: 0, matchesCount: 0, status: 'upcoming', type: 'league', autoSeed: false, createdBy: '', teamsList: [] });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (t) => {
        setFormData(t);
        setEditingId(t.id);
        setShowForm(true);
        setSuccessMessage('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this tournament? This action cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'tournaments', id));
                setSuccessMessage('Tournament deleted successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
            } catch (error) {
                console.error("Error deleting: ", error);
            }
        }
    };

    const handleReSeedBracket = async () => {
        if (!editingId) return;
        if (!window.confirm("WARNING: This will delete ALL current matches for this tournament and replace them with a new structure. This cannot be undone. Continue?")) return;

        setLoading(true);
        try {
            const q = query(collection(db, 'matches'), where('tournamentId', '==', editingId));
            const querySnapshot = await getDocs(q);
            const deletePromises = [];
            querySnapshot.forEach((doc) => { deletePromises.push(deleteDoc(doc.ref)); });
            await Promise.all(deletePromises);

            let newMatches = [];
            if (formData.type === 'pool') {
                newMatches = generatePoolMatches(formData.teamsCount, formData.name, editingId, formData.startDate);
            } else if (formData.type === 'dual_knockout') {
                newMatches = generateDualKnockoutMatches(formData.teamsCount, formData.name, editingId, formData.startDate);
            } else {
                newMatches = generateKnockoutMatches(formData.teamsCount, formData.name, editingId, formData.startDate);
            }

            await Promise.all(newMatches.map(match => addDoc(collection(db, 'matches'), match)));
            setSuccessMessage("Bracket structure updated successfully!");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Error re-seeding bracket: ", error);
            alert("Error updating bracket: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const scopedTournaments = tournaments.filter(t => isSuperAdmin || t.createdBy === currentUser?.uid);

    // Stats
    const totalMatches = scopedTournaments.reduce((acc, t) => acc + (t.matchesCount || 0), 0);
    const totalTeams = scopedTournaments.reduce((acc, t) => acc + (t.teamsCount || 0), 0);
    const ongoingCount = scopedTournaments.filter(t => t.status === 'ongoing').length;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                            <Trophy size={20} className="text-white" />
                        </div>
                        Tournaments
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {isSuperAdmin ? 'Create and manage all tournaments' : 'Manage your assigned tournaments'}
                    </p>
                </div>
                {isSuperAdmin && !showForm && (
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setShowForm(true); setEditingId(null); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/25"
                    >
                        <Plus size={18} /> New Tournament
                    </motion.button>
                )}
            </div>

            {/* Success Banner */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400"
                    >
                        <CheckCircle size={18} />
                        <span className="font-medium text-sm">{successMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tournaments', value: scopedTournaments.length, icon: Trophy, color: 'from-yellow-500/10 to-orange-500/5 border-yellow-500/10', iconColor: 'text-yellow-400' },
                    { label: 'Total Teams', value: totalTeams, icon: Users, color: 'from-blue-500/10 to-blue-600/5 border-blue-500/10', iconColor: 'text-blue-400' },
                    { label: 'Total Matches', value: totalMatches, icon: Swords, color: 'from-brand-500/10 to-brand-600/5 border-brand-500/10', iconColor: 'text-brand-400' },
                    { label: 'Active Now', value: ongoingCount, icon: Flag, color: 'from-green-500/10 to-green-600/5 border-green-500/10', iconColor: 'text-green-400' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`bg-gradient-to-br ${stat.color} border rounded-2xl p-4 text-center`}
                    >
                        <stat.icon size={20} className={`mx-auto mb-2 ${stat.iconColor}`} />
                        <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">{stat.value}</div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mt-1">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Info banner for tournament admins */}
            {!isSuperAdmin && !showForm && (
                <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-300 text-sm">
                    <Shield size={18} className="flex-shrink-0" />
                    <span>You can only edit tournaments assigned to you. Contact a Super Admin to create new tournaments.</span>
                </div>
            )}

            {/* Form */}
            <AnimatePresence>
                {(showForm || editingId) && (isSuperAdmin || editingId) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="glass-card rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl">
                            {/* Form Header */}
                            <div className="bg-gradient-to-r from-brand-600/20 via-brand-500/10 to-transparent p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${editingId ? 'bg-blue-500/20' : 'bg-brand-500/20'}`}>
                                        {editingId ? <Edit3 size={18} className="text-blue-400" /> : <Plus size={18} className="text-brand-400" />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                                            {editingId ? 'Edit Tournament' : 'Create New Tournament'}
                                        </h2>
                                        <p className="text-xs text-slate-500">Fill in the details below</p>
                                    </div>
                                </div>
                                <button
                                    onClick={resetForm}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-500 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Form Body */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Tournament Name */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tournament Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="e.g. Kashmir Premier League 2026"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all text-sm"
                                        required
                                    />
                                </div>

                                {/* District */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        <MapPin size={12} className="inline mr-1" /> District
                                    </label>
                                    <select
                                        name="district"
                                        value={formData.district}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm"
                                        required
                                    >
                                        <option value="">Select District</option>
                                        <optgroup label="── Kashmir Division ──">
                                            {DISTRICTS.KASHMIR.map(d => <option key={d} value={d}>{d}</option>)}
                                        </optgroup>
                                        <optgroup label="── Jammu Division ──">
                                            {DISTRICTS.JAMMU.map(d => <option key={d} value={d}>{d}</option>)}
                                        </optgroup>
                                    </select>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                            <Calendar size={12} className="inline mr-1" /> Start Date
                                        </label>
                                        <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                            <Calendar size={12} className="inline mr-1" /> End Date
                                        </label>
                                        <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 outline-none text-sm" />
                                    </div>
                                </div>

                                {/* Type & Status */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Format</label>
                                        <select name="type" value={formData.type} onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 outline-none text-sm">
                                            <option value="league">🏆 League</option>
                                            <option value="knockout">⚔️ Knockout</option>
                                            <option value="pool">🏊 Pool Group + Knockout</option>
                                            <option value="dual_knockout">🎯 2-Pool Knockout</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                                        <select name="status" value={formData.status} onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 outline-none text-sm">
                                            <option value="upcoming">🕐 Upcoming</option>
                                            <option value="ongoing">🟢 Ongoing</option>
                                            <option value="finished">✅ Finished</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Teams & Matches Count */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                            <Users size={12} className="inline mr-1" /> Number of Teams
                                        </label>
                                        <input type="number" name="teamsCount" placeholder="0" min="0" value={formData.teamsCount} onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 outline-none text-sm" />
                                        {formData.teamsCount > 0 && (
                                            <p className="text-[10px] text-brand-400 mt-2 leading-relaxed">
                                                Teams: {generateTeamsList(formData.teamsCount).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                            <Swords size={12} className="inline mr-1" /> Matches <span className="text-brand-400 normal-case">(auto)</span>
                                        </label>
                                        <input type="number" name="matchesCount" value={formData.matchesCount} readOnly
                                            className="w-full bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none text-sm opacity-60 cursor-not-allowed" />
                                        <p className="text-[10px] text-slate-500 mt-2">
                                            {formData.type === 'knockout' ? 'Knockout: N-1 matches' : formData.type === 'pool' ? 'Pool RR + Semi + Final' : formData.type === 'dual_knockout' ? '2-Pool + Semi + Final' : 'League: N × (N-1) matches'}
                                        </p>
                                    </div>
                                </div>

                                {/* Super Admin: Assign Admin */}
                                {isSuperAdmin && (
                                    <div className="bg-yellow-400/5 border border-yellow-400/10 rounded-2xl p-4">
                                        <label className="block text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">
                                            <Crown size={12} className="inline mr-1" /> Assign Tournament Admin
                                        </label>
                                        <select name="createdBy" value={formData.createdBy || ''} onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-yellow-400/20 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-yellow-400/50 outline-none text-sm">
                                            <option value={currentUser?.uid || ''}>Myself (Super Admin)</option>
                                            {adminUsers.filter(u => u.uid !== currentUser?.uid).map(admin => (
                                                <option key={admin.uid || admin.id} value={admin.uid || admin.id}>
                                                    {admin.displayName || admin.email} ({admin.role === 'admin' ? 'Tournament Admin' : 'Super Admin'})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-500 mt-2">The assigned admin will have full control over this tournament's data.</p>
                                    </div>
                                )}

                                {/* Pool Distribution Preview */}
                                {formData.type === 'pool' && formData.teamsCount >= 4 && (
                                    <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10">
                                        <p className="text-xs font-bold text-indigo-400 mb-3 flex items-center gap-2">
                                            <ChevronDown size={14} /> Pool Distribution Preview
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 p-3 rounded-xl border border-indigo-500/10">
                                                <p className="text-xs font-bold text-indigo-300 mb-1">Pool A ({Math.ceil(formData.teamsCount / 2)} teams)</p>
                                                <p className="text-[10px] text-slate-400">{generateTeamsList(Math.ceil(formData.teamsCount / 2)).join(', ')}</p>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-xl border border-indigo-500/10">
                                                <p className="text-xs font-bold text-indigo-300 mb-1">Pool B ({formData.teamsCount - Math.ceil(formData.teamsCount / 2)} teams)</p>
                                                <p className="text-[10px] text-slate-400">{Array.from({ length: formData.teamsCount - Math.ceil(formData.teamsCount / 2) }, (_, i) => `Team ${Math.ceil(formData.teamsCount / 2) + i + 1}`).join(', ')}</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-3">Semi-Finals: A1 vs B2, B1 vs A2 → Final</p>
                                    </div>
                                )}

                                {/* Auto-Seed Checkbox */}
                                {(formData.type === 'knockout' || formData.type === 'pool' || formData.type === 'dual_knockout') && !editingId && (
                                    <label className="flex items-center gap-3 p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl cursor-pointer hover:bg-brand-500/10 transition-colors">
                                        <input
                                            type="checkbox"
                                            name="autoSeed"
                                            checked={formData.autoSeed}
                                            onChange={handleInputChange}
                                            className="w-5 h-5 accent-brand-500 rounded"
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-brand-400">Auto-Generate Bracket</span>
                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                {formData.type === 'pool' ? 'Creates pool matches + knockout' : formData.type === 'dual_knockout' ? 'Creates 2-pool knockout bracket' : 'Creates initial knockout bracket'}
                                            </p>
                                        </div>
                                    </label>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        {loading ? (
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <CheckCircle size={18} />
                                        )}
                                        {loading ? 'Saving...' : (editingId ? 'Update Tournament' : 'Create Tournament')}
                                    </motion.button>

                                    {editingId && (formData.type === 'knockout' || formData.type === 'pool' || formData.type === 'dual_knockout') && (
                                        <button
                                            type="button"
                                            onClick={handleReSeedBracket}
                                            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold transition-all"
                                        >
                                            <RefreshCw size={16} /> Re-seed Bracket
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white/5 hover:bg-white/10 text-slate-400 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium transition-all"
                                    >
                                        <X size={16} /> Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tournament Cards */}
            <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                    {isSuperAdmin ? 'All Tournaments' : 'Your Tournaments'} ({scopedTournaments.length})
                </h3>

                {scopedTournaments.length === 0 ? (
                    <div className="text-center py-20 glass-card rounded-3xl border border-slate-200 dark:border-white/5">
                        <Trophy size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                        <p className="text-slate-500 font-medium">No tournaments found</p>
                        <p className="text-slate-400 text-sm mt-1">
                            {isSuperAdmin ? 'Create your first tournament to get started' : 'Contact a Super Admin to get assigned'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {scopedTournaments.map((t, i) => {
                            const status = statusConfig[t.status] || statusConfig.upcoming;
                            const type = typeConfig[t.type] || typeConfig.league;
                            const matchCount = allMatches?.filter(m => m.competition === t.name || m.tournamentId === t.id).length || 0;

                            return (
                                <motion.div
                                    key={t.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="glass-card rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden group hover:border-brand-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5"
                                >
                                    {/* Card Header */}
                                    <div className="p-5 pb-0">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${status.color}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                {status.label}
                                            </div>
                                            <span className="text-lg">{type.icon}</span>
                                        </div>

                                        <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white leading-tight mb-1 group-hover:text-brand-400 transition-colors">
                                            {t.name}
                                        </h3>

                                        {t.district && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                                                <MapPin size={12} className="text-brand-400" />
                                                {t.district}
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Stats */}
                                    <div className="px-5 py-3">
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="text-center p-2 bg-white/5 rounded-xl">
                                                <div className="text-lg font-bold text-slate-900 dark:text-white">{t.teamsCount || 0}</div>
                                                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Teams</div>
                                            </div>
                                            <div className="text-center p-2 bg-white/5 rounded-xl">
                                                <div className="text-lg font-bold text-slate-900 dark:text-white">{matchCount}</div>
                                                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Matches</div>
                                            </div>
                                            <div className="text-center p-2 bg-white/5 rounded-xl">
                                                <div className="text-lg font-bold text-slate-900 dark:text-white capitalize">{type.label}</div>
                                                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Format</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Dates */}
                                    {(t.startDate || t.endDate) && (
                                        <div className="px-5 pb-3">
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                <Calendar size={12} />
                                                {t.startDate && new Date(t.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                {t.endDate && ` — ${new Date(t.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                            </div>
                                        </div>
                                    )}

                                    {/* Card Actions */}
                                    <div className="px-5 py-4 border-t border-slate-200 dark:border-white/5 flex items-center gap-2">
                                        <button
                                            onClick={() => handleEdit(t)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                                        >
                                            <Edit3 size={14} /> Edit
                                        </button>
                                        {isSuperAdmin && (
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageTournaments;
