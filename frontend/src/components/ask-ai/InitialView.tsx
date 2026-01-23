import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AskAILayout } from './AskAILayout';
import { ConversationSidebar, Conversation } from './ConversationSidebar';
import { ChatInput } from './ChatInput';
import { VideoSelector, VideoOption } from './VideoSelector';

interface InitialViewProps {
  // Sidebar props
  conversations: Conversation[];
  videoMap: Map<string, { title: string; thumbnail: string }>;
  currentConversationId: string | null;
  onLoadConversation: (conversationId: string, videoId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  isLoadingConversations?: boolean;
  
  // Video selector props
  selectedVideo: VideoOption | undefined;
  selectedVideoId: string;
  videoOptions: VideoOption[];
  isVideoSelectorOpen: boolean;
  isLoadingVideos: boolean;
  onVideoSelectorToggle: () => void;
  onVideoSelect: (id: string) => void;
  
  // Input props
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  quotaData: { questions_used: number; questions_limit: number; plan: string } | null | undefined;
  
  // Suggestions
  suggestions: string[];
  
  // Error
  error: string | null;
}

/**
 * Initial view when no chat has started yet.
 * Shows the welcome message, video selector, and suggested questions.
 */
export const InitialView = ({
  conversations,
  videoMap,
  currentConversationId,
  onLoadConversation,
  onNewConversation,
  onDeleteConversation,
  isLoadingConversations = false,
  selectedVideo,
  selectedVideoId,
  videoOptions,
  isVideoSelectorOpen,
  isLoadingVideos,
  onVideoSelectorToggle,
  onVideoSelect,
  input,
  onInputChange,
  onSend,
  onKeyDown,
  isLoading,
  inputRef,
  quotaData,
  suggestions,
  error,
}: InitialViewProps) => {
  return (
    <AskAILayout>
      {/* Conversation Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        videoMap={videoMap}
        currentConversationId={currentConversationId}
        onLoadConversation={onLoadConversation}
        onNewConversation={onNewConversation}
        onDeleteConversation={onDeleteConversation}
        isLoading={isLoadingConversations}
      />

      {/* Background gradient - fixed to cover full area */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl text-center"
        >

          {/* Icon */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold mb-2"
          >
            Ask AI about your Comments
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground mb-8"
          >
            Get instant insights from your YouTube comments with AI
          </motion.p>

          {/* Video Selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <VideoSelector
              selectedVideo={selectedVideo}
              selectedVideoId={selectedVideoId}
              videoOptions={videoOptions}
              isOpen={isVideoSelectorOpen}
              isLoading={isLoadingVideos}
              onToggle={onVideoSelectorToggle}
              onSelect={onVideoSelect}
              variant="full"
            />
          </motion.div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative max-w-xl mx-auto"
          >
            <ChatInput
              value={input}
              onChange={onInputChange}
              onSend={onSend}
              onKeyDown={onKeyDown}
              disabled={!selectedVideo && selectedVideoId !== 'all'}
              isLoading={isLoading}
              placeholder={
                selectedVideoId === 'all' 
                  ? "Ask anything about all your videos..." 
                  : selectedVideo 
                    ? `Ask anything about "${selectedVideo.title}"...` 
                    : "Select a video first, then ask a question..."
              }
              inputRef={inputRef}
              quotaData={quotaData}
              variant="initial"
            />
          </motion.div>

          {/* Suggested Questions */}
          {(selectedVideo || selectedVideoId === 'all') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6"
            >
              <p className="text-xs text-muted-foreground mb-3">Try asking:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      onInputChange(q);
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-2 text-sm bg-card border border-border rounded-full hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AskAILayout>
  );
};
