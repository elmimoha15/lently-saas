import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisApi, askAiApi } from '@/services/api.service';
import { useBilling } from '@/contexts/BillingContext';
import { useUpgradeModal } from '@/hooks/useUpgradeModal';
import { toast } from 'sonner';
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
  const queryClient = useQueryClient();
  
  // Get billing data from single source of truth
  const { usage, currentPlan, canAskQuestion, refreshBilling } = useBilling();
  const { showUpgradeModal, handleQuotaError, pendingAction, clearPendingAction } = useUpgradeModal();
  
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Resume pending action after successful payment
  useEffect(() => {
    if (hasStartedChat && conversationId && selectedVideoId) {
      const state = {
        conversationId,
        videoId: selectedVideoId,
        timestamp: Date.now(),
      };
      sessionStorage.setItem('lently_active_conversation', JSON.stringify(state));
    }
  }, [hasStartedChat, conversationId, selectedVideoId]);

  // Restore conversation state on mount if no specific route/query params
  useEffect(() => {
    const shouldRestore = !routeVideoId && !loadConversationId;
    
    if (shouldRestore && isInitialLoad) {
      const stored = sessionStorage.getItem('lently_active_conversation');
      if (stored) {
        try {
          const state = JSON.parse(stored);
          const ageMinutes = (Date.now() - state.timestamp) / (1000 * 60);
          
          // Restore if less than 24 hours old
          if (ageMinutes < 1440 && state.conversationId && state.videoId) {
            console.log('🔄 Restoring previous conversation:', state.conversationId);
            
            // First verify the conversation still exists by attempting to load it
            // This will handle deleted conversations gracefully
            setIsLoadingConversation(true);
            loadConversation(state.conversationId).then(success => {
              if (!success) {
                // Conversation was deleted, show initial view
                setIsInitialLoad(false);
              } else if (state.messages && state.messages.length > 0) {
                // Successfully loaded, use cached messages if available
                setMessages(state.messages);
              }
              // Navigate to the conversation URL if successful
              if (success) {
                navigate(`/ai?conversation=${state.conversationId}`, { replace: true });
              }
            });
          } else {
            // Clear stale data
            sessionStorage.removeItem('lently_active_conversation');
            setIsInitialLoad(false);
          }
        } catch (e) {
          console.error('Failed to restore conversation:', e);
          sessionStorage.removeItem('lently_active_conversation');
          setIsInitialLoad(false);
        }
      } else {
        setIsInitialLoad(false);
      }
    } else if (routeVideoId || loadConversationId) {
      // If there's a specific route param, don't restore from storage
      setIsInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeVideoId, loadConversationId, isInitialLoad]);

  // Persist conversation state when user navigates away
  useEffect(() => {
    if (hasStartedChat && conversationId && selectedVideoId) {
      const state = {
        conversationId,
        videoId: selectedVideoId,
        messages: messages, // Save messages to avoid reloading
        timestamp: Date.now(),
      };
      sessionStorage.setItem('lently_active_conversation', JSON.stringify(state));
    }
  }, [hasStartedChat, conversationId, selectedVideoId, messages]);

  // Resume pending action after successful payment
  useEffect(() => {
    if (pendingAction?.type === 'ask_ai' && canAskQuestion) {
      // User just upgraded and can now ask - resume the action
      const { question, videoId } = pendingAction.payload || {};
      clearPendingAction();
      
      if (videoId) {
        setSelectedVideoId(videoId);
      }
      
      if (question) {
        setInput(question);
        toast.success('Welcome back! Your question is ready to send.');
      } else {
        toast.success('Welcome back! You can now ask AI questions.');
      }
      
      // Focus the input so user can easily submit
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [pendingAction, canAskQuestion, clearPendingAction]);

  // =========================================================================
  // Data Fetching
  // =========================================================================

  // Fetch conversation history list - cached for fast navigation
  const { data: conversationsData, refetch: refetchConversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await askAiApi.getConversations(50);
      if (response.error) return null;
      return response.data;
    },
    // Conversations are cached and don't need frequent refetching
    staleTime: 10 * 60 * 1000, // Stay fresh for 10 minutes
  });

  const conversations: Conversation[] = conversationsData?.conversations || [];

  // Fetch analyzed videos for the selector - shared with Videos page cache
  const { data: historyData, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['analysisHistory'],
    queryFn: async () => {
      const response = await analysisApi.getHistory(50);
      if (response.error) throw new Error(response.error.detail);
      return response.data;
    },
    // Uses global cache settings - shares data with Videos page
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

  // Fetch suggestions when video is selected (only for initial view, not for 'all')
  const { data: suggestionsData } = useQuery({
    queryKey: ['askAiSuggestions', selectedVideoId],
    queryFn: async () => {
      if (!selectedVideoId || selectedVideoId === 'all') return null;
      const response = await askAiApi.getSuggestions(selectedVideoId);
      if (response.error) return null;
      return response.data;
    },
    enabled: !!selectedVideoId && selectedVideoId !== 'all' && !hasStartedChat,
  });

  // Default actionable suggestions - diverse question types
  const suggestions = suggestionsData?.suggestions || [
    // Strategic questions
    'What video should I make next based on audience demand?',
    'What should I improve in my next video?',
    
    // Analytical questions  
    'What did people complain about?',
    'What confused viewers the most?',
    
    // Sentiment questions
    'Is this video a hit?',
    'Do they really love it?',
    
    // Community questions
    'Who are my superfans I should engage with?',
    'What are the top questions I should answer?',
    
    // Exploratory questions
    "What's the most interesting pattern in the comments?",
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
          // Include enriched metadata for AI messages
          ...(msg.key_points && { keyPoints: msg.key_points }),
          ...(msg.follow_up_questions && { followUpQuestions: msg.follow_up_questions }),
          ...(msg.sources && { sources: msg.sources })
        }));

        setMessages(loadedMessages);
        setSelectedVideoId(data.video_id);
        setConversationId(convId);
        setHasStartedChat(true);
        setIsInitialLoad(false);
        return true; // Success
      } else {
        // Conversation not found
        throw new Error('Conversation not found');
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      
      // If conversation doesn't exist (was deleted), clear storage and reset
      if (err instanceof Error && (err.message.includes('not found') || err.message.includes('404'))) {
        console.log('🗑️ Conversation no longer exists, clearing storage');
        sessionStorage.removeItem('lently_active_conversation');
        setHasStartedChat(false);
        setMessages([]);
        setConversationId(null);
        setSelectedVideoId('');
        navigate('/ai', { replace: true });
      } else {
        setError('Failed to load conversation');
      }
      return false; // Failed
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleLoadConversation = useCallback((convId: string, videoId: string) => {
    // Immediately switch to chat view and navigate
    setConversationId(convId);
    setSelectedVideoId(videoId);
    setHasStartedChat(true);
    setIsLoadingConversation(true); // Show skeleton during load
    setMessages([]); // Clear messages first for clean transition
    navigate(`/ai?conversation=${convId}`, { replace: true });
    
    // Load conversation data in background
    loadConversation(convId);
  }, [navigate]);

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
      // Check if this is a quota exceeded error (402 from backend)
      const errorMessage = error.message;
      
      if (errorMessage.includes('quota_exceeded') || 
          errorMessage.includes('AI question') ||
          errorMessage.includes('question limit')) {
        // Handle quota error - show upgrade modal with pending action
        handleQuotaError(
          {
            error: 'quota_exceeded',
            message: errorMessage,
            current: usage?.ai_questions_used || 0,
            limit: usage?.ai_questions_limit || 2,
          },
          {
            type: 'ask_ai',
            payload: { 
              videoId: selectedVideoId,
            },
          }
        );
        return;
      }
      
      setError(errorMessage);
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
      showUpgradeModal(
        {
          limitType: 'ai_questions',
          currentUsage: usage?.ai_questions_used,
          currentLimit: usage?.ai_questions_limit,
        },
        // Store the pending action so we can resume after upgrade
        {
          type: 'ask_ai',
          payload: { 
            question: messageText,
            videoId: selectedVideoId,
          },
        }
      );
      return;
    }
    
    setError(null);

    // Check if there's an existing conversation for this video that we should reuse
    let existingConversationId = conversationId;
    if (!existingConversationId && conversations.length > 0) {
      const existingConv = conversations.find(c => c.video_id === selectedVideoId);
      if (existingConv) {
        // Load the existing conversation first
        existingConversationId = existingConv.conversation_id;
        setConversationId(existingConversationId);
        
        // Load the conversation messages if we haven't started chat yet
        if (!hasStartedChat) {
          await loadConversation(existingConversationId);
        }
      }
    }

    // Start chat mode if not already
    if (!hasStartedChat) {
      setHasStartedChat(true);
      // Only add greeting if there's no existing conversation
      if (!existingConversationId) {
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

    // Ask the question (use existing conversation ID if found)
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
    navigate('/ai', { replace: true });
  };

  const handleDeleteConversation = async (conversationIdToDelete: string) => {
    // Optimistically remove from cache immediately
    queryClient.setQueryData(['conversations'], (oldData: { conversations: Conversation[] } | null) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        conversations: oldData.conversations.filter(c => c.conversation_id !== conversationIdToDelete)
      };
    });
    
    // If we deleted the current conversation, reset the chat and clear storage
    if (conversationIdToDelete === conversationId) {
      sessionStorage.removeItem('lently_active_conversation');
      handleNewConversation();
    }
    
    // Delete in background (no await, fire and forget)
    askAiApi.deleteConversation(conversationIdToDelete).catch(error => {
      console.error('Failed to delete conversation:', error);
      // Optionally refetch to restore if delete failed
      refetchConversations();
    });
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
    conversations,
    videoMap,
    currentConversationId: conversationId,
    onLoadConversation: handleLoadConversation,
    onNewConversation: handleNewConversation,
    onDeleteConversation: handleDeleteConversation,
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
  
  const videoInfoProps = {
    selectedVideo,
    selectedVideoId,
    videoOptions,
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

  if (!hasStartedChat && !isLoadingConversation) {
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
      {...videoInfoProps}
      {...inputProps}
      messages={messages}
      messagesEndRef={messagesEndRef}
      suggestions={suggestions}
      error={error}
      isLoadingConversation={isLoadingConversation}
    />
  );
};

export default AskAI;
