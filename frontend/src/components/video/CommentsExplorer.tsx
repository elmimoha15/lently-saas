/**
 * Comments Explorer Section
 * Filter and view all comments by category
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

interface Comment {
  comment_id: string;
  author: string;
  text: string;
  like_count: number;
  reply_count: number;
  sentiment?: string;
  category?: string;
}

interface CommentsExplorerProps {
  comments: Comment[];
}

const filterOptions = ['All', 'Questions', 'Praise', 'Complaints', 'Suggestions'];

export const CommentsExplorer = ({ comments }: CommentsExplorerProps) => {
  const [activeFilter, setActiveFilter] = useState('All');

  // Filter comments by category
  const filteredComments = (() => {
    if (activeFilter === 'All') return comments;
    
    // Map filter names to backend category names (including legacy names for backward compatibility)
    const categoryMap: Record<string, string[]> = {
      'Questions': ['question'],
      'Praise': ['appreciation', 'praise', 'feedback'], // feedback can be positive
      'Complaints': ['complaint', 'criticism'],
      'Suggestions': ['suggestion', 'request'],
    };
    
    const acceptedCategories = categoryMap[activeFilter] || [];
    return comments.filter((c) => 
      acceptedCategories.includes(c.category?.toLowerCase() || '')
    );
  })();

  // Count comments per filter
  const getFilterCount = (filter: string) => {
    if (filter === 'All') return comments.length;
    const categoryMap: Record<string, string[]> = {
      'Questions': ['question'],
      'Praise': ['appreciation', 'praise', 'feedback'], // feedback can be positive
      'Complaints': ['complaint', 'criticism'],
      'Suggestions': ['suggestion', 'request'],
    };
    const acceptedCategories = categoryMap[filter] || [];
    return comments.filter((c) => 
      acceptedCategories.includes(c.category?.toLowerCase() || '')
    ).length;
  };

  return (
    <div className="card-premium">
      <h3 className="text-lg font-semibold mb-6">Explore All Comments</h3>
      
      {/* Filter Buttons */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const count = getFilterCount(option);
            return (
              <button
                key={option}
                onClick={() => setActiveFilter(option)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeFilter === option
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                {option} {option !== 'All' && count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comments List */}
      {filteredComments.length > 0 ? (
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
      ) : (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-border bg-card">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No {activeFilter.toLowerCase()} found</h3>
          <p className="text-muted-foreground">
            Try selecting a different category
          </p>
        </div>
      )}

      {/* Show count */}
      {filteredComments.length > 20 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Showing 20 of {filteredComments.length} comments
          </p>
        </div>
      )}
    </div>
  );
};
