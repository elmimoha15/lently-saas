/**
 * Sign Up Page
 * 
 * Google Sign-Up only - creates new accounts.
 * Redirects existing users to sign in instead.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SignInProgress } from '@/components/auth/SignInProgress';

const SignUp = () => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { signUpWithGoogle, isAuthenticated, user, isLoading } = useAuth();

  // Auto-redirect when user becomes authenticated after signup
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      // If user just signed up and hasn't completed onboarding, redirect there
      if (!user.hasCompletedOnboarding) {
        console.log('New user authenticated, redirecting to onboarding...');
        navigate('/onboarding', { replace: true });
      }
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const handleGoogleSignUp = async () => {
    setError(null);

    try {
      const result = await signUpWithGoogle();

      if (result.success) {
        // Extract first name from display name if available
        const displayName = result.user?.profile?.displayName;
        if (displayName) {
          setUserName(displayName.split(' ')[0]);
        }
        
        // Small delay to ensure Google popup closes, then show progress
        setTimeout(() => {
          setIsSigningUp(true);
          
          // Progress bar will continue showing while onboarding loads
          navigate('/onboarding', { replace: true });
        }, 300);
      } else if (result.error) {
        // Handle specific error for existing users
        if (result.error.code === 'auth/account-exists') {
          setError('An account with this Google account already exists. Please sign in instead.');
        } else {
          setError(result.error.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  // Show progress screen when signing up
  if (isSigningUp) {
    return <SignInProgress userName={userName} message="Creating account" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 flex items-center justify-center p-8">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-16 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col justify-center py-8 px-12 bg-muted/30 rounded-2xl">
          <div className="space-y-8">
            <Link to="/landing" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Flame className="w-7 h-7 text-white" />
              </div>
              <span className="font-logo text-2xl font-semibold tracking-tight">Lently</span>
            </Link>

            <div className="max-w-md space-y-6">
              <h1 className="text-5xl font-semibold leading-tight tracking-tight">
                Transform your
                <br />
                <span className="text-primary">YouTube comments</span>
                <br />
                into insights
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Join creators who are building deeper connections with their audience
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Sign up form */}
        <div className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[400px]"
          >
            {/* Mobile logo */}
            <Link to="/landing" className="lg:hidden flex items-center justify-center gap-2 mb-12">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <span className="font-logo text-xl font-semibold tracking-tight">Lently</span>
            </Link>

            <div className="space-y-8">
              <div className="space-y-2 text-center lg:text-left">
                <h2 className="text-3xl font-semibold tracking-tight">Create your account</h2>
                <p className="text-muted-foreground">
                  Start your journey to better engagement
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3"
                >
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm text-destructive">
                    {error}
                    {error.includes('already exists') && (
                      <Link to="/signin" className="block mt-2 font-medium underline">
                        Go to Sign In →
                      </Link>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Google Sign Up Button */}
              <div className="space-y-4">
                <Button
                  onClick={handleGoogleSignUp}
                  disabled={isSigningUp}
                  className="w-full h-12 flex items-center justify-center gap-3 bg-background hover:bg-muted border border-border text-foreground font-medium transition-colors"
                  variant="outline"
                >
                  {isSigningUp ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Have an account?</span>
                  </div>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/signin" className="text-primary hover:underline font-medium">
                    Sign in instead
                  </Link>
                </p>
              </div>

              {/* Terms */}
              <p className="text-xs text-center text-muted-foreground leading-relaxed">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="underline hover:text-foreground">
                  Terms
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
