import { motion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlanId } from '@/types/user';

interface PlanData {
  id: string;
  name: string;
  price_monthly: number;
  videos_per_month: number;
  comments_per_video: number;
  ai_questions_per_month: number;
  priority_support: boolean;
  unlimited_ai: boolean;
}

interface PlanStepProps {
  plans: PlanData[];
  selectedPlan: PlanId;
  onSelectPlan: (planId: PlanId) => void;
  onComplete: () => void;
  isSaving: boolean;
  error: string | null;
}

export const PlanStep = ({ plans, selectedPlan, onSelectPlan, onComplete, isSaving, error }: PlanStepProps) => {
  return (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {plans.map((plan, index) => {
          const isSelected = selectedPlan === plan.id;
          const isPopular = plan.id === 'pro';
          const isFree = plan.id === 'free';
          
          const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
            free: {
              bg: 'bg-muted',
              text: 'text-muted-foreground',
              border: 'border-muted',
            },
            starter: {
              bg: 'bg-blue-500/10',
              text: 'text-blue-500',
              border: 'border-blue-500/20',
            },
            pro: {
              bg: 'bg-primary/10',
              text: 'text-primary',
              border: 'border-primary/20',
            },
            business: {
              bg: 'bg-purple-500/10',
              text: 'text-purple-500',
              border: 'border-purple-500/20',
            },
          };

          const colors = colorClasses[plan.id] || colorClasses.free;

          const features = [
            `${plan.videos_per_month} videos/month`,
            `${plan.comments_per_video.toLocaleString()} comments/video`,
            plan.unlimited_ai ? 'Unlimited AI questions' : `${plan.ai_questions_per_month} AI questions`,
            ...(plan.priority_support ? ['Priority support'] : []),
          ];

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              onClick={() => onSelectPlan(plan.id as PlanId)}
              className={`relative cursor-pointer p-6 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : isPopular
                  ? 'border-primary/30 bg-card hover:border-primary/50'
                  : 'border-border bg-card hover:border-primary/30'
              } ${isPopular ? 'ring-2 ring-primary/20' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  RECOMMENDED
                </div>
              )}

              <div className={`inline-block px-3 py-1 text-xs font-medium rounded-full mb-4 ${colors.bg} ${colors.text}`}>
                {plan.name.toUpperCase()}
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ${plan.price_monthly / 100}
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <div className="space-y-3 mb-6">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-6 right-6 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <Button
        onClick={onComplete}
        disabled={isSaving}
        className="btn-primary w-full h-14 text-base gap-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {selectedPlan === 'free' ? 'Setting up...' : 'Opening checkout...'}
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
          Secure payment powered by Paddle. Cancel anytime.
        </p>
      )}
    </motion.div>
  );
};
