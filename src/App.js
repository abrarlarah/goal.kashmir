import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import Teams from './pages/Teams';
import Players from './pages/Players';
import Leaderboard from './pages/Leaderboard';
import LiveMatch from './pages/LiveMatch';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Admin from './pages/admin/Admin';
import ManageMatches from './pages/admin/ManageMatches';
import ManageTeams from './pages/admin/ManageTeams';
import ManagePlayers from './pages/admin/ManagePlayers';
import ManageTournaments from './pages/admin/ManageTournaments';
import ManageLineups from './pages/admin/ManageLineups';
import ManageNews from './pages/admin/ManageNews'; // Admin News
import News from './pages/News'; // Public News
import PrivateRoute from './components/common/PrivateRoute';
import { DataProvider } from './context/DataContext';

function App() {
  return (
    <DataProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/players" element={<Players />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/news" element={<News />} />
            <Route path="/live/:matchId" element={<LiveMatch />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <Admin />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/matches"
              element={
                <PrivateRoute>
                  <ManageMatches />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/teams"
              element={
                <PrivateRoute>
                  <ManageTeams />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/players"
              element={
                <PrivateRoute>
                  <ManagePlayers />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/lineups"
              element={
                <PrivateRoute>
                  <ManageLineups />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/tournaments"
              element={
                <PrivateRoute>
                  <ManageTournaments />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/news"
              element={
                <PrivateRoute>
                  <ManageNews />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </DataProvider>
  );
}

export default App;