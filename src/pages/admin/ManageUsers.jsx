import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Shield, ShieldAlert, ShieldCheck, Users, Search, Crown, UserX, ChevronRight, Newspaper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROLE_CONFIG = {
    superadmin: { label: 'Super Admin', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: Crown },
    admin: { label: 'Tournament Admin', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: ShieldCheck },
    newsadmin: { label: 'News Admin', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20', icon: Newspaper },
    null: { label: 'User', color: 'text-slate-500 dark:text-gray-400 bg-gray-400/10 border-gray-400/20', icon: Users }
};

const ManageUsers = () => {
    const { isSuperAdmin, currentUser } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Guard: Only superadmin can access this page
    useEffect(() => {
        if (!isSuperAdmin) {
            navigate('/admin');
        }
    }, [isSuperAdmin, navigate]);

    // Fetch all users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'users'));
                const userData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUsers(userData);
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [successMessage]); // Refetch when success message changes (after role update)

    const handleRoleChange = async (userId, newRole) => {
        if (userId === currentUser?.uid) {
            alert("You cannot change your own role.");
            return;
        }

        const roleLabel = newRole ? ROLE_CONFIG[newRole].label : 'Regular User';
        if (!window.confirm(`Change this user's role to "${roleLabel}"?`)) return;

        try {
            await updateDoc(doc(db, 'users', userId), {
                role: newRole
            });
            setSuccessMessage(`Role updated to ${roleLabel}!`);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update role: ' + error.message);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (userId === currentUser?.uid) {
            alert("You cannot delete your own account from here.");
            return;
        }
        if (!window.confirm('Remove this user profile? (This only removes their profile from the database, not their Firebase Auth account.)')) return;

        try {
            await deleteDoc(doc(db, 'users', userId));
            setSuccessMessage('User profile removed.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                    <div className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading Users...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 text-slate-900 dark:text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Shield className="text-yellow-400" size={28} />
                        User & Role Management
                    </h2>
                    <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">Assign roles to control who can manage tournaments and data.</p>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                    <span className="px-3 py-1.5 rounded-lg border bg-yellow-400/10 border-yellow-400/20 text-yellow-400">
                        <Crown size={12} className="inline mr-1" /> Super Admin: Full Access
                    </span>
                    <span className="px-3 py-1.5 rounded-lg border bg-blue-400/10 border-blue-400/20 text-blue-400">
                        <ShieldCheck size={12} className="inline mr-1" /> Admin: Own Tournaments
                    </span>
                    <span className="px-3 py-1.5 rounded-lg border bg-pink-400/10 border-pink-400/20 text-pink-400">
                        <Newspaper size={12} className="inline mr-1" /> News Admin: Manage News
                    </span>
                </div>
            </div>

            {successMessage && (
                <div className="bg-green-600 text-slate-900 dark:text-white p-3 rounded-lg mb-6 animate-pulse font-medium">
                    {successMessage}
                </div>
            )}

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search users by email or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-slate-200/5 dark:border-white/5 text-center">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{users.length}</div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-500 uppercase font-black tracking-widest">Total Users</div>
                </div>
                <div className="bg-slate-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-slate-200/5 dark:border-white/5 text-center">
                    <div className="text-2xl font-black text-yellow-400">{users.filter(u => u.role === 'superadmin').length}</div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-500 uppercase font-black tracking-widest">Super Admins</div>
                </div>
                <div className="bg-slate-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-slate-200/5 dark:border-white/5 text-center">
                    <div className="text-2xl font-black text-blue-400">{users.filter(u => u.role === 'admin').length}</div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-500 uppercase font-black tracking-widest">Admins</div>
                </div>
                <div className="bg-slate-50/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-slate-200/5 dark:border-white/5 text-center">
                    <div className="text-2xl font-black text-pink-400">{users.filter(u => u.role === 'newsadmin').length}</div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-500 uppercase font-black tracking-widest">News Admins</div>
                </div>
            </div>

            {/* User List */}
            <div className="space-y-3">
                {filteredUsers.map(user => {
                    const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG[null];
                    const RoleIcon = roleConfig.icon;
                    const isCurrentUser = user.uid === currentUser?.uid || user.id === currentUser?.uid;

                    return (
                        <div
                            key={user.id}
                            className={`bg-slate-50 dark:bg-gray-800 p-5 rounded-2xl border transition-all ${isCurrentUser ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-slate-200/5 dark:border-white/5 hover:border-slate-200/10 dark:border-white/10'}`}
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${roleConfig.color}`}>
                                        <RoleIcon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {user.displayName || user.email?.split('@')[0] || 'Unknown'}
                                            {isCurrentUser && (
                                                <span className="text-[10px] px-2 py-0.5 bg-yellow-400/20 text-yellow-400 rounded-full font-black uppercase">You</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-500 dark:text-gray-400">{user.email}</div>
                                        <div className="text-[10px] text-gray-600 mt-1">
                                            UID: {user.uid || user.id} • Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Current role badge */}
                                    <span className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${roleConfig.color}`}>
                                        {roleConfig.label}
                                    </span>

                                    {!isCurrentUser && (
                                        <div className="flex items-center gap-1">
                                            <select
                                                value={user.role || ''}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value || null)}
                                                className="bg-slate-100 dark:bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                            >
                                                <option value="">Regular User</option>
                                                <option value="newsadmin">News Admin</option>
                                                <option value="admin">Tournament Admin</option>
                                                <option value="superadmin">Super Admin</option>
                                            </select>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-slate-900 dark:text-white rounded-xl transition-all"
                                                title="Remove user profile"
                                            >
                                                <UserX size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredUsers.length === 0 && (
                    <div className="text-center py-16 text-slate-500 dark:text-gray-500 italic">
                        No users found matching your search.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageUsers;
