// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Import db
import { doc, getDoc, onSnapshot } from 'firebase/firestore'; // Import Firestore functions
import { Skeleton } from "@/components/ui/skeleton";

// Define UserProfile type
interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin?: boolean;
  // Add other profile fields as needed
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // User logged out, clear profile and finish loading
        setUserProfile(null);
        setLoading(false);
      }
      // If user logs in, the profile listener below will handle loading
    });

    return () => unsubscribeAuth(); // Cleanup auth listener
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined = undefined;

    if (user) {
      // User is logged in, listen for profile changes
      setLoading(true); // Start loading profile data
      const userDocRef = doc(db, 'users', user.uid);
      
      unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          // Profile doesn't exist (this might happen briefly after signup)
          // You could create a default profile here if needed, or wait
          setUserProfile(null);
          console.warn(`User profile not found for uid: ${user.uid}`);
        }
        setLoading(false); // Finish loading once profile is checked/loaded
      }, (error) => {
         console.error("Error listening to user profile:", error);
         setUserProfile(null); // Clear profile on error
         setLoading(false);
      });

    } else {
      // User logged out, ensure loading is false if auth listener hasn't already set it
       if(loading){ 
         setLoading(false);
       }
    }

    // Cleanup profile listener on unmount or when user changes
    return () => {
        if (unsubscribeProfile) {
             unsubscribeProfile();
        }
    };
  }, [user]); // Re-run when user object changes

  // Initial loading state covers both auth and profile fetching
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Skeleton className="w-20 h-20 rounded-full" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
