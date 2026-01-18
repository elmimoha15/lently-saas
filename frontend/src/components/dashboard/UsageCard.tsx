import { motion } from 'framer-motion';
import { Video, MessageSquare, BarChart3, BrainCircuit } from 'lucide-react';

interface UsageCardProps {
  title: string;
  current: number;
  limit: number;
  resetDate?: string;
  showWarning?: boolean;
  isPerVideo?: boolean;
}

const getIcon = (title: string) => {
  if (title.includes('Video')) return Video;
  if (title.includes('AI') || title.includes('Question')) return BrainCircuit;
  if (title.includes('Comment')) return MessageSquare;
  return BarChart3;
};

export const UsageCard = ({ title, current, limit, resetDate, showWarning, isPerVideo }: UsageCardProps) => {
  const percentage = isPerVideo ? 0 : Math.min((current / limit) * 100, 100);
  const isOverLimit = !isPerVideo && current >= limit;
  const Icon = getIcon(title);
  
  const daysUntilReset = resetDate 
    ? Math.ceil((new Date(resetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="card-premium relative overflow-hidden"
    >
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
        </div>
        
        <div className="flex items-baseline gap-1">
          {isPerVideo ? (
            <>
              <span className="text-lg text-muted-foreground">Up to</span>
              <span className="text-3xl font-bold text-foreground ml-1">
                {limit.toLocaleString()}
              </span>
            </>
          ) : (
            <>
              <span className={`text-3xl font-bold ${isOverLimit ? 'text-destructive' : 'text-foreground'}`}>
                {current}
              </span>
              <span className="text-lg text-muted-foreground">/{limit}</span>
            </>
          )}
        </div>
        
        {!isPerVideo && (
          <div className="mt-4">
            <div className="progress-bar">
              <motion.div
                className={`progress-fill ${isOverLimit ? 'bg-destructive' : ''}`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-3">
          {isPerVideo ? (
            'Per video limit based on your plan'
          ) : isOverLimit ? (
            <span className="text-destructive font-medium">Limit reached - upgrade to continue</span>
          ) : resetDate ? (
            `Resets in ${Math.max(0, daysUntilReset)} days`
          ) : (
            `${limit - current} remaining`
          )}
        </p>
      </div>
    </motion.div>
  );
};
