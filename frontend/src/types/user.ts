/**
 * User Types
 * 
 * Core type definitions for user management, authentication state,
 * and subscription plans. Designed for consistency across frontend,
 * backend, and Firestore.
 */

// ============================================================================
// Subscription & Plan Types
// ============================================================================

export type PlanId = 'free' | 'starter' | 'pro';

export interface PlanLimits {
  videosPerMonth: number;
  commentsPerVideo: number;
  aiQuestionsPerMonth: number;
  hasPrioritySupport: boolean;
}

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  price: number;
  description: string;
  features: string[];
  limits: PlanLimits;
  paddlePriceId?: string; // Paddle price ID for payment integration
}

// Plan configurations (used in onboarding and billing)
export const PLANS: Record<PlanId, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: ['3 videos per month', '100 comments per video', '3 AI questions'],
    limits: {
      videosPerMonth: 3,
      commentsPerVideo: 100,
      aiQuestionsPerMonth: 3,
      hasPrioritySupport: false,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 12,
    description: 'For growing creators',
    features: ['20 videos per month', '5,000 comments per video', '60 AI questions'],
    limits: {
      videosPerMonth: 20,
      commentsPerVideo: 5000,
      aiQuestionsPerMonth: 60,
      hasPrioritySupport: false,
    },
    paddlePriceId: undefined, // Set when Paddle is configured
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 27,
    description: 'For serious creators',
    features: ['50 videos per month', '10,000 comments per video', '150 AI questions', 'Priority support'],
    limits: {
      videosPerMonth: 50,
      commentsPerVideo: 10000,
      aiQuestionsPerMonth: 150,
      hasPrioritySupport: true,
    },
    paddlePriceId: undefined, // Set when Paddle is configured
  },
};

// ============================================================================
// Subscription Status Types
// ============================================================================

export type SubscriptionStatus = 
  | 'active'      // Currently active subscription
  | 'trialing'    // In trial period
  | 'past_due'    // Payment failed but grace period
  | 'paused'      // Subscription paused
  | 'canceled'    // Subscription canceled but still active until period end
  | 'expired';    // Subscription ended

export interface UserSubscription {
  planId: PlanId;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  paddleSubscriptionId?: string;
  paddleCustomerId?: string;
}

// ============================================================================
// Usage Tracking Types
// ============================================================================

export interface UsageStats {
  videosAnalyzedThisMonth: number;
  aiQuestionsThisMonth: number;
  lastResetDate: Date;
}

// ============================================================================
// User Profile Types
// ============================================================================

export type OnboardingGoal = 
  | 'understand'   // Understand audience better
  | 'questions'    // Find common questions
  | 'ideas'        // Get content ideas
  | 'sentiment'    // Track sentiment
  | 'grow';        // Grow channel faster

export interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  onboardingGoals: OnboardingGoal[];
}

// ============================================================================
// Main User Type (Firestore Document)
// ============================================================================

export interface LentlyUser {
  // Core identifiers
  uid: string;
  email: string | null;
  
  // Profile info
  profile: UserProfile;
  
  // Subscription info
  subscription: UserSubscription;
  
  // Usage tracking
  usage: UsageStats;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  
  // Onboarding status
  hasCompletedOnboarding: boolean;
  
  // YouTube connection (for future)
  youtubeChannelId?: string;
}

// ============================================================================
// Auth State Types
// ============================================================================

export type AuthMode = 'signin' | 'signup';

export interface AuthState {
  user: LentlyUser | null;
  firebaseUser: import('firebase/auth').User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
}

export interface AuthError {
  code: string;
  message: string;
  type: 'signin' | 'signup' | 'signout' | 'general';
}

// ============================================================================
// Auth Result Types
// ============================================================================

export interface SignInResult {
  success: boolean;
  user?: LentlyUser;
  isNewUser: boolean;
  needsOnboarding: boolean;
  error?: AuthError;
}

export interface SignUpResult {
  success: boolean;
  user?: LentlyUser;
  error?: AuthError;
}

// ============================================================================
// Firestore Helpers
// ============================================================================

/**
 * Create a default user document for new signups
 */
export const createDefaultUser = (
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null
): LentlyUser => {
  const now = new Date();
  
  return {
    uid,
    email,
    profile: {
      displayName,
      email,
      photoURL,
      onboardingGoals: [],
    },
    subscription: {
      planId: 'free',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: null, // Free plan doesn't expire
      cancelAtPeriodEnd: false,
    },
    usage: {
      videosAnalyzedThisMonth: 0,
      aiQuestionsThisMonth: 0,
      lastResetDate: now,
    },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    hasCompletedOnboarding: false,
  };
};
