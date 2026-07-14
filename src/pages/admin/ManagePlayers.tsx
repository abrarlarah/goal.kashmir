// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useData } from '../../context/DataContext';
import { Upload, X, User, Image as ImageIcon, Folders, Search, Filter, Edit3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, MapPin } from 'lucide-react';
import AssetPicker from '../../components/admin/AssetPicker';
import { registerAsset } from '../../utils/assetRegistry';
import { calculateAge } from '../../utils/ageUtils';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../utils/auditLogger';

// Districts of Jammu and Kashmir
const DISTRICTS = {
    JAMMU: ['Jammu', 'Samba', 'Kathua', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar'],
    KASHMIR: ['Srinagar', 'Ganderbal', 'Budgam', 'Baramulla', 'Bandipora', 'Kupwara', 'Pulwama', 'Shopian', 'Kulgam', 'Anantnag']
};

const ManagePlayers = () => {
    const { players, teams, tournaments } = useData();
    const { currentUser, isSuperAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false); // Form loading
    const [searchTerm, setSearchTerm] = useState('');
    const [teamFilter, setTeamFilter] = useState('All');
    const [teamSearchText, setTeamSearchText] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        team: '',
        position: 'Forward',
        nationality: '',
        district: '',
        dob: '',
        age: '',
        photoUrl: '',
        matches: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        number: '',
        bio: '',
        cleanSheets: 0
    });
    const [editingId, setEditingId] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [showAssetPicker, setShowAssetPicker] = useState(false);

    const [successMessage, setSuccessMessage] = useState('');

    const positions = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

    useEffect(() => {
        if (location.state && location.state.editPlayer) {
            handleEdit(location.state.editPlayer);
            // Clear state so it doesn't re-trigger
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Helper to determine if field should be a number
        const numberFields = ['age', 'matches', 'goals', 'assists', 'yellowCards', 'redCards', 'number', 'cleanSheets'];

        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: numberFields.includes(name) ? Number(value) : value
            };

            // Automatically calculate age if DOB changes
            if (name === 'dob') {
                const calculatedAge = calculateAge(value);
                if (calculatedAge !== null) {
                    newData.age = calculatedAge;
                }
            }

            return newData;
        });
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('Image size should be less than 2MB');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const storageRef = ref(storage, `player-photos/${Date.now()}_${file.name}`);
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
            setFormData(prev => ({ ...prev, photoUrl: downloadURL }));

            // Automatically register in Media Repository
            await registerAsset(file.name, downloadURL, 'Players');

            setUploading(false);
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error.code || error.message}`);
            setUploading(false);
        }
    };

    const removePhoto = () => {
        setFormData(prev => ({ ...prev, photoUrl: '' }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');

        const isEditing = !!editingId;
        const playerName = formData.name;
        const playerId = editingId;

        const request = isEditing
            ? updateDoc(doc(db, 'players', editingId), formData)
            : addDoc(collection(db, 'players'), formData);

        request.then((docRef) => {
            logAuditEvent(isEditing ? 'UPDATE_PLAYER' : 'CREATE_PLAYER', {
                entityType: 'player',
                entityId: isEditing ? playerId : docRef?.id,
                entityName: playerName,
            });
        }).catch((error) => {
            console.error("Error saving player: ", error);
            alert("Error saving player: " + error.message);
        });

        // Optimistic Update
        setSuccessMessage(isEditing ? 'Player updated successfully!' : 'Player added successfully!');

        setFormData({
            name: '',
            team: '',
            position: 'Forward',
            nationality: '',
            district: '',
            dob: '',
            age: '',
            photoUrl: '',
            matches: 0,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            number: '',
            bio: '',
            cleanSheets: 0
        });
        setEditingId(null);

        window.scrollTo(0, 0);
        setTimeout(() => setSuccessMessage(''), 3000);
        setLoading(false);
    };

    const handleEdit = (player) => {
        setFormData({
            ...player,
            nationality: player.nationality || '',
            district: player.district || '',
            dob: player.dob || '',
            bio: player.bio || '',
            number: player.number || '',
            cleanSheets: player.cleanSheets || 0
        });
        setEditingId(player.id);
        setSuccessMessage('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this player?')) {
            const player = players.find(p => p.id === id);
            try {
                await deleteDoc(doc(db, 'players', id));
                logAuditEvent('DELETE_PLAYER', {
                    entityType: 'player',
                    entityId: id,
                    entityName: player?.name || 'Unknown',
                });
                setSuccessMessage('Player deleted successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
            } catch (error) {
                console.error("Error deleting player: ", error);
            }
        }
    };

    // Scope players: superadmin sees all, admin sees only players on teams in their tournaments
    const myTournamentNames = useMemo(() => {
        if (isSuperAdmin) return null;
        return tournaments
            .filter(t => t.createdBy === currentUser?.uid)
            .map(t => t.name);
    }, [tournaments, currentUser, isSuperAdmin]);

    const allowedTeamNames = useMemo(() => {
        if (isSuperAdmin) return null; // superadmin
        return teams
            .filter(team => {
                // Include teams created by the user (Team Admins)
                if (team.createdBy === currentUser?.uid) return true;

                // Include teams in user's tournaments (Tournament Admins)
                if (!myTournamentNames) return false;
                const teamTournaments = Array.isArray(team.tournaments)
                    ? team.tournaments
                    : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
                return teamTournaments.some(tn => myTournamentNames.includes(tn));
            })
            .map(t => t.name);
    }, [teams, myTournamentNames, currentUser, isSuperAdmin]);

    const scopedPlayers = useMemo(() => {
        if (!allowedTeamNames) return players; // superadmin
        return players.filter(p => allowedTeamNames.includes(p.team));
    }, [players, allowedTeamNames]);

    const filteredPlayers = scopedPlayers.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.team.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTeam = teamFilter === 'All' || p.team === teamFilter;
        return matchesSearch && matchesTeam;
    });

    // Pagination Logic
    const [currentPage, setCurrentPage] = useState(1);
    const playersPerPage = 10;
    const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);

    const indexOfLastPlayer = currentPage * playersPerPage;
    const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
    const currentItems = filteredPlayers.slice(indexOfFirstPlayer, indexOfLastPlayer);

    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
        const listElement = document.getElementById('player-list-top');
        if (listElement) listElement.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, teamFilter]);

    const handleExportCSV = () => {
        if (filteredPlayers.length === 0) return alert('No players to export');

        const headers = ['Name', 'Team', 'District', 'Kit #', 'Position', 'Goals', 'Assists', 'Matches', 'Yellow Cards', 'Red Cards', 'Nationality'];
        const csvRows = [headers.join(',')];

        filteredPlayers.forEach(p => {
            const row = [
                `"${p.name || ''}"`,
                `"${p.team || ''}"`,
                `"${p.district || ''}"`,
                p.number || '',
                `"${p.position || ''}"`,
                p.goals || 0,
                p.assists || 0,
                p.matches || 0,
                p.yellowCards || 0,
                p.redCards || 0,
                `"${p.nationality || ''}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `players_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container mx-auto px-4 py-8 text-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Manage Players</h2>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0B1220] bg-[#131D31] hover:bg-[#18253C] dark:bg-[#131D31] text-white border border-[#24344D] rounded-lg text-sm transition-colors"
                >
                    <Download size={16} /> Export to CSV
                </button>
            </div>

            {successMessage && (
                <div className="bg-green-600 text-white p-3 rounded mb-4 animate-pulse">
                    {successMessage}
                </div>
            )}

            {/* Form */}
            <div className="rounded-3xl bg-[#131D31] dark:bg-[#0B1120] border border-[#24344D]/50 border-[#24344D]/50 shadow-2xl dark:shadow-brand-500/5 overflow-hidden transition-all mb-10">
                <div className="bg-gradient-to-r from-violet-600 via-cyan-500 to-pink-500 p-6 sm:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E2B42] rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-3 bg-[#131D31]/10 rounded-2xl backdrop-blur-sm border border-white/20 shadow-lg">
                            <User className="text-white h-7 w-7" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
                                {editingId ? 'Edit Player Details' : 'Register New Player'}
                            </h3>
                            <p className="text-white/90 mt-1 text-sm font-medium">Add a player to the registry database and manage statistics.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-8 bg-[#0B1220]/50 dark:bg-transparent">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                        {/* Player Photo Upload */}
                        <div className="lg:col-span-4">
                            <label className="text-sm font-bold text-[#94A3B8] dark:text-gray-300 block mb-3 uppercase tracking-wider">Player Portrait</label>
                            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 border-[1.5px] border-dashed border-[#24344D] rounded-2xl bg-[#131D31] bg-[#131D31]/50 transition-all hover:border-brand-500/50 hover:bg-[#0B1220] dark:hover:bg-brand-500/5 group shadow-sm">
                                {formData.photoUrl ? (
                                    <div className="relative shrink-0">
                                        <div className="absolute inset-0 bg-cyan-500/15 blur-xl rounded-full opacity-100 transition-opacity"></div>
                                        <img src={formData.photoUrl} alt="Preview" className="w-28 h-28 object-cover rounded-full bg-[#131D31] dark:bg-gray-800 p-1.5 shadow-xl relative z-10 border border-[#24344D]/50 border-[#24344D]/50 mx-auto" />
                                        <button
                                            type="button"
                                            onClick={removePhoto}
                                            className="absolute top-0 right-0 p-1.5 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition-all z-20 hover:scale-110"
                                            title="Remove Photo"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1 w-full flex flex-col items-center justify-center py-2">
                                        <label className="flex flex-col items-center justify-center cursor-pointer group/upload w-full">
                                            <div className="w-20 h-20 rounded-full bg-[#101827] dark:bg-gray-800 shadow-inner border border-[#24344D]/50 border-[#24344D]/50 flex items-center justify-center text-brand-500 group-hover/upload:scale-110 group-hover/upload:bg-brand-100 dark:group-hover/upload:bg-brand-500/15 transition-all duration-300">
                                                {uploading ? (
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent animate-spin rounded-full"></div>
                                                    </div>
                                                ) : (
                                                    <User size={32} className="drop-shadow-sm" />
                                                )}
                                            </div>
                                            <span className="mt-4 font-semibold text-[#94A3B8] dark:text-gray-300 group-hover/upload:text-violet-600 dark:group-hover/upload:text-brand-400 transition-colors">
                                                {uploading ? `Uploading ${Math.round(uploadProgress)}%...` : 'Click to Upload Portrait'}
                                            </span>
                                            <span className="text-xs text-[#64748B] mt-1 font-medium bg-[#101827] dark:bg-gray-800 px-3 py-1 rounded-full">PNG, JPG up to 5MB</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                                        </label>
                                    </div>
                                )}

                                {!formData.photoUrl && (
                                    <>
                                        <div className="hidden sm:flex flex-col items-center justify-center px-4">
                                            <div className="w-px h-10 bg-[#131D31] bg-[#18253C]"></div>
                                            <span className="my-3 text-xs font-black text-[#64748B] uppercase tracking-widest bg-[#131D31] dark:bg-[#0B1120] px-2 py-1 rounded-md shadow-sm border border-[#24344D]/50 border-[#24344D]/50">OR</span>
                                            <div className="w-px h-10 bg-[#131D31] bg-[#18253C]"></div>
                                        </div>
                                        <div className="flex sm:hidden items-center justify-center w-full px-4 gap-4 py-2">
                                            <div className="h-px w-full bg-[#131D31] bg-[#18253C]"></div>
                                            <span className="text-xs font-black text-[#64748B] uppercase tracking-widest bg-[#131D31] dark:bg-[#0B1120] px-2 py-1 rounded-md shadow-sm border border-[#24344D]/50 border-[#24344D]/50">OR</span>
                                            <div className="h-px w-full bg-[#131D31] bg-[#18253C]"></div>
                                        </div>

                                        <div className="flex-1 flex justify-center w-full">
                                            <button
                                                type="button"
                                                onClick={() => setShowAssetPicker(true)}
                                                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-[#131D31] dark:bg-gray-800 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-brand-500/10 text-[#94A3B8] text-white border border-[#24344D] hover:border-brand-500/20 rounded-xl font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-95 group/btn"
                                            >
                                                <Folders size={20} className="text-brand-500 group-hover/btn:scale-110 transition-transform" />
                                                Choose from Directory
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <AssetPicker
                            isOpen={showAssetPicker}
                            onClose={() => setShowAssetPicker(false)}
                            onSelect={(url) => setFormData(prev => ({ ...prev, photoUrl: url }))}
                            category="Players"
                        />

                        {/* Text Inputs */}
                        <div className="md:col-span-2 space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                            <label className="text-xs font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider">Player Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="name"
                                placeholder="Full Name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full bg-[#131D31] dark:bg-gray-800/50 border border-[#24344D] p-3.5 rounded-xl text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium"
                                required
                            />
                        </div>

                        <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                            <label className="text-xs font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider flex justify-between items-center">
                                <span>Team</span>
                                {teams.length > 5 && (
                                    <div className="flex items-center gap-1 bg-[#101827] dark:bg-gray-900/50 px-2 py-0.5 rounded-md border border-[#24344D]/50 border-[#24344D]/50">
                                        <Search size={10} className="text-[#64748B] dark:text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Find team"
                                            value={teamSearchText}
                                            onChange={(e) => setTeamSearchText(e.target.value)}
                                            className="bg-transparent border-none text-[10px] w-14 outline-none text-brand-500 placeholder:text-gray-400/70"
                                        />
                                    </div>
                                )}
                            </label>
                            <div className="relative">
                                <select
                                    name="team"
                                    value={formData.team}
                                    onChange={handleInputChange}
                                    className="w-full bg-[#131D31] dark:bg-gray-800/50 border border-[#24344D] p-3.5 rounded-xl text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="" disabled className="dark:bg-gray-800">Select a Club</option>
                                    {teams
                                        .filter(t => t.name.toLowerCase().includes(teamSearchText.toLowerCase()))
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(t => (
                                            <option key={t.id} value={t.name} className="font-medium text-[#F8FAFC] text-white dark:bg-gray-800">{t.name}</option>
                                        ))
                                    }
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#64748B]">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                            <label className="text-xs font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider">Position</label>
                            <div className="relative">
                                <select
                                    name="position"
                                    value={formData.position}
                                    onChange={handleInputChange}
                                    className="w-full bg-[#131D31] dark:bg-gray-800/50 border border-[#24344D] p-3.5 rounded-xl text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium appearance-none cursor-pointer"
                                    style={{
                                        color: formData.position === 'Forward' ? '#ef4444' :
                                               formData.position === 'Midfielder' ? '#eab308' :
                                               formData.position === 'Defender' ? '#3b82f6' : '#22c55e'
                                    }}
                                >
                                    {positions.map(p => (
                                        <option key={p} value={p} className="text-white dark:bg-gray-800">
                                            {p}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#64748B]">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                            <label className="text-xs font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider">Home District <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <select
                                    name="district"
                                    value={formData.district}
                                    onChange={handleInputChange}
                                    className="w-full bg-[#131D31] dark:bg-gray-800/50 border border-[#24344D] p-3.5 rounded-xl text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="" disabled className="dark:bg-gray-800">Select District</option>
                                    <optgroup label="Jammu Division" className="font-bold text-brand-500 dark:bg-gray-800 text-white bg-[#131D31]">
                                        {DISTRICTS.JAMMU.map(district => (
                                            <option key={district} value={district} className="text-white font-medium dark:bg-gray-800">{district}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Kashmir Division" className="font-bold text-cyan-500 dark:bg-gray-800 text-white bg-[#131D31]">
                                        {DISTRICTS.KASHMIR.map(district => (
                                            <option key={district} value={district} className="text-white font-medium dark:bg-gray-800">{district}</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#64748B]">
                                    <MapPin className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                            <label className="text-xs font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider">Kit Number</label>
                            <input
                                type="number"
                                name="number"
                                placeholder="e.g. 10"
                                value={formData.number}
                                onChange={handleInputChange}
                                className="w-full bg-[#131D31] dark:bg-gray-800/50 border border-[#24344D] p-3.5 rounded-xl text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-black text-center text-lg"
                            />
                        </div>

                        <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                            <label className="text-xs font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider">Nationality</label>
                            <input
                                type="text"
                                name="nationality"
                                placeholder="Nationality"
                                value={formData.nationality}
                                onChange={handleInputChange}
                                className="w-full bg-[#131D31] dark:bg-gray-800/50 border border-[#24344D] p-3.5 rounded-xl text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium"
                            />
                        </div>

                        <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                            <label className="text-xs font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider">Date of Birth</label>
                            <input
                                type="date"
                                name="dob"
                                value={formData.dob}
                                onChange={handleInputChange}
                                className="w-full bg-[#131D31] dark:bg-gray-800/50 border border-[#24344D] p-3.5 rounded-xl text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider">Age (Auto Calc)</label>
                            <input
                                type="number"
                                name="age"
                                placeholder="0"
                                value={formData.age === 0 ? '' : formData.age}
                                readOnly
                                className="w-full bg-[#101827]/80 dark:bg-gray-800/80 border border-[#24344D]/50 border-[#24344D]/50 p-3.5 rounded-xl text-[#64748B] dark:text-gray-400 font-medium cursor-not-allowed text-center"
                            />
                        </div>

                        {/* Player Statistics Grids */}
                        <div className="col-span-full pt-4">
                            <h4 className="text-sm font-black text-[#F8FAFC] text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-cyan-500"></div> Player Statistics
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 p-4 rounded-2xl bg-[#0B1220] dark:bg-[#121b2e] border border-[#24344D]/50 border-[#24344D]/50">
                                <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                                    <label className="text-[10px] font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider text-center block">Matches</label>
                                    <input type="number" name="matches" placeholder="0" value={formData.matches === 0 ? '' : formData.matches} onChange={handleInputChange} className="w-full bg-[#131D31] dark:bg-gray-800 border border-[#24344D] p-2.5 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm font-black text-center" />
                                </div>
                                <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                                    <label className="text-[10px] font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider text-center block">Goals</label>
                                    <input type="number" name="goals" placeholder="0" value={formData.goals === 0 ? '' : formData.goals} onChange={handleInputChange} className="w-full bg-[#131D31] dark:bg-gray-800 border border-[#24344D] p-2.5 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm font-black text-center text-brand-500" />
                                </div>
                                <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                                    <label className="text-[10px] font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider text-center block">Assists</label>
                                    <input type="number" name="assists" placeholder="0" value={formData.assists === 0 ? '' : formData.assists} onChange={handleInputChange} className="w-full bg-[#131D31] dark:bg-gray-800 border border-[#24344D] p-2.5 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm font-black text-center text-blue-500" />
                                </div>
                                <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                                    <label className="text-[10px] font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider text-center block">Y. Cards</label>
                                    <input type="number" name="yellowCards" placeholder="0" value={formData.yellowCards === 0 ? '' : formData.yellowCards} onChange={handleInputChange} className="w-full bg-[#131D31] dark:bg-gray-800 border border-[#24344D] p-2.5 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm font-black text-center text-yellow-500" />
                                </div>
                                <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                                    <label className="text-[10px] font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider text-center block">R. Cards</label>
                                    <input type="number" name="redCards" placeholder="0" value={formData.redCards === 0 ? '' : formData.redCards} onChange={handleInputChange} className="w-full bg-[#131D31] dark:bg-gray-800 border border-[#24344D] p-2.5 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm font-black text-center text-red-500" />
                                </div>
                                <div className="space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors">
                                    <label className="text-[10px] font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider text-center block">Clean Sht</label>
                                    <input type="number" name="cleanSheets" placeholder="0" value={formData.cleanSheets === 0 ? '' : formData.cleanSheets} onChange={handleInputChange} className="w-full bg-[#131D31] dark:bg-gray-800 border border-[#24344D] p-2.5 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm font-black text-center text-green-400" />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 lg:col-span-4 space-y-1.5 focus-within:text-violet-600 dark:focus-within:text-cyan-400 transition-colors mt-2">
                            <label className="text-xs font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-wider">Player Biography</label>
                            <textarea
                                name="bio"
                                placeholder="Write about the player's career, strengths, and background..."
                                value={formData.bio || ''}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full bg-[#131D31] dark:bg-gray-800/50 border border-[#24344D] p-4 rounded-xl text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm font-medium resize-y"
                            ></textarea>
                        </div>

                        {/* Actions */}
                        <div className="lg:col-span-4 pt-6 pb-2 border-t border-[#24344D] flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <div className="flex w-full gap-3 flex-col sm:flex-row order-1 sm:order-2 sm:justify-end">
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingId(null);
                                            setFormData({
                                                name: '',
                                                team: '',
                                                position: 'Forward',
                                                nationality: '',
                                                district: '',
                                                age: '',
                                                matches: 0,
                                                goals: 0,
                                                assists: 0,
                                                yellowCards: 0,
                                                redCards: 0,
                                                number: ''
                                            });
                                        }}
                                        className="px-6 py-3.5 rounded-xl font-bold bg-[#101827] hover:bg-slate-200 text-[#94A3B8] bg-[#131D31]/50 hover:bg-[#18253C] text-white transition-all w-full sm:w-auto text-center"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`relative overflow-hidden group px-8 py-3.5 rounded-xl font-black text-white shadow-lg shadow-cyan-500/25 transition-all w-full sm:w-auto text-center ${loading ? 'bg-cyan-400/80 cursor-not-allowed scale-95' : 'bg-gradient-to-r from-violet-600 via-cyan-500 to-pink-500 hover:scale-[1.02] active:scale-95'}`}
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white/50 border-t-white animate-spin rounded-full"></div>
                                            <span>Saving...</span>
                                        </div>
                                    ) : (
                                        <div className="relative z-10 flex items-center justify-center gap-2">
                                            <span>{editingId ? 'Save Improvements' : 'Register Player'}</span>
                                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Search and Filters */}
            <div id="player-list-top" className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search players by name or team..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#0B1220] dark:bg-gray-800 border border-[#24344D] dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-[#64748B] dark:text-gray-400" size={18} />
                    <select
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        className="bg-[#0B1220] dark:bg-gray-800 border border-[#24344D] dark:border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                        <option value="All" className="dark:bg-gray-800">All Teams</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.name} className="dark:bg-gray-800">{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-[#94A3B8] dark:text-gray-300">
                    <thead className="bg-[#0B1220] dark:bg-gray-800 text-xs uppercase">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Team</th>
                            <th className="px-4 py-3">District</th>
                            <th className="px-4 py-3">Kit #</th>
                            <th className="px-4 py-3">Pos</th>
                            <th className="px-4 py-3">Stats</th>
                            <th className="px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map(player => (
                            <tr key={player.id} className="border-b border-[#24344D] dark:border-gray-700 bg-[#0B1220] dark:bg-gray-800 hover:bg-[#18253C] dark:bg-gray-700">
                                <td className="px-4 py-3 font-medium text-white">{player.name}</td>
                                <td className="px-4 py-3">{player.team}</td>
                                <td className="px-4 py-3">
                                    <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-1 rounded">
                                        {player.district || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-bold text-brand-500">#{player.number || '--'}</span>
                                </td>
                                <td className="px-4 py-3">{player.position}</td>
                                <td className="px-4 py-3">
                                    {player.goals} G, {player.assists} A
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEdit(player)}
                                            className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                                            title="Edit Player"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        {isSuperAdmin && (
                                            <button
                                                onClick={() => handleDelete(player.id)}
                                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                                title="Delete Player"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {
                    filteredPlayers.length === 0 && !loading && (
                        <p className="text-center text-[#64748B] dark:text-gray-400 mt-4">No players found matching your criteria.</p>
                    )
                }
            </div >

            {/* Pagination Controls */}
            {filteredPlayers.length > playersPerPage && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220]/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-[#24344D]/40">
                    <div className="text-sm text-[#64748B] dark:text-gray-400 font-medium">
                        Showing <span className="text-white font-bold">{indexOfFirstPlayer + 1}</span> to <span className="text-white font-bold">{Math.min(indexOfLastPlayer, filteredPlayers.length)}</span> of <span className="text-white font-bold">{filteredPlayers.length}</span> players
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => paginate(1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl bg-[#0B1220] dark:bg-gray-800 border border-[#24344D]/40 text-[#64748B] dark:text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronsLeft size={18} />
                        </button>
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl bg-[#0B1220] dark:bg-gray-800 border border-[#24344D]/40 text-[#64748B] dark:text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex items-center gap-1 mx-2">
                            {[...Array(totalPages)].map((_, i) => {
                                const pageNum = i + 1;
                                // Show first, last, current, and pages around current
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
                                                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                                                : "bg-[#0B1220] dark:bg-gray-800 border border-[#24344D]/40 text-[#64748B] dark:text-gray-400 hover:text-white"
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
                            className="p-2 rounded-xl bg-[#0B1220] dark:bg-gray-800 border border-[#24344D]/40 text-[#64748B] dark:text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <button
                            onClick={() => paginate(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-xl bg-[#0B1220] dark:bg-gray-800 border border-[#24344D]/40 text-[#64748B] dark:text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronsRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
};

export default ManagePlayers;
