import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../config/firebase';
import { 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import type { UserProfile } from '../services/firebaseService'; // <-- UPDATED IMPORT

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          // Add uid to the profile object from the doc id
          setUserProfile({ ...userDocSnap.data(), uid: user.uid } as UserProfile);
        } else {
          console.error(`No profile found for UID: ${user.uid}. Logging out.`);
          await signOut(auth);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    logout,
  };

  if (loading) {
    return <LoadingSpinner message="กำลังตรวจสอบสิทธิ์..." />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};