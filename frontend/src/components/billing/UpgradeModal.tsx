/**
 * Upgrade Modal Component
 * 
 * A modern, reusable modal for prompting users to upgrade when limits are exceeded.
 * Matches the SaaS design with smooth animations, plan cards, and full checkout integration.
 * 
 * Features:
 * - Horizontal plan card layout matching billing page
 * - Auto-dismisses when checkout opens (no blocking)
 * - Stores pending action for post-payment resume
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useBilling } from '@/contexts/BillingContext';

// ============================================================================
// Types
// ============================================================================

export type LimitType = 'videos' | 'ai_questions' | 'comments';

export interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: LimitType;
  currentUsage?: number;
  currentLimit?: number;
}

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
    custom_integrations?: boolean;
    unlimited_ai: boolean;
  };
  index: number;
  isCurrentPlan: boolean;
  isPopular: boolean;
  isLoading: boolean;
  isPaddleReady: boolean;
  onSelect: (planId: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getLimitInfo = (limitType: LimitType) => {
  switch (limitType) {
    case 'videos':
      return {
        title: 'Video Analysis Limit Reached',
        description: 'You\'ve used all your video analyses for this month.',
        icon: '🎬',
      };
    case 'ai_questions':
      return {
        title: 'AI Questions Limit Reached',
        description: 'You\'ve used all your AI questions for this month.',
        icon: '🤖',
      };
    case 'comments':
      return {
        title: 'Comments Limit Reached',
        description: 'This video has more comments than your plan allows.',
        icon: '💬',
      };
  }
};

// ============================================================================
// Plan Card Component (Horizontal Style - Matches Billing Page)
// ============================================================================

const PlanCard = ({
  plan,
  index,
  isCurrentPlan,
  isPopular,
  isLoading,
  isPaddleReady,
  onSelect,
}: PlanCardProps) => {
  const isFree = plan.id === 'free';

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

  const isUpgrade = !isFree && !isCurrentPlan;

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
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center gap-1">
          <Zap className="w-3 h-3" />
          POPULAR
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
          CURRENT
        </div>
      )}

      <div
        className={`inline-block px-3 py-1 text-xs font-medium rounded-full mb-4 ${colors.bg} ${colors.text}`}
      >
        {plan.name.toUpperCase()}
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold">${plan.price_monthly / 100}</span>
        <span className="text-muted-foreground">/month</span>
      </div>

      <div className="space-y-2 mb-6 flex-1">
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
        ) : (
          'Select Plan'
        )}
      </Button>
    </motion.div>
  );
};

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2">
    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
    <span className="text-sm">{children}</span>
  </div>
);

// ============================================================================
// Upgrade Modal Component
// ============================================================================

export const UpgradeModal = ({
  open,
  onOpenChange,
  limitType,
  currentUsage,
  currentLimit,
}: UpgradeModalProps) => {
  const { plans, subscription, openCheckout, isPaddleReady } = useBilling();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  
  const limitInfo = getLimitInfo(limitType);
  const currentPlanId = subscription?.plan_id || 'free';

  // Get paid plans only for display
  const paidPlans = plans.filter((plan) => plan.id !== 'free');

  const handleSelectPlan = useCallback(async (planId: string) => {
    if (planId === 'free') return;
    
    setLoadingPlanId(planId);
    
    try {
      // IMPORTANT: Close the modal BEFORE opening checkout
      // This ensures checkout overlay is not blocked by the modal
      onOpenChange(false);
      
      // Small delay to let modal close animation complete
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Open checkout
      await openCheckout(planId, 'monthly');
    } catch (error) {
      console.error('Checkout error:', error);
      // Re-open modal if checkout failed
      onOpenChange(true);
    } finally {
      setLoadingPlanId(null);
    }
  }, [openCheckout, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">{limitInfo.icon}</span>
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <DialogTitle className="text-2xl">{limitInfo.title}</DialogTitle>
          <DialogDescription className="text-base">
            {limitInfo.description}
            {currentUsage !== undefined && currentLimit !== undefined && (
              <span className="block mt-1 font-medium text-foreground">
                You've used {currentUsage} of {currentLimit} available.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Upgrade your plan to continue analyzing videos and asking AI questions.
          </p>

          {/* Horizontal Grid Layout - Matches Billing Page */}
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {paidPlans.map((plan, index) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  index={index}
                  isCurrentPlan={plan.id === currentPlanId}
                  isPopular={plan.id === 'pro'}
                  isLoading={loadingPlanId === plan.id}
                  isPaddleReady={isPaddleReady}
                  onSelect={handleSelectPlan}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Cancel anytime • Secure checkout via Paddle
          </p>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
