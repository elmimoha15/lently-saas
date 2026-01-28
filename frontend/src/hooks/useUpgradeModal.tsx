/**
 * useUpgradeModal Hook
 * 
 * Centralized hook for managing the upgrade modal state and handling
 * quota exceeded errors (HTTP 402) from the backend.
 * 
 * This hook:
 * - Manages modal open/close state
 * - Stores context about which limit was hit
 * - Provides helper functions to show the modal
 * - Stores pending action for post-payment resume
 * - Can be triggered by API error interceptors
 */

import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
import type { LimitType } from '@/components/billing/UpgradeModal';

// ============================================================================
// Types
// ============================================================================

export interface PendingAction {
  type: 'analyze_video' | 'ask_ai';
  payload?: {
    videoUrl?: string;
    question?: string;
    videoId?: string;
  };
}

interface QuotaExceededInfo {
  limitType: LimitType;
  currentUsage?: number;
  currentLimit?: number;
  message?: string;
}

interface UpgradeModalContextType {
  // Modal state
  isOpen: boolean;
  quotaInfo: QuotaExceededInfo | null;
  
  // Pending action for post-payment resume
  pendingAction: PendingAction | null;
  
  // Actions
  showUpgradeModal: (info: QuotaExceededInfo, action?: PendingAction) => void;
  hideUpgradeModal: () => void;
  clearPendingAction: () => void;
  
  // Helper for handling API errors
  handleQuotaError: (error: unknown, action?: PendingAction) => boolean;
}

// ============================================================================
// Context
// ============================================================================

const UpgradeModalContext = createContext<UpgradeModalContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<QuotaExceededInfo | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Store pending action in sessionStorage for post-payment resume
  useEffect(() => {
    if (pendingAction) {
      sessionStorage.setItem('lently_pending_action', JSON.stringify(pendingAction));
    }
  }, [pendingAction]);

  // Check for pending action on mount (after payment redirect)
  useEffect(() => {
    const stored = sessionStorage.getItem('lently_pending_action');
    if (stored) {
      try {
        const action = JSON.parse(stored) as PendingAction;
        setPendingAction(action);
      } catch (e) {
        sessionStorage.removeItem('lently_pending_action');
      }
    }
  }, []);

  const showUpgradeModal = useCallback((info: QuotaExceededInfo, action?: PendingAction) => {
    setQuotaInfo(info);
    if (action) {
      setPendingAction(action);
    }
    setIsOpen(true);
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setIsOpen(false);
    // Clear quota info after animation
    setTimeout(() => setQuotaInfo(null), 300);
  }, []);

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
    sessionStorage.removeItem('lently_pending_action');
  }, []);

  /**
   * Handle a potential quota exceeded error from the backend.
   * Returns true if it was a quota error and the modal was shown.
   * 
   * Expected error format from backend:
   * {
   *   detail: {
   *     error: "quota_exceeded",
   *     message: "You've used all 1 video analyses this month",
   *     current: 1,
   *     limit: 1,
   *     action: "upgrade"
   *   }
   * }
   */
  const handleQuotaError = useCallback((error: unknown, action?: PendingAction): boolean => {
    // Parse error to check if it's a quota exceeded error
    let errorDetail: Record<string, unknown> | null = null;
    
    if (error && typeof error === 'object') {
      // Check for nested detail object (from API response)
      if ('detail' in error && error.detail && typeof error.detail === 'object') {
        errorDetail = error.detail as Record<string, unknown>;
      } else if ('error' in error) {
        errorDetail = error as Record<string, unknown>;
      }
    }
    
    // Also handle string error messages containing "quota_exceeded"
    const errorString = typeof error === 'string' ? error : 
      (error instanceof Error ? error.message : JSON.stringify(error));
    
    if (!errorDetail && errorString.includes('quota_exceeded')) {
      // Try to determine limit type from message
      let limitType: LimitType = 'videos';
      if (errorString.toLowerCase().includes('ai question') || errorString.toLowerCase().includes('question')) {
        limitType = 'ai_questions';
      } else if (errorString.toLowerCase().includes('comment')) {
        limitType = 'comments';
      }
      
      showUpgradeModal({ limitType, message: errorString }, action);
      return true;
    }
    
    if (!errorDetail || errorDetail.error !== 'quota_exceeded') {
      return false;
    }

    // Determine limit type from the message or context
    const message = String(errorDetail.message || '');
    let limitType: LimitType = 'videos';
    
    if (message.toLowerCase().includes('ai question') || message.toLowerCase().includes('question')) {
      limitType = 'ai_questions';
    } else if (message.toLowerCase().includes('comment')) {
      limitType = 'comments';
    } else if (message.toLowerCase().includes('video')) {
      limitType = 'videos';
    }

    showUpgradeModal({
      limitType,
      currentUsage: typeof errorDetail.current === 'number' ? errorDetail.current : undefined,
      currentLimit: typeof errorDetail.limit === 'number' ? errorDetail.limit : undefined,
      message,
    }, action);

    return true;
  }, [showUpgradeModal]);

  const value: UpgradeModalContextType = {
    isOpen,
    quotaInfo,
    pendingAction,
    showUpgradeModal,
    hideUpgradeModal,
    clearPendingAction,
    handleQuotaError,
  };

  return (
    <UpgradeModalContext.Provider value={value}>
      {children}
    </UpgradeModalContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useUpgradeModal(): UpgradeModalContextType {
  const context = useContext(UpgradeModalContext);
  
  if (context === undefined) {
    throw new Error('useUpgradeModal must be used within an UpgradeModalProvider');
  }
  
  return context;
}

// ============================================================================
// Helper: Parse API Error for Quota Exceeded
// ============================================================================

/**
 * Check if an API error response is a quota exceeded error (HTTP 402)
 * Returns the parsed error info if it is, null otherwise.
 */
export function parseQuotaError(error: unknown): QuotaExceededInfo | null {
  // Handle ApiError format { detail: string | object, status: number }
  if (error && typeof error === 'object' && 'status' in error) {
    const apiError = error as { status: number; detail: unknown };
    
    if (apiError.status === 402) {
      // Parse the detail
      if (typeof apiError.detail === 'object' && apiError.detail) {
        const detail = apiError.detail as Record<string, unknown>;
        
        const message = String(detail.message || '');
        let limitType: LimitType = 'videos';
        
        if (message.toLowerCase().includes('ai question') || message.toLowerCase().includes('question')) {
          limitType = 'ai_questions';
        } else if (message.toLowerCase().includes('comment')) {
          limitType = 'comments';
        }
        
        return {
          limitType,
          currentUsage: typeof detail.current === 'number' ? detail.current : undefined,
          currentLimit: typeof detail.limit === 'number' ? detail.limit : undefined,
          message,
        };
      }
      
      // Fallback for string detail
      if (typeof apiError.detail === 'string') {
        const message = apiError.detail;
        let limitType: LimitType = 'videos';
        
        if (message.toLowerCase().includes('ai question') || message.toLowerCase().includes('question')) {
          limitType = 'ai_questions';
        } else if (message.toLowerCase().includes('comment')) {
          limitType = 'comments';
        }
        
        return { limitType, message };
      }
    }
  }
  
  return null;
}

export default useUpgradeModal;
