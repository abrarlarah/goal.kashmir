import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../context/DataContext';

const ManagePlayers = () => {
    const { players, teams } = useData();
    const [loading, setLoading] = useState(false); // Form loading
    const [formData, setFormData] = useState({
        name: '',
        team: '',
        position: 'Forward',
        nationality: '',
        age: '',
        matches: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0
    });
    const [editingId, setEditingId] = useState(null);

    const [successMessage, setSuccessMessage] = useState('');

    const positions = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Helper to determine if field should be a number
        const numberFields = ['age', 'matches', 'goals', 'assists', 'yellowCards', 'redCards'];

        setFormData(prev => ({
            ...prev,
            [name]: numberFields.includes(name) ? Number(value) : value
        }));
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
            age: '',
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
                        <label className="text-xs text-gray-400 block mb-1">Team</label>
                        <select
                            name="team"
                            value={formData.team}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
                            required
                        >
                            <option value="" disabled>Select Team</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
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
                        <label className="text-xs text-gray-400 block mb-1">Age</label>
                        <input
                            type="number"
                            name="age"
                            placeholder="0"
                            value={formData.age}
                            onChange={handleInputChange}
                            className="bg-gray-700 p-2 rounded text-white w-full"
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

            {/* List */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-gray-800 text-xs uppercase">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Team</th>
                            <th className="px-4 py-3">Pos</th>
                            <th className="px-4 py-3">Stats</th>
                            <th className="px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map(player => (
                            <tr key={player.id} className="border-b border-gray-700 bg-gray-800 hover:bg-gray-700">
                                <td className="px-4 py-3 font-medium text-white">{player.name}</td>
                                <td className="px-4 py-3">{player.team}</td>
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
                {players.length === 0 && !loading && (
                    <p className="text-center text-gray-400 mt-4">No players found.</p>
                )}
            </div>
        </div>
    );
};

export default ManagePlayers;
