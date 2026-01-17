import { ArrowUp, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  quotaData?: {
    questions_used: number;
    questions_limit: number;
    plan: string;
  } | null;
  variant?: 'initial' | 'chat';
}

export const ChatInput = ({
  value,
  onChange,
  onSend,
  onKeyDown,
  disabled = false,
  isLoading = false,
  placeholder = 'Ask me anything about these comments...',
  inputRef,
  quotaData,
  variant = 'chat',
}: ChatInputProps) => {
  // Check if unlimited (Business plan with very high limit)
  const isUnlimited = quotaData && quotaData.questions_limit >= 999999;
  const isQuotaExhausted = quotaData && !isUnlimited && quotaData.questions_used >= quotaData.questions_limit;
  const canSend = value.trim() && !disabled && !isLoading && !isQuotaExhausted;

  return (
    <div className={variant === 'chat' ? 'bg-background p-4' : 'bg-transparent'}>
      {/* Quota Exhausted Warning */}
      {isQuotaExhausted && (
        <div className="flex items-center justify-center gap-2 mb-3 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>You've used all your AI questions this month.</span>
          <Link to="/settings/billing" className="font-medium underline hover:no-underline">
            Upgrade now
          </Link>
        </div>
      )}
      
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isQuotaExhausted ? 'Upgrade to continue asking questions...' : placeholder}
          disabled={disabled || isLoading || isQuotaExhausted}
          rows={1}
          className="w-full resize-none bg-card border border-border rounded-2xl px-4 pr-14 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed leading-[52px]"
          style={{ height: '52px', overflow: 'hidden' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            if (target.value.includes('\n') || target.scrollHeight > 52) {
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
              target.style.lineHeight = '1.5';
              target.style.paddingTop = '14px';
              target.style.paddingBottom = '14px';
              target.style.overflow = 'auto';
            } else {
              target.style.height = '52px';
              target.style.lineHeight = '52px';
              target.style.paddingTop = '0';
              target.style.paddingBottom = '0';
              target.style.overflow = 'hidden';
            }
          }}
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-md'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ArrowUp className="w-5 h-5" />
          )}
        </button>
      </div>
      
      {/* Quota Display */}
      {quotaData && !isQuotaExhausted && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {isUnlimited 
            ? `${quotaData.questions_used} questions used this month — ${quotaData.plan} Plan (Unlimited)`
            : `${quotaData.questions_used}/${quotaData.questions_limit} questions used this month — ${quotaData.plan} Plan`
          }
        </p>
      )}
    </div>
  );
};
