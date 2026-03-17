import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useData } from '../../context/DataContext';
import { Upload, X, Image as ImageIcon, Folders, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Shield, MapPin } from 'lucide-react';
import AssetPicker from '../../components/admin/AssetPicker';
import { registerAsset } from '../../utils/assetRegistry';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../utils/auditLogger';

const ManageTeams = () => {
    const { teams, tournaments } = useData();
    const { currentUser, isSuperAdmin } = useAuth();
    const location = useLocation();
    const [loading, setLoading] = useState(false); // Loading for form submission
    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        founded: '',
        stadium: '',
        manager: '',
        status: 'Active',
        players: 0,
        logoUrl: '',
        tournaments: [],
        description: '',
        trophies: 0,
        district: 'Baramulla'
    });
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [showAssetPicker, setShowAssetPicker] = useState(false);

    useEffect(() => {
        if (location.state && location.state.editTeam) {
            handleEdit(location.state.editTeam);
            // Clear location state after picking it up
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'founded' || name === 'players' || name === 'trophies') ? Number(value) : value
        }));
    };

    const handleTournamentToggle = (tournamentName) => {
        setFormData(prev => {
            const current = Array.isArray(prev.tournaments) ? prev.tournaments : [];
            if (current.includes(tournamentName)) {
                return { ...prev, tournaments: current.filter(t => t !== tournamentName) };
            } else {
                return { ...prev, tournaments: [...current, tournamentName] };
            }
        });
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const storageRef = ref(storage, `team-logos/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            await new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    },
                    (error) => reject(error),
                    () => resolve()
                );
            });

            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setFormData(prev => ({ ...prev, logoUrl: downloadURL }));

            // Automatically register in Media Repository
            await registerAsset(file.name, downloadURL, 'Teams');

            setUploading(false);
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error.code || error.message}`);
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');

        const dataToSave = {
            ...formData,
            // Ensure tournaments is an array
            tournaments: Array.isArray(formData.tournaments) ? formData.tournaments : []
        };

        try {
            if (editingId) {
                const originalTeam = teams.find(t => t.id === editingId);
                const nameChanged = originalTeam && originalTeam.name !== formData.name;

                await updateDoc(doc(db, 'teams', editingId), dataToSave);

                // Cascade updates if name changed
                if (nameChanged) {
                    const oldName = originalTeam.name;
                    const newName = formData.name;
                    const batch = writeBatch(db);

                    // 1. Update Matches
                    const matchesQueryA = query(collection(db, 'matches'), where('teamA', '==', oldName));
                    const matchesQueryB = query(collection(db, 'matches'), where('teamB', '==', oldName));
                    const [matchesA, matchesB] = await Promise.all([getDocs(matchesQueryA), getDocs(matchesQueryB)]);

                    matchesA.forEach(d => batch.update(d.ref, { teamA: newName }));
                    matchesB.forEach(d => batch.update(d.ref, { teamB: newName }));

                    // 2. Update Players
                    const playersQuery = query(collection(db, 'players'), where('team', '==', oldName));
                    const playersDocs = await getDocs(playersQuery);
                    playersDocs.forEach(d => batch.update(d.ref, { team: newName }));

                    await batch.commit();
                    logAuditEvent('UPDATE_TEAM', {
                        entityType: 'team',
                        entityId: editingId,
                        entityName: formData.name,
                        details: { nameChanged: true, oldName: originalTeam.name, newName: formData.name },
                    });
                    setSuccessMessage('Team and all associated matches/players updated!');
                } else {
                    logAuditEvent('UPDATE_TEAM', {
                        entityType: 'team',
                        entityId: editingId,
                        entityName: formData.name,
                    });
                    setSuccessMessage('Team updated successfully!');
                }
            } else {
                const docRef = await addDoc(collection(db, 'teams'), dataToSave);
                logAuditEvent('CREATE_TEAM', {
                    entityType: 'team',
                    entityId: docRef.id,
                    entityName: formData.name,
                });
                setSuccessMessage('Team added successfully!');
            }

            // Clear form
            setFormData({
                name: '',
                shortName: '',
                founded: '',
                stadium: '',
                manager: '',
                status: 'Active',
                players: 0,
                logoUrl: '',
                tournaments: [],
                description: '',
                trophies: 0,
                district: 'Baramulla'
            });
            setEditingId(null);
            window.scrollTo(0, 0);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Error saving team: ", error);
            alert("Error saving team: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (team) => {
        setFormData({
            ...team,
            tournaments: Array.isArray(team.tournaments) ? team.tournaments : []
        });
        setEditingId(team.id);
        setSuccessMessage('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this team?')) {
            const team = teams.find(t => t.id === id);
            try {
                await deleteDoc(doc(db, 'teams', id));
                logAuditEvent('DELETE_TEAM', {
                    entityType: 'team',
                    entityId: id,
                    entityName: team?.name || 'Unknown',
                });
                setSuccessMessage('Team deleted successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
            } catch (error) {
                console.error("Error deleting team: ", error);
            }
        }
    };

    const removeLogo = () => {
        setFormData(prev => ({ ...prev, logoUrl: '' }));
    };

    // Scope teams: superadmin sees all, admin sees only teams in their tournaments
    const myTournamentNames = useMemo(() => {
        if (isSuperAdmin) return null;
        return tournaments
            .filter(t => t.createdBy === currentUser?.uid)
            .map(t => t.name);
    }, [tournaments, currentUser, isSuperAdmin]);

    const scopedTeams = useMemo(() => {
        if (isSuperAdmin) return teams;
        return teams.filter(team => {
            // Include teams created by the user (Team Admins)
            if (team.createdBy === currentUser?.uid) return true;

            // Include teams in user's tournaments (Tournament Admins)
            if (!myTournamentNames) return false;
            const teamTournaments = Array.isArray(team.tournaments)
                ? team.tournaments
                : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
            return teamTournaments.some(tn => myTournamentNames.includes(tn));
        });
    }, [teams, myTournamentNames, currentUser, isSuperAdmin]);

    const filteredTeams = scopedTeams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.shortName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const [currentPage, setCurrentPage] = useState(1);
    const teamsPerPage = 10;
    const totalPages = Math.ceil(filteredTeams.length / teamsPerPage);

    const indexOfLastTeam = currentPage * teamsPerPage;
    const indexOfFirstTeam = indexOfLastTeam - teamsPerPage;
    const currentItems = filteredTeams.slice(indexOfFirstTeam, indexOfLastTeam);

    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
        const listElement = document.getElementById('team-list-top');
        if (listElement) listElement.scrollIntoView({ behavior: 'smooth' });
    };

    // Reset to page 1 on search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="container mx-auto px-4 py-8 text-slate-900 dark:text-white">
            <h2 className="text-2xl font-bold mb-6">Manage Teams</h2>

            {successMessage && (
                <div className="bg-green-600 text-slate-900 dark:text-white p-3 rounded mb-4 animate-pulse">
                    {successMessage}
                </div>
            )}

            {/* Form */}
            <div className="rounded-3xl bg-white dark:bg-[#0B1120] border border-slate-200/50 dark:border-white/5 shadow-2xl dark:shadow-brand-500/5 overflow-hidden transition-all mb-10">
                <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-sky-500 p-6 sm:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/20 shadow-lg">
                            <Shield className="text-white h-7 w-7" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
                                {editingId ? 'Edit Team Details' : 'Register New Team'}
                            </h3>
                            <p className="text-brand-50/90 mt-1 text-sm font-medium">Complete the information below to manage team records.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-transparent">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Logo Upload Section */}
                        <div className="md:col-span-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-gray-300 block mb-3 uppercase tracking-wider">Team Crest / Logo</label>
                            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 border-[1.5px] border-dashed border-slate-300 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5 transition-all hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-500/5 group shadow-sm">
                                {formData.logoUrl ? (
                                    <div className="relative shrink-0">
                                        <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full opacity-100 transition-opacity"></div>
                                        <img src={formData.logoUrl} alt="Logo Preview" className="w-28 h-28 object-contain rounded-2xl bg-white dark:bg-gray-800 p-3 shadow-xl relative z-10 border border-slate-100 dark:border-white/5" />
                                        <button
                                            type="button"
                                            onClick={removeLogo}
                                            className="absolute -top-3 -right-3 p-1.5 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition-all z-20 hover:scale-110"
                                            title="Remove Logo"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1 w-full flex flex-col items-center justify-center py-2">
                                        <label className="flex flex-col items-center justify-center cursor-pointer group/upload w-full">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-gray-800 shadow-inner border border-slate-200/50 dark:border-white/5 flex items-center justify-center text-brand-500 group-hover/upload:scale-110 group-hover/upload:bg-brand-100 dark:group-hover/upload:bg-brand-500/20 transition-all duration-300">
                                                {uploading ? (
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent animate-spin rounded-full"></div>
                                                    </div>
                                                ) : (
                                                    <ImageIcon size={28} className="drop-shadow-sm" />
                                                )}
                                            </div>
                                            <span className="mt-4 font-semibold text-slate-700 dark:text-gray-300 group-hover/upload:text-brand-600 dark:group-hover/upload:text-brand-400 transition-colors">
                                                {uploading ? `Uploading ${Math.round(uploadProgress)}%...` : 'Click to Upload Logo'}
                                            </span>
                                            <span className="text-xs text-slate-500 mt-1 font-medium bg-slate-100 dark:bg-gray-800 px-3 py-1 rounded-full">PNG, JPG up to 5MB</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                                        </label>
                                    </div>
                                )}

                                {!formData.logoUrl && (
                                    <>
                                        <div className="hidden sm:flex flex-col items-center justify-center px-4">
                                            <div className="w-px h-10 bg-slate-200 dark:bg-white/10"></div>
                                            <span className="my-3 text-xs font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-[#0B1120] px-2 py-1 rounded-md shadow-sm border border-slate-100 dark:border-white/5">OR</span>
                                            <div className="w-px h-10 bg-slate-200 dark:bg-white/10"></div>
                                        </div>
                                        <div className="flex sm:hidden items-center justify-center w-full px-4 gap-4 py-2">
                                            <div className="h-px w-full bg-slate-200 dark:bg-white/10"></div>
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-[#0B1120] px-2 py-1 rounded-md shadow-sm border border-slate-100 dark:border-white/5">OR</span>
                                            <div className="h-px w-full bg-slate-200 dark:bg-white/10"></div>
                                        </div>

                                        <div className="flex-1 flex justify-center w-full">
                                            <button
                                                type="button"
                                                onClick={() => setShowAssetPicker(true)}
                                                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-gray-800 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 hover:border-brand-500/30 rounded-xl font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-95 group/btn"
                                            >
                                                <Folders size={20} className="text-brand-500 group-hover/btn:scale-110 transition-transform" />
                                                Choose from Gallery
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <AssetPicker
                            isOpen={showAssetPicker}
                            onClose={() => setShowAssetPicker(false)}
                            onSelect={(url) => setFormData(prev => ({ ...prev, logoUrl: url }))}
                            category="Teams"
                        />

                        {/* Text Inputs */}
                        <div className="space-y-1.5 focus-within:text-brand-600 dark:focus-within:text-brand-400 transition-colors">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Team Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="name"
                                placeholder="e.g. Real Madrid CF"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-white/10 p-3.5 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium"
                                required
                            />
                        </div>
                        
                        <div className="space-y-1.5 focus-within:text-brand-600 dark:focus-within:text-brand-400 transition-colors">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Short Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="shortName"
                                placeholder="e.g. RMA"
                                value={formData.shortName}
                                onChange={handleInputChange}
                                className="w-full bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-white/10 p-3.5 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium uppercase"
                                maxLength={5}
                                required
                            />
                        </div>
                        
                        <div className="space-y-1.5 focus-within:text-brand-600 dark:focus-within:text-brand-400 transition-colors">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Founded Year</label>
                            <input
                                type="number"
                                name="founded"
                                placeholder="e.g. 1902"
                                value={formData.founded === 0 ? '' : formData.founded}
                                onChange={handleInputChange}
                                className="w-full bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-white/10 p-3.5 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium"
                            />
                        </div>
                        
                        <div className="space-y-1.5 focus-within:text-brand-600 dark:focus-within:text-brand-400 transition-colors">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Stadium</label>
                            <input
                                type="text"
                                name="stadium"
                                placeholder="e.g. Santiago Bernabéu"
                                value={formData.stadium}
                                onChange={handleInputChange}
                                className="w-full bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-white/10 p-3.5 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium"
                            />
                        </div>
                        
                        <div className="space-y-1.5 focus-within:text-brand-600 dark:focus-within:text-brand-400 transition-colors">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Manager Name</label>
                            <input
                                type="text"
                                name="manager"
                                placeholder="Manager's Full Name"
                                value={formData.manager || ''}
                                onChange={handleInputChange}
                                className="w-full bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-white/10 p-3.5 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium"
                            />
                        </div>
                        
                        <div className="space-y-1.5 focus-within:text-brand-600 dark:focus-within:text-brand-400 transition-colors">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Squad Size</label>
                            <input
                                type="number"
                                name="players"
                                placeholder="Number of players"
                                value={formData.players === 0 ? '' : formData.players}
                                onChange={handleInputChange}
                                className="w-full bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-white/10 p-3.5 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium"
                            />
                        </div>
                        
                        <div className="space-y-1.5 focus-within:text-brand-600 dark:focus-within:text-brand-400 transition-colors">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Team Status</label>
                            <div className="relative">
                                <select
                                    name="status"
                                    value={formData.status || 'Active'}
                                    onChange={handleInputChange}
                                    className="w-full bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-white/10 p-3.5 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium appearance-none cursor-pointer"
                                    style={{
                                        color: formData.status === 'Active' ? '#22c55e' : 
                                               formData.status === 'Inactive' ? '#94a3b8' : 
                                               formData.status === 'Suspended' ? '#ef4444' : '#64748b'
                                    }}
                                >
                                    <option value="Active" className="text-green-500 font-bold">Active</option>
                                    <option value="Inactive" className="text-slate-500 font-bold">Inactive</option>
                                    <option value="Suspended" className="text-red-500 font-bold">Suspended</option>
                                    <option value="Dissolved" className="text-slate-600 font-bold">Dissolved</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-1.5 focus-within:text-brand-600 dark:focus-within:text-brand-400 transition-colors">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Home District</label>
                            <div className="relative">
                                <select
                                    name="district"
                                    value={formData.district || ''}
                                    onChange={handleInputChange}
                                    className="w-full bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-white/10 p-3.5 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium appearance-none cursor-pointer"
                                >
                                    <option value="">Select District</option>
                                    <option value="Quick Match">Quick Match Special Category</option>
                                    <optgroup label="Jammu Division" className="font-bold text-brand-500">
                                        {['Jammu', 'Samba', 'Kathua', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar'].map(d => (
                                            <option key={d} value={d} className="text-slate-900 dark:text-white font-medium">{d}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Kashmir Division" className="font-bold text-sky-500">
                                        {['Srinagar', 'Ganderbal', 'Budgam', 'Baramulla', 'Bandipora', 'Kupwara', 'Pulwama', 'Shopian', 'Kulgam', 'Anantnag'].map(d => (
                                            <option key={d} value={d} className="text-slate-900 dark:text-white font-medium">{d}</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                    <MapPin className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5 focus-within:text-brand-600 dark:focus-within:text-brand-400 transition-colors">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Trophies Won</label>
                            <input
                                type="number"
                                name="trophies"
                                placeholder="0"
                                value={formData.trophies === 0 ? '' : formData.trophies}
                                onChange={handleInputChange}
                                className="w-full bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-white/10 p-3.5 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-1.5 focus-within:text-brand-600 dark:focus-within:text-brand-400 transition-colors">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Club History / Description</label>
                            <textarea
                                name="description"
                                rows="4"
                                placeholder="Write about the club's history, values, and achievements..."
                                value={formData.description || ''}
                                onChange={handleInputChange}
                                className="w-full bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-white/10 p-4 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium resize-y"
                            ></textarea>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider flex items-center justify-between">
                                Participating Tournaments
                                <span className="text-[10px] font-medium opacity-80 normal-case bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded-full">Select multiple</span>
                            </label>
                            <div className="flex flex-wrap gap-2.5 bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-white/10 p-4 rounded-xl min-h-[58px] items-center shadow-inner">
                                {tournaments.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleTournamentToggle(t.name)}
                                        className={`text-sm px-4 py-2 rounded-lg font-bold transition-all border ${Array.isArray(formData.tournaments) && formData.tournaments.includes(t.name)
                                            ? 'bg-brand-500/10 border-brand-500/30 text-brand-600 dark:text-brand-400 shadow-sm'
                                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                                {tournaments.length === 0 && <div className="text-slate-500 dark:text-gray-500 text-sm italic py-1 px-2 border border-dashed border-slate-300 dark:border-gray-600 rounded">No tournaments available. Create one first.</div>}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-2 pt-6 mt-2 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <div className="flex w-full gap-3 flex-col sm:flex-row order-1 sm:order-2 sm:justify-end">
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingId(null);
                                            setFormData({
                                                name: '',
                                                shortName: '',
                                                founded: '',
                                                stadium: '',
                                                manager: '',
                                                status: 'Active',
                                                players: 0,
                                                tournaments: [],
                                                logoUrl: '',
                                                description: '',
                                                trophies: 0,
                                                district: 'Baramulla'
                                            });
                                        }}
                                        className="px-6 py-3.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white transition-all w-full sm:w-auto text-center"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`relative overflow-hidden group px-8 py-3.5 rounded-xl font-black text-white shadow-lg shadow-brand-500/25 transition-all w-full sm:w-auto text-center ${loading ? 'bg-brand-400/80 cursor-not-allowed scale-95' : 'bg-gradient-to-r from-brand-600 to-sky-500 hover:scale-[1.02] active:scale-95'}`}
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white/50 border-t-white animate-spin rounded-full"></div>
                                            <span>Saving...</span>
                                        </div>
                                    ) : (
                                        <div className="relative z-10 flex items-center justify-center gap-2">
                                            <span>{editingId ? 'Save Changes' : 'Create Team'}</span>
                                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Search */}
            < div id="team-list-top" className="mb-6 relative" >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search teams by name or short name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
            </div >

            {/* List */}
            < div className="grid grid-cols-1 md:grid-cols-2 gap-4" >
                {
                    currentItems.map(team => (
                        <div key={team.id} className="bg-slate-50 dark:bg-gray-800 p-4 rounded flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center border border-slate-200/5 dark:border-white/5 overflow-hidden">
                                    {team.logoUrl ? (
                                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <ImageIcon className="text-gray-600" size={24} />
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-lg">{team.name} ({team.shortName})</div>
                                    <div className="text-sm text-slate-500 dark:text-gray-400">
                                        Stadium: {team.stadium} • Manager: {team.manager || 'N/A'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 text-slate-900 dark:text-white">
                                <button
                                    onClick={() => handleEdit(team)}
                                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
                                >
                                    Edit
                                </button>
                                {isSuperAdmin && (
                                    <button
                                        onClick={() => handleDelete(team.id)}
                                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                }
                {
                    filteredTeams.length === 0 && !loading && (
                        <p className="text-center text-slate-500 dark:text-gray-400 col-span-full py-8">No teams found matching your search.</p>
                    )
                }
            </div >

            {/* Pagination Controls */}
            {filteredTeams.length > teamsPerPage && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-slate-200/5 dark:border-white/5">
                    <div className="text-sm text-slate-500 dark:text-gray-400 font-medium">
                        Showing <span className="text-slate-900 dark:text-white font-bold">{indexOfFirstTeam + 1}</span> to <span className="text-slate-900 dark:text-white font-bold">{Math.min(indexOfLastTeam, filteredTeams.length)}</span> of <span className="text-slate-900 dark:text-white font-bold">{filteredTeams.length}</span> teams
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
        </div >
    );
};

export default ManageTeams;
