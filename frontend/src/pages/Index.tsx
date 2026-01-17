import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp, MessageSquare, HelpCircle, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { getRecentVideos } from '@/data/videos';
import { UsageCard } from '@/components/dashboard/UsageCard';
import { VideoTable } from '@/components/dashboard/VideoTable';
import { useBilling } from '@/contexts/BillingContext';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { usage, isLoading: billingLoading, planName } = useBilling();
  const recentVideos = getRecentVideos(5);

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
                current={usage.videos_used}
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
              <UsageCard title="Videos Analyzed" current={0} limit={3} />
              <UsageCard title="AI Questions" current={0} limit={9} />
              <UsageCard title="Comments per Video" current={0} limit={300} isPerVideo={true} />
            </>
          )}
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
          <VideoTable videos={recentVideos} compact />
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-6">Quick Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickStatCard
              title="Total Comments This Month"
              value="2,090"
              icon={<MessageSquare className="w-6 h-6" />}
              accent
            />
            <QuickStatCard
              title="Average Sentiment"
              value="72%"
              icon={<TrendingUp className="w-6 h-6" />}
              trend={{ value: 5, isPositive: true }}
            />
            <QuickStatCard
              title="Most Common Question"
              value="When is next video?"
              icon={<HelpCircle className="w-6 h-6" />}
              isText
            />
          </div>
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

export default Dashboard;
