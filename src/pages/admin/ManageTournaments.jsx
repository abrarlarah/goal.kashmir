import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../context/DataContext';

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
        type: 'league' // league, knockout
    });
    const [editingId, setEditingId] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'teamsCount' || name === 'matchesCount') ? Number(value) : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');

        const request = editingId
            ? updateDoc(doc(db, 'tournaments', editingId), formData)
            : addDoc(collection(db, 'tournaments'), formData);

        request.catch((error) => {
            console.error("Error saving tournament: ", error);
            alert("Error saving: " + error.message);
        });

        // Optimistic Update
        setSuccessMessage(editingId ? 'Tournament updated successfully!' : 'Tournament added successfully!');

        setFormData({
            name: '',
            district: '',
            startDate: '',
            endDate: '',
            teamsCount: 0,
            matchesCount: 0,
            status: 'upcoming',
            type: 'league'
        });
        setEditingId(null);

        window.scrollTo(0, 0);
        setTimeout(() => setSuccessMessage(''), 3000);
        setLoading(false);
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

    return (
        <div className="container mx-auto px-4 py-8 text-white">
            <h2 className="text-2xl font-bold mb-6">Manage Tournaments</h2>

            {successMessage && (
                <div className="bg-green-600 text-white p-3 rounded mb-4 animate-pulse">
                    {successMessage}
                </div>
            )}

            {/* Form */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
                <h3 className="text-xl mb-4">{editingId ? 'Edit Tournament' : 'Add New Tournament'}</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                        <label className="text-xs text-gray-400 block mb-1">Tournament Name</label>
                        <input type="text" name="name" placeholder="Tournament Name" value={formData.name} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-white w-full" required />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <label className="text-xs text-gray-400 block mb-1">District</label>
                        <select name="district" value={formData.district} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-white w-full" required>
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
                            <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-white w-full" />
                        </div>
                        <div className="w-full">
                            <label className="text-xs text-gray-400 block mb-1">End Date</label>
                            <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-white w-full" />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="w-full">
                            <label className="text-xs text-gray-400 block mb-1">Teams Count</label>
                            <input type="number" name="teamsCount" placeholder="0" value={formData.teamsCount} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-white w-full" />
                        </div>
                        <div className="w-full">
                            <label className="text-xs text-gray-400 block mb-1">Matches Count</label>
                            <input type="number" name="matchesCount" placeholder="0" value={formData.matchesCount} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-white w-full" />
                        </div>
                    </div>

                    <select name="status" value={formData.status} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-white">
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="finished">Finished</option>
                    </select>

                    <select name="type" value={formData.type} onChange={handleInputChange} className="bg-gray-700 p-2 rounded text-white">
                        <option value="league">League</option>
                        <option value="knockout">Knockout</option>
                    </select>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`bg-green-600 hover:bg-green-700 p-2 rounded text-white col-span-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Saving...' : (editingId ? 'Update Tournament' : 'Add Tournament')}
                    </button>

                    {editingId && (
                        <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', district: '', startDate: '', endDate: '', teamsCount: 0, matchesCount: 0, status: 'upcoming', type: 'league' }); }} className="bg-gray-600 hover:bg-gray-500 p-2 rounded text-white col-span-full">
                            Cancel Edit
                        </button>
                    )}
                </form>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournaments.map(t => (
                    <div key={t.id} className="bg-gray-800 p-4 rounded flex justify-between items-start">
                        <div>
                            <div className="font-bold text-lg text-white">{t.name}</div>
                            {t.district && (
                                <div className="text-xs text-brand-400 font-medium mt-0.5">📍 {t.district}</div>
                            )}
                            <div className="text-sm text-gray-400">{t.status} • {t.type}</div>
                            <div className="text-xs text-gray-500 mt-1">{t.startDate} - {t.endDate}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => handleEdit(t)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm text-white">Edit</button>
                            <button onClick={() => handleDelete(t.id)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm text-white">Delete</button>
                        </div>
                    </div>
                ))}
                {tournaments.length === 0 && !loading && <div className="text-gray-400 col-span-full text-center">No tournaments found.</div>}
            </div>
        </div>
    );
};

export default ManageTournaments;
