/**
 * Hero Insight Section
 * Displays the main insight with structured breakdown:
 * - Main insight statement
 * - Key findings (metrics)
 * - Opportunities
 * - Action items
 * - Top priority
 */

import { Sparkles, TrendingUp, Zap, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExecutiveSummary {
  summary_text: string;
  key_findings?: string[];
  priority_actions?: string[];
}

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
}

interface Categories {
  questions: number;
  praise: number;
  complaints: number;
  suggestions: number;
  spam: number;
  general: number;
}

interface HeroInsightSectionProps {
  executiveSummary: ExecutiveSummary | null;
  sentimentData: SentimentData;
  categories: Categories;
  commentsAnalyzed: number;
}

/**
 * Sanitize text by removing broken/malformed formatting tags
 * Handles: {/b}, [/b] without opener, orphan [b], curly brace variants, etc.
 */
const sanitizeText = (text: string): string => {
  let cleaned = text;
  
  // Remove broken variants with curly braces: {b}, {/b}, {b}text{/b}
  cleaned = cleaned.replace(/\{b\}|\{\/b\}/gi, '');
  
  // Remove orphan closing tags without openers: [/b] not preceded by [b]
  // Process iteratively to handle nested/repeated cases
  let prevLength = 0;
  while (prevLength !== cleaned.length) {
    prevLength = cleaned.length;
    // Remove [/b] that doesn't have a matching [b] before it
    cleaned = cleaned.replace(/^([^\[]*)\[\/b\]/gi, '$1');
    cleaned = cleaned.replace(/\[\/b\]([^\[]*$)/gi, '$1');
  }
  
  // Remove orphan [b] tags that don't have a [/b] after them
  cleaned = cleaned.replace(/\[b\](?![^\[]*\[\/b\])/gi, '');
  
  // Clean up any remaining orphan tags
  cleaned = cleaned.replace(/\[b\]\s*\[\/b\]/gi, ''); // Empty bold tags
  
  // Fix double spaces that may result from removals
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  
  return cleaned;
};

/**
 * Convert **text** or [b]text[/b] format to JSX with bold elements
 * First sanitizes text to remove broken formatting, then applies proper bold styling
 */
const formatTextWithBold = (text: string) => {
  // First sanitize any broken formatting
  const sanitized = sanitizeText(text);
  
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  const regex = /(\*\*(.*?)\*\*|\[b\](.*?)\[\/b\])/g;
  let match;
  let key = 0;

  while ((match = regex.exec(sanitized)) !== null) {
    if (match.index > lastIndex) {
      parts.push(sanitized.substring(lastIndex, match.index));
    }
    const boldText = match[2] || match[3];
    parts.push(<strong key={key++} className="font-bold">{boldText}</strong>);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < sanitized.length) {
    parts.push(sanitized.substring(lastIndex));
  }

  return parts.length > 0 ? parts : sanitized;
};

export const HeroInsightSection = ({
  executiveSummary,
  sentimentData,
  categories,
  commentsAnalyzed,
}: HeroInsightSectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-premium bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30 relative overflow-hidden"
    >
      {/* Sparkle decoration */}
      <div className="absolute top-4 right-4">
        <Sparkles className="w-8 h-8 text-primary/20" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Hero Insight</h3>
        </div>
        
        {executiveSummary?.summary_text ? (
          <div className="prose prose-lg max-w-none">
            {(() => {
              // Sanitize the text first to remove any broken formatting
              const text = sanitizeText(executiveSummary.summary_text);
              
              // Split into sentences
              const sentences = text.split(/(?<=[.!?])\s+/);
              
              // First sentence as main insight
              const mainInsight = sentences[0];
              
              // Use key_findings from API if available, otherwise extract from text
              const keyFindings = executiveSummary.key_findings && executiveSummary.key_findings.length > 0
                ? executiveSummary.key_findings
                : text.match(/(\d+%[^.!?]*[.!?])/g) || [];
              
              return (
                <div className="space-y-4">
                  {/* Main insight */}
                  <p className="text-lg font-semibold text-foreground leading-relaxed">
                    {formatTextWithBold(mainInsight)}
                  </p>
                  
                  {/* Key findings as bullets - from API or parsed */}
                  {keyFindings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Key Findings:</p>
                      <ul className="space-y-1.5 ml-0">
                        {keyFindings.slice(0, 4).map((finding: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-1">•</span>
                            <span>{typeof finding === 'string' ? sanitizeText(finding.trim()) : finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <p className="text-lg font-semibold text-foreground leading-relaxed mb-4">
            {sentimentData.positive > 70 
              ? `Your audience is loving this! ${sentimentData.positive}% positive sentiment with ${categories.questions} engaged questions.`
              : sentimentData.negative > 30
              ? `${categories.complaints} viewers shared concerns worth addressing - this is valuable feedback.`
              : `${commentsAnalyzed.toLocaleString()} viewers engaged with ${categories.questions} questions and ${categories.suggestions} suggestions.`}
          </p>
        )}
        
        {/* Priority Action Section */}
        {executiveSummary?.priority_actions && executiveSummary.priority_actions.length > 0 && (
          <div className="flex items-start gap-2 p-3 mt-4 bg-primary/5 rounded-lg border border-primary/20">
            <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">Top Priority:</p>
              <p className="text-sm text-foreground">{sanitizeText(executiveSummary.priority_actions[0])}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
