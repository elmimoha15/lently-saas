/**
 * Billing Page
 * 
 * Uses BillingContext as the SINGLE SOURCE OF TRUTH for all billing data.
 * Displays:
 * - Current plan and status
 * - Usage statistics (same data as dashboard)
 * - Available plans with Paddle checkout
 * - Subscription management (cancel, update payment)
 * - Billing history with downloadable invoices
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBilling } from '@/contexts/BillingContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { billingApi } from '@/services/api.service';
import {
  CurrentPlanSection,
  UsageStatsSection,
  PlanCard,
  BillingHistorySection,
  CancelSubscriptionDialog,
} from '@/components/billing';

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

  // Fetch billing history
  const { data: transactionsData, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const response = await billingApi.getTransactions(20);
      if (response.error) throw new Error(response.error.detail);
      return response.data;
    },
  });

  const transactions = transactionsData?.transactions || [];

  // Handler for plan selection
  const handleSelectPlan = async (planId: string) => {
    console.log('🎯 [BILLING PAGE] Plan selected:', planId);

    if (planId === 'free') {
      console.log('ℹ️ [BILLING PAGE] Free plan selected, skipping checkout');
      return;
    }

    console.log('🎯 [BILLING PAGE] Setting checkout loading for:', planId);
    setCheckoutLoading(planId);
    try {
      console.log('🎯 [BILLING PAGE] Calling openCheckout for:', planId);
      await openCheckout(planId, 'monthly');
      console.log('🎯 [BILLING PAGE] openCheckout completed for:', planId);
    } catch (error) {
      console.error('❌ [BILLING PAGE] Error in handleSelectPlan:', error);
    } finally {
      console.log('🎯 [BILLING PAGE] Clearing checkout loading');
      setCheckoutLoading(null);
    }
  };

  // Handler for subscription cancellation
  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const success = await cancelSubscription();
      if (success) {
        setShowCancelDialog(false);
        // Refresh billing data to show cancellation status
        await refreshBilling();
      }
    } finally {
      setIsCancelling(false);
    }
  };

  // Handler for scrolling to plans section
  const handleUpgradeClick = () => {
    const plansSection = document.getElementById('plans-section');
    plansSection?.scrollIntoView({ behavior: 'smooth' });
  };

  // Loading state with skeletons
  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-10">
          <Skeleton className="h-9 w-72" />

          {/* Current Plan Skeleton */}
          <div className="card-elevated space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-5 w-52" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>

          {/* Usage Statistics Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-7 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-premium space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-5 w-48" />
          </div>

          {/* Available Plans Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-7 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-premium space-y-4 p-6">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-10 w-32" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-10 w-full rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Billing History Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-7 w-40" />
            <div className="card-premium space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </div>
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

        {/* Current Plan Section */}
        <CurrentPlanSection
          subscription={subscription}
          currentPlan={currentPlan}
          isActive={isActive}
          onCancelClick={() => setShowCancelDialog(true)}
          onUpgradeClick={handleUpgradeClick}
        />

        {/* Usage Statistics Section */}
        <UsageStatsSection usage={usage} />

        {/* Available Plans Section */}
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



        {/* Billing History Section */}
        <BillingHistorySection
          transactions={transactions}
          isLoading={isLoadingTransactions}
          isPaidSubscription={isPaidSubscription}
        />
      </motion.div>

      {/* Cancel Subscription Dialog */}
      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancelSubscription}
        isCancelling={isCancelling}
      />
    </MainLayout>
  );
};

export default Billing;
