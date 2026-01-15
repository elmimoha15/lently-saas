/**
 * API Client Service
 * 
 * Centralized API client for communicating with the Lently backend.
 * Automatically attaches Firebase auth tokens to requests.
 */

import { auth } from '@/lib/firebase';
import type {
  StartAnalysisResponse,
  AnalysisResponse,
  AnalysisHistoryResponse,
  JobStatusResponse,
  ProgressUpdate,
} from '@/types/analysis';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================================
// Types
// ============================================================================

export interface ApiError {
  detail: string;
  status: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

// ============================================================================
// Auth Token Helper
// ============================================================================

/**
 * Get the current user's Firebase ID token
 * Returns null if user is not authenticated
 */
const getAuthToken = async (): Promise<string | null> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }

  try {
    // Force refresh to ensure token is valid
    return await currentUser.getIdToken(true);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// ============================================================================
// API Client
// ============================================================================

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    requiresAuth = true,
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth token if required
  if (requiresAuth) {
    const token = await getAuthToken();
    if (!token) {
      return {
        error: {
          detail: 'Authentication required',
          status: 401,
        },
      };
    }
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle non-OK responses
    if (!response.ok) {
      let errorDetail = 'An error occurred';
      
      try {
        const errorBody = await response.json();
        errorDetail = errorBody.detail || errorBody.message || errorDetail;
      } catch {
        // Response body is not JSON
        errorDetail = response.statusText || errorDetail;
      }

      return {
        error: {
          detail: errorDetail,
          status: response.status,
        },
      };
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return { data: undefined };
    }

    // Parse JSON response
    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('API request error:', error);
    return {
      error: {
        detail: 'Network error. Please check your connection.',
        status: 0,
      },
    };
  }
}

// ============================================================================
// API Methods
// ============================================================================

export const api = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  /**
   * POST request
   */
  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

  /**
   * PUT request
   */
  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

// ============================================================================
// Specific API Endpoints
// ============================================================================

export const userApi = {
  /**
   * Get current user profile from backend
   */
  getProfile: () => api.get<{
    uid: string;
    email: string;
    display_name: string;
    photo_url: string;
    plan: string;
    quota: {
      videos_analyzed: number;
      videos_limit: number;
      ai_questions: number;
      ai_questions_limit: number;
    };
  }>('/api/user/me'),

  /**
   * Get user quota/usage
   */
  getQuota: () => api.get<{
    videos_analyzed_this_month: number;
    videos_limit: number;
    ai_questions_this_month: number;
    ai_questions_limit: number;
    plan: string;
    reset_date: string;
  }>('/api/user/quota'),
};

export const analysisApi = {
  /**
   * Start a new video analysis (returns immediately with analysis_id)
   */
  startAnalysis: (videoUrl: string, options?: {
    maxComments?: number;
    includeSentiment?: boolean;
    includeClassification?: boolean;
    includeInsights?: boolean;
    includeSummary?: boolean;
  }) => api.post<StartAnalysisResponse>('/api/analysis/start', {
    video_url_or_id: videoUrl,
    max_comments: options?.maxComments || 500,
    include_sentiment: options?.includeSentiment ?? true,
    include_classification: options?.includeClassification ?? true,
    include_insights: options?.includeInsights ?? true,
    include_summary: options?.includeSummary ?? true,
  }),

  /**
   * Get current job status (for polling or reconnection)
   */
  getJobStatus: (analysisId: string) =>
    api.get<JobStatusResponse>(`/api/analysis/job/${analysisId}`),

  /**
   * Get completed analysis results
   */
  getAnalysis: (analysisId: string) =>
    api.get<AnalysisResponse>(`/api/analysis/${analysisId}`),

  /**
   * Get user's analysis history
   */
  getHistory: (limit?: number) =>
    api.get<AnalysisHistoryResponse>(`/api/analysis/history${limit ? `?limit=${limit}` : ''}`),

  /**
   * Subscribe to analysis progress via SSE
   * Returns an async iterator of progress updates
   */
  subscribeToProgress: async function* (analysisId: string): AsyncGenerator<ProgressUpdate, void, unknown> {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const url = `${API_BASE_URL}/api/analysis/progress/${analysisId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to connect to progress stream: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data as ProgressUpdate;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};

export const askAiApi = {
  /**
   * Ask a question about video comments
   */
  askQuestion: (
    videoId: string, 
    question: string, 
    contextFilter: 'all' | 'positive' | 'negative' | 'questions' | 'feedback' = 'all',
    conversationId?: string
  ) =>
    api.post<{
      answer: string;
      confidence: number;
      sources: Array<{ comment_id: string; author: string; text: string; relevance: string }>;
      key_points: string[];
      follow_up_questions: string[];
      conversation_id: string;
      questions_remaining: number;
    }>('/api/ask/question', {
      video_id: videoId,
      question,
      context_filter: contextFilter,
      conversation_id: conversationId,
    }),

  /**
   * Get conversation history list
   */
  getConversations: (limit: number = 10) => 
    api.get<{
      conversations: Array<{
        conversation_id: string;
        video_id: string;
        question_count: number;
        created_at: string;
        updated_at: string;
        last_message: string;
      }>;
      count: number;
    }>(`/api/ask/conversations?limit=${limit}`),

  /**
   * Get full conversation history
   */
  getConversation: (conversationId: string) =>
    api.get<{
      conversation_id: string;
      video_id: string;
      messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: string;
      }>;
      question_count: number;
      created_at: string;
      updated_at: string;
    }>(`/api/ask/conversation/${conversationId}`),

  /**
   * Get question suggestions for a video
   */
  getSuggestions: (videoId: string) => 
    api.get<{
      video_id: string;
      suggestions: string[];
    }>(`/api/ask/suggestions/${videoId}`),

  /**
   * Get user's question quota
   */
  getQuota: () =>
    api.get<{
      questions_used: number;
      questions_limit: number;
      questions_remaining: number;
      plan: string;
    }>('/api/ask/quota'),
};

export default api;
