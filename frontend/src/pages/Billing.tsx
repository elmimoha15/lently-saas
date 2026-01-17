/**
 * Billing Page
 * 
 * Uses BillingContext as the SINGLE SOURCE OF TRUTH for all billing data.
 * Displays:
 * - Current plan and status
 * - Usage statistics (same data as dashboard)
 * - Available plans with Paddle checkout
 * - Subscription management (cancel, update payment)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Sparkles, 
  Video, 
  MessageSquare, 
  BrainCircuit,
  CreditCard,
  AlertCircle,
  Crown,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useBilling } from '@/contexts/BillingContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Billing = () => {
  const {
    usage,
    subscription,
    plans,
    currentPlan,
    isLoading,
    error,
    openCheckout,
    cancelSubscription,
    isPaddleReady,
    refreshBilling,
  } = useBilling();
  
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') return;
    
    setCheckoutLoading(planId);
    try {
      await openCheckout(planId, 'monthly');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const success = await cancelSubscription();
      if (success) {
        setShowCancelDialog(false);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading billing information...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto py-12">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load billing information. Please try again.
              <Button variant="outline" size="sm" className="ml-4" onClick={() => refreshBilling()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  const usageStats = usage ? [
    {
      icon: Video,
      label: 'Videos Analyzed',
      used: usage.videos_used,
      limit: usage.videos_limit,
      color: 'text-primary',
    },
    {
      icon: BrainCircuit,
      label: 'AI Questions',
      used: usage.ai_questions_used,
      limit: usage.ai_questions_limit,
      color: 'text-primary',
    },
    {
      icon: MessageSquare,
      label: 'Comments per Video',
      used: 0,
      limit: usage.comments_per_video_limit,
      color: 'text-primary',
      isPerVideo: true,
    },
  ] : [];

  const isPaidSubscription = subscription && subscription.plan_id !== 'free';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-10"
      >
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>

        {/* Current Plan Card */}
        <section className="card-elevated">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Current Plan:</h2>
              <span className={`px-3 py-1 text-sm font-medium rounded-full inline-flex items-center gap-1.5 ${
                subscription?.plan_id === 'free' 
                  ? 'bg-muted text-muted-foreground' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {subscription?.plan_id !== 'free' && <Crown className="w-3.5 h-3.5" />}
                {subscription?.plan_name || 'Free'}
              </span>
              {subscription?.status && subscription.status !== 'none' && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  subscription.status === 'active' ? 'bg-green-500/10 text-green-500' :
                  subscription.status === 'past_due' ? 'bg-red-500/10 text-red-500' :
                  subscription.status === 'canceled' ? 'bg-muted text-muted-foreground' :
                  'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {subscription.status.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>
            {subscription?.price_formatted && subscription.plan_id !== 'free' && (
              <span className="text-lg font-semibold">{subscription.price_formatted}</span>
            )}
          </div>

          {/* Current plan features */}
          {currentPlan && (
            <div className="space-y-2 mb-6">
              <FeatureItem>{currentPlan.videos_per_month} videos per month</FeatureItem>
              <FeatureItem>{currentPlan.comments_per_video.toLocaleString()} comments per video</FeatureItem>
              <FeatureItem>
                {currentPlan.unlimited_ai 
                  ? 'Unlimited AI questions' 
                  : `${currentPlan.ai_questions_per_month} AI questions per month`}
              </FeatureItem>
              {currentPlan.priority_support && <FeatureItem>Priority support</FeatureItem>}
              {currentPlan.custom_integrations && <FeatureItem>Custom integrations</FeatureItem>}
            </div>
          )}

          {/* Cancel at period end notice */}
          {subscription?.cancel_at_period_end && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your subscription will end on {subscription.current_period_end 
                  ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    }) 
                  : 'the end of your billing period'}. 
                You'll be downgraded to the Free plan.
              </AlertDescription>
            </Alert>
          )}

          {/* Scheduled change notice */}
          {subscription?.scheduled_change && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your plan will change to {subscription.scheduled_change.plan_id} at the end of your billing period.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            {subscription?.plan_id === 'free' ? (
              <Button 
                className="btn-primary flex items-center gap-2"
                onClick={() => {
                  const plansSection = document.getElementById('plans-section');
                  plansSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Sparkles className="w-5 h-5" />
                Upgrade to get more →
              </Button>
            ) : isActive && !subscription?.cancel_at_period_end ? (
              <>
                {subscription?.update_payment_url && (
                  <Button variant="outline" asChild>
                    <a href={subscription.update_payment_url} target="_blank" rel="noopener noreferrer">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Update Payment Method
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Subscription
                </Button>
              </>
            ) : null}
          </div>
        </section>

        {/* Usage Statistics */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Current Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {usageStats.map((stat, index) => {
              const percentage = stat.isPerVideo ? 0 : Math.min((stat.used / stat.limit) * 100, 100);
              const isOverLimit = !stat.isPerVideo && stat.used >= stat.limit;
              
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card-premium"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  </div>
                  
                  <div className="text-3xl font-bold mb-3">
                    {stat.isPerVideo ? (
                      <>
                        <span className="text-lg text-muted-foreground font-normal">Up to </span>
                        {stat.limit.toLocaleString()}
                      </>
                    ) : (
                      <>
                        {stat.used}
                        <span className="text-lg text-muted-foreground font-normal">/{stat.limit}</span>
                      </>
                    )}
                  </div>
                  
                  {!stat.isPerVideo && (
                    <div className="progress-bar">
                      <motion.div
                        className={`progress-fill ${isOverLimit ? 'bg-destructive' : ''}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                      />
                    </div>
                  )}
                  
                  {isOverLimit && (
                    <p className="text-xs text-destructive mt-2 font-medium">Limit reached</p>
                  )}
                </motion.div>
              );
            })}
          </div>
          {usage?.reset_date && (
            <p className="text-sm text-muted-foreground mt-4">
              Resets on: {new Date(usage.reset_date).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          )}
        </section>

        {/* Available Plans */}
        <section id="plans-section">
          <h2 className="text-xl font-semibold mb-6">Available Plans</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={index}
                currentPlanId={subscription?.plan_id || 'free'}
                onSelect={handleSelectPlan}
                isLoading={checkoutLoading === plan.id}
                isPaddleReady={isPaddleReady}
              />
            ))}
          </div>
        </section>

        {/* Payment Method (for paid users) */}
        {isPaidSubscription && (
          <section className="card-premium">
            <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
            {subscription?.update_payment_url ? (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Manage your payment method through Paddle</p>
                <Button variant="outline" asChild>
                  <a href={subscription.update_payment_url} target="_blank" rel="noopener noreferrer">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Payment
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">Payment method on file with Paddle</p>
            )}
          </section>
        )}

        {/* Billing History */}
        <section className="card-premium">
          <h2 className="text-xl font-semibold mb-4">Billing History</h2>
          <p className="text-muted-foreground">
            {isPaidSubscription 
              ? 'View your invoices and receipts in the Paddle customer portal.'
              : 'No invoices yet. Subscribe to a plan to see your billing history.'}
          </p>
        </section>
      </motion.div>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Your subscription will remain active until the end of your current billing period. 
              After that, you'll be downgraded to the Free plan and lose access to premium features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

// =============================================================================
// Sub-components
// =============================================================================

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 text-sm">
    <Check className="w-4 h-4 text-success flex-shrink-0" />
    <span>{children}</span>
  </div>
);

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    price_monthly: number;
    price_monthly_formatted: string;
    videos_per_month: number;
    comments_per_video: number;
    ai_questions_per_month: number;
    priority_support: boolean;
    custom_integrations: boolean;
    unlimited_ai: boolean;
  };
  index: number;
  currentPlanId: string;
  onSelect: (planId: string) => void;
  isLoading: boolean;
  isPaddleReady: boolean;
}

const PlanCard = ({ 
  plan, 
  index, 
  currentPlanId, 
  onSelect, 
  isLoading,
  isPaddleReady,
}: PlanCardProps) => {
  const isCurrentPlan = plan.id === currentPlanId;
  const isPopular = plan.id === 'pro';
  const isFree = plan.id === 'free';
  
  const monthlyPrice = plan.price_monthly;
  
  const isUpgrade = !isFree && (
    currentPlanId === 'free' ||
    (currentPlanId === 'starter' && (plan.id === 'pro' || plan.id === 'business')) ||
    (currentPlanId === 'pro' && plan.id === 'business')
  );
  
  const isDowngrade = !isFree && !isUpgrade && !isCurrentPlan;
  
  const colorClasses: Record<string, { bg: string; text: string; button: string }> = {
    free: {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      button: 'bg-muted text-foreground hover:bg-muted/80',
    },
    starter: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      button: 'bg-blue-500 text-white hover:bg-blue-600',
    },
    pro: {
      bg: 'bg-primary/10',
      text: 'text-primary',
      button: 'bg-primary text-primary-foreground hover:bg-primary/90',
    },
    business: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-500',
      button: 'bg-purple-500 text-white hover:bg-purple-600',
    },
  };

  const colors = colorClasses[plan.id] || colorClasses.free;

  const features = [
    `${plan.videos_per_month} videos/month`,
    `${plan.comments_per_video.toLocaleString()} comments/video`,
    plan.unlimited_ai ? 'Unlimited AI questions' : `${plan.ai_questions_per_month} AI questions`,
    ...(plan.priority_support ? ['Priority support'] : []),
    ...(plan.custom_integrations ? ['Custom integrations'] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className={`card-premium relative flex flex-col ${isPopular ? 'ring-2 ring-primary' : ''}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
          MOST POPULAR
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
          CURRENT
        </div>
      )}

      <div className={`inline-block px-3 py-1 text-xs font-medium rounded-full mb-4 ${colors.bg} ${colors.text}`}>
        {plan.name.toUpperCase()}
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold">
          ${monthlyPrice / 100}
        </span>
        <span className="text-muted-foreground">/month</span>
      </div>

      <div className="space-y-3 mb-8 flex-1">
        {features.map((feature) => (
          <FeatureItem key={feature}>{feature}</FeatureItem>
        ))}
      </div>

      <Button 
        className={`w-full ${isCurrentPlan ? 'bg-muted text-foreground cursor-default' : colors.button}`}
        onClick={() => !isCurrentPlan && !isFree && onSelect(plan.id)}
        disabled={isCurrentPlan || isFree || isLoading || !isPaddleReady}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : isFree ? (
          'Free Forever'
        ) : isUpgrade ? (
          'Upgrade'
        ) : isDowngrade ? (
          'Downgrade'
        ) : (
          'Select Plan'
        )}
      </Button>
    </motion.div>
  );
};

export default Billing;
