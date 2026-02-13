import React from 'react';
import { Link } from 'react-router-dom';
const Admin = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/admin/matches" className="bg-gray-800 p-6 rounded-lg shadow-lg hover:bg-gray-700 transition duration-300">
          <h2 className="text-xl font-semibold text-white mb-4">Manage Matches</h2>
          <p className="text-gray-400">Update live scores and match details</p>
        </Link>
        <Link to="/admin/teams" className="bg-gray-800 p-6 rounded-lg shadow-lg hover:bg-gray-700 transition duration-300">
          <h2 className="text-xl font-semibold text-white mb-4">Manage Teams</h2>
          <p className="text-gray-400">Add, edit, and remove teams</p>
        </Link>
        <Link to="/admin/players" className="bg-gray-800 p-6 rounded-lg shadow-lg hover:bg-gray-700 transition duration-300">
          <h2 className="text-xl font-semibold text-white mb-4">Manage Players</h2>
          <p className="text-gray-400">Update player stats and info</p>
        </Link>
        <Link to="/admin/lineups" className="bg-gray-800 p-6 rounded-lg shadow-lg hover:bg-gray-700 transition duration-300">
          <h2 className="text-xl font-semibold text-white mb-4">⚽ Manage Lineups</h2>
          <p className="text-gray-400">Set starting 11 and bench players for matches</p>
        </Link>
        <Link to="/admin/tournaments" className="bg-gray-800 p-6 rounded-lg shadow-lg hover:bg-gray-700 transition duration-300">
          <h2 className="text-xl font-semibold text-white mb-4">Manage Tournaments</h2>
          <p className="text-gray-400">Create and manage tournaments</p>
        </Link>
        <Link to="/admin/news" className="bg-gray-800 p-6 rounded-lg shadow-lg hover:bg-gray-700 transition duration-300">
          <h2 className="text-xl font-semibold text-white mb-4">📰 Manage News</h2>
          <p className="text-gray-400">Publish articles and announcements</p>
        </Link>
      </div>
    </div>
  );
};

export default Admin;
