import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Trophy, Users, Swords, LayoutList, Newspaper, UserCog, Crown, ShieldCheck, Star } from 'lucide-react';

const Admin = () => {
  const { isSuperAdmin, userRole, userProfile } = useAuth();

  const adminCards = [
    { to: '/admin/matches', icon: Swords, title: 'Manage Matches', desc: 'Update live scores and match details', color: 'from-green-500/20 to-green-600/5 border-green-500/20' },
    { to: '/admin/teams', icon: Users, title: 'Manage Teams', desc: 'Add, edit, and remove teams', color: 'from-blue-500/20 to-blue-600/5 border-blue-500/20' },
    { to: '/admin/players', icon: LayoutList, title: 'Manage Players', desc: 'Update player stats and info', color: 'from-purple-500/20 to-purple-600/5 border-purple-500/20' },
    { to: '/admin/lineups', icon: Shield, title: '⚽ Manage Lineups', desc: 'Set starting 11 and bench players for matches', color: 'from-teal-500/20 to-teal-600/5 border-teal-500/20' },
    { to: '/admin/tournaments', icon: Trophy, title: 'Manage Tournaments', desc: 'Create and manage tournaments', color: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/20' },
    { to: '/admin/sponsors', icon: Star, title: 'Manage Sponsors', desc: 'Add/update tournament sponsors', color: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/20' },
  ];

  // News management is super admin only
  if (isSuperAdmin) {
    adminCards.push({ to: '/admin/news', icon: Newspaper, title: '📰 Manage News', desc: 'Publish articles and announcements', color: 'from-pink-500/20 to-pink-600/5 border-pink-500/20' });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Role Badge */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Welcome back, {userProfile?.displayName || 'Admin'}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-bold text-sm ${isSuperAdmin
          ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400'
          : 'bg-blue-400/10 border-blue-400/20 text-blue-400'
          }`}>
          {isSuperAdmin ? <Crown size={16} /> : <ShieldCheck size={16} />}
          {isSuperAdmin ? 'Super Admin' : 'Tournament Admin'}
        </div>
      </div>

      {/* Info Banner for Tournament Admins */}
      {!isSuperAdmin && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-8 text-sm text-blue-300">
          <ShieldCheck size={16} className="inline mr-2" />
          <strong>Tournament Admin Mode:</strong> You can only manage tournaments you created and their associated matches, teams, and players.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map(card => (
          <Link
            key={card.to}
            to={card.to}
            className={`group bg-gradient-to-br ${card.color} border p-6 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300`}
          >
            <div className="flex items-center gap-3 mb-3">
              <card.icon className="text-white/70 group-hover:text-white transition-colors" size={22} />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{card.title}</h2>
            </div>
            <p className="text-gray-400 text-sm">{card.desc}</p>
          </Link>
        ))}

        {/* Super Admin Only: User Management */}
        {isSuperAdmin && (
          <Link
            to="/admin/users"
            className="group bg-gradient-to-br from-yellow-500/20 to-orange-600/5 border border-yellow-500/20 p-6 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-2 right-2">
              <span className="text-[10px] px-2 py-0.5 bg-yellow-400/20 text-yellow-400 rounded-full font-black uppercase">Super Admin</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <UserCog className="text-yellow-400/70 group-hover:text-yellow-400 transition-colors" size={22} />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">👑 Manage Users</h2>
            </div>
            <p className="text-gray-400 text-sm">Assign roles and manage admin access</p>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Admin;
