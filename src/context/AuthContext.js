import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Role-Based Access Control:
 * - 'superadmin': Full access to everything
 * - 'admin': Can only manage tournaments they created + related matches/teams/players
 * - null/undefined: Regular user (no admin access)
 */

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState();
  const [userRole, setUserRole] = useState(null); // 'superadmin' | 'admin' | null
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
        setUserRole(data.role || null);
        setUserProfile(data);
      } else {
        // First-time login: check if any users exist to bootstrap the first superadmin
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const isFirstUser = usersSnapshot.empty;

        const newProfile = {
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          role: isFirstUser ? 'superadmin' : null, // First user becomes superadmin
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

  const value = {
    currentUser,
    userRole,
    userProfile,
    isSuperAdmin: userRole === 'superadmin',
    isAdmin: userRole === 'superadmin' || userRole === 'admin',
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