/**
 * Prefetch Hook
 * 
 * Prefetches key data when user logs in so navigation is instant.
 * This runs once on app load and populates the React Query cache.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { analysisApi, askAiApi, billingApi } from '@/services/api.service';

export const usePrefetch = () => {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Prefetch key data in parallel when user is authenticated
    const prefetchData = async () => {
      console.log('🚀 Prefetching app data for faster navigation...');

      // Prefetch all key data in parallel
      await Promise.allSettled([
        // Analysis history (used by Dashboard, Videos, Ask AI)
        queryClient.prefetchQuery({
          queryKey: ['analysisHistory'],
          queryFn: async () => {
            const response = await analysisApi.getHistory(50);
            if (response.error) throw new Error(response.error.detail);
            return response.data;
          },
          staleTime: 5 * 60 * 1000,
        }),

        // Recent videos for dashboard
        queryClient.prefetchQuery({
          queryKey: ['recentVideos'],
          queryFn: async () => {
            const response = await analysisApi.getHistory(5);
            if (response.error) throw new Error(response.error.detail);
            return response.data;
          },
          staleTime: 5 * 60 * 1000,
        }),

        // Conversations for Ask AI
        queryClient.prefetchQuery({
          queryKey: ['conversations'],
          queryFn: async () => {
            const response = await askAiApi.getConversations(50);
            if (response.error) return null;
            return response.data;
          },
          staleTime: 10 * 60 * 1000,
        }),

        // Billing transactions (optional, lower priority)
        queryClient.prefetchQuery({
          queryKey: ['transactions'],
          queryFn: async () => {
            const response = await billingApi.getTransactions(20);
            if (response.error) throw new Error(response.error.detail);
            return response.data;
          },
          staleTime: 5 * 60 * 1000,
        }),
      ]);

      console.log('✅ Prefetch complete - app data cached');
    };

    prefetchData();
  }, [isAuthenticated, user, queryClient]);
};
