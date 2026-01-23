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
Write a clear, professional executive summary for a YouTube creator. This is the HERO INSIGHT they see first.

## REQUIRED FORMAT (follow exactly):

1. **Opening Statement** (1 sentence):
   Write: "The comment section for [video title] reveals a predominantly [positive/negative/mixed] sentiment, with [X]% of viewers expressing [positive/negative] opinions compared to [Y]% [positive/negative]."
   Use the EXACT percentages from the sentiment data provided.

2. **Key Findings** (2-3 complete bullet points):
   Each bullet MUST be a complete sentence with a number.
   Example: "45% of comments were questions, indicating high audience curiosity."
   Example: "The top category was appreciation with 30 comments."
   DO NOT write incomplete sentences like "75% of viewers expressing..."

3. **Top Priority** (1 sentence):
   One specific, actionable recommendation with data to support it.
   Example: "Address the 25 questions about installation to reduce viewer confusion."

## CRITICAL RULES:
- Every sentence must be COMPLETE (subject + verb + object)
- Include specific percentages and numbers from the data
- NO formatting tags [b], **bold**, etc. - plain text only
- DO NOT start sentences with "and", "or", "but"
- The key_findings array must have 2-3 COMPLETE sentences

## RESPONSE FORMAT (JSON)
{{
  "executive_summary": "The comment section for [title] reveals... [full paragraph with key findings integrated]",
  "key_metrics": {{
    "sentiment_score": [positive_percentage as integer],
    "engagement_quality": "high/medium/low",
    "actionable_comments_percentage": [percentage of questions+suggestions+requests]
  }},
  "key_findings": [
    "First complete finding sentence with a number.",
    "Second complete finding sentence with data.",
    "Third complete finding (optional)."
  ],
  "priority_actions": [
    "First specific action with supporting data",
    "Second action",
    "Third action"
  ]
}}

Respond ONLY with valid JSON, no additional text."""
