/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication.
 * Redirects unauthenticated users to sign in.
 * Redirects users who haven't completed onboarding to onboarding.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Flame } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean; // If true, requires completed onboarding
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOnboarding = true,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading state with better UI
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Flame className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-2xl animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-foreground mb-1">Loading Lently</p>
            <p className="text-sm text-muted-foreground">Preparing your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Redirect to onboarding if required and not completed
  if (requireOnboarding && user && !user.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

/**
 * Public Route Component
 * 
 * Wraps routes that should only be accessible to unauthenticated users.
 * Redirects authenticated users to dashboard or onboarding.
 */
interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading state with better UI
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Flame className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-2xl animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-foreground mb-1">Loading Lently</p>
            <p className="text-sm text-muted-foreground">Just a moment...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect authenticated users
  if (isAuthenticated && user) {
    // Get the intended destination if available
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    
    // If user hasn't completed onboarding, redirect there
    if (!user.hasCompletedOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
    
    // Otherwise, go to dashboard or intended destination
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

/**
 * Onboarding Route Component
 * 
 * Special route for onboarding - requires auth but NOT completed onboarding.
 * Redirects users who have completed onboarding to dashboard.
 */
interface OnboardingRouteProps {
  children: React.ReactNode;
}

export const OnboardingRoute: React.FC<OnboardingRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading state with better UI
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Flame className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-2xl animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-foreground mb-1">Loading Lently</p>
            <p className="text-sm text-muted-foreground">Setting things up...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/signup" replace />;
  }

  // Redirect to dashboard if onboarding is already completed
  if (user?.hasCompletedOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
