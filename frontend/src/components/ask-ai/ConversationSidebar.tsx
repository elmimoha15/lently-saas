import { motion } from 'framer-motion';
import { History, ChevronLeft, MessageSquare, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  conversations: Conversation[];
  videoMap: Map<string, VideoData>;
  currentConversationId: string | null;
  onLoadConversation: (conversationId: string, videoId: string) => void;
  onNewConversation: () => void;
  isLoading?: boolean;
}

export const ConversationSidebar = ({
  isOpen,
  onClose,
  onOpen,
  conversations,
  videoMap,
  currentConversationId,
  onLoadConversation,
  onNewConversation,
  isLoading = false,
}: ConversationSidebarProps) => {
  return (
    <div className="h-full flex-shrink-0 flex">
      {/* Collapsed state - narrow tab */}
      {!isOpen && (
        <div className="h-full border-r border-border bg-card">
          <button
            onClick={onOpen}
            className="h-full w-12 flex flex-col items-center justify-start pt-4 gap-2 hover:bg-secondary/50 transition-colors"
            title="Show conversations"
          >
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            <span 
              className="text-xs font-medium text-muted-foreground"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Conversations
            </span>
          </button>
        </div>
      )}

      {/* Expanded state - full sidebar */}
      {isOpen && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 300 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="h-full border-r border-border bg-card overflow-hidden"
        >
          <div className="h-full flex flex-col w-[300px]">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Conversations</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                title="Close sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
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
                    
                    let timeAgo = 'Recently';
                    try {
                      timeAgo = formatDistanceToNow(new Date(conv.updated_at), {
                        addSuffix: true,
                      });
                    } catch {
                      // Keep default 'Recently'
                    }

                    return (
                      <button
                        key={conv.conversation_id}
                        onClick={() => onLoadConversation(conv.conversation_id, conv.video_id)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          isActive
                            ? 'bg-primary/10 border border-primary/30 shadow-sm'
                            : 'hover:bg-secondary border border-transparent'
                        }`}
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
                          {video?.title || 'Unknown Video'}
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
