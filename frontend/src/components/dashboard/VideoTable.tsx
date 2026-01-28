import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { RefreshCw, Trash2, ExternalLink, MoreHorizontal, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { analysisApi } from '@/services/api.service';
import { useQueryClient } from '@tanstack/react-query';

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
  videoId?: string;
}

interface VideoTableProps {
  videos: Video[];
  compact?: boolean;
}

export const VideoTable = ({ videos, compact = false }: VideoTableProps) => {
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleRegenerate = async (video: Video) => {
    // Navigate to analyze page with video ID pre-filled
    if (video.videoId) {
      navigate(`/analyze/${video.videoId}`);
    } else {
      toast.error('Video ID not available for regeneration');
    }
  };

  const handleCancelAnalysis = async (video: Video) => {
    setCancellingIds(prev => new Set(prev).add(video.id));
    
    try {
      await analysisApi.cancelAnalysis(video.id);
      
      toast.success('Analysis cancelled');
      
      // Immediately remove from cache
      queryClient.setQueryData(['analysisHistory'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          analyses: old.analyses.filter((a: any) => a.analysis_id !== video.id),
          count: old.count - 1
        };
      });
      
      queryClient.setQueryData(['recentVideos'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          analyses: old.analyses.filter((a: any) => a.analysis_id !== video.id),
          count: old.count - 1
        };
      });
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel analysis');
    } finally {
      setCancellingIds(prev => {
        const next = new Set(prev);
        next.delete(video.id);
        return next;
      });
    }
  };

  const handleDeleteClick = (video: Video) => {
    setVideoToDelete(video);
  };

  const confirmDelete = async () => {
    if (!videoToDelete) return;

    setDeletingIds(prev => new Set(prev).add(videoToDelete.id));
    
    try {
      const response = await analysisApi.deleteAnalysis(videoToDelete.id);
      
      if (response.error) {
        throw new Error(response.error.detail);
      }
      
      toast.success(`"${videoToDelete.title}" has been deleted`);
      
      // Update the query cache directly without refetching
      queryClient.setQueryData(['analysisHistory'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          analyses: old.analyses.filter((a: any) => a.analysis_id !== videoToDelete.id),
          count: old.count - 1
        };
      });
      
      queryClient.setQueryData(['recentVideos'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          analyses: old.analyses.filter((a: any) => a.analysis_id !== videoToDelete.id),
          count: old.count - 1
        };
      });
      
      // Invalidate conversations cache since they were deleted with the video
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Check if the active conversation is for this video and clear it
      const storedConversation = sessionStorage.getItem('lently_active_conversation');
      if (storedConversation) {
        try {
          const state = JSON.parse(storedConversation);
          if (state.videoId === videoToDelete.videoId) {
            sessionStorage.removeItem('lently_active_conversation');
            console.log('🗑️ Cleared active conversation for deleted video');
          }
        } catch (e) {
          // Invalid JSON, clear it anyway
          sessionStorage.removeItem('lently_active_conversation');
        }
      }
      
      setVideoToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(videoToDelete.id);
        return next;
      });
    }
  };

  const cancelDelete = () => {
    setVideoToDelete(null);
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
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleCancelAnalysis(video)}
                      disabled={cancellingIds.has(video.id)}
                    >
                      {cancellingIds.has(video.id) ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        'Cancel'
                      )}
                    </Button>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
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
                            className="cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate Analysis
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(video)}
                            disabled={deletingIds.has(video.id)}
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            {deletingIds.has(video.id) ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Video
                              </>
                            )}
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {videoToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={cancelDelete}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Delete Video Analysis?
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Are you sure you want to delete <span className="font-medium text-foreground">"{videoToDelete.title}"</span>?
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                    <span className="font-medium text-amber-600">Note:</span> This will also delete all AI conversations associated with this video. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={cancelDelete}
                  className="flex-1 h-11 rounded-full"
                  disabled={deletingIds.has(videoToDelete.id)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  disabled={deletingIds.has(videoToDelete.id)}
                  className="flex-1 h-11 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deletingIds.has(videoToDelete.id) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
