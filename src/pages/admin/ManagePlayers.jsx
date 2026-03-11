import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useData } from '../../context/DataContext';
import { Upload, X, User, Image as ImageIcon, Folders, Search, Filter, Edit3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download } from 'lucide-react';
import AssetPicker from '../../components/admin/AssetPicker';
import { registerAsset } from '../../utils/assetRegistry';
import { calculateAge } from '../../utils/ageUtils';
import { useAuth } from '../../context/AuthContext';

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

        const request = editingId
            ? updateDoc(doc(db, 'players', editingId), formData)
            : addDoc(collection(db, 'players'), formData);

        request.catch((error) => {
            console.error("Error saving player: ", error);
            alert("Error saving player: " + error.message);
        });

        // Optimistic Update
        setSuccessMessage(editingId ? 'Player updated successfully!' : 'Player added successfully!');

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
            try {
                await deleteDoc(doc(db, 'players', id));
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
        if (!myTournamentNames) return null; // superadmin
        return teams
            .filter(team => {
                const teamTournaments = Array.isArray(team.tournaments)
                    ? team.tournaments
                    : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
                return teamTournaments.some(tn => myTournamentNames.includes(tn));
            })
            .map(t => t.name);
    }, [teams, myTournamentNames]);

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
        <div className="container mx-auto px-4 py-8 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Manage Players</h2>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm transition-colors"
                >
                    <Download size={16} /> Export to CSV
                </button>
            </div>

            {successMessage && (
                <div className="bg-green-600 text-slate-900 dark:text-white p-3 rounded mb-4 animate-pulse">
                    {successMessage}
                </div>
            )}

            {/* Form */}
            <div className="rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-[#0f172a] dark:to-[#020617] ring-1 ring-slate-200/80 dark:ring-white/5 overflow-hidden shadow-xl dark:shadow-2xl dark:shadow-brand-500/5 transition-all p-6 mb-8">
                <h3 className="text-xl mb-4 font-bold">{editingId ? 'Edit Player' : 'Add New Player'}</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Player Photo Upload */}
                    <div className="lg:col-span-4 flex flex-col items-center p-4 border-2 border-dashed border-gray-600 rounded-xl bg-slate-100/30 dark:bg-gray-700/30">
                        {formData.photoUrl ? (
                            <div className="relative">
                                <img src={formData.photoUrl} alt="Preview" className="w-24 h-24 object-cover rounded-full border-2 border-brand-500" />
                                <button
                                    type="button"
                                    onClick={removePhoto}
                                    className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full text-slate-900 dark:text-white shadow-lg hover:bg-red-600"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <label className="flex flex-col items-center cursor-pointer group">
                                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center text-slate-500 dark:text-gray-400 group-hover:bg-gray-600 transition-colors">
                                        {uploading ? (
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent animate-spin rounded-full mb-1"></div>
                                                <span className="text-[10px] text-brand-400">{Math.round(uploadProgress)}%</span>
                                            </div>
                                        ) : (
                                            <User size={32} />
                                        )}
                                    </div>
                                    <span className="mt-2 text-sm text-slate-500 dark:text-gray-400">
                                        {uploading ? 'Uploading...' : 'Upload Profile Picture'}
                                    </span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                                </label>

                                <div className="flex items-center gap-3">
                                    <div className="h-[1px] w-12 bg-gray-600"></div>
                                    <span className="text-xs text-slate-500 dark:text-gray-500 uppercase font-bold">OR</span>
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
                        onSelect={(url) => setFormData(prev => ({ ...prev, photoUrl: url }))}
                        category="Players"
                    />

                    <div className="md:col-span-2">
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Player Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Full Name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1 flex justify-between items-center">
                            <span>Team</span>
                            {teams.length > 5 && (
                                <div className="flex items-center gap-1 bg-white/50 dark:bg-gray-900/50 px-2 py-0.5 rounded border border-slate-200/5 dark:border-white/5">
                                    <Search size={10} className="text-slate-500 dark:text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Find team..."
                                        value={teamSearchText}
                                        onChange={(e) => setTeamSearchText(e.target.value)}
                                        className="bg-transparent border-none text-[10px] w-16 outline-none text-brand-400 placeholder:text-gray-600"
                                    />
                                </div>
                            )}
                        </label>
                        <select
                            name="team"
                            value={formData.team}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                            required
                        >
                            <option value="" disabled>Select Team</option>
                            {teams
                                .filter(t => t.name.toLowerCase().includes(teamSearchText.toLowerCase()))
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Position</label>
                        <select
                            name="position"
                            value={formData.position}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        >
                            {positions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">District</label>
                        <select
                            name="district"
                            value={formData.district}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                            required
                        >
                            <option value="" disabled>Select District</option>
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
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Kit Number</label>
                        <input
                            type="number"
                            name="number"
                            placeholder="e.g. 10"
                            value={formData.number}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Nationality</label>
                        <input
                            type="text"
                            name="nationality"
                            placeholder="Nationality"
                            value={formData.nationality}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Date of Birth</label>
                        <input
                            type="date"
                            name="dob"
                            value={formData.dob}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Age (Auto)</label>
                        <input
                            type="number"
                            name="age"
                            placeholder="0"
                            value={formData.age === 0 ? '' : formData.age}
                            readOnly
                            className="bg-slate-100/50 dark:bg-gray-700/50 p-2 rounded text-slate-500 dark:text-gray-400 w-full cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Clean Sheets (GK)</label>
                        <input
                            type="number"
                            name="cleanSheets"
                            placeholder="0"
                            value={formData.cleanSheets === 0 ? '' : formData.cleanSheets}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Matches</label>
                        <input
                            type="number"
                            name="matches"
                            placeholder="0"
                            value={formData.matches === 0 ? '' : formData.matches}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Goals</label>
                        <input
                            type="number"
                            name="goals"
                            placeholder="0"
                            value={formData.goals === 0 ? '' : formData.goals}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Assists</label>
                        <input
                            type="number"
                            name="assists"
                            placeholder="0"
                            value={formData.assists === 0 ? '' : formData.assists}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Yellow Cards</label>
                        <input
                            type="number"
                            name="yellowCards"
                            placeholder="0"
                            value={formData.yellowCards === 0 ? '' : formData.yellowCards}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Red Cards</label>
                        <input
                            type="number"
                            name="redCards"
                            placeholder="0"
                            value={formData.redCards === 0 ? '' : formData.redCards}
                            onChange={handleInputChange}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full"
                        />
                    </div>

                    <div className="md:col-span-2 lg:col-span-4">
                        <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Player Biography</label>
                        <textarea
                            name="bio"
                            placeholder="Tell us about the player or their career..."
                            value={formData.bio}
                            onChange={handleInputChange}
                            rows={4}
                            className="bg-slate-100 dark:bg-gray-700 p-2 rounded text-slate-900 dark:text-white w-full outline-none focus:ring-2 focus:ring-brand-500"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`bg-green-600 hover:bg-green-700 p-2 rounded text-slate-900 dark:text-white col-span-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Saving...' : (editingId ? 'Update Player' : 'Add Player')}
                    </button>
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
                            className="bg-gray-600 hover:bg-gray-500 p-2 rounded text-slate-900 dark:text-white col-span-full"
                        >
                            Cancel Edit
                        </button>
                    )}
                </form>
            </div>

            {/* Search and Filters */}
            <div id="player-list-top" className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search players by name or team..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-slate-500 dark:text-gray-400" size={18} />
                    <select
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                        <option value="All">All Teams</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-slate-600 dark:text-gray-300">
                    <thead className="bg-slate-50 dark:bg-gray-800 text-xs uppercase">
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
                            <tr key={player.id} className="border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:bg-gray-700">
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{player.name}</td>
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
                                            className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-slate-900 dark:text-white rounded-lg transition-all"
                                            title="Edit Player"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(player.id)}
                                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-slate-900 dark:text-white rounded-lg transition-all"
                                            title="Delete Player"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {
                    filteredPlayers.length === 0 && !loading && (
                        <p className="text-center text-slate-500 dark:text-gray-400 mt-4">No players found matching your criteria.</p>
                    )
                }
            </div >

            {/* Pagination Controls */}
            {filteredPlayers.length > playersPerPage && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-slate-200/5 dark:border-white/5">
                    <div className="text-sm text-slate-500 dark:text-gray-400 font-medium">
                        Showing <span className="text-slate-900 dark:text-white font-bold">{indexOfFirstPlayer + 1}</span> to <span className="text-slate-900 dark:text-white font-bold">{Math.min(indexOfLastPlayer, filteredPlayers.length)}</span> of <span className="text-slate-900 dark:text-white font-bold">{filteredPlayers.length}</span> players
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
                                                ? "bg-brand-500 text-slate-900 dark:text-white shadow-lg shadow-brand-500/20"
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

export default ManagePlayers;
