/**
 * Current Plan Section
 * Displays the user's current subscription plan with features and management options
 */

import { Crown, AlertCircle, Sparkles, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlanData, SubscriptionData } from '@/services/api.service';

interface CurrentPlanSectionProps {
  subscription: SubscriptionData | null;
  currentPlan: PlanData | null;
  isActive: boolean;
  onCancelClick: () => void;
  onUpgradeClick: () => void;
}

export const CurrentPlanSection = ({
  subscription,
  currentPlan,
  isActive,
  onCancelClick,
  onUpgradeClick,
}: CurrentPlanSectionProps) => {
  return (
    <section className="card-elevated">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Current Plan:</h2>
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full inline-flex items-center gap-1.5 ${
              subscription?.plan_id === 'free'
                ? 'bg-muted text-muted-foreground'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {subscription?.plan_id !== 'free' && <Crown className="w-3.5 h-3.5" />}
            {subscription?.plan_name || 'Free'}
          </span>
          {subscription?.status && subscription.status !== 'none' && (
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded ${
                subscription.status === 'active'
                  ? 'bg-green-500/10 text-green-500'
                  : subscription.status === 'past_due'
                  ? 'bg-red-500/10 text-red-500'
                  : subscription.status === 'canceled'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-yellow-500/10 text-yellow-500'
              }`}
            >
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
          <FeatureItem>
            {currentPlan.comments_per_video.toLocaleString()} comments per video
          </FeatureItem>
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
            Your subscription will end on{' '}
            {subscription.current_period_end
              ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'the end of your billing period'}
            . You'll be downgraded to the Free plan.
          </AlertDescription>
        </Alert>
      )}

      {/* Scheduled change notice */}
      {subscription?.scheduled_change && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your plan will change to {subscription.scheduled_change.plan_id} at the end of your
            billing period.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4">
        {subscription?.plan_id === 'free' ? (
          <Button className="btn-primary flex items-center gap-2" onClick={onUpgradeClick}>
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
              onClick={onCancelClick}
            >
              Cancel Subscription
            </Button>
          </>
        ) : null}
      </div>
    </section>
  );
};

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 text-sm">
    <svg
      className="w-4 h-4 text-success flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>{children}</span>
  </div>
);
