/**
 * Plan Card Component
 * Displays an individual plan with pricing, features, and selection button
 */

import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export const PlanCard = ({
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

  const isUpgrade =
    !isFree &&
    (currentPlanId === 'free' ||
      (currentPlanId === 'starter' && (plan.id === 'pro' || plan.id === 'business')) ||
      (currentPlanId === 'pro' && plan.id === 'business'));

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

      <div
        className={`inline-block px-3 py-1 text-xs font-medium rounded-full mb-4 ${colors.bg} ${colors.text}`}
      >
        {plan.name.toUpperCase()}
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold">${monthlyPrice / 100}</span>
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

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2">
    <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
    <span className="text-sm">{children}</span>
  </div>
);
