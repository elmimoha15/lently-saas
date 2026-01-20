/**
 * Usage Statistics Section
 * Displays current usage for videos, AI questions, and comments
 */

import { motion } from 'framer-motion';
import { Video, BrainCircuit, MessageSquare, LucideIcon } from 'lucide-react';
import { UsageData } from '@/services/api.service';

interface UsageStatsSectionProps {
  usage: UsageData | null;
}

interface UsageStat {
  icon: LucideIcon;
  label: string;
  used: number;
  limit: number;
  color: string;
  isPerVideo?: boolean;
}

export const UsageStatsSection = ({ usage }: UsageStatsSectionProps) => {
  if (!usage) return null;

  const usageStats: UsageStat[] = [
    {
      icon: Video,
      label: 'Videos Analyzed',
      used: usage.videos_used,
      limit: usage.videos_limit,
      color: 'text-primary',
    },
    {
      icon: BrainCircuit,
      label: 'AI Questions',
      used: usage.ai_questions_used,
      limit: usage.ai_questions_limit,
      color: 'text-primary',
    },
    {
      icon: MessageSquare,
      label: 'Comments per Video',
      used: 0,
      limit: usage.comments_per_video_limit,
      color: 'text-primary',
      isPerVideo: true,
    },
  ];

  return (
    <section>
      <h2 className="text-xl font-semibold mb-6">Current Usage</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {usageStats.map((stat, index) => {
          const percentage = stat.isPerVideo ? 0 : Math.min((stat.used / stat.limit) * 100, 100);
          const isOverLimit = !stat.isPerVideo && stat.used >= stat.limit;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-premium"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ${stat.color}`}
                >
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
              </div>

              <div className="text-3xl font-bold mb-3">
                {stat.isPerVideo ? (
                  <>
                    <span className="text-lg text-muted-foreground font-normal">Up to </span>
                    {stat.limit.toLocaleString()}
                  </>
                ) : (
                  <>
                    {stat.used}
                    <span className="text-lg text-muted-foreground font-normal">/{stat.limit}</span>
                  </>
                )}
              </div>

              {!stat.isPerVideo && (
                <div className="progress-bar">
                  <motion.div
                    className={`progress-fill ${isOverLimit ? 'bg-destructive' : ''}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  />
                </div>
              )}

              {isOverLimit && (
                <p className="text-xs text-destructive mt-2 font-medium">Limit reached</p>
              )}
            </motion.div>
          );
        })}
      </div>
      {usage?.reset_date && (
        <p className="text-sm text-muted-foreground mt-4">
          Resets on:{' '}
          {new Date(usage.reset_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      )}
    </section>
  );
};
