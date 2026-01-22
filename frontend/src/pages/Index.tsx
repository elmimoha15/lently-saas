import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp, MessageSquare, HelpCircle, Loader2, Video } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { UsageCard } from '@/components/dashboard/UsageCard';
import { VideoTable } from '@/components/dashboard/VideoTable';
import { useBilling } from '@/contexts/BillingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { analysisApi } from '@/services/api.service';
import type { AnalysisHistoryItem } from '@/types/analysis';

const Dashboard = () => {
  const { user } = useAuth();
  const { usage, isLoading: billingLoading, planName } = useBilling();

  // Fetch recent videos from API with periodic refetch for processing videos
  const { data: historyData, isLoading: videosLoading } = useQuery({
    queryKey: ['recentVideos'],
    queryFn: async () => {
      const response = await analysisApi.getHistory(5);
      if (response.error) {
        throw new Error(response.error.detail);
      }
      return response.data;
    },
    staleTime: 0,
    refetchInterval: (data) => {
      // If there are processing videos, poll every 2 seconds
      const hasProcessing = data?.analyses?.some((a: any) => a.status === 'processing');
      return hasProcessing ? 2000 : 30000; // 2s if processing, otherwise 30s
    },
  });

  // Convert history to Video format, including processing videos
  const recentVideos = (historyData?.analyses || []).map((item: AnalysisHistoryItem) => {
    const isProcessing = item.status === 'processing';
    return {
      id: item.analysis_id,
      title: item.video_title,
      channel: item.channel_title || 'Unknown Channel',
      channelVerified: false,
      thumbnail: item.video_thumbnail || 'https://via.placeholder.com/640x360?text=No+Thumbnail',
      commentCount: item.comments_analyzed || 0,
      publishedAt: item.created_at,
      analyzedAt: item.created_at,
      sentiment: {
        positive: item.sentiment_summary?.positive || 33,
        neutral: item.sentiment_summary?.neutral || 34,
        negative: item.sentiment_summary?.negative || 33,
      },
      categories: {
        questions: item.classification_summary?.questions || 0,
        praise: item.classification_summary?.praise || 0,
        complaints: item.classification_summary?.complaints || 0,
        suggestions: item.classification_summary?.suggestions || 0,
        spam: 0,
        general: 0,
      },
      topics: [],
      isProcessing: isProcessing,
      progress: isProcessing ? item.progress || 0 : undefined,
      videoId: item.video_id,
    };
  });

  // Calculate stats from actual data (excluding processing videos)
  const completedVideos = recentVideos.filter(v => !v.isProcessing);
  const stats = {
    totalComments: completedVideos.reduce((sum, v) => sum + v.commentCount, 0),
    avgSentiment: completedVideos.length > 0 
      ? Math.round(completedVideos.reduce((sum, v) => sum + v.sentiment.positive, 0) / completedVideos.length)
      : 0,
    totalVideos: completedVideos.length,
  };

  // Use actual completed videos count for the "Videos Analyzed" card
  const videosAnalyzedCount = usage?.videos_used || completedVideos.length;

  // Get user's display name
  const displayName = user?.profile?.displayName?.split(' ')[0] || 'there';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <MainLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-10"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {displayName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your videos
            </p>
          </div>
          <Link to="/analyze">
            <Button className="btn-primary flex items-center gap-2 h-12 px-6 text-base">
              <Sparkles className="w-5 h-5" />
              Analyze Video
            </Button>
          </Link>
        </motion.div>

        {/* Usage Cards - From Billing Context (Single Source of Truth) */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {billingLoading ? (
            // Loading state for usage cards
            <>
              <UsageCardSkeleton />
              <UsageCardSkeleton />
              <UsageCardSkeleton />
            </>
          ) : usage ? (
            <>
              <UsageCard
                title="Videos Analyzed"
                current={videosAnalyzedCount}
                limit={usage.videos_limit}
                resetDate={usage.reset_date || undefined}
              />
              <UsageCard
                title="AI Questions"
                current={usage.ai_questions_used}
                limit={usage.ai_questions_limit}
                resetDate={usage.reset_date || undefined}
              />
              <UsageCard
                title="Comments per Video"
                current={0}
                limit={usage.comments_per_video_limit}
                resetDate={usage.reset_date || undefined}
                isPerVideo={true}
              />
            </>
          ) : (
            // Fallback if no usage data
            <>
              <UsageCard title="Videos Analyzed" current={0} limit={1} />
              <UsageCard title="AI Questions" current={0} limit={2} />
              <UsageCard title="Comments per Video" current={0} limit={100} isPerVideo={true} />
            </>
          )}
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-6">This Month's Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickStatCard
              title="Total Videos Analyzed"
              value={stats.totalVideos.toString()}
              icon={<Video className="w-6 h-6" />}
              accent
            />
            <QuickStatCard
              title="Total Comments Reviewed"
              value={stats.totalComments.toLocaleString()}
              icon={<MessageSquare className="w-6 h-6" />}
            />
            <QuickStatCard
              title="Average Positive Sentiment"
              value={`${stats.avgSentiment}%`}
              icon={<TrendingUp className="w-6 h-6" />}
            />
          </div>
        </motion.div>

        {/* Recent Videos Table */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Videos</h2>
            <Link
              to="/videos"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
            >
              View All
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          {videosLoading ? (
            <VideoTableSkeleton />
          ) : recentVideos.length > 0 ? (
            <VideoTable videos={recentVideos} compact />
          ) : (
            <EmptyVideosState />
          )}
        </motion.div>
      </motion.div>
    </MainLayout>
  );
};

interface QuickStatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  isText?: boolean;
  accent?: boolean;
}

const QuickStatCard = ({ title, value, icon, trend, isText, accent }: QuickStatCardProps) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className={`card-premium relative overflow-hidden ${accent ? 'border-primary/20 bg-gradient-to-br from-primary/[0.02] to-transparent' : ''}`}
  >
    <div className={`mb-4 p-3 rounded-xl w-fit ${accent ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
      {icon}
    </div>
    <p className="text-sm text-muted-foreground mb-1">{title}</p>
    <div className="flex items-baseline gap-2">
      <span className={`font-bold ${isText ? 'text-lg' : 'text-3xl'} text-foreground`}>
        {value}
      </span>
      {trend && (
        <span className={`text-sm font-medium flex items-center gap-0.5 ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}%
        </span>
      )}
    </div>
    {accent && (
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full" />
    )}
  </motion.div>
);

// Loading skeleton for usage cards
const UsageCardSkeleton = () => (
  <div className="card-premium animate-pulse">
    <div className="h-4 bg-muted rounded w-1/2 mb-4" />
    <div className="h-8 bg-muted rounded w-3/4 mb-4" />
    <div className="h-2 bg-muted rounded w-full" />
  </div>
);

// Loading skeleton for video table
const VideoTableSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl animate-pulse">
        <div className="w-40 h-24 bg-muted rounded-lg"></div>
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-muted rounded-full"></div>
            <div className="h-6 w-16 bg-muted rounded-full"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Empty state for videos
const EmptyVideosState = () => (
  <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-border bg-card">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
      <Video className="w-8 h-8 text-primary" />
    </div>
    <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
    <p className="text-muted-foreground mb-4">
      Analyze your first video to see it here
    </p>
    <Link to="/analyze">
      <Button className="btn-primary flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Analyze Video
      </Button>
    </Link>
  </div>
);

export default Dashboard;
