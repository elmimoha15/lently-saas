import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AskAILayout } from './AskAILayout';
import { ConversationSidebar, Conversation } from './ConversationSidebar';
import { ChatInput } from './ChatInput';
import { VideoInfoHeader, VideoOption } from './VideoInfoHeader';
import { MessageBubble, Message } from './MessageBubble';

interface ChatViewProps {
  // Sidebar props
  conversations: Conversation[];
  videoMap: Map<string, { title: string; thumbnail: string }>;
  currentConversationId: string | null;
  onLoadConversation: (conversationId: string, videoId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  isLoadingConversations?: boolean;
  
  // Video info props
  selectedVideo: VideoOption | undefined;
  selectedVideoId: string;
  videoOptions: VideoOption[];
  
  // Messages
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  
  // Input props
  input: string;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  quotaData: { questions_used: number; questions_limit: number; plan: string } | null | undefined;
  
  // Suggestions
  suggestions: string[];
  
  // Error
  error: string | null;
  
  // Loading state
  isLoadingConversation?: boolean;
}

/**
 * Chat interface view when a conversation is active.
 */
export const ChatView = ({
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
  messages,
  messagesEndRef,
  input,
  onInputChange,
  onSend,
  onKeyDown,
  isLoading,
  inputRef,
  quotaData,
  suggestions,
  error,
  isLoadingConversation = false,
}: ChatViewProps) => {
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with Video Info */}
        <VideoInfoHeader
          selectedVideo={selectedVideo}
          selectedVideoId={selectedVideoId}
          videoOptions={videoOptions}
        />

        {/* Messages Container - Centered */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 space-y-6">
          {isLoadingConversation ? (
            // Skeleton messages for initial load
            <div className="space-y-6">
              {/* Skeleton AI message */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded-lg w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded-lg w-full animate-pulse" />
                  <div className="h-4 bg-muted rounded-lg w-2/3 animate-pulse" />
                </div>
              </div>
              {/* Skeleton user message */}
              <div className="flex justify-end">
                <div className="w-2/3 space-y-2">
                  <div className="h-4 bg-muted rounded-lg w-full animate-pulse ml-auto" />
                  <div className="h-4 bg-muted rounded-lg w-3/4 animate-pulse ml-auto" />
                </div>
              </div>
              {/* Skeleton AI message */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded-lg w-full animate-pulse" />
                  <div className="h-4 bg-muted rounded-lg w-5/6 animate-pulse" />
                  <div className="h-4 bg-muted rounded-lg w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded-lg w-2/3 animate-pulse" />
                </div>
              </div>
            </div>
          ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                onFollowUp={onSend} 
              />
            ))}
          </AnimatePresence>
          )}

          {/* Suggested Questions (only show if just AI greeting) */}
          {messages.length === 1 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 ml-14"
            >
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => onSend(q)}
                  className="px-4 py-2 text-sm bg-card border border-border rounded-full hover:border-primary hover:scale-[1.02] transition-all"
                >
                  {q}
                </button>
              ))}
            </motion.div>
          )}

          {/* Typing Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-md p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Centered */}
        <div className="flex-shrink-0 border-t border-border">
          <div className="max-w-3xl mx-auto">
            {isLoadingConversation ? (
              // Skeleton for loading conversation
              <div className="bg-background p-4">
                <div className="relative">
                  <div className="w-full h-[52px] bg-muted rounded-2xl animate-pulse" />
                </div>
                <div className="h-4 w-64 bg-muted rounded mt-2 mx-auto animate-pulse" />
              </div>
            ) : (
              <ChatInput
                value={input}
                onChange={onInputChange}
                onSend={() => onSend()}
                onKeyDown={onKeyDown}
                disabled={isLoading}
                isLoading={isLoading}
                inputRef={inputRef}
                quotaData={quotaData}
                variant="chat"
              />
            )}
          </div>
        </div>
      </div>
    </AskAILayout>
  );
};
