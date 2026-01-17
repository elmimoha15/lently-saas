import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { RefreshCw, Trash2, ExternalLink, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Video {
  id: string;
  title: string;
  channel: string;
  channelVerified: boolean;
  thumbnail: string;
  commentCount: number;
  publishedAt: string;
  analyzedAt: string;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  categories: {
    questions: number;
    praise: number;
    complaints: number;
    suggestions: number;
    spam: number;
    general: number;
  };
  topics: string[];
  isProcessing?: boolean;
  progress?: number;
}

interface VideoTableProps {
  videos: Video[];
  compact?: boolean;
}

export const VideoTable = ({ videos, compact = false }: VideoTableProps) => {
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());

  const handleRegenerate = async (video: Video) => {
    setRegeneratingIds(prev => new Set(prev).add(video.id));
    
    // Simulate regeneration
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setRegeneratingIds(prev => {
      const next = new Set(prev);
      next.delete(video.id);
      return next;
    });
    
    toast.success(`Analysis regenerated for "${video.title}"`);
  };

  const handleDelete = (video: Video) => {
    toast.success(`"${video.title}" has been deleted`);
  };

  const getSentimentColor = (positive: number) => {
    if (positive >= 70) return 'text-success';
    if (positive >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getSentimentEmoji = (positive: number) => {
    if (positive >= 70) return '😊';
    if (positive >= 40) return '😐';
    return '😔';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background-secondary">
              <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                Video
              </th>
              {!compact && (
                <th className="text-left py-4 px-4 text-sm font-semibold text-foreground">
                  Channel
                </th>
              )}
              <th className="text-center py-4 px-4 text-sm font-semibold text-foreground">
                Comments
              </th>
              <th className="text-center py-4 px-4 text-sm font-semibold text-foreground">
                Sentiment
              </th>
              <th className="text-center py-4 px-4 text-sm font-semibold text-foreground">
                Analyzed
              </th>
              <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video, index) => (
              <motion.tr
                key={video.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`border-b border-border last:border-0 hover:bg-primary/[0.02] transition-colors group ${
                  video.isProcessing ? 'bg-primary/5' : ''
                }`}
              >
                {/* Video Info */}
                <td className="py-4 px-6">
                  <Link 
                    to={video.isProcessing ? `/analyze/${video.id}` : `/videos/${video.id}`}
                    className="flex items-center gap-4 group/link"
                  >
                    <div className="relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-transparent group-hover/link:ring-primary/20 transition-all">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      {video.isProcessing && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground group-hover/link:text-primary transition-colors line-clamp-1">
                          {video.title}
                        </h3>
                        {video.isProcessing && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Analyzing {video.progress}%
                          </span>
                        )}
                      </div>
                      {compact && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {video.channel}
                        </p>
                      )}
                    </div>
                  </Link>
                </td>

                {/* Channel */}
                {!compact && (
                  <td className="py-4 px-4">
                    <span className="text-sm text-muted-foreground">
                      {video.isProcessing ? 'Loading...' : video.channel}
                    </span>
                  </td>
                )}

                {/* Comments */}
                <td className="py-4 px-4 text-center">
                  {video.isProcessing ? (
                    <span className="text-sm text-muted-foreground">...</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-sm font-medium text-foreground">
                      💬 {video.commentCount.toLocaleString()}
                    </span>
                  )}
                </td>

                {/* Sentiment */}
                <td className="py-4 px-4 text-center">
                  {video.isProcessing ? (
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${getSentimentColor(video.sentiment.positive)}`}>
                      {getSentimentEmoji(video.sentiment.positive)} {video.sentiment.positive}%
                    </span>
                  )}
                </td>

                {/* Analyzed Date */}
                <td className="py-4 px-4 text-center">
                  <span className="text-sm text-muted-foreground">
                    {video.isProcessing ? 'In progress...' : formatDate(video.analyzedAt)}
                  </span>
                </td>

                {/* Actions */}
                <td className="py-4 px-6 text-right">
                  {video.isProcessing ? (
                    <span className="text-xs text-muted-foreground">
                      Analyzing...
                    </span>
                  ) : (
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
                        asChild
                      >
                        <Link to={`/videos/${video.id}`}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                          View
                        </Link>
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleRegenerate(video)}
                            disabled={regeneratingIds.has(video.id)}
                            className="cursor-pointer"
                          >
                            <RefreshCw className={`w-4 h-4 mr-2 ${regeneratingIds.has(video.id) ? 'animate-spin' : ''}`} />
                            {regeneratingIds.has(video.id) ? 'Regenerating...' : 'Regenerate Analysis'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(video)}
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Video
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
