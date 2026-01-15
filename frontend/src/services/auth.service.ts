/**
 * Authentication Service
 * 
 * Handles all Firebase authentication operations including:
 * - Google Sign-In/Sign-Up
 * - User document management in Firestore
 * - Account existence checking
 * - Sign out
 */

import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
  AuthError as FirebaseAuthError,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import {
  LentlyUser,
  SignInResult,
  SignUpResult,
  AuthError,
  AuthMode,
  createDefaultUser,
} from '@/types/user';

// ============================================================================
// Constants
// ============================================================================

const USERS_COLLECTION = 'users';

// ============================================================================
// Error Handling
// ============================================================================

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': 'Sign in was cancelled. Please try again.',
  'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again.',
  'auth/cancelled-popup-request': 'Sign in was cancelled.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/account-exists-with-different-credential': 
    'An account already exists with the same email address.',
  'default': 'An unexpected error occurred. Please try again.',
};

const getAuthErrorMessage = (code: string): string => {
  return AUTH_ERROR_MESSAGES[code] || AUTH_ERROR_MESSAGES['default'];
};

const createAuthError = (
  error: FirebaseAuthError | Error,
  type: AuthError['type']
): AuthError => {
  const code = (error as FirebaseAuthError).code || 'unknown';
  return {
    code,
    message: getAuthErrorMessage(code),
    type,
  };
};

// ============================================================================
// Firestore User Operations
// ============================================================================

/**
 * Get user document from Firestore
 */
export const getUserDocument = async (uid: string): Promise<LentlyUser | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      
      // Convert Firestore Timestamps to Dates
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
        subscription: {
          ...data.subscription,
          currentPeriodStart: data.subscription?.currentPeriodStart?.toDate() || null,
          currentPeriodEnd: data.subscription?.currentPeriodEnd?.toDate() || null,
        },
        usage: {
          ...data.usage,
          lastResetDate: data.usage?.lastResetDate?.toDate() || new Date(),
        },
      } as LentlyUser;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user document:', error);
    return null;
  }
};

/**
 * Check if a user document exists in Firestore
 */
export const checkUserExists = async (uid: string): Promise<boolean> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};

/**
 * Create a new user document in Firestore
 */
export const createUserDocument = async (
  firebaseUser: FirebaseUser
): Promise<LentlyUser> => {
  const userDoc = createDefaultUser(
    firebaseUser.uid,
    firebaseUser.email,
    firebaseUser.displayName,
    firebaseUser.photoURL
  );

  const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  
  // Prepare for Firestore (use serverTimestamp for accurate timestamps)
  const firestoreData = {
    ...userDoc,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    subscription: {
      ...userDoc.subscription,
      currentPeriodStart: serverTimestamp(),
      currentPeriodEnd: null,
    },
    usage: {
      ...userDoc.usage,
      lastResetDate: serverTimestamp(),
    },
  };

  await setDoc(userRef, firestoreData);

  return userDoc;
};

/**
 * Update last login timestamp
 */
export const updateLastLogin = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};

// ============================================================================
// Authentication Operations
// ============================================================================

/**
 * Sign in with Google
 * 
 * Handles existing users only. If user doesn't have an account,
 * returns an error prompting them to sign up first.
 */
export const signInWithGoogle = async (): Promise<SignInResult> => {
  try {
    // Attempt Google sign in
    const result: UserCredential = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;

    // Check if user exists in Firestore
    const existingUser = await getUserDocument(firebaseUser.uid);

    if (!existingUser) {
      // User authenticated with Google but doesn't have a Lently account
      // Sign them out and return error
      await firebaseSignOut(auth);
      
      return {
        success: false,
        isNewUser: true,
        needsOnboarding: false,
        error: {
          code: 'auth/user-not-found',
          message: "You don't have a Lently account yet. Please sign up first.",
          type: 'signin',
        },
      };
    }

    // Update last login
    await updateLastLogin(firebaseUser.uid);

    return {
      success: true,
      user: existingUser,
      isNewUser: false,
      needsOnboarding: !existingUser.hasCompletedOnboarding,
    };
  } catch (error) {
    console.error('Google sign in error:', error);
    return {
      success: false,
      isNewUser: false,
      needsOnboarding: false,
      error: createAuthError(error as FirebaseAuthError, 'signin'),
    };
  }
};

/**
 * Sign up with Google
 * 
 * Creates a new Lently account. If account already exists,
 * returns an error prompting them to sign in instead.
 */
export const signUpWithGoogle = async (): Promise<SignUpResult> => {
  try {
    // Attempt Google sign in/up
    const result: UserCredential = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;

    // Check if user already exists in Firestore
    const existingUser = await getUserDocument(firebaseUser.uid);

    if (existingUser) {
      // User already has an account - they should sign in instead
      await firebaseSignOut(auth);
      
      return {
        success: false,
        error: {
          code: 'auth/account-exists',
          message: 'An account with this Google account already exists. Please sign in instead.',
          type: 'signup',
        },
      };
    }

    // Create new user document
    const newUser = await createUserDocument(firebaseUser);

    return {
      success: true,
      user: newUser,
    };
  } catch (error) {
    console.error('Google sign up error:', error);
    return {
      success: false,
      error: createAuthError(error as FirebaseAuthError, 'signup'),
    };
  }
};

/**
 * Sign out
 */
export const signOut = async (): Promise<{ success: boolean; error?: AuthError }> => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: createAuthError(error as Error, 'signout'),
    };
  }
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuthState = (
  callback: (user: FirebaseUser | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// ============================================================================
// User Data Updates
// ============================================================================

/**
 * Update user's onboarding data
 */
export const updateOnboardingData = async (
  uid: string,
  goals: string[],
  planId: string
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      'profile.onboardingGoals': goals,
      'subscription.planId': planId,
      hasCompletedOnboarding: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating onboarding data:', error);
    throw error;
  }
};

/**
 * Update user subscription (called from backend via webhook or manually)
 */
export const updateUserSubscription = async (
  uid: string,
  subscription: Partial<LentlyUser['subscription']>
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const updates: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    // Build nested updates for subscription
    Object.entries(subscription).forEach(([key, value]) => {
      updates[`subscription.${key}`] = value;
    });

    await updateDoc(userRef, updates);
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};
