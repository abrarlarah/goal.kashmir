import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useData } from '../../context/DataContext';
import { Upload, X, User, Image as ImageIcon, Folders, Search, Filter } from 'lucide-react';
import AssetPicker from '../../components/admin/AssetPicker';
import { registerAsset } from '../../utils/assetRegistry';
import { calculateAge } from '../../utils/ageUtils';

// Districts of Jammu and Kashmir
const DISTRICTS = {
    JAMMU: ['Jammu', 'Samba', 'Kathua', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar'],
    KASHMIR: ['Srinagar', 'Ganderbal', 'Budgam', 'Baramulla', 'Bandipora', 'Kupwara', 'Pulwama', 'Shopian', 'Kulgam', 'Anantnag']
};

const ManagePlayers = () => {
    const { players, teams } = useData();
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
        redCards: 0
    });
    const [editingId, setEditingId] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [showAssetPicker, setShowAssetPicker] = useState(false);

    const [successMessage, setSuccessMessage] = useState('');

    const positions = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Helper to determine if field should be a number
        const numberFields = ['age', 'matches', 'goals', 'assists', 'yellowCards', 'redCards'];

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
            redCards: 0
        });
        setEditingId(null);

        window.scrollTo(0, 0);
        setTimeout(() => setSuccessMessage(''), 3000);
        setLoading(false);
    };

    const handleEdit = (player) => {
        setFormData(player);
        setEditingId(player.id);
        setSuccessMessage('');
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

    const filteredPlayers = players.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.team.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTeam = teamFilter === 'All' || p.team === teamFilter;
        return matchesSearch && matchesTeam;
    });

    return (
        <div className="container mx-auto px-4 py-8 text-white">
            <h2 className="text-2xl font-bold mb-6">Manage Players</h2>

            {successMessage && (
                <div className="bg-green-600 text-white p-3 rounded mb-4 animate-pulse">
                    {successMessage}
                </div>
            )}

            {/* Form */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
                <h3 className="text-xl mb-4">{editingId ? 'Edit Player' : 'Add New Player'}</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Player Photo Upload */}
                    <div className="lg:col-span-4 flex flex-col items-center p-4 border-2 border-dashed border-gray-600 rounded-xl bg-gray-700/30">
                        {formData.photoUrl ? (
                            <div className="relative">
                                <img src={formData.photoUrl} alt="Preview" className="w-24 h-24 object-cover rounded-full border-2 border-brand-500" />
                                <button
                                    type="button"
                                    onClick={removePhoto}
                                    className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <label className="flex flex-col items-center cursor-pointer group">
                                    <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-gray-600 transition-colors">
                                        {uploading ? (
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent animate-spin rounded-full mb-1"></div>
                                                <span className="text-[10px] text-brand-400">{Math.round(uploadProgress)}%</span>
                                            </div>
                                        ) : (
                                            <User size={32} />
                                        )}
                                    </div>
                                    <span className="mt-2 text-sm text-gray-400">
                                        {uploading ? 'Uploading...' : 'Upload Profile Picture'}
                                    </span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
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
                        onSelect={(url) => setFormData(prev => ({ ...prev, photoUrl: url }))}
                        category="Players"
                    />

                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-400 block mb-1">Player Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Full Name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1 flex justify-between items-center">
                            <span>Team</span>
                            {teams.length > 5 && (
                                <div className="flex items-center gap-1 bg-gray-900/50 px-2 py-0.5 rounded border border-white/5">
                                    <Search size={10} className="text-gray-500" />
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
                            className="bg-gray-700 p-2 rounded text-white w-full"
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
                        <label className="text-xs text-gray-400 block mb-1">Position</label>
                        <select
                            name="position"
                            value={formData.position}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
                        >
                            {positions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">District</label>
                        <select
                            name="district"
                            value={formData.district}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
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
                        <label className="text-xs text-gray-400 block mb-1">Nationality</label>
                        <input
                            type="text"
                            name="nationality"
                            placeholder="Nationality"
                            value={formData.nationality}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Date of Birth</label>
                        <input
                            type="date"
                            name="dob"
                            value={formData.dob}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Age (Auto)</label>
                        <input
                            type="number"
                            name="age"
                            placeholder="0"
                            value={formData.age}
                            readOnly
                            className="bg-gray-700/50 p-2 rounded text-gray-400 w-full cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Matches</label>
                        <input
                            type="number"
                            name="matches"
                            placeholder="0"
                            value={formData.matches}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Goals</label>
                        <input
                            type="number"
                            name="goals"
                            placeholder="0"
                            value={formData.goals}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Assists</label>
                        <input
                            type="number"
                            name="assists"
                            placeholder="0"
                            value={formData.assists}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Yellow Cards</label>
                        <input
                            type="number"
                            name="yellowCards"
                            placeholder="0"
                            value={formData.yellowCards}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Red Cards</label>
                        <input
                            type="number"
                            name="redCards"
                            placeholder="0"
                            value={formData.redCards}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`bg-green-600 hover:bg-green-700 p-2 rounded text-white col-span-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                    redCards: 0
                                });
                            }}
                            className="bg-gray-600 hover:bg-gray-500 p-2 rounded text-white col-span-full"
                        >
                            Cancel Edit
                        </button>
                    )}
                </form>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search players by name or team..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-gray-400" size={18} />
                    <select
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-500 outline-none"
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
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-gray-800 text-xs uppercase">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Team</th>
                            <th className="px-4 py-3">District</th>
                            <th className="px-4 py-3">Pos</th>
                            <th className="px-4 py-3">Stats</th>
                            <th className="px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPlayers.map(player => (
                            <tr key={player.id} className="border-b border-gray-700 bg-gray-800 hover:bg-gray-700">
                                <td className="px-4 py-3 font-medium text-white">{player.name}</td>
                                <td className="px-4 py-3">{player.team}</td>
                                <td className="px-4 py-3">
                                    <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-1 rounded">
                                        {player.district || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{player.position}</td>
                                <td className="px-4 py-3">
                                    {player.goals} G, {player.assists} A
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleEdit(player)}
                                        className="text-blue-500 hover:text-blue-400 mr-3"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(player.id)}
                                        className="text-red-500 hover:text-red-400"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredPlayers.length === 0 && !loading && (
                    <p className="text-center text-gray-400 mt-4">No players found matching your criteria.</p>
                )}
            </div>
        </div>
    );
};

export default ManagePlayers;
