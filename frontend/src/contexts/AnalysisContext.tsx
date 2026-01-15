/**
 * Analysis Context
 * 
 * Global state management for tracking active analyses.
 * Handles SSE connections for real-time progress updates.
 * Allows background processing while navigating between pages.
 */

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { analysisApi } from '@/services/api.service';
import type { ProgressUpdate, AnalysisStep } from '@/types/analysis';

// ============================================================================
// Types
// ============================================================================

export interface ActiveAnalysis {
  analysisId: string;
  videoUrl: string;
  step: AnalysisStep;
  progress: number;
  message: string;
  videoId?: string;
  videoTitle?: string;
  videoThumbnail?: string;
  commentsFetched?: number;
  totalComments?: number;
  error?: string;
  startedAt: Date;
}

interface AnalysisState {
  activeAnalyses: Map<string, ActiveAnalysis>;
  completedAnalysisIds: string[];
}

type AnalysisAction =
  | { type: 'START_ANALYSIS'; payload: { analysisId: string; videoUrl: string } }
  | { type: 'UPDATE_PROGRESS'; payload: ProgressUpdate }
  | { type: 'ANALYSIS_COMPLETED'; payload: { analysisId: string } }
  | { type: 'ANALYSIS_FAILED'; payload: { analysisId: string; error: string } }
  | { type: 'REMOVE_ANALYSIS'; payload: { analysisId: string } }
  | { type: 'CLEAR_COMPLETED' };

interface AnalysisContextValue {
  state: AnalysisState;
  startAnalysis: (videoUrl: string) => Promise<string>;
  getAnalysis: (analysisId: string) => ActiveAnalysis | undefined;
  isAnalyzing: (analysisId: string) => boolean;
  hasActiveAnalyses: boolean;
  clearCompleted: () => void;
}

// ============================================================================
// Context
// ============================================================================

const AnalysisContext = createContext<AnalysisContextValue | undefined>(undefined);

// ============================================================================
// Reducer
// ============================================================================

const initialState: AnalysisState = {
  activeAnalyses: new Map(),
  completedAnalysisIds: [],
};

function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case 'START_ANALYSIS': {
      // Clean up old completed/failed analyses
      const newAnalyses = new Map(
        Array.from(state.activeAnalyses.entries()).filter(
          ([_, analysis]) => analysis.step !== 'completed' && analysis.step !== 'failed'
        )
      );
      newAnalyses.set(action.payload.analysisId, {
        analysisId: action.payload.analysisId,
        videoUrl: action.payload.videoUrl,
        step: 'queued',
        progress: 0,
        message: 'Starting analysis...',
        startedAt: new Date(),
      });
      return { ...state, activeAnalyses: newAnalyses };
    }

    case 'UPDATE_PROGRESS': {
      const { analysis_id, ...update } = action.payload;
      const existing = state.activeAnalyses.get(analysis_id);
      if (!existing) return state;

      const newAnalyses = new Map(state.activeAnalyses);
      newAnalyses.set(analysis_id, {
        ...existing,
        step: update.step,
        progress: update.progress,
        message: update.step_label,
        videoId: update.video_id || existing.videoId,
        videoTitle: update.video_title || existing.videoTitle,
        videoThumbnail: update.video_thumbnail || existing.videoThumbnail,
        commentsFetched: update.comments_fetched ?? existing.commentsFetched,
        totalComments: update.total_comments ?? existing.totalComments,
        error: update.error,
      });
      return { ...state, activeAnalyses: newAnalyses };
    }

    case 'ANALYSIS_COMPLETED': {
      // Keep the analysis in activeAnalyses so pages can detect completion
      // It will be cleaned up when the user navigates away or on next START_ANALYSIS
      const existing = state.activeAnalyses.get(action.payload.analysisId);
      if (!existing) return state;

      const newAnalyses = new Map(state.activeAnalyses);
      // Mark as completed but keep in map
      newAnalyses.set(action.payload.analysisId, {
        ...existing,
        step: 'completed',
      });
      return {
        ...state,
        activeAnalyses: newAnalyses,
        completedAnalysisIds: [...state.completedAnalysisIds, action.payload.analysisId],
      };
    }

    case 'ANALYSIS_FAILED': {
      const existing = state.activeAnalyses.get(action.payload.analysisId);
      if (!existing) return state;

      const newAnalyses = new Map(state.activeAnalyses);
      newAnalyses.set(action.payload.analysisId, {
        ...existing,
        step: 'failed',
        error: action.payload.error,
      });
      return { ...state, activeAnalyses: newAnalyses };
    }

    case 'REMOVE_ANALYSIS': {
      const newAnalyses = new Map(state.activeAnalyses);
      newAnalyses.delete(action.payload.analysisId);
      return { ...state, activeAnalyses: newAnalyses };
    }

    case 'CLEAR_COMPLETED': {
      return { ...state, completedAnalysisIds: [] };
    }

    default:
      return state;
  }
}

// ============================================================================
// Provider
// ============================================================================

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(analysisReducer, initialState);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach((controller) => controller.abort());
    };
  }, []);

  const startAnalysis = useCallback(async (videoUrl: string): Promise<string> => {
    // Call the backend to start analysis
    const response = await analysisApi.startAnalysis(videoUrl);
    
    if (response.error) {
      throw new Error(response.error.detail);
    }

    if (!response.data) {
      throw new Error('No response data');
    }

    const { analysis_id: analysisId } = response.data;

    // Add to state
    dispatch({ type: 'START_ANALYSIS', payload: { analysisId, videoUrl } });

    // Start SSE subscription
    const abortController = new AbortController();
    abortControllersRef.current.set(analysisId, abortController);

    // Process SSE updates in background
    (async () => {
      try {
        for await (const update of analysisApi.subscribeToProgress(analysisId)) {
          if (abortController.signal.aborted) break;

          dispatch({ type: 'UPDATE_PROGRESS', payload: update });

          if (update.step === 'completed') {
            dispatch({ type: 'ANALYSIS_COMPLETED', payload: { analysisId } });
            break;
          }

          if (update.step === 'failed') {
            dispatch({
              type: 'ANALYSIS_FAILED',
              payload: { analysisId, error: update.error || 'Analysis failed' },
            });
            break;
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('SSE connection error:', error);
          dispatch({
            type: 'ANALYSIS_FAILED',
            payload: {
              analysisId,
              error: error instanceof Error ? error.message : 'Connection lost',
            },
          });
        }
      } finally {
        abortControllersRef.current.delete(analysisId);
      }
    })();

    return analysisId;
  }, []);

  const getAnalysis = useCallback(
    (analysisId: string): ActiveAnalysis | undefined => {
      return state.activeAnalyses.get(analysisId);
    },
    [state.activeAnalyses]
  );

  const isAnalyzing = useCallback(
    (analysisId: string): boolean => {
      const analysis = state.activeAnalyses.get(analysisId);
      return (
        !!analysis &&
        analysis.step !== 'completed' &&
        analysis.step !== 'failed'
      );
    },
    [state.activeAnalyses]
  );

  const hasActiveAnalyses = state.activeAnalyses.size > 0;

  const clearCompleted = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED' });
  }, []);

  const value: AnalysisContextValue = {
    state,
    startAnalysis,
    getAnalysis,
    isAnalyzing,
    hasActiveAnalyses,
    clearCompleted,
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}

// ============================================================================
// Helper Hook for Single Analysis
// ============================================================================

export function useActiveAnalysis(analysisId: string | null) {
  const { getAnalysis, isAnalyzing } = useAnalysis();

  if (!analysisId) {
    return { analysis: undefined, isActive: false };
  }

  return {
    analysis: getAnalysis(analysisId),
    isActive: isAnalyzing(analysisId),
  };
}
