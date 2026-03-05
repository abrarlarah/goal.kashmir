import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useData } from '../../context/DataContext';
import { Upload, X, Image as ImageIcon, Folders, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import AssetPicker from '../../components/admin/AssetPicker';
import { registerAsset } from '../../utils/assetRegistry';

const ManageTeams = () => {
    const { teams, tournaments } = useData();
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
                    setSuccessMessage('Team and all associated matches/players updated!');
                } else {
                    setSuccessMessage('Team updated successfully!');
                }
            } else {
                await addDoc(collection(db, 'teams'), dataToSave);
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
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this team?')) {
            try {
                await deleteDoc(doc(db, 'teams', id));
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

    const filteredTeams = teams.filter(team =>
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
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
                <h3 className="text-xl mb-4">{editingId ? 'Edit Team' : 'Add New Team'}</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Logo Upload Section */}
                    <div className="md:col-span-2 flex flex-col items-center p-4 border-2 border-dashed border-gray-600 rounded-xl bg-gray-700/30">
                        {formData.logoUrl ? (
                            <div className="relative">
                                <img src={formData.logoUrl} alt="Logo Preview" className="w-24 h-24 object-contain rounded-lg bg-white/10 p-2" />
                                <button
                                    type="button"
                                    onClick={removeLogo}
                                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-slate-900 dark:text-white shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <label className="flex flex-col items-center justify-center cursor-pointer group">
                                    <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-gray-600 transition-colors">
                                        {uploading ? (
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent animate-spin rounded-full mb-1"></div>
                                                <span className="text-[10px] text-brand-400">{Math.round(uploadProgress)}%</span>
                                            </div>
                                        ) : (
                                            <ImageIcon size={32} />
                                        )}
                                    </div>
                                    <span className="mt-2 text-sm text-gray-400 group-hover:text-gray-300">
                                        {uploading ? 'Uploading...' : 'Upload Team Logo'}
                                    </span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                                </label>

                                <div className="flex items-center gap-3">
                                    <div className="h-[1px] w-12 bg-gray-600"></div>
                                    <span className="text-xs text-gray-500 uppercase font-bold">OR</span>
                                    <div className="h-[1px] w-12 bg-gray-600"></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowAssetPicker(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-xl text-sm font-semibold transition-all"
                                >
                                    <Folders size={18} />
                                    Choose from Repository
                                </button>
                            </div>
                        )}
                    </div>

                    <AssetPicker
                        isOpen={showAssetPicker}
                        onClose={() => setShowAssetPicker(false)}
                        onSelect={(url) => setFormData(prev => ({ ...prev, logoUrl: url }))}
                        category="Teams"
                    />

                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Team Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Team Name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Short Name</label>
                        <input
                            type="text"
                            name="shortName"
                            placeholder="e.g. MUN"
                            value={formData.shortName}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Founded Year</label>
                        <input
                            type="number"
                            name="founded"
                            placeholder="Year"
                            value={formData.founded}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Stadium</label>
                        <input
                            type="text"
                            name="stadium"
                            placeholder="Stadium"
                            value={formData.stadium}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Manager Name</label>
                        <input
                            type="text"
                            name="manager"
                            placeholder="Manager's Name"
                            value={formData.manager || ''}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Squad Size</label>
                        <input
                            type="number"
                            name="players"
                            placeholder="0"
                            value={formData.players}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Team Status</label>
                        <select
                            name="status"
                            value={formData.status || 'Active'}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Dissolved">Dissolved</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Home District</label>
                        <select
                            name="district"
                            value={formData.district || ''}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        >
                            <option value="">Select District</option>
                            <optgroup label="Jammu Division">
                                {['Jammu', 'Samba', 'Kathua', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar'].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Kashmir Division">
                                {['Srinagar', 'Ganderbal', 'Budgam', 'Baramulla', 'Bandipora', 'Kupwara', 'Pulwama', 'Shopian', 'Kulgam', 'Anantnag'].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Trophies Won</label>
                        <input
                            type="number"
                            name="trophies"
                            placeholder="0"
                            value={formData.trophies || 0}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div className="col-span-full">
                        <label className="text-xs text-gray-400 block mb-1">Club History / Description</label>
                        <textarea
                            name="description"
                            rows="4"
                            placeholder="Write about the club's history, values, and achievements..."
                            value={formData.description || ''}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-3 rounded text-slate-900 dark:text-white w-full"
                        ></textarea>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Participating Tournaments</label>
                        <div className="flex flex-wrap gap-2 bg-gray-700 p-2 rounded min-h-[42px] items-center">
                            {tournaments.map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleTournamentToggle(t.name)}
                                    className={`text-xs px-2 py-1 rounded transition-colors ${Array.isArray(formData.tournaments) && formData.tournaments.includes(t.name)
                                        ? 'bg-green-600 text-slate-900 dark:text-white shadow-sm'
                                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        }`}
                                >
                                    {t.name}
                                </button>
                            ))}
                            {tournaments.length === 0 && <span className="text-gray-500 text-xs italic">No tournaments available. Create one first.</span>}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`bg-green-600 hover:bg-green-700 p-2 rounded text-slate-900 dark:text-white col-span-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Saving...' : (editingId ? 'Update Team' : 'Add Team')}
                    </button>
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
                            className="bg-gray-600 hover:bg-gray-500 p-2 rounded text-slate-900 dark:text-white col-span-full"
                        >
                            Cancel Edit
                        </button>
                    )}
                </form>
            </div >

            {/* Search */}
            < div id="team-list-top" className="mb-6 relative" >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search teams by name or short name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
            </div >

            {/* List */}
            < div className="grid grid-cols-1 md:grid-cols-2 gap-4" >
                {
                    currentItems.map(team => (
                        <div key={team.id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center border border-white/5 overflow-hidden">
                                    {team.logoUrl ? (
                                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <ImageIcon className="text-gray-600" size={24} />
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-lg">{team.name} ({team.shortName})</div>
                                    <div className="text-sm text-gray-400">
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
                                <button
                                    onClick={() => handleDelete(team.id)}
                                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                }
                {
                    filteredTeams.length === 0 && !loading && (
                        <p className="text-center text-gray-400 col-span-full py-8">No teams found matching your search.</p>
                    )
                }
            </div >

            {/* Pagination Controls */}
            {filteredTeams.length > teamsPerPage && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-800/50 p-4 rounded-2xl border border-white/5">
                    <div className="text-sm text-gray-400 font-medium">
                        Showing <span className="text-white font-bold">{indexOfFirstTeam + 1}</span> to <span className="text-white font-bold">{Math.min(indexOfLastTeam, filteredTeams.length)}</span> of <span className="text-white font-bold">{filteredTeams.length}</span> teams
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => paginate(1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl bg-gray-800 border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronsLeft size={18} />
                        </button>
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl bg-gray-800 border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                                                : "bg-gray-800 border border-white/5 text-gray-400 hover:text-white"
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
                            className="p-2 rounded-xl bg-gray-800 border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <button
                            onClick={() => paginate(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-xl bg-gray-800 border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
