import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { History, MessageSquare, Plus, MoreVertical, Trash2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface Conversation {
  conversation_id: string;
  video_id: string;
  question_count: number;
  created_at: string;
  updated_at: string;
  last_message: string;
}

export interface VideoData {
  title: string;
  thumbnail: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  videoMap: Map<string, VideoData>;
  currentConversationId: string | null;
  onLoadConversation: (conversationId: string, videoId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  isLoading?: boolean;
}

export const ConversationSidebar = ({
  conversations,
  videoMap,
  currentConversationId,
  onLoadConversation,
  onNewConversation,
  onDeleteConversation,
  isLoading = false,
}: ConversationSidebarProps) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    if (conversationToDelete) {
      // Add to deleting set for animation
      setDeletingIds(prev => new Set(prev).add(conversationToDelete));
      
      // Wait for animation to complete before actually deleting
      setTimeout(() => {
        onDeleteConversation(conversationToDelete);
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(conversationToDelete);
          return newSet;
        });
      }, 300);
      
      setConversationToDelete(null);
    }
  };

  const toggleMenu = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === conversationId ? null : conversationId);
  };

  return (
    <div className="h-full flex-shrink-0 flex">
      {/* Always expanded sidebar */}
      <div className="h-full border-r border-border bg-card w-[300px]">
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border flex items-center gap-2 flex-shrink-0">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Conversations</h3>
          </div>

          {/* New Conversation Button */}
          <div className="p-2 border-b border-border flex-shrink-0">
            <button
              onClick={onNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New Conversation</span>
            </button>
          </div>

          {/* Conversations List - scrollable */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              // Skeleton loaders
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-full p-3 rounded-lg border border-border animate-pulse">
                    <div className="w-full h-16 bg-muted rounded-md mb-2" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-full mb-1" />
                    <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                    <div className="flex gap-2">
                      <div className="h-3 bg-muted rounded w-16" />
                      <div className="h-3 bg-muted rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Start asking questions about your videos
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => {
                  const video = videoMap.get(conv.video_id);
                  const isActive = conv.conversation_id === currentConversationId;
                  const isDeleting = deletingIds.has(conv.conversation_id);
                  
                  let timeAgo = 'Recently';
                  try {
                    timeAgo = formatDistanceToNow(new Date(conv.updated_at), {
                      addSuffix: true,
                    });
                  } catch {
                    // Keep default 'Recently'
                  }

                  return (
                    <motion.div
                      key={conv.conversation_id}
                      initial={{ opacity: 1, height: 'auto' }}
                      animate={{ 
                        opacity: isDeleting ? 0 : 1, 
                        height: isDeleting ? 0 : 'auto',
                        marginBottom: isDeleting ? 0 : undefined
                      }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className={`group relative rounded-lg transition-all overflow-hidden ${
                        isActive
                          ? 'bg-primary/10 border border-primary/30 shadow-sm'
                          : 'hover:bg-secondary border border-transparent'
                      }`}
                    >
                      <button
                        onClick={() => onLoadConversation(conv.conversation_id, conv.video_id)}
                        className="w-full text-left p-3 pr-10"
                      >
                        {/* Video thumbnail */}
                        {video?.thumbnail && (
                          <img
                            src={video.thumbnail}
                            alt={video.title || ''}
                            className="w-full h-16 rounded-md object-cover mb-2"
                          />
                        )}
                        
                        {/* Video title */}
                        <p className="text-sm font-medium line-clamp-1 mb-1">
                          {conv.video_id === 'all' ? 'All Videos' : (video?.title || 'Unknown Video')}
                        </p>
                        
                        {/* Last message preview */}
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {conv.last_message || 'No messages yet'}
                        </p>
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{conv.question_count} questions</span>
                          <span>•</span>
                          <span>{timeAgo}</span>
                        </div>
                      </button>
                      
                      {/* Three-dot menu */}
                      <div className="absolute top-3 right-2 z-20">
                        <button
                          onClick={(e) => toggleMenu(e, conv.conversation_id)}
                          className="p-1.5 bg-card hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4 text-foreground" />
                        </button>
                        
                        {/* Dropdown menu */}
                        {openMenuId === conv.conversation_id && (
                          <div className="absolute top-10 right-0 z-30 min-w-[180px] bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                            <button
                              onClick={(e) => handleDeleteClick(e, conv.conversation_id)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete conversation
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={conversationToDelete !== null} onOpenChange={(open) => !open && setConversationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Delete Conversation?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base">
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
