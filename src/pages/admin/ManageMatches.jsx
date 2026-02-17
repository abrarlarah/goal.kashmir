import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useData } from '../../context/DataContext';

const ManageMatches = () => {
  const { matches, teams, tournaments } = useData();
  const [loading, setLoading] = useState(false); // Form loading
  const [formData, setFormData] = useState({
    teamA: '',
    teamB: '',
    scoreA: 0,
    scoreB: 0,
    status: 'scheduled', // scheduled, live, finished
    currentMinute: 0,
    competition: '',
    date: '',
    time: '',
    managerA: '',
    managerB: '',
    round: '' // e.g., 'Group A', 'Semi-Final', 'Round 1'
  });
  const [successMessage, setSuccessMessage] = useState('');

  // Helper to filter teams by selected competition
  const getFilteredTeams = () => {
    if (!formData.competition) return [];
    return teams.filter(team => {
      const tTournaments = Array.isArray(team.tournaments)
        ? team.tournaments
        : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
      return tTournaments.includes(formData.competition);
    });
  };

  const [editingId, setEditingId] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev };
      newData[name] = name.includes('score') || name === 'currentMinute' ? parseInt(value) || 0 : value;

      // Reset teams if competition changes
      if (name === 'competition') {
        newData.teamA = '';
        newData.teamB = '';
        newData.managerA = '';
        newData.managerB = '';
      }

      // Auto-populate manager when a team is selected
      if (name === 'teamA' && value) {
        const team = teams.find(t => t.name === value);
        if (team) newData.managerA = team.manager || '';
      }
      if (name === 'teamB' && value) {
        const team = teams.find(t => t.name === value);
        if (team) newData.managerB = team.manager || '';
      }

      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    const request = editingId
      ? updateDoc(doc(db, 'matches', editingId), formData)
      : addDoc(collection(db, 'matches'), formData);

    request.then(() => {
      setSuccessMessage(editingId ? 'Match updated successfully!' : 'Match added successfully!');
      setFormData({
        teamA: '',
        teamB: '',
        scoreA: 0,
        scoreB: 0,
        status: 'scheduled',
        currentMinute: 0,
        competition: '',
        date: '',
        time: '',
        managerA: '',
        managerB: '',
        round: ''
      });
      setEditingId(null);
      window.scrollTo(0, 0);
      setTimeout(() => setSuccessMessage(''), 3000);
    }).catch((error) => {
      console.error("Error saving match: ", error);
      alert("Error saving: " + error.message);
    }).finally(() => {
      setLoading(false);
    });
  };

  const handleEdit = (match) => {
    setFormData({
      ...match,
      managerA: match.managerA || '',
      managerB: match.managerB || '',
      round: match.round || ''
    });
    setEditingId(match.id);
    setSuccessMessage('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      try {
        await deleteDoc(doc(db, 'matches', id));
        setSuccessMessage('Match deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error("Error deleting match: ", error);
      }
    }
  };


  const updateMatchScore = async (id, team, increment) => {
    const match = matches.find(m => m.id === id);
    if (!match) return;

    const newScore = team === 'A' ? (match.scoreA || 0) + increment : (match.scoreB || 0) + increment;
    if (newScore < 0) return;

    try {
      await updateDoc(doc(db, 'matches', id), {
        [team === 'A' ? 'scoreA' : 'scoreB']: newScore
      });
    } catch (error) {
      console.error("Error updating score: ", error);
    }
  };

  const updateMatchStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'matches', id), { status });
      setSuccessMessage(`Match marked as ${status}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error("Error updating status: ", error);
    }
  };

  const liveMatches = matches.filter(m => m.status === 'live');
  const otherMatches = matches.filter(m => m.status !== 'live');

  return (
    <div className="container mx-auto px-4 py-8 text-white">
      <h2 className="text-2xl font-bold mb-6">Manage Matches</h2>

      {successMessage && (
        <div className="bg-green-600 text-white p-3 rounded mb-4 animate-pulse">
          {successMessage}
        </div>
      )}

      {/* Live Matches Quick Controls */}
      {liveMatches.length > 0 && (
        <div className="mb-8 p-4 bg-gray-800 rounded-lg border border-green-500">
          <h3 className="text-xl font-bold mb-4 text-green-400 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Live Matches Control
          </h3>
          <div className="grid gap-4">
            {liveMatches.map(match => (
              <div key={match.id} className="bg-gray-700 p-4 rounded flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left flex-1">
                  <div className="font-medium text-gray-300">{match.competition} - {match.currentMinute}'</div>
                  <div className="flex items-center justify-center md:justify-start gap-4 text-2xl font-bold mt-2">
                    <div className="flex flex-col items-center gap-1">
                      <span>{match.teamA}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateMatchScore(match.id, 'A', -1)} className="w-8 h-8 rounded bg-gray-600 hover:bg-gray-500 text-sm">-</button>
                        <span>{match.scoreA}</span>
                        <button onClick={() => updateMatchScore(match.id, 'A', 1)} className="w-8 h-8 rounded bg-green-600 hover:bg-green-500 text-sm">+</button>
                      </div>
                    </div>
                    <span className="text-gray-400">vs</span>
                    <div className="flex flex-col items-center gap-1">
                      <span>{match.teamB}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateMatchScore(match.id, 'B', -1)} className="w-8 h-8 rounded bg-gray-600 hover:bg-gray-500 text-sm">-</button>
                        <span>{match.scoreB}</span>
                        <button onClick={() => updateMatchScore(match.id, 'B', 1)} className="w-8 h-8 rounded bg-green-600 hover:bg-green-500 text-sm">+</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(match)}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
                  >
                    Edit Info
                  </button>
                  <button
                    onClick={() => updateMatchStatus(match.id, 'finished')}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
                  >
                    End Match
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h3 className="text-xl mb-4">{editingId ? 'Edit Match' : 'Add New Match'}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Competition / Tournament</label>
            <select
              name="competition"
              value={formData.competition}
              onChange={handleInputChange}
              className="bg-gray-700 p-2 rounded text-white w-full"
              required
            >
              <option value="" disabled>Select Competition</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Home Team</label>
              <select
                name="teamA"
                value={formData.teamA}
                onChange={handleInputChange}
                className="bg-gray-700 p-2 rounded text-white w-full"
                required
              >
                <option value="" disabled>Select Home Team</option>
                {getFilteredTeams().map(team => (
                  <option key={team.id} value={team.name} disabled={team.name === formData.teamB}>
                    {team.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="managerA"
                placeholder="Home Manager"
                value={formData.managerA || ''}
                onChange={handleInputChange}
                className="bg-gray-700 p-2 rounded text-white w-full mt-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Away Team</label>
              <select
                name="teamB"
                value={formData.teamB}
                onChange={handleInputChange}
                className="bg-gray-700 p-2 rounded text-white w-full"
                required
              >
                <option value="" disabled>Select Away Team</option>
                {getFilteredTeams().map(team => (
                  <option key={team.id} value={team.name} disabled={team.name === formData.teamA}>
                    {team.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="managerB"
                placeholder="Away Manager"
                value={formData.managerB || ''}
                onChange={handleInputChange}
                className="bg-gray-700 p-2 rounded text-white w-full mt-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Match Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="bg-gray-700 p-2 rounded text-white w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Match Time</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                className="bg-gray-700 p-2 rounded text-white w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Round / Group (e.g. 'Group A', 'Final', 'Quarter-Final')</label>
            <input
              type="text"
              name="round"
              placeholder="Round / Group"
              value={formData.round || ''}
              onChange={handleInputChange}
              className="bg-gray-700 p-2 rounded text-white w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="w-full">
              <label className="text-xs text-gray-400 block mb-1">Home Score</label>
              <input
                type="number"
                name="scoreA"
                placeholder="0"
                value={formData.scoreA}
                onChange={handleInputChange}
                className="bg-gray-700 p-2 rounded text-white w-full"
              />
            </div>
            <div className="w-full">
              <label className="text-xs text-gray-400 block mb-1">Away Score</label>
              <input
                type="number"
                name="scoreB"
                placeholder="0"
                value={formData.scoreB}
                onChange={handleInputChange}
                className="bg-gray-700 p-2 rounded text-white w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Match Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="bg-gray-700 p-2 rounded text-white w-full"
              >
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="finished">Finished</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Current Minute</label>
              <input
                type="number"
                name="currentMinute"
                placeholder="0'"
                value={formData.currentMinute}
                onChange={handleInputChange}
                className="bg-gray-700 p-2 rounded text-white w-full"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`bg-green-600 hover:bg-green-700 p-2 rounded text-white col-span-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Saving...' : (editingId ? 'Update Match' : 'Add Match')}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormData({
                  teamA: '',
                  teamB: '',
                  scoreA: 0,
                  scoreB: 0,
                  status: 'scheduled',
                  currentMinute: 0,
                  competition: '',
                  date: '',
                  time: '',
                  managerA: '',
                  managerB: '',
                  round: ''
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
      <h3 className="text-xl font-bold mb-4">All Matches</h3>
      <div className="grid gap-4">
        {otherMatches.map(match => (
          <div key={match.id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
            <div>
              <div className="font-bold text-lg">
                {match.teamA} <span className="text-green-400">{match.scoreA}</span> - <span className="text-green-400">{match.scoreB}</span> {match.teamB}
              </div>
              <div className="text-sm text-gray-400">
                {match.competition} {match.round && `• ${match.round}`} • {match.status} {match.status === 'live' && `• ${match.currentMinute}'`}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(match)}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(match.id)}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {otherMatches.length === 0 && !loading && (
          <p className="text-center text-gray-400">No scheduled or finished matches found.</p>
        )}
      </div>
    </div>
  );
};

export default ManageMatches;
