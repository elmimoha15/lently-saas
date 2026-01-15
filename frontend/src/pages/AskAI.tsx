import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Copy, Check, Sparkles, ChevronDown, Video, Loader2, AlertCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { analysisApi, askAiApi } from '@/services/api.service';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  sources?: Array<{ author: string; text: string }>;
  keyPoints?: string[];
  followUpQuestions?: string[];
}

interface VideoOption {
  id: string;
  analysis_id: string;
  title: string;
  thumbnail: string;
  commentCount: number;
}

const AskAI = () => {
  const { videoId: routeVideoId } = useParams<{ videoId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State
  const initialVideoId = routeVideoId || searchParams.get('video') || '';
  const [selectedVideoId, setSelectedVideoId] = useState(initialVideoId);
  const [isVideoSelectorOpen, setIsVideoSelectorOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch analyzed videos for the selector
  const { data: historyData, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['analysisHistory'],
    queryFn: async () => {
      const response = await analysisApi.getHistory(50);
      if (response.error) throw new Error(response.error.detail);
      return response.data;
    },
  });

  // Convert to video options
  const videoOptions: VideoOption[] = historyData?.analyses
    ?.filter(a => a.status === 'completed')
    .map(a => ({
      id: a.video_id,
      analysis_id: a.analysis_id,
      title: a.video_title,
      thumbnail: a.video_thumbnail || '',
      commentCount: a.comments_analyzed || 0,
    })) || [];

  const selectedVideo = videoOptions.find(v => v.id === selectedVideoId);

  // Fetch quota
  const { data: quotaData, refetch: refetchQuota } = useQuery({
    queryKey: ['askAiQuota'],
    queryFn: async () => {
      const response = await askAiApi.getQuota();
      if (response.error) throw new Error(response.error.detail);
      return response.data;
    },
  });

  // Fetch suggestions when video is selected
  const { data: suggestionsData } = useQuery({
    queryKey: ['askAiSuggestions', selectedVideoId],
    queryFn: async () => {
      if (!selectedVideoId) return null;
      const response = await askAiApi.getSuggestions(selectedVideoId);
      if (response.error) return null;
      return response.data;
    },
    enabled: !!selectedVideoId,
  });

  // Actionable default suggestions - what creators ACTUALLY want to know
  const suggestions = suggestionsData?.suggestions || [
    'What video should I make next based on these comments?',
    'What did viewers love that I should keep doing?',
    'What confused or frustrated viewers?',
  ];

  // Ask question mutation
  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await askAiApi.askQuestion(
        selectedVideoId,
        question,
        'all',
        conversationId || undefined
      );
      if (response.error) throw new Error(response.error.detail);
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        // Update conversation ID for follow-ups
        setConversationId(data.conversation_id);
        
        // Add AI response to messages
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: data.answer,
          timestamp: 'Just now',
          sources: data.sources?.slice(0, 3).map(s => ({ author: s.author, text: s.text })),
          keyPoints: data.key_points,
          followUpQuestions: data.follow_up_questions,
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Refetch quota
        refetchQuota();
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      // Remove loading message
      setMessages(prev => prev.filter(m => m.id !== 'loading'));
    },
  });

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, askMutation.isPending, scrollToBottom]);

  // Reset conversation when video changes
  useEffect(() => {
    setMessages([]);
    setHasStartedChat(false);
    setConversationId(null);
    setError(null);
  }, [selectedVideoId]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || !selectedVideoId) return;
    
    setError(null);

    // Start chat mode if not already
    if (!hasStartedChat) {
      setHasStartedChat(true);
      // Add initial greeting
      const greeting: Message = {
        id: 'greeting',
        role: 'ai',
        content: `Hi! I've analyzed ${selectedVideo?.commentCount.toLocaleString() || 'the'} comments for "${selectedVideo?.title || 'this video'}". What would you like to know?`,
        timestamp: 'Just now',
      };
      setMessages([greeting]);
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: 'Just now',
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Ask the question
    askMutation.mutate(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVideoSelect = (id: string) => {
    setSelectedVideoId(id);
    setIsVideoSelectorOpen(false);
    navigate(`/ai/${id}`, { replace: true });
  };

  // Initial centered input view
  if (!hasStartedChat) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl text-center"
          >
            {/* Animated gradient background */}
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            </motion.div>

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
              Ask AI about your videos
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
              <div className="relative">
                <button
                  onClick={() => setIsVideoSelectorOpen(!isVideoSelectorOpen)}
                  className="w-full max-w-md mx-auto flex items-center justify-between gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors"
                >
                  {selectedVideo ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedVideo.thumbnail}
                        alt={selectedVideo.title}
                        className="w-12 h-8 rounded object-cover"
                      />
                      <span className="text-sm font-medium truncate">{selectedVideo.title}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Video className="w-5 h-5" />
                      <span className="text-sm">Select a video to analyze</span>
                    </div>
                  )}
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isVideoSelectorOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isVideoSelectorOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 w-full max-w-md mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
                    >
                      {isLoadingVideos ? (
                        <div className="p-8 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                          <p className="text-sm text-muted-foreground">Loading videos...</p>
                        </div>
                      ) : videoOptions.length === 0 ? (
                        <div className="p-8 text-center">
                          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">No analyzed videos yet</p>
                          <button
                            onClick={() => navigate('/analyze')}
                            className="text-sm text-primary hover:underline"
                          >
                            Analyze your first video →
                          </button>
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto p-2">
                          {videoOptions.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => handleVideoSelect(v.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors ${
                                selectedVideoId === v.id ? 'bg-primary/10' : ''
                              }`}
                            >
                              <img
                                src={v.thumbnail}
                                alt={v.title}
                                className="w-16 h-10 rounded object-cover flex-shrink-0"
                              />
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-medium truncate">{v.title}</p>
                                <p className="text-xs text-muted-foreground">{v.commentCount.toLocaleString()} comments</p>
                              </div>
                              {selectedVideoId === v.id && (
                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
              className="relative max-w-2xl mx-auto"
            >
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedVideo ? `Ask anything about "${selectedVideo.title}"...` : "Select a video first, then ask a question..."}
                  disabled={!selectedVideo}
                  rows={1}
                  className="w-full resize-none input-premium pr-14 py-4 text-base rounded-2xl border-2 focus:border-primary/50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: '60px', maxHeight: '150px' }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || !selectedVideo}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    input.trim() && selectedVideo
                      ? 'bg-primary text-primary-foreground hover:bg-primary-hover hover:scale-105 active:scale-95 shadow-md'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </motion.div>

            {/* Suggested Questions */}
            {selectedVideo && (
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
                        setInput(q);
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

            {/* Usage Counter */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-muted-foreground mt-8"
            >
              {quotaData ? (
                `${quotaData.questions_used}/${quotaData.questions_limit} questions used this month — ${quotaData.plan.charAt(0).toUpperCase() + quotaData.plan.slice(1)} Plan`
              ) : (
                'Loading quota...'
              )}
            </motion.p>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Full chat interface
  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)] max-w-3xl mx-auto">
        {/* Mini Header with Video Selector */}
        <div className="flex items-center gap-3 pb-4 border-b border-border mb-6">
          <div className="relative flex-1">
            <button
              onClick={() => setIsVideoSelectorOpen(!isVideoSelectorOpen)}
              className="flex items-center gap-3 hover:bg-secondary px-2 py-1 -mx-2 rounded-lg transition-colors"
            >
              {selectedVideo && (
                <img
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm text-muted-foreground">Asking about:</p>
                <p className="text-sm font-medium truncate">{selectedVideo?.title || 'Select a video'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isVideoSelectorOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isVideoSelectorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 w-80 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
                >
                  <div className="max-h-64 overflow-y-auto p-2">
                    {videoOptions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => handleVideoSelect(v.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors ${
                          selectedVideoId === v.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <img
                          src={v.thumbnail}
                          alt={v.title}
                          className="w-12 h-8 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium truncate">{v.title}</p>
                          <p className="text-xs text-muted-foreground">{v.commentCount.toLocaleString()} comments</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto space-y-6 pb-32">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} onFollowUp={handleSend} />
            ))}
          </AnimatePresence>

          {/* Suggested Questions (only show if just AI greeting) */}
          {messages.length === 1 && !askMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 ml-14"
            >
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-4 py-2 text-sm bg-card border border-border rounded-full hover:border-primary hover:scale-[1.02] transition-all"
                >
                  {q}
                </button>
              ))}
            </motion.div>
          )}

          {/* Typing Indicator */}
          {askMutation.isPending && (
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

        {/* Input Area */}
        <div className="fixed bottom-0 left-sidebar right-0 bg-background border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about these comments..."
                disabled={askMutation.isPending}
                rows={1}
                className="w-full resize-none input-premium pr-14 py-4 text-base disabled:opacity-50"
                style={{ minHeight: '56px', maxHeight: '150px' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || askMutation.isPending}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  input.trim() && !askMutation.isPending
                    ? 'bg-primary text-primary-foreground hover:bg-primary-hover hover:scale-105 active:scale-95'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {askMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowUp className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {quotaData ? (
                `${quotaData.questions_used}/${quotaData.questions_limit} questions used this month — ${quotaData.plan.charAt(0).toUpperCase() + quotaData.plan.slice(1)} Plan`
              ) : (
                'Loading quota...'
              )}
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

interface MessageBubbleProps {
  message: Message;
  onFollowUp?: (question: string) => void;
}

const MessageBubble = ({ message, onFollowUp }: MessageBubbleProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="flex items-start gap-3 max-w-[85%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-base leading-relaxed">{message.content}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold flex-shrink-0">
            You
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm flex-shrink-0">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="max-w-[85%] group relative">
        <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
          <div 
            className="text-base leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: message.content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br />')
            }}
          />

          {/* Key Points */}
          {message.keyPoints && message.keyPoints.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Key takeaways:</p>
              <ul className="text-sm space-y-1">
                {message.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source Comments */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">From your comments:</p>
              <div className="space-y-2">
                {message.sources.map((source, i) => (
                  <div
                    key={i}
                    className="text-xs bg-background/50 rounded-lg px-3 py-2 text-muted-foreground"
                  >
                    <span className="font-medium">{source.author}:</span> "{source.text.length > 100 ? source.text.slice(0, 100) + '...' : source.text}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Questions */}
          {message.followUpQuestions && message.followUpQuestions.length > 0 && onFollowUp && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Want to know more?</p>
              <div className="flex flex-wrap gap-2">
                {message.followUpQuestions.slice(0, 3).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onFollowUp(q)}
                    className="text-xs px-3 py-1.5 bg-background border border-border rounded-full hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default AskAI;
