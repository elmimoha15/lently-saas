import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare, CheckCircle, Loader2, AlertCircle, Check } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { SentimentChart } from '@/components/video/SentimentChart';
import { CategoryBreakdown } from '@/components/video/CategoryBreakdown';
import { TopicPills } from '@/components/video/TopicPills';
import { CommentCard } from '@/components/video/CommentCard';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analysisApi } from '@/services/api.service';
import { useActiveAnalysis } from '@/contexts/AnalysisContext';
import type { AnalysisResponse, AnalysisStep } from '@/types/analysis';

// Step labels for progress display
const STEP_LABELS: Record<AnalysisStep, string> = {
  queued: 'Queued for processing',
  connecting: 'Connecting to YouTube',
  fetching_video: 'Fetching video metadata',
  fetching_comments: 'Downloading comments',
  analyzing_sentiment: 'AI analyzing sentiment',
  classifying: 'Categorizing comments',
  extracting_insights: 'Extracting insights',
  generating_summary: 'Generating summary',
  saving: 'Saving results',
  completed: 'Analysis complete',
  failed: 'Analysis failed',
};

const VideoAnalysis = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  
  // Check if this analysis is currently active/processing
  const { analysis: activeAnalysis, isActive } = useActiveAnalysis(videoId || null);

  // Fetch analysis data from API
  const { data: analysisData, isLoading, error, refetch } = useQuery({
    queryKey: ['analysis', videoId],
    queryFn: async () => {
      if (!videoId) throw new Error('No video ID');
      const response = await analysisApi.getAnalysis(videoId);
      if (response.error) {
        throw new Error(response.error.detail);
      }
      return response.data;
    },
    enabled: !!videoId && !isActive, // Don't fetch while processing
    retry: 1,
  });

  // Refetch when active analysis completes
  useEffect(() => {
    if (activeAnalysis?.step === 'completed') {
      refetch();
    }
  }, [activeAnalysis?.step, refetch]);

  // Loading state
  if (isLoading && !isActive) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading analysis...</p>
        </div>
      </MainLayout>
    );
  }

  // Processing state (active analysis in progress)
  if (isActive && activeAnalysis) {
    return (
      <MainLayout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto py-12"
        >
          {/* Back Navigation */}
          <Link
            to="/videos"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group mb-8"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Videos
          </Link>

          {/* Video Info (if available) */}
          {activeAnalysis.videoTitle && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-card border border-border rounded-xl flex items-center gap-4"
            >
              {activeAnalysis.videoThumbnail && (
                <img
                  src={activeAnalysis.videoThumbnail}
                  alt={activeAnalysis.videoTitle}
                  className="w-32 h-20 object-cover rounded-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg truncate">{activeAnalysis.videoTitle}</h2>
                <p className="text-sm text-muted-foreground">
                  {activeAnalysis.totalComments?.toLocaleString() || '...'} comments
                </p>
              </div>
            </motion.div>
          )}

          {/* Progress Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              Analyzing... <span className="text-primary">{Math.round(activeAnalysis.progress)}%</span>
            </h1>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${activeAnalysis.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Current Step */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 text-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">
                {STEP_LABELS[activeAnalysis.step as AnalysisStep] || activeAnalysis.message}
              </span>
            </div>
            {activeAnalysis.step === 'fetching_comments' && activeAnalysis.commentsFetched && (
              <p className="text-sm text-muted-foreground mt-2 ml-8">
                Downloaded {activeAnalysis.commentsFetched} of {activeAnalysis.totalComments || '...'} comments
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center mt-6">
            You can navigate away - analysis will continue in the background
          </p>
        </motion.div>
      </MainLayout>
    );
  }

  // Error state
  if (error || !analysisData) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Analysis Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : 'This analysis could not be found.'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/videos')}>
              Back to Videos
            </Button>
            <Button onClick={() => navigate('/analyze')}>
              Analyze New Video
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Analysis data loaded successfully
  const video = analysisData.video;
  const sentiment = analysisData.sentiment;
  const classification = analysisData.classification;
  const insights = analysisData.insights;
  const executiveSummary = analysisData.executive_summary;
  const storedComments = analysisData.stored_comments || [];

  // Transform data for components
  const sentimentData = sentiment ? {
    positive: Math.round(sentiment.summary.positive_percentage),
    neutral: Math.round(sentiment.summary.neutral_percentage),
    negative: Math.round(sentiment.summary.negative_percentage),
  } : { positive: 33, neutral: 34, negative: 33 };

  const categories = classification ? {
    questions: classification.summary.category_counts['question'] || 0,
    praise: classification.summary.category_counts['appreciation'] || classification.summary.category_counts['praise'] || 0,
    complaints: classification.summary.category_counts['complaint'] || 0,
    suggestions: classification.summary.category_counts['suggestion'] || 0,
    spam: classification.summary.category_counts['spam'] || 0,
    general: classification.summary.category_counts['discussion'] || classification.summary.category_counts['other'] || 0,
  } : { questions: 0, praise: 0, complaints: 0, suggestions: 0, spam: 0, general: 0 };

  const topics = insights?.key_themes?.slice(0, 8).map(t => t.theme) || [];

  // Filter comments
  const filteredComments = activeFilter === 'All'
    ? storedComments
    : storedComments.filter((c) => c.category?.toLowerCase() === activeFilter.toLowerCase());

  const filterOptions = ['All', 'Questions', 'Praise', 'Complaints', 'Suggestions'];

  const daysSinceAnalysis = Math.ceil(
    (new Date().getTime() - new Date(analysisData.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-10"
      >
        {/* Back Navigation */}
        <Link
          to="/videos"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Videos
        </Link>

        {/* Executive Summary */}
        {executiveSummary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-premium bg-gradient-to-r from-primary/5 to-transparent border-primary/20"
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>✨</span> Executive Summary
            </h3>
            <p className="text-foreground leading-relaxed">{executiveSummary.summary_text}</p>
            {executiveSummary.priority_actions && executiveSummary.priority_actions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Priority Actions:</h4>
                <ul className="space-y-1">
                  {executiveSummary.priority_actions.slice(0, 3).map((action, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {/* Video Header */}
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-[400px] flex-shrink-0">
            <div className="aspect-video rounded-xl overflow-hidden">
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{video.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <span>by {video.channel_title}</span>
              <CheckCircle className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {(analysisData.comments_analyzed || 0).toLocaleString()} comments analyzed • {video.view_count.toLocaleString()} views • Analyzed {daysSinceAnalysis} day{daysSinceAnalysis !== 1 ? 's' : ''} ago
            </p>

            <Link to={`/ai/${analysisData.analysis_id}`} className="mt-6 block">
              <Button className="btn-primary flex items-center gap-2 w-full lg:w-auto">
                <MessageSquare className="w-5 h-5" />
                💬 Ask AI About This Video
              </Button>
            </Link>
          </div>
        </div>

        {/* Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card-premium">
            <h3 className="text-lg font-semibold mb-6">Sentiment Breakdown</h3>
            <SentimentChart sentiment={sentimentData} />
          </div>
          <div className="card-premium">
            <h3 className="text-lg font-semibold mb-6">Category Breakdown</h3>
            <CategoryBreakdown categories={categories} />
          </div>
        </div>

        {/* Top Topics */}
        {topics.length > 0 && (
          <div className="card-premium">
            <h3 className="text-lg font-semibold mb-4">Top Topics Discussed</h3>
            <TopicPills topics={topics} />
          </div>
        )}

        {/* Audience Insights */}
        {insights?.audience_insights && insights.audience_insights.length > 0 && (
          <div className="card-premium">
            <h3 className="text-lg font-semibold mb-4">Audience Insights</h3>
            <div className="space-y-4">
              {insights.audience_insights.slice(0, 5).map((insight, i) => (
                <div key={i} className="p-4 bg-background-secondary rounded-lg">
                  <p className="font-medium">{insight.insight}</p>
                  {insight.evidence && (
                    <p className="text-sm text-muted-foreground mt-1">{insight.evidence}</p>
                  )}
                  {insight.action_item && (
                    <p className="text-sm text-primary mt-2 flex items-center gap-2">
                      <span>💡</span> {insight.action_item}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Ideas */}
        {insights?.content_ideas && insights.content_ideas.length > 0 && (
          <div className="card-premium">
            <h3 className="text-lg font-semibold mb-4">Content Ideas from Comments</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {insights.content_ideas.slice(0, 4).map((idea, i) => (
                <div key={i} className="p-4 bg-background-secondary rounded-lg">
                  <h4 className="font-medium">{idea.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{idea.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Source: {idea.source_type} • Confidence: {Math.round((idea.confidence || 0.7) * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        {storedComments.length > 0 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold">
                Comments ({(analysisData.comments_analyzed || 0).toLocaleString()})
              </h2>
              <div className="flex gap-1 flex-wrap">
                {filterOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setActiveFilter(option)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      activeFilter === option
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredComments.slice(0, 20).map((comment, index) => (
                <motion.div
                  key={comment.comment_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-4 bg-card border border-border rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {comment.author[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{comment.author}</span>
                        {comment.sentiment && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            comment.sentiment === 'positive' ? 'bg-success/10 text-success' :
                            comment.sentiment === 'negative' ? 'bg-destructive/10 text-destructive' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {comment.sentiment}
                          </span>
                        )}
                        {comment.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {comment.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-1">{comment.text}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>👍 {comment.like_count}</span>
                        <span>💬 {comment.reply_count} replies</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredComments.length > 20 && (
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Showing 20 of {filteredComments.length} comments
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </MainLayout>
  );
};

export default VideoAnalysis;
