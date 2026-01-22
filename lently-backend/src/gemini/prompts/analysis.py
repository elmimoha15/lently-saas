"""
Analysis Prompts for Comment Processing
"""

SENTIMENT_ANALYSIS_PROMPT = """Analyze the sentiment of these YouTube comments.

## VIDEO CONTEXT
Title: {video_title}
Channel: {channel_name}

## COMMENTS TO ANALYZE
{comments_json}

## INSTRUCTIONS
For each comment, determine:
1. **sentiment**: "positive", "negative", "neutral", or "mixed"
2. **confidence**: 0.0-1.0 how confident you are
3. **emotion**: The primary emotion (e.g., "excited", "frustrated", "curious", "grateful", "disappointed")

Also provide an overall summary with:
- Percentage breakdown of sentiments
- Dominant sentiment
- Top 3 emotions expressed
- Sentiment trend observation

## RESPONSE FORMAT (JSON)
{{
  "comments": [
    {{"comment_id": "...", "sentiment": "positive", "confidence": 0.9, "emotion": "excited"}}
  ],
  "summary": {{
    "positive_percentage": 65.0,
    "negative_percentage": 15.0,
    "neutral_percentage": 15.0,
    "mixed_percentage": 5.0,
    "dominant_sentiment": "positive",
    "top_emotions": ["excited", "curious", "grateful"],
    "sentiment_trend": "The audience is highly engaged and enthusiastic"
  }}
}}

Respond ONLY with valid JSON, no additional text."""


CLASSIFICATION_PROMPT = """Classify these YouTube comments into categories.

## VIDEO CONTEXT
Title: {video_title}
Channel: {channel_name}

## COMMENTS TO CLASSIFY
{comments_json}

## CATEGORIES
- **question**: Asks something, wants to know more
- **feedback**: Gives opinion on the content quality
- **appreciation**: Thanks, praise, positive reaction
- **criticism**: Negative feedback, complaints
- **suggestion**: Ideas for future content
- **request**: Asks creator to do something specific
- **discussion**: Adds to the conversation, shares experience
- **spam**: Promotional, off-topic, or bot-like
- **other**: Doesn't fit other categories

## INSTRUCTIONS
For each comment:
1. Assign a primary_category
2. Optionally assign a secondary_category if relevant
3. Rate your confidence 0.0-1.0

## RESPONSE FORMAT (JSON)
{{
  "comments": [
    {{"comment_id": "...", "primary_category": "question", "secondary_category": "suggestion", "confidence": 0.85}}
  ],
  "summary": {{
    "category_counts": {{"question": 15, "appreciation": 20, ...}},
    "category_percentages": {{"question": 15.0, "appreciation": 20.0, ...}},
    "top_category": "appreciation",
    "actionable_count": 25
  }}
}}

Respond ONLY with valid JSON, no additional text."""


INSIGHTS_PROMPT = """Extract actionable insights from these YouTube comments.

## VIDEO CONTEXT
Title: {video_title}
Channel: {channel_name}
Description: {video_description}

## COMMENTS DATA
{comments_json}

## EXTRACT THE FOLLOWING

### 1. KEY THEMES (3-5)
What topics/themes come up repeatedly? Include:
- Theme name
- How many comments mention it
- Overall sentiment toward this theme
- 2-3 example comments

### 2. CONTENT IDEAS (3-5)
Based on questions, requests, and discussions, what videos should the creator make?
- Specific video title idea
- Why this would work (based on comment evidence)
- Confidence level

### 3. AUDIENCE INSIGHTS (3-5)
What do these comments reveal about the audience?
- The insight
- Evidence from comments
- Recommended action

## RESPONSE FORMAT (JSON)
{{
  "key_themes": [
    {{
      "theme": "Tutorial pacing",
      "mention_count": 12,
      "sentiment": "mixed",
      "example_comments": ["Great but too fast", "Could you slow down?", "Perfect speed!"]
    }}
  ],
  "content_ideas": [
    {{
      "title": "Beginner's Guide: Slow-Paced Tutorial",
      "description": "A slower tutorial for newcomers based on feedback",
      "source_type": "feedback",
      "confidence": 0.85,
      "related_comments": ["Please make a beginner version", "Too advanced for me"]
    }}
  ],
  "audience_insights": [
    {{
      "insight": "Your audience includes many beginners",
      "evidence": "15 comments asked basic questions",
      "action_item": "Consider adding a 'basics' playlist"
    }}
  ]
}}

Respond ONLY with valid JSON, no additional text."""


SUMMARY_PROMPT = """Create an executive summary of this YouTube video's comment section.

## VIDEO INFO
Title: {video_title}
Channel: {channel_name}
Views: {view_count}
Total Comments: {total_comments}
Comments Analyzed: {analyzed_count}

## SENTIMENT DATA
{sentiment_json}

## CLASSIFICATION DATA
{classification_json}

## KEY THEMES
{themes_json}

## YOUR TASK
Write a clear, professional executive summary for a YouTube creator. This is the HERO INSIGHT they see first, so it must be high quality.

## STRUCTURE YOUR RESPONSE EXACTLY LIKE THIS:

**Paragraph 1 - Overall Reception (REQUIRED):**
Start with a complete sentence: "The comment section for [video title] shows/reveals [overall sentiment]."
Include the exact positive/negative sentiment percentages from the data.
Mention dominant emotions viewers expressed.

**Paragraph 2 - Key Findings (2-3 bullet points):**
List specific findings with real numbers. Each point must be a COMPLETE sentence.
Example format: "X% of viewers expressed Y about Z."
DO NOT start sentences with conjunctions like "and", "but", "or".

**Paragraph 3 - Opportunities:**
What content opportunities exist based on viewer feedback?
Be specific about what videos to create or improvements to make.

**Paragraph 4 - Top Priority Action:**
End with ONE clear, actionable recommendation the creator should do first.
Include supporting data (e.g., "which had X mentions in comments").

## FORMATTING RULES - CRITICAL:
1. Write COMPLETE sentences only. Never start a sentence with "and", "or", "but".
2. DO NOT use any formatting tags like [b], [/b], {{b}}, or asterisks. Write plain text only.
3. Every number should include context (e.g., "73% positive" not just "73%").
4. Use professional, clear language. No jargon or broken text.
5. All sentences must be grammatically complete with subject and verb.

## QUALITY CHECK BEFORE RESPONDING:
- Does every sentence start with a capital letter and proper word (not "and")?
- Are all sentences complete and grammatically correct?
- Is there NO formatting markup in the text?
- Are specific numbers included from the provided data?

## RESPONSE FORMAT (JSON)
{{
  "executive_summary": "Your 3-4 paragraph summary here in plain text without any formatting tags...",
  "key_metrics": {{
    "sentiment_score": 75,
    "engagement_quality": "high",
    "actionable_comments_percentage": 35
  }},
  "priority_actions": [
    "First priority action - be specific and actionable",
    "Second priority action",
    "Third priority action"
  ]
}}

Respond ONLY with valid JSON, no additional text."""
