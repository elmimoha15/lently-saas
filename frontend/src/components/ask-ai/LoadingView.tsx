import { Loader2 } from 'lucide-react';
import { AskAILayout } from './AskAILayout';

/**
 * Loading state view for when a conversation is being loaded.
 */
export const LoadingView = () => {
  return (
    <AskAILayout>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    </AskAILayout>
  );
};
