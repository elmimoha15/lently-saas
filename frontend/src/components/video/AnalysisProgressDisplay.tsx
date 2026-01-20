/**
 * Analysis Progress Display
 * Shows real-time progress when video is being analyzed
 */

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface AnalysisProgress {
  step: string;
  progress: number;
  message: string;
  commentsFetched?: number;
  totalComments?: number;
}

interface AnalysisProgressDisplayProps {
  analysis: AnalysisProgress;
  stepLabels: Record<string, string>;
}

export const AnalysisProgressDisplay = ({ analysis, stepLabels }: AnalysisProgressDisplayProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto py-12"
    >
      <h2 className="text-2xl font-bold mb-8 text-center">Analyzing Video...</h2>
      
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">{Math.round(analysis.progress)}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${analysis.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Current Step */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 text-primary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">
            {stepLabels[analysis.step] || analysis.message}
          </span>
        </div>
        {analysis.step === 'fetching_comments' && analysis.commentsFetched && (
          <p className="text-sm text-muted-foreground mt-2 ml-8">
            Downloaded {analysis.commentsFetched} of {analysis.totalComments || '...'} comments
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center mt-6">
        You can navigate away - analysis will continue in the background
      </p>
    </motion.div>
  );
};
