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
import NewsDetail from './pages/NewsDetail'; // Public News Detail
import TournamentDetail from './pages/TournamentDetail';
import Search from './pages/Search';
import PrivateRoute from './components/common/PrivateRoute';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <div className="min-h-screen bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors duration-300">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              {/* ... routes ... */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournaments/:id" element={<TournamentDetail />} />
              <Route path="/search" element={<Search />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/players" element={<Players />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:id" element={<NewsDetail />} />
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
    </ThemeProvider>
  );
}

export default App;