/**
 * Analysis Metrics Grid
 * Displays category breakdown, topics, and top comments
 */

import { motion } from 'framer-motion';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import { CategoryBreakdown } from './CategoryBreakdown';
import { TopicPills } from './TopicPills';

interface Categories {
  questions: number;
  praise: number;
  complaints: number;
  suggestions: number;
  spam: number;
  general: number;
}

interface Comment {
  comment_id: string;
  author: string;
  text: string;
  like_count: number;
  reply_count: number;
  sentiment?: string;
  category?: string;
}

interface AnalysisMetricsGridProps {
  categories: Categories;
  topics: string[];
  topPositiveComments: Comment[];
  topNegativeComments: Comment[];
}

export const AnalysisMetricsGrid = ({
  categories,
  topics,
  topPositiveComments,
  topNegativeComments,
}: AnalysisMetricsGridProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Categories and Topics */}
      <div className="space-y-8">
        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CategoryBreakdown categories={categories} />
        </motion.div>

        {/* Key Topics */}
        {topics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-premium"
          >
            <h3 className="text-lg font-semibold mb-4">Key Discussion Topics</h3>
            <TopicPills topics={topics} />
          </motion.div>
        )}
      </div>

      {/* Right Column - Top Comments */}
      <div className="space-y-8">
        {/* Top Positive Comments */}
        {topPositiveComments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-premium"
          >
            <h3 className="text-lg font-semibold mb-4">Top Positive Comments</h3>
            <div className="space-y-3">
              {topPositiveComments.slice(0, 3).map((comment) => (
                <div key={comment.comment_id} className="p-4 bg-card border border-border rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-success">
                        {comment.author[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                          positive
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{comment.text}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {comment.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {comment.reply_count} replies
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Negative Comments */}
        {topNegativeComments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card-premium"
          >
            <h3 className="text-lg font-semibold mb-4">Areas to Address</h3>
            <div className="space-y-3">
              {topNegativeComments.slice(0, 3).map((comment) => (
                <div key={comment.comment_id} className="p-4 bg-card border border-border rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-destructive">
                        {comment.author[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                          negative
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{comment.text}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {comment.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {comment.reply_count} replies
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
