import { motion } from 'framer-motion';
import { ThumbsUp } from 'lucide-react';
import { Comment, getCategoryBadgeClass, getSentimentEmoji } from '@/data/comments';
import { useState } from 'react';

interface CommentCardProps {
  comment: Comment;
  index?: number;
}

export const CommentCard = ({ comment, index = 0 }: CommentCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const isLongComment = comment.text.length > 150;

  const categoryLabels: Record<string, string> = {
    question: 'Question',
    praise: 'Praise',
    complaint: 'Complaint',
    suggestion: 'Suggestion',
    spam: 'Spam',
    general: 'General',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card-premium p-5"
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-muted-foreground flex-shrink-0">
          {comment.username.slice(1, 3).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{comment.username}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryBadgeClass(comment.category)}`}>
              {categoryLabels[comment.category]}
            </span>
            <span className="text-sm">{getSentimentEmoji(comment.sentiment)}</span>
          </div>

          {/* Content */}
          <p className="text-sm text-foreground mt-2 leading-relaxed">
            {isLongComment && !expanded ? (
              <>
                {comment.text.slice(0, 150)}...{' '}
                <button
                  onClick={() => setExpanded(true)}
                  className="text-primary hover:underline font-medium"
                >
                  Read more
                </button>
              </>
            ) : (
              comment.text
            )}
            {expanded && isLongComment && (
              <button
                onClick={() => setExpanded(false)}
                className="text-primary hover:underline font-medium ml-1"
              >
                Show less
              </button>
            )}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5" />
              {comment.likes}
            </span>
            <span>{comment.timestamp}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
