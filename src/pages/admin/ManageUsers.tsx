// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { db, firebaseConfig } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Shield, ShieldAlert, ShieldCheck, Users, Search, Crown, UserX, ChevronRight, Newspaper, Settings, Flag, UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logAuditEvent } from '../../utils/auditLogger';

const ROLE_CONFIG = {
    super_admin: { label: 'Super Admin', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: Crown },
    tournament_admin: { label: 'Tournament Admin', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: ShieldCheck },
    team_manager: { label: 'Team Manager', color: 'text-green-400 bg-emerald-400/10 border-emerald-400/20', icon: Shield },
    referee: { label: 'Referee', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: Flag },
    content_creator: { label: 'Content Creator', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20', icon: Newspaper },
    suspended: { label: 'Suspended', color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: ShieldAlert },
    null: { label: 'User', color: 'text-[#64748B] dark:text-gray-400 bg-gray-400/10 border-gray-400/20', icon: Users }
};

const ManageUsers = () => {
    const { isSuperAdmin, currentUser } = useAuth();
    const { teams, tournaments, matches } = useData();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [editingScopeUser, setEditingScopeUser] = useState(null); // User ID being edited for scopes

    // Add User Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', role: 'null' });

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
    }, [successMessage]); // Refetch when success message changes

    const handleRoleChange = async (userId, newRole) => {
        if (userId === currentUser?.uid) {
            alert("You cannot change your own role.");
            return;
        }

        const roleLabel = newRole ? ROLE_CONFIG[newRole].label : 'Regular User';
        if (!window.confirm(`Change this user's role to "${roleLabel}"?`)) return;

        try {
            const targetUser = users.find(u => u.id === userId);
            const oldRole = targetUser?.role || null;
            
            const functions = getFunctions();
            const setUserRoleFn = httpsCallable(functions, 'setUserRole');
            await setUserRoleFn({ targetUid: userId, role: newRole });
            logAuditEvent('UPDATE_USER_ROLE', {
                entityType: 'user',
                entityId: userId,
                entityName: targetUser?.displayName || targetUser?.email || 'Unknown',
                details: { oldRole: oldRole || 'user', newRole: newRole || 'user' },
            });
            setSuccessMessage(`Role updated to ${roleLabel}!`);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update role: ' + error.message);
        }
    };

    const handleScopeUpdate = async (userId, scopeType, arrayValues) => {
        try {
            await updateDoc(doc(db, 'users', userId), {
                [scopeType]: arrayValues
            });
            setSuccessMessage('Scope updated successfully.');
            setTimeout(() => setSuccessMessage(''), 2000);
        } catch (error) {
            console.error('Error updating scope:', error);
            alert('Failed to update scope: ' + error.message);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (userId === currentUser?.uid) {
            alert("You cannot delete your own account from here.");
            return;
        }
        if (!window.confirm('Remove this user profile? (This only removes their profile from the database, not their Firebase Auth account.)')) return;

        try {
            const targetUser = users.find(u => u.id === userId);
            await deleteDoc(doc(db, 'users', userId));
            logAuditEvent('REMOVE_USER', {
                entityType: 'user',
                entityId: userId,
                entityName: targetUser?.displayName || targetUser?.email || 'Unknown',
            });
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

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            // Use a secondary app instance so the admin doesn't get logged out
            const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
            const secondaryAuth = getAuth(secondaryApp);
            
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserData.email, newUserData.password);
            await signOut(secondaryAuth);
            
            const newUid = userCredential.user.uid;
            const roleToSave = newUserData.role === 'null' ? null : newUserData.role;
            const newProfile = {
                uid: newUid,
                email: newUserData.email,
                displayName: newUserData.name,
                role: roleToSave,
                createdAt: new Date().toISOString()
            };
            
            await setDoc(doc(db, 'users', newUid), newProfile);
            
            logAuditEvent('CREATE_USER', {
                entityType: 'user',
                entityId: newUid,
                entityName: newUserData.name,
                details: { role: roleToSave || 'user' }
            });
            
            setSuccessMessage(`User ${newUserData.name} created successfully!`);
            setShowAddModal(false);
            setNewUserData({ name: '', email: '', password: '', role: 'null' });
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Failed to create user: ' + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                    <div className="text-[#94A3B8] font-medium animate-pulse">Loading Users...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Shield className="text-yellow-400" size={28} />
                        User & Role Management
                    </h2>
                    <p className="text-[#64748B] dark:text-gray-400 text-sm mt-1">Assign secure, scoped roles to control who can manage what data.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-brand-500/20 transition-all font-medium whitespace-nowrap"
                >
                    <UserPlus size={18} />
                    <span>Add New User</span>
                </button>
            </div>

            {successMessage && (
                <div className="bg-green-600 text-white p-3 rounded-lg mb-6 animate-pulse font-medium">
                    {successMessage}
                </div>
            )}

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search users by email or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0B1220] dark:bg-gray-800 border border-[#24344D] dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
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
                            className={`bg-[#0B1220] p-5 rounded-2xl border transition-all ${isCurrentUser ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-[#24344D]/40 hover:border-[#24344D]'}`}
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${roleConfig.color}`}>
                                        <RoleIcon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {user.displayName || user.email?.split('@')[0] || 'Unknown'}
                                            {isCurrentUser && (
                                                <span className="text-[10px] px-2 py-0.5 bg-yellow-400/20 text-yellow-400 rounded-full font-black uppercase">You</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-[#64748B]">{user.email}</div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-end md:items-center gap-2">
                                    {!isCurrentUser && (
                                        <div className="flex items-center gap-1">
                                            <select
                                                value={user.role || ''}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value || null)}
                                                className="bg-[#101827] border border-gray-600 rounded-xl px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500"
                                            >
                                                <option value="">User (Read-only)</option>
                                                <option value="content_creator">Content Creator</option>
                                                <option value="referee">Referee</option>
                                                <option value="team_manager">Team Manager</option>
                                                <option value="tournament_admin">Tournament Admin</option>
                                                <option value="super_admin">Super Admin</option>
                                                <option value="suspended">Suspended</option>
                                            </select>
                                            
                                            {/* Scope Settings Toggle Button */}
                                            {['team_manager', 'tournament_admin', 'referee'].includes(user.role) && (
                                                <button
                                                    onClick={() => setEditingScopeUser(editingScopeUser === user.id ? null : user.id)}
                                                    className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all"
                                                    title="Manage Scope Assignments"
                                                >
                                                    <Settings size={16} />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                                title="Remove user profile"
                                            >
                                                <UserX size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Scoping Settings Dropdown */}
                            {editingScopeUser === user.id && (
                                <div className="mt-4 pt-4 border-t border-[#24344D]/50">
                                    <h4 className="text-sm font-bold text-white mb-2">Scope Assignments</h4>
                                    <p className="text-xs text-[#64748B] mb-4">Select which items this user is allowed to manage.</p>
                                    
                                    {user.role === 'team_manager' && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {teams.map(team => {
                                                const isAssigned = (user.teamIds || []).includes(team.id);
                                                return (
                                                    <label key={team.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${isAssigned ? 'bg-brand-500/20 border-brand-500 text-white' : 'bg-[#101827] border-[#24344D] text-[#64748B] hover:text-white'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isAssigned}
                                                            onChange={(e) => {
                                                                const newScope = e.target.checked 
                                                                    ? [...(user.teamIds || []), team.id] 
                                                                    : (user.teamIds || []).filter(id => id !== team.id);
                                                                handleScopeUpdate(user.id, 'teamIds', newScope);
                                                            }}
                                                            className="hidden" 
                                                        />
                                                        {team.name}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {user.role === 'tournament_admin' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            {tournaments.map(tournament => {
                                                const isAssigned = (user.tournamentIds || []).includes(tournament.id);
                                                return (
                                                    <label key={tournament.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${isAssigned ? 'bg-brand-500/20 border-brand-500 text-white' : 'bg-[#101827] border-[#24344D] text-[#64748B] hover:text-white'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isAssigned}
                                                            onChange={(e) => {
                                                                const newScope = e.target.checked 
                                                                    ? [...(user.tournamentIds || []), tournament.id] 
                                                                    : (user.tournamentIds || []).filter(id => id !== tournament.id);
                                                                handleScopeUpdate(user.id, 'tournamentIds', newScope);
                                                            }}
                                                            className="hidden" 
                                                        />
                                                        {tournament.name}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {user.role === 'referee' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {matches.map(match => {
                                                const isAssigned = (user.matchIds || []).includes(match.id);
                                                return (
                                                    <label key={match.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${isAssigned ? 'bg-brand-500/20 border-brand-500 text-white' : 'bg-[#101827] border-[#24344D] text-[#64748B] hover:text-white'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isAssigned}
                                                            onChange={(e) => {
                                                                const newScope = e.target.checked 
                                                                    ? [...(user.matchIds || []), match.id] 
                                                                    : (user.matchIds || []).filter(id => id !== match.id);
                                                                handleScopeUpdate(user.id, 'matchIds', newScope);
                                                            }}
                                                            className="hidden" 
                                                        />
                                                        {match.teamA} vs {match.teamB} ({match.date})
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredUsers.length === 0 && (
                    <div className="text-center py-16 text-[#64748B] dark:text-gray-500 italic">
                        No users found matching your search.
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0F172A] border border-[#24344D] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-[#24344D]">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <UserPlus size={20} className="text-brand-400" />
                                Add New User
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-[#64748B] hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserData.name}
                                    onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                                    className="w-full bg-[#1A2333] border border-[#24344D] rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="John Doe"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserData.email}
                                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                                    className="w-full bg-[#1A2333] border border-[#24344D] rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="john@example.com"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength="6"
                                    value={newUserData.password}
                                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                                    className="w-full bg-[#1A2333] border border-[#24344D] rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Min. 6 characters"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Initial Role</label>
                                <select
                                    value={newUserData.role}
                                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                                    className="w-full bg-[#1A2333] border border-[#24344D] rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                >
                                    <option value="null">User (Read-only)</option>
                                    <option value="content_creator">Content Creator</option>
                                    <option value="referee">Referee</option>
                                    <option value="team_manager">Team Manager</option>
                                    <option value="tournament_admin">Tournament Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#24344D] text-white hover:bg-[#1A2333] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isCreating ? (
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        'Create User'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageUsers;
