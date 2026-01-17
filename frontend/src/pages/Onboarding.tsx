/**
 * Onboarding Page
 * 
 * Multi-step onboarding flow that:
 * 1. Welcomes the user
 * 2. Collects their goals
 * 3. Lets them choose a plan (with Paddle checkout for paid plans)
 * 4. Saves data to Firestore
 * 5. Redirects to dashboard
 */

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/contexts/BillingContext';
import { PlanId } from '@/types/user';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { GoalsStep } from '@/components/onboarding/GoalsStep';
import { PlanStep } from '@/components/onboarding/PlanStep';
import { CompleteStep } from '@/components/onboarding/CompleteStep';

type Step = 'welcome' | 'goals' | 'plan' | 'complete';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();
  const { plans, openCheckout, subscription, isLoading: billingLoading } = useBilling();

  // State
  const [step, setStep] = useState<Step>('welcome');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('free');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // =============================================================================
  // INITIALIZATION: Check if user already paid (after page reload from checkout)
  // =============================================================================
  useEffect(() => {
    // Wait for billing to load
    if (billingLoading || !user) {
      return;
    }

    // Only run once on mount
    if (isInitialized) {
      return;
    }

    console.log('[Onboarding Init] Checking subscription status:', subscription?.plan_id);

    // If user has a paid subscription, they just completed payment
    // Show the complete step immediately (don't start from welcome)
    if (subscription && subscription.plan_id !== 'free') {
      console.log('[Onboarding Init] Paid subscription detected, showing complete step');
      setSelectedPlan(subscription.plan_id as PlanId);
      
      // DON'T complete onboarding yet - wait for user to click "Go to Dashboard"
      // Just show the complete step immediately
      setStep('complete');
    }

    setIsInitialized(true);
  }, [subscription, user, billingLoading, isInitialized]);

  // =============================================================================
  // HANDLERS
  // =============================================================================
  const handleGoalToggle = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId]
    );
  };

  const handlePlanSelect = (planId: PlanId) => {
    setSelectedPlan(planId);
  };

  const handleComplete = async () => {
    setIsSaving(true);
    setError(null);

    try {
      if (selectedPlan !== 'free') {
        // For paid plans: Open checkout WITHOUT completing onboarding
        // After payment, page will reload and useEffect will detect paid subscription
        console.log('[Onboarding] Opening checkout for paid plan:', selectedPlan);
        setIsSaving(false);
        await openCheckout(selectedPlan, 'monthly');
        return;
      }

      // For free plan: Complete onboarding and show complete step
      console.log('[Onboarding] Completing onboarding with free plan');
      await completeOnboarding(selectedGoals, selectedPlan);
      setStep('complete');
    } catch (err) {
      console.error('[Onboarding] Error:', err);
      setError('Failed to save your preferences. Please try again.');
    } finally {
      if (selectedPlan === 'free') {
        setIsSaving(false);
      }
    }
  };

  // =============================================================================
  // GO TO DASHBOARD
  // =============================================================================
  const goToDashboard = async () => {
    console.log('[Onboarding] Navigating to dashboard');
    // Onboarding should already be complete, but double-check
    if (user && !user.hasCompletedOnboarding) {
      console.log('[Onboarding] Marking onboarding complete before dashboard');
      try {
        await completeOnboarding(
          selectedGoals.length > 0 ? selectedGoals : ['understand'],
          selectedPlan
        );
      } catch (err) {
        console.error('[Onboarding] Error completing onboarding:', err);
      }
    }
    navigate('/dashboard');
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  // Show loading state while billing data is loading
  if (billingLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className={`w-full ${step === 'plan' ? 'max-w-6xl' : 'max-w-2xl'} transition-all duration-300`}>
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['welcome', 'goals', 'plan', 'complete'].map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                step === s
                  ? 'bg-primary w-6'
                  : i < ['welcome', 'goals', 'plan', 'complete'].indexOf(step)
                    ? 'bg-primary'
                    : 'bg-border'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <WelcomeStep
              userName={user?.profile?.displayName?.split(' ')[0]}
              onNext={() => setStep('goals')}
            />
          )}

          {/* Goals Step */}
          {step === 'goals' && (
            <GoalsStep
              selectedGoals={selectedGoals}
              onToggle={handleGoalToggle}
              onNext={() => setStep('plan')}
            />
          )}

          {/* Plan Step */}
          {step === 'plan' && (
            <PlanStep
              plans={plans}
              selectedPlan={selectedPlan}
              onSelectPlan={handlePlanSelect}
              onComplete={handleComplete}
              isSaving={isSaving}
              error={error}
            />
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <CompleteStep onNavigateToDashboard={goToDashboard} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
