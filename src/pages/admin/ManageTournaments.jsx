import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../context/DataContext';
import { generateKnockoutMatches, generatePoolMatches, generateDualKnockoutMatches, generateLeagueMatches, calcMatchesCount } from '../../utils/bracketGenerator';

// Districts of Jammu and Kashmir
const DISTRICTS = {
    JAMMU: ['Jammu', 'Samba', 'Kathua', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar'],
    KASHMIR: ['Srinagar', 'Ganderbal', 'Budgam', 'Baramulla', 'Bandipora', 'Kupwara', 'Pulwama', 'Shopian', 'Kulgam', 'Anantnag']
};

const ManageTournaments = () => {
    const { tournaments } = useData();
    const [loading, setLoading] = useState(false); // Form loading
    const [successMessage, setSuccessMessage] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        district: '',
        startDate: '',
        endDate: '',
        teamsCount: 0,
        matchesCount: 0,
        status: 'upcoming', // upcoming, ongoing, finished
        type: 'league', // league, knockout, pool
        autoSeed: false,
        teamsList: [] // e.g. ['Team 1', 'Team 2', ...]
    });
    const [editingId, setEditingId] = useState(null);

    // Helper to generate team list
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

            // Auto-calculate matchesCount and teamsList when teamsCount or type changes
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
            // Remove local-only states
            const { autoSeed, ...tournamentData } = formData;
            // Ensure teamsList is saved
            if (!tournamentData.teamsList || tournamentData.teamsList.length === 0) {
                tournamentData.teamsList = generateTeamsList(tournamentData.teamsCount);
            }

            let currentTournamentId = editingId;
            if (editingId) {
                await updateDoc(doc(db, 'tournaments', editingId), tournamentData);
            } else {
                const docRef = await addDoc(collection(db, 'tournaments'), tournamentData);
                currentTournamentId = docRef.id;

                // Auto-seed matches if requested
                if (autoSeed && formData.teamsCount > 0) {
                    let matches = [];
                    if (formData.type === 'league') {
                        matches = generateLeagueMatches(
                            formData.teamsCount,
                            formData.name,
                            currentTournamentId,
                            formData.startDate
                        );
                    } else if (formData.type === 'knockout') {
                        matches = generateKnockoutMatches(
                            formData.teamsCount,
                            formData.name,
                            currentTournamentId,
                            formData.startDate
                        );
                    } else if (formData.type === 'pool') {
                        matches = generatePoolMatches(
                            formData.teamsCount,
                            formData.name,
                            currentTournamentId,
                            formData.startDate
                        );
                    } else if (formData.type === 'dual_knockout') {
                        matches = generateDualKnockoutMatches(
                            formData.teamsCount,
                            formData.name,
                            currentTournamentId,
                            formData.startDate
                        );
                    }

                    if (matches.length > 0) {
                        const batchPromises = matches.map(match => addDoc(collection(db, 'matches'), match));
                        await Promise.all(batchPromises);
                    }
                }
            }

            setSuccessMessage(editingId ? 'Tournament updated successfully!' : 'Tournament added successfully!');
            setFormData({
                name: '',
                district: '',
                startDate: '',
                endDate: '',
                teamsCount: 0,
                matchesCount: 0,
                status: 'upcoming',
                type: 'league',
                autoSeed: false,
                teamsList: []
            });
            setEditingId(null);
            window.scrollTo(0, 0);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Error saving tournament: ", error);
            alert("Error saving: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (t) => {
        setFormData(t);
        setEditingId(t.id);
        setSuccessMessage('');
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this tournament?')) {
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
        if (!window.confirm("WARNING: This will delete ALL current matches for this tournament and replace them with a new dummy structure based on the current Teams Count. This cannot be undone. Continue?")) return;

        setLoading(true);
        try {
            // 1. Find all matches for this tournament
            const q = query(collection(db, 'matches'), where('tournamentId', '==', editingId));
            const querySnapshot = await getDocs(q);

            // 2. Delete existing matches
            const deletePromises = [];
            querySnapshot.forEach((doc) => {
                deletePromises.push(deleteDoc(doc.ref));
            });
            await Promise.all(deletePromises);

            // 3. Generate new matches based on type
            let newMatches = [];
            if (formData.type === 'pool') {
                newMatches = generatePoolMatches(
                    formData.teamsCount,
                    formData.name,
                    editingId,
                    formData.startDate
                );
            } else if (formData.type === 'dual_knockout') {
                newMatches = generateDualKnockoutMatches(
                    formData.teamsCount,
                    formData.name,
                    editingId,
                    formData.startDate
                );
            } else {
                newMatches = generateKnockoutMatches(
                    formData.teamsCount,
                    formData.name,
                    editingId,
                    formData.startDate
                );
            }

            const seedPromises = newMatches.map(match => addDoc(collection(db, 'matches'), match));
            await Promise.all(seedPromises);

            setSuccessMessage("Bracket structure updated successfully!");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Error re-seeding bracket: ", error);
            alert("Error updating bracket: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 text-slate-900 dark:text-white">
            <h2 className="text-2xl font-bold mb-6">Manage Tournaments</h2>

            {successMessage && (
                <div className="bg-green-600 text-slate-900 dark:text-white p-3 rounded mb-4 animate-pulse">
                    {successMessage}
                </div>
            )}

            {/* Form */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
                <h3 className="text-xl mb-4">{editingId ? 'Edit Tournament' : 'Add New Tournament'}</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                        <label className="text-xs text-gray-400 block mb-1">Tournament Name</label>
                        <input type="text" name="name" placeholder="Tournament Name" value={formData.name} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full" required />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <label className="text-xs text-gray-400 block mb-1">District</label>
                        <select name="district" value={formData.district} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full" required>
                            <option value="">Select District</option>
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

                    <div className="flex gap-2">
                        <div className="w-full">
                            <label className="text-xs text-gray-400 block mb-1">Start Date</label>
                            <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full" />
                        </div>
                        <div className="w-full">
                            <label className="text-xs text-gray-400 block mb-1">End Date</label>
                            <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full" />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="w-full">
                            <label className="text-xs text-gray-400 block mb-1">Number of Teams</label>
                            <input type="number" name="teamsCount" placeholder="0" min="0" value={formData.teamsCount} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full" />
                            {formData.teamsCount > 0 && (
                                <p className="text-[10px] text-brand-400 mt-1">Teams: {generateTeamsList(formData.teamsCount).join(', ')}</p>
                            )}
                        </div>
                        <div className="w-full">
                            <label className="text-xs text-gray-400 block mb-1">Matches Count <span className="text-brand-400">(auto-calculated)</span></label>
                            <input type="number" name="matchesCount" placeholder="0" value={formData.matchesCount} readOnly className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full opacity-70 cursor-not-allowed" />
                            <p className="text-[10px] text-gray-500 mt-1">{formData.type === 'knockout' ? 'Knockout: N-1 matches' : formData.type === 'pool' ? '2 Pools round-robin + Semi-Finals + Final' : 'League: N × (N-1) matches'}</p>
                        </div>
                    </div>

                    <select name="status" value={formData.status} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white">
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="finished">Finished</option>
                    </select>

                    <select name="type" value={formData.type} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white">
                        <option value="league">League</option>
                        <option value="knockout">Knockout</option>
                        <option value="pool">Pool Group + Knockout</option>
                        <option value="dual_knockout">2-Pool Knockout (No Group Stage)</option>
                    </select>

                    {formData.type === 'pool' && formData.teamsCount >= 4 && (
                        <div className="col-span-full bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
                            <p className="text-xs font-bold text-indigo-400 mb-2">Pool Distribution Preview:</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-300 mb-1">Pool A ({Math.ceil(formData.teamsCount / 2)} teams)</p>
                                    <p className="text-[10px] text-gray-400">{generateTeamsList(Math.ceil(formData.teamsCount / 2)).join(', ')}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-300 mb-1">Pool B ({formData.teamsCount - Math.ceil(formData.teamsCount / 2)} teams)</p>
                                    <p className="text-[10px] text-gray-400">{Array.from({ length: formData.teamsCount - Math.ceil(formData.teamsCount / 2) }, (_, i) => `Team ${Math.ceil(formData.teamsCount / 2) + i + 1}`).join(', ')}</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">Semi-Finals: A1 vs B2, B1 vs A2 → Final</p>
                        </div>
                    )}

                    {(formData.type === 'knockout' || formData.type === 'pool' || formData.type === 'dual_knockout') && !editingId && (
                        <div className="flex items-center gap-2 col-span-full bg-brand-500/10 p-3 rounded-lg border border-brand-500/20">
                            <input
                                type="checkbox"
                                name="autoSeed"
                                id="autoSeed"
                                checked={formData.autoSeed}
                                onChange={handleInputChange}
                                className="w-4 h-4 accent-brand-500"
                            />
                            <label htmlFor="autoSeed" className="text-sm font-bold text-brand-400">
                                {formData.type === 'pool'
                                    ? 'Automatically Generate Pool Matches + Knockout (based on Teams Count)'
                                    : formData.type === 'dual_knockout'
                                        ? 'Automatically Generate 2-Pool Knockout Bracket'
                                        : 'Automatically Generate Initial Bracket (based on Teams Count)'
                                }
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`bg-green-600 hover:bg-green-700 p-2 rounded text-slate-900 dark:text-white col-span-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Saving...' : (editingId ? 'Update Tournament' : 'Add Tournament')}
                    </button>

                    {editingId && (
                        <div className="flex flex-col gap-2 col-span-full">
                            {(formData.type === 'knockout' || formData.type === 'pool') && (
                                <button
                                    type="button"
                                    onClick={handleReSeedBracket}
                                    className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 p-2 rounded text-sm transition-all"
                                >
                                    Re-generate {formData.type === 'pool' ? 'Pool + Knockout' : 'Bracket'} Structure
                                </button>
                            )}
                            <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', district: '', startDate: '', endDate: '', teamsCount: 0, matchesCount: 0, status: 'upcoming', type: 'league', autoSeed: false, teamsList: [] }); }} className="bg-gray-600 hover:bg-gray-500 p-2 rounded text-slate-900 dark:text-white">
                                Cancel Edit
                            </button>
                        </div>
                    )}
                </form>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournaments.map(t => (
                    <div key={t.id} className="bg-gray-800 p-4 rounded flex justify-between items-start">
                        <div>
                            <div className="font-bold text-lg text-slate-900 dark:text-white">{t.name}</div>
                            {t.district && (
                                <div className="text-xs text-brand-400 font-medium mt-0.5">📍 {t.district}</div>
                            )}
                            <div className="text-sm text-gray-400">{t.status} • {t.type}</div>
                            <div className="text-xs text-gray-500 mt-1">{t.startDate} - {t.endDate}</div>
                            <div className="text-xs text-gray-500 mt-1">🏟️ {t.teamsCount} Teams • {t.matchesCount} Matches</div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => handleEdit(t)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm text-slate-900 dark:text-white">Edit</button>
                            <button onClick={() => handleDelete(t.id)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm text-slate-900 dark:text-white">Delete</button>
                        </div>
                    </div>
                ))}
                {tournaments.length === 0 && !loading && <div className="text-gray-400 col-span-full text-center">No tournaments found.</div>}
            </div>
        </div>
    );
};

export default ManageTournaments;
