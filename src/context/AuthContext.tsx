// @ts-nocheck
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isTournamentAdmin: boolean;
  isTeamManager: boolean;
  isReferee: boolean;
  isNewsAdmin: boolean;
  isContentCreator: boolean;
  hasAnyAdminAccess: boolean;
  userRole: any;
  login: (e: any, p: any) => Promise<any>;
  signup: (e: any, p: any, n: any) => Promise<any>;
  logout: () => Promise<void>;
  hasAccessToTournament: (id: string) => boolean;
  hasAccessToTeam: (id: string) => boolean;
  resetPassword?: (e: string) => Promise<void>;
  refreshRole: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}


/**
 * Role-Based Access Control:
 * - 'super_admin': Full access to everything
 * - 'tournament_admin': Can manage assigned tournaments + related matches/teams/players
 * - 'team_manager': Can manage specific teams (lineups, team profile)
 * - 'referee': Can only update live match events/scores for assigned matches
 * - 'content_creator': Can manage News and Gallery
 * - 'suspended': Revoked access
 * - null/undefined: Regular user
 */

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState();
  const [userRole, setUserRole] = useState(null); 
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    setUserRole(null);
    setUserProfile(null);
    return signOut(auth);
  }

  // Fetch user role from Firestore 'users' collection
  const fetchUserRole = async (user) => {
    if (!user) {
      setUserRole(null);
      setUserProfile(null);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        
        // Handle legacy roles temporarily while migrating
        let normalizedRole = data.role || null;
        if (normalizedRole === 'admin') normalizedRole = 'tournament_admin';
        if (normalizedRole === 'teamadmin') normalizedRole = 'team_manager';
        if (normalizedRole === 'superadmin') normalizedRole = 'super_admin';
        if (normalizedRole === 'newsadmin') normalizedRole = 'content_creator';

        setUserRole(normalizedRole);
        setUserProfile({...data, role: normalizedRole});
      } else {
        // First-time login: check if any users exist to bootstrap the first super_admin
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const isFirstUser = usersSnapshot.empty;

        const newProfile = {
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          role: isFirstUser ? 'super_admin' : null, 
          createdAt: new Date().toISOString(),
          uid: user.uid
        };
        await setDoc(userDocRef, newProfile);
        setUserRole(newProfile.role);
        setUserProfile(newProfile);

        if (isFirstUser) {
          console.log('🎉 First user detected! You have been automatically promoted to Super Admin.');
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await fetchUserRole(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const isSuperAdmin = userRole === 'super_admin';
  const isTournamentAdmin = isSuperAdmin || userRole === 'tournament_admin';
  const isTeamManager = isTournamentAdmin || userRole === 'team_manager';
  const isReferee = isTournamentAdmin || userRole === 'referee';
  const isContentCreator = isSuperAdmin || userRole === 'content_creator';

  const hasAnyAdminAccess = isSuperAdmin || isTournamentAdmin || isTeamManager || isReferee || isContentCreator;

  const value = {
    currentUser,
    userRole,
    userProfile,
    isSuperAdmin,
    isTournamentAdmin,
    isTeamManager,
    isReferee,
    isContentCreator,
    hasAnyAdminAccess,
    isLoggedIn: !!currentUser,
    signup,
    login,
    logout,
    refreshRole: () => fetchUserRole(currentUser)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
