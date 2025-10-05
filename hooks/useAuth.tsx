import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authService } from '../services/firebaseService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(authUser => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string) => {
    try {
        setLoading(true);
        const loggedInUser = await authService.signInWithGoogle(email);
        setUser(loggedInUser);
    } catch(error) {
        alert((error as Error).message);
    } finally {
        setLoading(false);
    }
  };

  const logout = async () => {
    try {
        await authService.signOut();
        setUser(null);
        // Force a hard redirect to ensure the user lands on the login page.
        window.location.hash = '/login';
    } catch (error) {
        console.error("Logout failed:", error);
        alert("Could not log out. Please try again.");
    }
  };

  const value = { user, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
