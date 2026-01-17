/**
 * Billing Context - SINGLE SOURCE OF TRUTH for billing and usage data
 * 
 * This context provides consistent billing/usage data across:
 * - Dashboard
 * - Billing page
 * - Onboarding
 * - Ask AI
 * - Video analysis
 * 
 * All components MUST use this context for billing data.
 * DO NOT fetch billing data directly in components.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { billingApi, BillingInfo, UsageData, SubscriptionData, PlanData, QuotaCheckResult } from '@/services/api.service';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// =============================================================================
// Types
// =============================================================================

interface BillingContextType {
  // Billing data (from backend - source of truth)
  billingInfo: BillingInfo | null;
  isLoading: boolean;
  error: Error | null;
  
  // Convenient accessors
  usage: UsageData | null;
  subscription: SubscriptionData | null;
  plans: PlanData[];
  currentPlan: PlanData | null;
  
  // Actions
  refreshBilling: () => Promise<void>;
  checkQuota: (type: 'videos' | 'comments' | 'ai_questions', amount?: number) => Promise<QuotaCheckResult | null>;
  openCheckout: (planId: string, billingCycle?: 'monthly' | 'yearly') => Promise<void>;
  cancelSubscription: () => Promise<boolean>;
  
  // UI helpers
  canAnalyzeVideo: boolean;
  canAskQuestion: boolean;
  videosRemaining: number;
  questionsRemaining: number;
  commentsLimit: number;
  planName: string;
  isPaidPlan: boolean;
  
  // Paddle
  isPaddleReady: boolean;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

// =============================================================================
// Paddle.js Initialization
// =============================================================================

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (env: 'sandbox' | 'production') => void;
      };
      Initialize: (options: { token: string; eventCallback?: (event: PaddleEvent) => void }) => void;
      Checkout: {
        open: (options: {
          items: Array<{ priceId: string; quantity?: number }>;
          customer?: { email?: string };
          customData?: Record<string, string>;
          settings?: { successUrl?: string };
        }) => void;
      };
    };
    __LENTLY_CHECKOUT_PENDING__?: boolean;
    __LENTLY_CHECKOUT_PLAN_ID__?: string;
  }
}

// Paddle event types
interface PaddleEvent {
  name: string;
  data?: {
    status?: string;
    transaction_id?: string;
    customer?: { id: string; email: string };
  };
}

const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || 'test_4d9558f1be8f4a68e6268fcfa0a';
const PADDLE_ENVIRONMENT = (import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

// =============================================================================
// Provider Component
// =============================================================================

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPaddleReady, setIsPaddleReady] = useState(false);
  
  // Fetch billing info from backend (single source of truth) - MUST be defined first
  const {
    data: billingInfo,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['billing', user?.uid],
    queryFn: async () => {
      const response = await billingApi.getBillingInfo();
      if (response.error) {
        throw new Error(response.error.detail);
      }
      return response.data || null;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchOnWindowFocus: true,
    retry: 2,
  });
  
  // Initialize Paddle.js with global event handler
  useEffect(() => {
    // Check if already loaded and initialized
    if (window.Paddle && isPaddleReady) {
      return;
    }
    
    // Function to handle payment success - waits for webhook then reloads
    const onPaymentSuccess = async () => {
      console.log('🎉 Payment success detected! Waiting for webhook processing...');
      
      toast({
        title: '✅ Payment successful!',
        description: 'Upgrading your plan...',
      });
      
      // Wait for Paddle webhook to hit backend and update Firestore
      // Webhook flow: Paddle → Backend → Firestore
      // We just need to wait and reload to get fresh data
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('Reloading page to fetch updated plan from Firestore...');
      window.location.reload();
    };
    
    const initPaddle = async () => {
      // Check if already loaded
      if (window.Paddle) {
        setIsPaddleReady(true);
        return;
      }
      
      // Load Paddle.js script
      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      
      script.onload = () => {
        if (window.Paddle) {
          window.Paddle.Environment.set(PADDLE_ENVIRONMENT);
          window.Paddle.Initialize({
            token: PADDLE_CLIENT_TOKEN,
            eventCallback: (event: PaddleEvent) => {
              console.log('🔔 Paddle Event:', event.name, event.data);
              
              // Detect successful checkout completion
              if (event.name === 'checkout.completed') {
                console.log('✅ Checkout completed event received!');
                window.__LENTLY_CHECKOUT_PENDING__ = false;
                onPaymentSuccess();
              }
              
              if (event.name === 'checkout.closed') {
                console.log('Checkout closed');
                window.__LENTLY_CHECKOUT_PENDING__ = false;
              }
            }
          });
          setIsPaddleReady(true);
        }
      };
      
      document.body.appendChild(script);
    };
    
    initPaddle();
  }, [isPaddleReady, queryClient, toast]);
  
  // Convenient accessors
  const usage = billingInfo?.usage || null;
  const subscription = billingInfo?.subscription || null;
  const plans = billingInfo?.available_plans || [];
  
  const currentPlan = useMemo(() => {
    if (!subscription || !plans.length) return null;
    return plans.find(p => p.id === subscription.plan_id) || null;
  }, [subscription, plans]);
  
  // UI helper values
  const canAnalyzeVideo = (usage?.videos_remaining ?? 0) > 0;
  const canAskQuestion = (usage?.ai_questions_remaining ?? 0) > 0;
  const videosRemaining = usage?.videos_remaining ?? 0;
  const questionsRemaining = usage?.ai_questions_remaining ?? 0;
  const commentsLimit = usage?.comments_per_video_limit ?? 300;
  const planName = subscription?.plan_name ?? 'Free';
  const isPaidPlan = subscription?.plan_id !== 'free';
  
  // Refresh billing data
  const refreshBilling = useCallback(async () => {
    await refetch();
  }, [refetch]);
  
  // Check quota before an action
  const checkQuota = useCallback(async (
    type: 'videos' | 'comments' | 'ai_questions',
    amount: number = 1
  ): Promise<QuotaCheckResult | null> => {
    try {
      const response = await billingApi.checkQuota(type, amount);
      if (response.error) {
        console.error('Quota check error:', response.error);
        return null;
      }
      return response.data || null;
    } catch (error) {
      console.error('Quota check error:', error);
      return null;
    }
  }, []);
  
  // Open Paddle checkout
  const openCheckout = useCallback(async (
    planId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ) => {
    if (!isPaddleReady || !window.Paddle) {
      toast({
        title: 'Payment system loading',
        description: 'Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Get checkout data from backend
      const response = await billingApi.createCheckout(planId, billingCycle);
      
      if (response.error) {
        throw new Error(response.error.detail);
      }
      
      if (!response.data) {
        throw new Error('No checkout data returned');
      }
      
      const { price_id, customer_email } = response.data;
      
      console.log('Opening Paddle checkout with:', { price_id, customer_email, planId });
      
      // Store the plan being purchased so event handler can access it
      window.__LENTLY_CHECKOUT_PLAN_ID__ = planId;
      // Mark that checkout is pending - global event handler will catch the result
      window.__LENTLY_CHECKOUT_PENDING__ = true;
      
      // Open Paddle checkout as overlay modal
      // Using Paddle's global eventCallback instead of inline callbacks for better reliability
      window.Paddle.Checkout.open({
        items: [{ priceId: price_id, quantity: 1 }],
        customer: { email: customer_email },
        customData: { userId: user?.uid || '' },
        settings: {
          successUrl: window.location.href,
        },
      });
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  }, [isPaddleReady, user?.uid, toast]);
  
  // Cancel subscription
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const response = await billingApi.cancelSubscription(true);
      
      if (response.error) {
        throw new Error(response.error.detail);
      }
      
      await refreshBilling();
      
      toast({
        title: 'Subscription cancelled',
        description: 'Your subscription will end at the end of the billing period.',
      });
      
      return true;
    } catch (error) {
      console.error('Cancel error:', error);
      toast({
        title: 'Cancellation failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
      return false;
    }
  }, [refreshBilling, toast]);
  
  const value: BillingContextType = {
    billingInfo: billingInfo || null,
    isLoading,
    error: error as Error | null,
    usage,
    subscription,
    plans,
    currentPlan,
    refreshBilling,
    checkQuota,
    openCheckout,
    cancelSubscription,
    canAnalyzeVideo,
    canAskQuestion,
    videosRemaining,
    questionsRemaining,
    commentsLimit,
    planName,
    isPaidPlan,
    isPaddleReady,
  };
  
  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
};

// =============================================================================
// Hook
// =============================================================================

export const useBilling = (): BillingContextType => {
  const context = useContext(BillingContext);
  
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  
  return context;
};

// =============================================================================
// Helper Hook for Quota Enforcement
// =============================================================================

interface QuotaEnforcementResult {
  canProceed: boolean;
  remaining: number;
  limit: number;
  used: number;
  message: string | null;
  showUpgradePrompt: () => void;
}

export const useQuotaEnforcement = (
  type: 'videos' | 'ai_questions',
): QuotaEnforcementResult => {
  const { usage, openCheckout } = useBilling();
  const { toast } = useToast();
  
  const getValues = () => {
    if (!usage) {
      return { remaining: 0, limit: 0, used: 0 };
    }
    
    if (type === 'videos') {
      return {
        remaining: usage.videos_remaining,
        limit: usage.videos_limit,
        used: usage.videos_used,
      };
    }
    
    return {
      remaining: usage.ai_questions_remaining,
      limit: usage.ai_questions_limit,
      used: usage.ai_questions_used,
    };
  };
  
  const { remaining, limit, used } = getValues();
  const canProceed = remaining > 0;
  
  const message = !canProceed
    ? type === 'videos'
      ? `You've used all ${limit} video analyses this month. Upgrade to continue.`
      : `You've used all ${limit} AI questions this month. Upgrade to continue.`
    : null;
  
  const showUpgradePrompt = useCallback(() => {
    toast({
      title: 'Upgrade required',
      description: message || 'Upgrade your plan to continue.',
    });
    // Redirect to billing page for upgrade
    window.location.href = '/billing';
  }, [message, toast]);
  
  return {
    canProceed,
    remaining,
    limit,
    used,
    message,
    showUpgradePrompt,
  };
};
