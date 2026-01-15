import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp, MessageSquare, HelpCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { currentUser } from '@/data/users';
import { getRecentVideos } from '@/data/videos';
import { UsageCard } from '@/components/dashboard/UsageCard';
import { VideoTable } from '@/components/dashboard/VideoTable';

const Dashboard = () => {
  const user = currentUser;
  const recentVideos = getRecentVideos(5);

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
              Welcome back, {user.name.split(' ')[0]}! 👋
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

        {/* Usage Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UsageCard
            title="Videos Analyzed"
            current={user.usage.videosAnalyzed}
            limit={user.usage.videosLimit}
            resetDate={user.usage.resetDate}
          />
          <UsageCard
            title="AI Questions"
            current={user.usage.aiQuestions}
            limit={user.usage.aiQuestionsLimit}
            resetDate={user.usage.resetDate}
          />
          <UsageCard
            title="Comments Analyzed"
            current={user.usage.commentsAnalyzed}
            limit={user.usage.commentsLimit}
            resetDate={user.usage.resetDate}
            showWarning={user.usage.commentsAnalyzed > user.usage.commentsLimit}
          />
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

export default Dashboard;
