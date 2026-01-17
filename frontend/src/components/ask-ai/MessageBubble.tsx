import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Check } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  sources?: Array<{ author: string; text: string }>;
  keyPoints?: string[];
  followUpQuestions?: string[];
}

interface MessageBubbleProps {
  message: Message;
  onFollowUp?: (question: string) => void;
}

export const MessageBubble = ({ message, onFollowUp }: MessageBubbleProps) => {
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
