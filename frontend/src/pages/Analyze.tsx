import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, AlertCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useQueryClient } from '@tanstack/react-query';
import type { AnalysisStep } from '@/types/analysis';

// Step labels for display
const STEP_LABELS: Record<AnalysisStep, string> = {
  queued: 'Queued for processing',
  connecting: 'Connecting to YouTube',
  fetching_video: 'Fetching video metadata',
  fetching_comments: 'Downloading comments',
  analyzing_sentiment: 'AI analyzing sentiment',
  classifying: 'Categorizing comments',
  extracting_insights: 'Extracting insights',
  generating_summary: 'Generating summary',
  saving: 'Saving results',
  completed: 'Analysis complete',
  failed: 'Analysis failed',
};

// Ordered list of steps for display
const STEP_ORDER: AnalysisStep[] = [
  'connecting',
  'fetching_video',
  'fetching_comments',
  'analyzing_sentiment',
  'classifying',
  'extracting_insights',
  'generating_summary',
  'saving',
];

type DisplayStep = {
  id: AnalysisStep;
  label: string;
  detail?: string;
  status: 'pending' | 'loading' | 'complete';
};

const Analyze = () => {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { videoId } = useParams<{ videoId?: string }>();
  
  const { startAnalysis, getAnalysis, state } = useAnalysis();
    // If videoId is in URL params, try to find existing analysis for that video
  useEffect(() => {
    if (videoId && !analysisId) {
      // Find an active analysis for this video_id
      const existingAnalysis = state.activeAnalyses.find(
        a => a.videoId === videoId && a.step !== 'completed' && a.step !== 'failed'
      );
      
      if (existingAnalysis) {
        setAnalysisId(existingAnalysis.analysisId);
        setIsAnalyzing(true);
      }
    }
  }, [videoId, analysisId, state.activeAnalyses]);
    // Get the current analysis from context
  const activeAnalysis = analysisId ? getAnalysis(analysisId) : undefined;
  
  // Build display steps from active analysis
  const [steps, setSteps] = useState<DisplayStep[]>([]);

  useEffect(() => {
    if (!activeAnalysis) {
      setSteps(STEP_ORDER.map((step) => ({
        id: step,
        label: STEP_LABELS[step],
        status: 'pending',
      })));
      return;
    }

    const currentStepIndex = STEP_ORDER.indexOf(activeAnalysis.step as AnalysisStep);
    
    const newSteps = STEP_ORDER.map((step, index) => {
      let status: 'pending' | 'loading' | 'complete' = 'pending';
      
      if (activeAnalysis.step === 'completed') {
        status = 'complete';
      } else if (activeAnalysis.step === 'failed') {
        if (index < currentStepIndex) status = 'complete';
        else if (index === currentStepIndex) status = 'loading';
        else status = 'pending';
      } else if (index < currentStepIndex) {
        status = 'complete';
      } else if (index === currentStepIndex) {
        status = 'loading';
      }
      
      // Add comment count detail for fetching_comments step
      let detail: string | undefined;
      if (step === 'fetching_comments' && activeAnalysis.commentsFetched !== undefined) {
        const total = activeAnalysis.totalComments || '...';
        detail = `(${activeAnalysis.commentsFetched}/${total})`;
      }
      
      return {
        id: step,
        label: STEP_LABELS[step],
        detail,
        status,
      };
    });
    
    setSteps(newSteps);
  }, [activeAnalysis]);

  // Handle analysis completion
  useEffect(() => {
    if (!activeAnalysis) return;
    
    if (activeAnalysis.step === 'completed' && activeAnalysis.analysisId) {
      // Invalidate the analysis history cache so Videos page shows new data immediately
      queryClient.invalidateQueries({ queryKey: ['analysisHistory'] });
      
      // Wait a moment for the celebration, then redirect
      const timer = setTimeout(() => {
        navigate(`/videos/${activeAnalysis.analysisId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
    
    if (activeAnalysis.step === 'failed') {
      setError(activeAnalysis.error || 'Analysis failed. Please try again.');
    }
  }, [activeAnalysis, navigate, queryClient]);

  const validateUrl = (value: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(value);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    setError(null);
    if (value.length > 10) {
      setIsValid(validateUrl(value));
    } else {
      setIsValid(null);
    }
  };

  const handleAnalyze = async () => {
    if (!validateUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    
    setError(null);
    setIsAnalyzing(true);
    
    try {
      const newAnalysisId = await startAnalysis(url);
      setAnalysisId(newAnalysisId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis');
      setIsAnalyzing(false);
    }
  };

  const handleSample = (type: 'tech' | 'vlog') => {
    const sampleUrls = {
      tech: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      vlog: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    };
    setUrl(sampleUrls[type]);
    setIsValid(true);
  };

  const handleCancel = () => {
    setIsAnalyzing(false);
    setAnalysisId(null);
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    handleAnalyze();
  };

  // Calculate progress from active analysis
  const progress = activeAnalysis?.progress ?? 0;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatePresence mode="wait">
            {!isAnalyzing ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <h1 className="text-4xl font-bold mb-3">Analyze New Video</h1>
                <p className="text-muted-foreground mb-10">
                  Paste a YouTube video URL to analyze its comments
                </p>

                <div className="card-premium max-w-2xl mx-auto">
                  <div className="relative mb-5">
                    <input
                      type="url"
                      value={url}
                      onChange={handleUrlChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className={`input-premium w-full h-14 text-base ${
                        isValid === false ? 'border-destructive focus:border-destructive' : ''
                      } ${
                        isValid === true ? 'border-success focus:border-success' : ''
                      }`}
                    />
                    {isValid !== null && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {isValid ? (
                          <Check className="w-5 h-5 text-success" />
                        ) : (
                          <span className="w-5 h-5 text-destructive">✕</span>
                        )}
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive mb-5 justify-center">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    onClick={handleAnalyze}
                    disabled={!url || isValid === false}
                    className="btn-primary w-full h-14 text-base"
                  >
                    Analyze Video
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-2xl mx-auto"
              >
                {/* Video Info Header (if available) */}
                {activeAnalysis?.videoTitle && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-card border border-border rounded-xl flex items-center gap-4"
                  >
                    {activeAnalysis.videoThumbnail && (
                      <img
                        src={activeAnalysis.videoThumbnail}
                        alt={activeAnalysis.videoTitle}
                        className="w-24 h-14 object-cover rounded-lg"
                      />
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{activeAnalysis.videoTitle}</h3>
                      <p className="text-xs text-muted-foreground">
                        {activeAnalysis.totalComments?.toLocaleString() || '...'} comments
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Progress Header */}
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="mb-8"
                >
                  <h1 className="text-4xl font-bold mb-4">
                    {activeAnalysis?.step === 'failed' ? (
                      <span className="text-destructive">Analysis Failed</span>
                    ) : activeAnalysis?.step === 'completed' ? (
                      <span className="text-success">Complete! 🎉</span>
                    ) : (
                      <>Analyzing... <span className="text-primary">{Math.round(progress)}%</span></>
                    )}
                  </h1>
                  
                  {/* Progress Bar */}
                  <div className="progress-bar">
                    <motion.div
                      className={`progress-fill ${
                        activeAnalysis?.step === 'failed' ? '!bg-destructive' :
                        activeAnalysis?.step === 'completed' ? '!bg-success' : ''
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>

                {/* Error Message */}
                {activeAnalysis?.step === 'failed' && activeAnalysis.error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl"
                  >
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5" />
                      <span>{activeAnalysis.error}</span>
                    </div>
                  </motion.div>
                )}

                {/* Steps List */}
                <div className="card-premium text-left">
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        {step.status === 'complete' && (
                          <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                            <Check className="w-4 h-4 text-success" />
                          </div>
                        )}
                        {step.status === 'loading' && (
                          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        )}
                        {step.status === 'pending' && (
                          <div className="w-6 h-6 rounded-full border-2 border-border" />
                        )}
                        <span
                          className={`text-base ${
                            step.status === 'complete'
                              ? 'text-foreground'
                              : step.status === 'loading'
                              ? 'text-primary font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {step.label}
                          {step.detail && (
                            <span className="text-primary ml-1">{step.detail}</span>
                          )}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-center gap-4">
                  {activeAnalysis?.step === 'failed' ? (
                    <>
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button onClick={handleRetry}>
                        Try Again
                      </Button>
                    </>
                  ) : activeAnalysis?.step === 'completed' ? (
                    <Button onClick={() => navigate(`/videos/${analysisId}`)}>
                      View Results
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You can navigate away - analysis will continue in the background
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Analyze;
