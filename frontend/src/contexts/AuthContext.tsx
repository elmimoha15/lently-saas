/**
 * Auth Context
 * 
 * Provides authentication state and methods throughout the app.
 * Handles Firebase auth state synchronization, user data loading, and token management.
 * Includes automatic logout on token expiration for security.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '@/services/token.service';
import {
  LentlyUser,
  AuthState,
  AuthError,
  SignInResult,
  SignUpResult,
  PlanId,
} from '@/types/user';
import {
  subscribeToAuthState,
  getUserDocument,
  signInWithGoogle as authSignInWithGoogle,
  signUpWithGoogle as authSignUpWithGoogle,
  signOut as authSignOut,
  updateOnboardingData,
  updateLastLogin,
} from '@/services/auth.service';

// ============================================================================
// Context Types
// ============================================================================

interface AuthContextValue extends AuthState {
  // Authentication methods
  signInWithGoogle: () => Promise<SignInResult>;
  signUpWithGoogle: () => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  
  // Data refresh
  refreshUser: () => Promise<void>;
  
  // Onboarding
  completeOnboarding: (goals: string[], planId: PlanId) => Promise<void>;
  
  // Error handling
  clearError: () => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<LentlyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ============================================================================
  // Firebase Auth State Listener
  // ============================================================================

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // User is signed in - fetch their Lently user data
        try {
          const lentlyUser = await getUserDocument(fbUser.uid);
          setUser(lentlyUser);
          
          // Start token management for authenticated users
          tokenManager.start(async () => {
            console.log('[Auth] Token expired, logging out user');
            await signOut();
          });
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError({
            code: 'data-fetch-error',
            message: 'Failed to load user data. Please try again.',
            type: 'general',
          });
        }
      } else {
        // User is signed out - stop token management
        setUser(null);
        tokenManager.stop();
      }

      setIsLoading(false);
      setIsInitialized(true);
    });

    return () => {
      unsubscribe();
      tokenManager.stop();
    };
  }, []);

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  const signInWithGoogle = useCallback(async (): Promise<SignInResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authSignInWithGoogle();

      if (result.success && result.user) {
        setUser(result.user);
      } else if (result.error) {
        setError(result.error);
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUpWithGoogle = useCallback(async (): Promise<SignUpResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authSignUpWithGoogle();

      if (result.success && result.user) {
        setUser(result.user);
      } else if (result.error) {
        setError(result.error);
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop token management before signing out
      tokenManager.stop();
      
      const result = await authSignOut();

      if (result.error) {
        setError(result.error);
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // User Data Methods
  // ============================================================================

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!firebaseUser) return;

    try {
      const lentlyUser = await getUserDocument(firebaseUser.uid);
      setUser(lentlyUser);
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  }, [firebaseUser]);

  const completeOnboarding = useCallback(
    async (goals: string[], planId: PlanId): Promise<void> => {
      if (!firebaseUser || !user) {
        throw new Error('No authenticated user');
      }

      await updateOnboardingData(firebaseUser.uid, goals, planId);

      // Update local state
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            onboardingGoals: goals as any,
          },
          subscription: {
            ...prev.subscription,
            planId,
          },
          hasCompletedOnboarding: true,
          updatedAt: new Date(),
        };
      });
    },
    [firebaseUser, user]
  );

  // ============================================================================
  // Error Handling
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      isLoading,
      isAuthenticated: !!user && !!firebaseUser,
      error,
      signInWithGoogle,
      signUpWithGoogle,
      signOut,
      refreshUser,
      completeOnboarding,
      clearError,
    }),
    [
      user,
      firebaseUser,
      isLoading,
      error,
      signInWithGoogle,
      signUpWithGoogle,
      signOut,
      refreshUser,
      completeOnboarding,
      clearError,
    ]
  );

  // ============================================================================
  // Render
  // ============================================================================

  // Show nothing until Firebase Auth is initialized
  // This prevents flash of unauthenticated content
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default AuthContext;
