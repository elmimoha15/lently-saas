import { motion } from 'framer-motion';
import { Video, MessageSquare, BarChart3 } from 'lucide-react';

interface UsageCardProps {
  title: string;
  current: number;
  limit: number;
  resetDate: string;
  showWarning?: boolean;
}

const getIcon = (title: string) => {
  if (title.includes('Video')) return Video;
  if (title.includes('AI')) return MessageSquare;
  return BarChart3;
};

export const UsageCard = ({ title, current, limit, resetDate, showWarning }: UsageCardProps) => {
  const percentage = Math.min((current / limit) * 100, 100);
  const isOverLimit = current > limit;
  const Icon = getIcon(title);
  
  const daysUntilReset = Math.ceil(
    (new Date(resetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="card-premium relative overflow-hidden"
    >
      {/* Icon background accent */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/5 rounded-full" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
        </div>
        
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${isOverLimit ? 'text-warning' : 'text-foreground'}`}>
            {current}
          </span>
          <span className="text-lg text-muted-foreground">/{limit}</span>
        </div>
        
        <div className="mt-4">
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                background: isOverLimit
                  ? 'linear-gradient(90deg, hsl(38, 92%, 50%), hsl(28, 92%, 45%))'
                  : undefined,
              }}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          {isOverLimit ? (
            <span className="text-warning font-medium">Over limit on last video</span>
          ) : (
            `Resets in ${daysUntilReset} days`
          )}
        </p>
      </div>
    </motion.div>
  );
};
