import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const Players = () => {
  const { players, loading } = useData();
  const [positionFilter, setPositionFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { isAdmin } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [editedPlayers, setEditedPlayers] = useState({});

  const positions = ['All', 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

  const handleStatChange = (id, field, value) => {
    setEditedPlayers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: Number(value)
      }
    }));
  };

  const saveChanges = async () => {
    if (!window.confirm('Save all changes?')) return;

    try {
      const updates = Object.entries(editedPlayers).map(([id, changes]) =>
        updateDoc(doc(db, 'players', id), changes)
      );
      await Promise.all(updates);
      setEditedPlayers({});
      setEditMode(false);
      alert('Changes saved!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Error saving changes');
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesPosition =
      positionFilter === 'All' || player.position === positionFilter;
    const matchesSearch =
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.team.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  if (loading && players.length === 0) {
    return (
      <div className="text-center text-white py-20">
        Loading Players...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-white">Players</h1>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <div className="flex gap-2">
              <Link to="/admin/players" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center">
                <span className="mr-2">+</span> Add Player
              </Link>
              {editMode ? (
                <>
                  <button
                    onClick={saveChanges}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setEditedPlayers({}); }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Edit Stats
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search players or teams..."
          className="bg-gray-700 text-white rounded px-4 py-2"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        <select
          className="bg-gray-700 text-white rounded px-4 py-2"
          value={positionFilter}
          onChange={e => setPositionFilter(e.target.value)}
        >
          {positions.map(pos => (
            <option key={pos} value={pos}>
              {pos === 'All' ? 'All Positions' : pos}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto bg-gray-800 rounded-lg">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs text-gray-300">Player</th>
              <th className="px-6 py-3 text-left text-xs text-gray-300">Team</th>
              <th className="px-6 py-3 text-left text-xs text-gray-300">Position</th>
              <th className="px-6 py-3 text-center text-xs text-gray-300">Matches</th>
              <th className="px-6 py-3 text-center text-xs text-gray-300">Goals</th>
              <th className="px-6 py-3 text-center text-xs text-gray-300">Assists</th>
              <th className="px-6 py-3 text-center text-xs text-gray-300">Cards</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-700">
            {filteredPlayers.map(player => {
              const edited = editedPlayers[player.id];
              const display = { ...player, ...edited };

              return (
                <tr key={player.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 text-white">{player.name}</td>
                  <td className="px-6 py-4 text-white">{player.team}</td>
                  <td className="px-6 py-4 text-white">{player.position}</td>

                  <td className={`px-6 py-4 text-center ${display.matches > 0 ? 'text-white' : 'text-gray-600'}`}>
                    {editMode ? (
                      <input
                        type="number"
                        className="w-16 bg-gray-900 border border-gray-600 rounded px-1 text-white"
                        value={display.matches || 0}
                        onChange={e =>
                          handleStatChange(player.id, 'matches', e.target.value)
                        }
                      />
                    ) : (
                      display.matches
                    )}
                  </td>

                  <td className={`px-6 py-4 text-center font-bold ${display.goals > 0 ? 'text-yellow-400' : 'text-gray-700'}`}>
                    {editMode ? (
                      <input
                        type="number"
                        className="w-16 bg-gray-900 border border-gray-600 rounded px-1 text-white"
                        value={display.goals || 0}
                        onChange={e =>
                          handleStatChange(player.id, 'goals', e.target.value)
                        }
                      />
                    ) : (
                      display.goals
                    )}
                  </td>

                  <td className={`px-6 py-4 text-center ${display.assists > 0 ? 'text-blue-400' : 'text-gray-700'}`}>
                    {editMode ? (
                      <input
                        type="number"
                        className="w-16 bg-gray-900 border border-gray-600 rounded px-1 text-white"
                        value={display.assists || 0}
                        onChange={e =>
                          handleStatChange(player.id, 'assists', e.target.value)
                        }
                      />
                    ) : (
                      display.assists
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1">
                      {Array(display.yellowCards || 0)
                        .fill(0)
                        .map((_, i) => (
                          <span
                            key={`yellow-${player.id}-${i}`}
                            className="h-4 w-2 bg-yellow-400 rounded-sm"
                          />
                        ))}

                      {Array(display.redCards || 0)
                        .fill(0)
                        .map((_, i) => (
                          <span
                            key={`red-${player.id}-${i}`}
                            className="h-4 w-2 bg-red-500 rounded-sm"
                          />
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            No players found.
          </div>
        )}
      </div>
    </div>
  );
};

export default Players;
