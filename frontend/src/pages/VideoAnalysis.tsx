import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle, Loader2, MessageSquare, Lightbulb, Video } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { HeroInsightSection } from '@/components/video/HeroInsightSection';
import { SentimentChart } from '@/components/video/SentimentChart';
import { CategoryBreakdown } from '@/components/video/CategoryBreakdown';
import { TopicPills } from '@/components/video/TopicPills';
import { CommentsExplorer } from '@/components/video/CommentsExplorer';
import { AnalysisProgressDisplay } from '@/components/video/AnalysisProgressDisplay';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analysisApi } from '@/services/api.service';
import { useActiveAnalysis } from '@/contexts/AnalysisContext';
import type { AnalysisStep } from '@/types/analysis';

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

  const daysSinceAnalysis = Math.ceil(
    (new Date().getTime() - new Date(analysisData.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto space-y-12 pb-20"
      >
        {/* Back Navigation - Minimal Apple Style */}
        <Link
          to="/videos"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Videos
        </Link>

        {/* Hero Insight - Primary Focus */}
        <HeroInsightSection
          executiveSummary={executiveSummary}
          sentimentData={sentimentData}
          categories={categories}
          commentsAnalyzed={analysisData.comments_analyzed || 0}
        />

        {/* Video Description with Thumbnail - Clean Apple Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          <div className="md:flex">
            {/* Thumbnail */}
            <div className="md:w-[420px] flex-shrink-0 bg-muted">
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-cover aspect-video md:aspect-auto md:min-h-[280px]"
              />
            </div>
            
            {/* Video Info */}
            <div className="p-8 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight mb-3">
                {video.title}
              </h1>
              <p className="text-muted-foreground mb-6">
                {video.channel_title}
              </p>
              
              {/* Stats - Minimal */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
                <span>{video.view_count.toLocaleString()} views</span>
                <span>•</span>
                <span>{video.comment_count.toLocaleString()} comments</span>
                <span>•</span>
                <span>{(analysisData.comments_analyzed || 0).toLocaleString()} analyzed</span>
              </div>

              {/* Ask AI Button - Prominent */}
              <Link to={`/ai/${video.video_id}`}>
                <Button size="lg" className="rounded-full px-6">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask AI About This Video
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Sentiment & Next Video Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-8"
        >
          {/* Sentiment Analysis - Circular Chart */}
          <div className="bg-card rounded-2xl border border-border p-8">
            <h2 className="text-2xl font-semibold mb-6">Sentiment Overview</h2>
            <SentimentChart sentiment={sentimentData} />
          </div>

          {/* Your Next Video - List Format */}
          {insights?.content_ideas && insights.content_ideas.length > 0 && (
            <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-2xl border border-primary/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Your Next Video</h2>
                  <p className="text-sm text-muted-foreground">Based on viewer requests</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {insights.content_ideas.slice(0, 4).map((idea, i) => (
                  <div 
                    key={i}
                    className="flex gap-4 p-4 rounded-xl border border-border bg-background/50 hover:bg-background transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                        i === 0 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {i + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1 leading-tight">{idea.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{idea.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Category Breakdown & Topics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 gap-8"
        >
          <div>
            <CategoryBreakdown categories={categories} />
          </div>
          {topics.length > 0 && (
            <div className="card-premium">
              <h3 className="text-lg font-semibold mb-4">Key Discussion Topics</h3>
              <TopicPills topics={topics} />
            </div>
          )}
        </motion.div>

        {/* Explore All Comments */}
        {storedComments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-semibold mb-6">Explore Comments</h2>
            <CommentsExplorer comments={storedComments} />
          </motion.div>
        )}
      </motion.div>
    </MainLayout>
  );
};

export default VideoAnalysis;
