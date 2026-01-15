/**
 * Onboarding Page
 * 
 * Multi-step onboarding flow that:
 * 1. Welcomes the user
 * 2. Collects their goals
 * 3. Lets them choose a plan
 * 4. Saves data to Firestore
 * 5. Redirects to dashboard
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  ArrowRight,
  Check,
  Sparkles,
  MessageSquare,
  BarChart3,
  Users,
  Lightbulb,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { useAuth } from '@/contexts/AuthContext';
import { PlanId } from '@/types/user';

type Step = 'welcome' | 'goals' | 'plan' | 'complete';

const goals = [
  { id: 'understand', icon: Users, label: 'Understand my audience better' },
  { id: 'questions', icon: MessageSquare, label: 'Find common questions to answer' },
  { id: 'ideas', icon: Lightbulb, label: 'Get content ideas from comments' },
  { id: 'sentiment', icon: BarChart3, label: 'Track sentiment over time' },
  { id: 'grow', icon: TrendingUp, label: 'Grow my channel faster' },
];

const plans = [
  {
    id: 'free' as PlanId,
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: ['3 videos per month', '100 comments per video', '3 AI questions'],
    popular: false,
  },
  {
    id: 'starter' as PlanId,
    name: 'Starter',
    price: 12,
    description: 'For growing creators',
    features: ['20 videos per month', '5,000 comments per video', '60 AI questions'],
    popular: false,
  },
  {
    id: 'pro' as PlanId,
    name: 'Pro',
    price: 27,
    description: 'For serious creators',
    features: [
      '50 videos per month',
      '10,000 comments per video',
      '150 AI questions',
      'Priority support',
    ],
    popular: true,
  },
];

const Onboarding = () => {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('free');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();

  const handleGoalToggle = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId]
    );
  };

  const handleComplete = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Save onboarding data to Firestore
      await completeOnboarding(selectedGoals, selectedPlan);

      // If user selected a paid plan, we would redirect to payment here
      // For now, we proceed to the complete step
      // TODO: Integrate Paddle payment flow for paid plans
      if (selectedPlan !== 'free') {
        // Future: Navigate to payment flow
        // For now, we'll complete onboarding and show a note
        console.log('Paid plan selected:', selectedPlan);
      }

      setStep('complete');
    } catch (err) {
      console.error('Error saving onboarding data:', err);
      setError('Failed to save your preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (step === 'complete') {
      // Fire red confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['#FF0000', '#FF3333', '#FF6666', '#CC0000'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [step]);

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
              >
                <Flame className="w-10 h-10 text-white" />
              </motion.div>

              <h1 className="text-3xl font-bold mb-4">
                Welcome{user?.profile?.displayName ? `, ${user.profile.displayName.split(' ')[0]}` : ''}! 🎉
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                Let's set up your account so you can start understanding your YouTube audience.
              </p>

              <Button onClick={() => setStep('goals')} className="btn-primary h-14 px-8 text-base gap-2">
                Get Started <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* Goals Step */}
          {step === 'goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-4">What do you want to achieve?</h1>
                <p className="text-muted-foreground">Select all that apply</p>
              </div>

              <div className="space-y-3 mb-8">
                {goals.map((goal) => {
                  const isSelected = selectedGoals.includes(goal.id);
                  return (
                    <motion.button
                      key={goal.id}
                      onClick={() => handleGoalToggle(goal.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        <goal.icon className="w-6 h-6" />
                      </div>
                      <span className="flex-1 text-left font-medium">{goal.label}</span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <Button
                onClick={() => setStep('plan')}
                disabled={selectedGoals.length === 0}
                className="btn-primary w-full h-14 text-base gap-2"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* Plan Step */}
          {step === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-4">Choose your plan</h1>
                <p className="text-muted-foreground">Start free, upgrade anytime</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-4 mb-8">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <motion.button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full p-5 rounded-xl border-2 transition-all text-left relative ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 right-4 px-3 py-1 bg-primary text-white text-xs font-medium rounded-full">
                          RECOMMENDED
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold">${plan.price}</span>
                          <span className="text-muted-foreground">/mo</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plan.features.map((feature) => (
                          <span
                            key={feature}
                            className="text-xs px-2 py-1 bg-secondary rounded-md text-muted-foreground"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-5 right-5 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <Button
                onClick={handleComplete}
                disabled={isSaving}
                className="btn-primary w-full h-14 text-base gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {selectedPlan === 'free' ? 'Start Free' : 'Continue to Payment'}{' '}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>

              {selectedPlan !== 'free' && (
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Payment integration coming soon. You'll start with the free plan for now.
                </p>
              )}
            </motion.div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-24 h-24 mx-auto mb-8 rounded-full bg-success/10 flex items-center justify-center"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }}>
                  <Check className="w-12 h-12 text-success" />
                </motion.div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold mb-4"
              >
                You're all set! 🎉
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-muted-foreground mb-8"
              >
                Your account is ready. Let's analyze some videos!
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button onClick={goToDashboard} className="btn-primary h-14 px-8 text-base gap-2">
                  <Sparkles className="w-5 h-5" />
                  Go to Dashboard
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
