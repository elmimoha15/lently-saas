/**
 * Analysis API Types
 * 
 * TypeScript types for the analysis pipeline API responses
 */

// ============================================================================
// Analysis Status & Progress
// ============================================================================

export type AnalysisStatus = 'processing' | 'completed' | 'failed';

export type AnalysisStep =
  | 'queued'
  | 'connecting'
  | 'fetching_video'
  | 'fetching_comments'
  | 'analyzing_sentiment'
  | 'classifying'
  | 'extracting_insights'
  | 'generating_summary'
  | 'saving'
  | 'completed'
  | 'failed';

export interface ProgressUpdate {
  analysis_id: string;
  status: string;
  step: AnalysisStep;
  step_label: string;
  progress: number;
  comments_fetched?: number;
  total_comments?: number;
  video_id?: string;
  video_title?: string;
  video_thumbnail?: string;
  error?: string;
  completed_at?: string;
}

export interface StartAnalysisResponse {
  analysis_id: string;
  status: string;
  message: string;
}

// ============================================================================
// Video & Analysis Data
// ============================================================================

export interface VideoInfo {
  video_id: string;
  title: string;
  channel_title: string;
  view_count: number;
  comment_count: number;
  thumbnail_url: string;
}

export interface SentimentSummary {
  positive_percentage: number;
  negative_percentage: number;
  neutral_percentage: number;
  mixed_percentage: number;
  dominant_sentiment: string;
  top_emotions: string[];
  sentiment_trend?: string;
}

export interface CommentSentiment {
  comment_id: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  emotion?: string;
}

export interface SentimentResult {
  summary: SentimentSummary;
  comments: CommentSentiment[];
}

export interface ClassificationSummary {
  category_counts: Record<string, number>;
  category_percentages: Record<string, number>;
  top_category: string;
  actionable_count: number;
}

export interface CommentClassification {
  comment_id: string;
  primary_category: string;
  secondary_category?: string;
  confidence: number;
}

export interface ClassificationResult {
  summary: ClassificationSummary;
  comments: CommentClassification[];
}

export interface KeyTheme {
  theme: string;
  mention_count: number;
  sentiment: string;
  example_comments: string[];
}

export interface ContentIdea {
  title: string;
  description: string;
  source_type: string;
  confidence: number;
  related_comments: string[];
}

export interface AudienceInsight {
  insight: string;
  evidence: string;
  action_item?: string;
}

export interface InsightsResult {
  key_themes: KeyTheme[];
  content_ideas: ContentIdea[];
  audience_insights: AudienceInsight[];
}

export interface ExecutiveSummary {
  summary_text: string;
  key_metrics: Record<string, unknown>;
  priority_actions: string[];
}

export interface StoredComment {
  comment_id: string;
  author: string;
  text: string;
  like_count: number;
  reply_count: number;
  sentiment?: string;
  category?: string;
  is_question?: boolean;
  is_feedback?: boolean;
}

// ============================================================================
// Full Analysis Response
// ============================================================================

export interface AnalysisResponse {
  analysis_id: string;
  video: VideoInfo;
  status: AnalysisStatus;
  created_at: string;
  completed_at?: string;
  comments_analyzed?: number;
  sentiment?: SentimentResult;
  classification?: ClassificationResult;
  insights?: InsightsResult;
  executive_summary?: ExecutiveSummary;
  stored_comments?: StoredComment[];
  error?: string;
}

// ============================================================================
// History
// ============================================================================

export interface AnalysisHistoryItem {
  analysis_id: string;
  video_id: string;
  video_title: string;
  video_thumbnail?: string;
  channel_title?: string;
  status: AnalysisStatus;
  created_at: string;
  completed_at?: string;
  comments_analyzed?: number;
  sentiment_summary?: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface AnalysisHistoryResponse {
  analyses: AnalysisHistoryItem[];
  count: number;
}

// ============================================================================
// Job Status (for polling)
// ============================================================================

export interface JobStatusResponse {
  analysis_id: string;
  step: AnalysisStep;
  progress: number;
  status?: string;
  video_id?: string;
  video_title?: string;
  video_thumbnail?: string;
  error?: string;
}

// ============================================================================
// Ask AI Types
// ============================================================================

export type ContextFilter = 'all' | 'positive' | 'negative' | 'questions' | 'feedback' | 'recent';

export interface AskQuestionRequest {
  question: string;
  video_id: string;
  context_filter?: ContextFilter;
  conversation_id?: string;
}

export interface SourceComment {
  comment_id: string;
  author: string;
  text: string;
  relevance: string;
}

export interface AskQuestionResponse {
  answer: string;
  confidence: number;
  sources: SourceComment[];
  key_points: string[];
  follow_up_questions: string[];
  conversation_id: string;
  questions_remaining: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ConversationSummary {
  conversation_id: string;
  video_id: string;
  question_count: number;
  created_at: string;
  updated_at: string;
  last_message: string;
}

export interface QuestionQuota {
  questions_used: number;
  questions_limit: number;
  questions_remaining: number;
  plan: string;
}

export interface QuestionSuggestions {
  video_id: string;
  suggestions: string[];
}
