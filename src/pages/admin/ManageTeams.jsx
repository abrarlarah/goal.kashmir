import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../context/DataContext';

const ManageTeams = () => {
    const { teams, tournaments } = useData();
    const [loading, setLoading] = useState(false); // Loading for form submission
    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        founded: '',
        stadium: '',
        manager: '',
        status: 'Active',
        players: 0,
        tournaments: [] // Now an array
    });
    const [editingId, setEditingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'founded' || name === 'players') ? Number(value) : value
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

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');

        const dataToSave = {
            ...formData,
            // Ensure tournaments is an array
            tournaments: Array.isArray(formData.tournaments) ? formData.tournaments : []
        };

        const request = editingId
            ? updateDoc(doc(db, 'teams', editingId), dataToSave)
            : addDoc(collection(db, 'teams'), dataToSave);

        request.catch((error) => {
            console.error("Error saving team: ", error);
            alert("Error saving team: " + error.message);
            setSuccessMessage('');
        });

        // Optimistic UI update
        setSuccessMessage(editingId ? 'Team updated successfully!' : 'Team added successfully!');

        // Clear form
        setFormData({
            name: '',
            shortName: '',
            founded: '',
            stadium: '',
            manager: '',
            status: 'Active',
            players: 0,
            tournaments: []
        });
        setEditingId(null);
        window.scrollTo(0, 0);
        setTimeout(() => setSuccessMessage(''), 3000);
        setLoading(false);
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

    return (
        <div className="container mx-auto px-4 py-8 text-white">
            <h2 className="text-2xl font-bold mb-6">Manage Teams</h2>

            {successMessage && (
                <div className="bg-green-600 text-white p-3 rounded mb-4 animate-pulse">
                    {successMessage}
                </div>
            )}

            {/* Form */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
                <h3 className="text-xl mb-4">{editingId ? 'Edit Team' : 'Add New Team'}</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Team Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Team Name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
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
                            className="bg-gray-700 p-2 rounded text-white w-full"
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
                            className="bg-gray-700 p-2 rounded text-white w-full"
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
                            className="bg-gray-700 p-2 rounded text-white w-full"
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
                            className="bg-gray-700 p-2 rounded text-white w-full"
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
                            className="bg-gray-700 p-2 rounded text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Team Status</label>
                        <select
                            name="status"
                            value={formData.status || 'Active'}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Dissolved">Dissolved</option>
                        </select>
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
                                        ? 'bg-green-600 text-white shadow-sm'
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
                        className={`bg-green-600 hover:bg-green-700 p-2 rounded text-white col-span-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                    tournaments: ''
                                });
                            }}
                            className="bg-gray-600 hover:bg-gray-500 p-2 rounded text-white col-span-full"
                        >
                            Cancel Edit
                        </button>
                    )}
                </form>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map(team => (
                    <div key={team.id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
                        <div>
                            <div className="font-bold text-lg">{team.name} ({team.shortName})</div>
                            <div className="text-sm text-gray-400">
                                Stadium: {team.stadium} • Manager: {team.manager || 'N/A'}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(team)}
                                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(team.id)}
                                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
                {teams.length === 0 && !loading && (
                    <p className="text-center text-gray-400 col-span-full">No teams found.</p>
                )}
            </div>
        </div>
    );
};

export default ManageTeams;
