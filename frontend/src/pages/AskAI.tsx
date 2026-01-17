import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { analysisApi, askAiApi } from '@/services/api.service';
import { useBilling } from '@/contexts/BillingContext';
import {
  Message,
  Conversation,
  VideoOption,
  LoadingView,
  InitialView,
  ChatView,
} from '@/components/ask-ai';

const AskAI = () => {
  const { videoId: routeVideoId } = useParams<{ videoId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get billing data from single source of truth
  const { usage, currentPlan, canAskQuestion, refreshBilling } = useBilling();
  
  // =========================================================================
  // State
  // =========================================================================
  
  const initialVideoId = routeVideoId || searchParams.get('video') || '';
  const loadConversationId = searchParams.get('conversation');
  
  const [selectedVideoId, setSelectedVideoId] = useState(initialVideoId);
  const [isVideoSelectorOpen, setIsVideoSelectorOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(loadConversationId);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // =========================================================================
  // Data Fetching
  // =========================================================================

  // Fetch conversation history list
  const { data: conversationsData, refetch: refetchConversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await askAiApi.getConversations(50);
      if (response.error) return null;
      return response.data;
    },
  });

  const conversations: Conversation[] = conversationsData?.conversations || [];

  // Fetch analyzed videos for the selector
  const { data: historyData, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['analysisHistory'],
    queryFn: async () => {
      const response = await analysisApi.getHistory(50);
      if (response.error) throw new Error(response.error.detail);
      return response.data;
    },
  });

  // Convert to video options - only completed analyses
  const videoOptions: VideoOption[] = (historyData?.analyses || [])
    .filter((a) => a.status === 'completed' && a.video_id)
    .map((a) => ({
      id: a.video_id,
      analysis_id: a.analysis_id,
      title: a.video_title || 'Untitled Video',
      thumbnail: a.video_thumbnail || '',
      commentCount: a.comments_analyzed || 0,
    }));

  const selectedVideo = videoOptions.find(v => v.id === selectedVideoId);
  const isAllVideos = selectedVideoId === 'all';
  const totalComments = videoOptions.reduce((sum, v) => sum + v.commentCount, 0);

  // Create video map for sidebar
  const videoMap = new Map(
    videoOptions.map((v) => [v.id, { title: v.title, thumbnail: v.thumbnail }])
  );

  // Build quota data from BillingContext (single source of truth)
  const quotaData = usage ? {
    questions_used: usage.ai_questions_used,
    questions_limit: usage.ai_questions_limit,
    plan: currentPlan?.name || 'Free',
  } : null;

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

  // Default actionable suggestions
  const suggestions = suggestionsData?.suggestions || [
    'What video should I make next based on these comments?',
    'What did viewers love that I should keep doing?',
    'What confused or frustrated viewers?',
  ];

  // =========================================================================
  // Conversation Loading
  // =========================================================================

  // Load existing conversation if conversation ID is provided in URL
  useEffect(() => {
    if (loadConversationId && !hasStartedChat) {
      loadConversation(loadConversationId);
    }
  }, [loadConversationId]);

  const loadConversation = async (convId: string) => {
    setIsLoadingConversation(true);
    setError(null);
    
    try {
      const response = await askAiApi.getConversation(convId);
      if (response.data) {
        const data = response.data;
        
        // Convert backend messages to frontend format
        const loadedMessages: Message[] = data.messages.map((msg, index) => ({
          id: `${msg.role}-${index}`,
          role: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: msg.timestamp || 'Earlier',
        }));

        setMessages(loadedMessages);
        setSelectedVideoId(data.video_id);
        setConversationId(convId);
        setHasStartedChat(true);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleLoadConversation = async (convId: string, videoId: string) => {
    setIsSidebarOpen(false);
    await loadConversation(convId);
    navigate(`/ai?conversation=${convId}`, { replace: true });
  };

  // =========================================================================
  // Ask Question Mutation
  // =========================================================================

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
        
        // Refresh billing data (single source of truth) and conversations
        refreshBilling();
        refetchConversations();
      }
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // =========================================================================
  // Event Handlers
  // =========================================================================

  const handleSend = async (text?: string) => {
    const messageText = typeof text === 'string' ? text : input;
    if (!messageText.trim() || !selectedVideoId) return;
    
    // Check quota before allowing question (frontend enforcement)
    if (!canAskQuestion) {
      setError('You have reached your AI question limit for this month. Please upgrade your plan to continue.');
      return;
    }
    
    setError(null);

    // Start chat mode if not already
    if (!hasStartedChat) {
      setHasStartedChat(true);
      // Add initial greeting
      const greetingContent = isAllVideos 
        ? `Hi! I've analyzed ${totalComments.toLocaleString()} comments across ${videoOptions.length} videos. What would you like to know?`
        : `Hi! I've analyzed ${selectedVideo?.commentCount.toLocaleString() || 'the'} comments for "${selectedVideo?.title || 'this video'}". What would you like to know?`;
      
      const greeting: Message = {
        id: 'greeting',
        role: 'ai',
        content: greetingContent,
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
    if (id === 'all') {
      navigate('/ai', { replace: true });
    } else {
      navigate(`/ai/${id}`, { replace: true });
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setHasStartedChat(false);
    setConversationId(null);
    setError(null);
    setIsSidebarOpen(false);
    navigate('/ai', { replace: true });
  };

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, askMutation.isPending, scrollToBottom]);

  // Reset conversation when video changes
  useEffect(() => {
    if (routeVideoId && routeVideoId !== selectedVideoId) {
      setSelectedVideoId(routeVideoId);
      setMessages([]);
      setHasStartedChat(false);
      setConversationId(null);
      setError(null);
    }
  }, [routeVideoId]);

  // =========================================================================
  // Shared Props
  // =========================================================================
  
  const sidebarProps = {
    isSidebarOpen,
    onSidebarOpen: () => setIsSidebarOpen(true),
    onSidebarClose: () => setIsSidebarOpen(false),
    conversations,
    videoMap,
    currentConversationId: conversationId,
    onLoadConversation: handleLoadConversation,
    onNewConversation: handleNewConversation,
    isLoadingConversations,
  };
  
  const videoSelectorProps = {
    selectedVideo,
    selectedVideoId,
    videoOptions,
    isVideoSelectorOpen,
    isLoadingVideos,
    onVideoSelectorToggle: () => setIsVideoSelectorOpen(!isVideoSelectorOpen),
    onVideoSelect: handleVideoSelect,
  };
  
  const inputProps = {
    input,
    onInputChange: setInput,
    onSend: handleSend,
    onKeyDown: handleKeyDown,
    isLoading: askMutation.isPending,
    inputRef,
    quotaData,
  };

  // =========================================================================
  // Render
  // =========================================================================

  if (isLoadingConversation) {
    return <LoadingView />;
  }

  if (!hasStartedChat) {
    return (
      <InitialView
        {...sidebarProps}
        {...videoSelectorProps}
        {...inputProps}
        suggestions={suggestions}
        error={error}
      />
    );
  }

  return (
    <ChatView
      {...sidebarProps}
      {...videoSelectorProps}
      {...inputProps}
      messages={messages}
      messagesEndRef={messagesEndRef}
      suggestions={suggestions}
      error={error}
    />
  );
};

export default AskAI;
