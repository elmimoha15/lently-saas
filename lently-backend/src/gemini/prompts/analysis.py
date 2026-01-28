"""
Analysis Prompts for Comment Processing
"""

SENTIMENT_ANALYSIS_PROMPT = """Analyze the sentiment of these YouTube comments with high accuracy.

## VIDEO CONTEXT
Title: {video_title}
Channel: {channel_name}

## COMMENTS TO ANALYZE
{comments_json}

## SENTIMENT CLASSIFICATION GUIDELINES
Classify each comment's sentiment as:

**POSITIVE** - The commenter expresses:
- Gratitude, thanks, appreciation
- Excitement, enthusiasm, happiness
- Praise, compliments, admiration
- Support, encouragement
- Agreement, endorsement
- Love for the content/creator

**NEGATIVE** - The commenter expresses:
- Frustration, anger, disappointment
- Criticism, complaints
- Disagreement, rejection
- Sarcasm that's clearly negative
- Demands or aggressive requests

**NEUTRAL** - The commenter:
- Asks questions without emotional charge
- States facts objectively
- Shares information without opinion
- Makes observations without judgment

**MIXED** - The comment contains BOTH:
- Clear positive AND negative elements
- Example: "Great video but the audio was terrible"

## ACCURACY RULES
1. Read the entire comment before deciding
2. Consider context and tone, not just keywords
3. Sarcasm should be detected and classified by true intent
4. Emojis strongly indicate sentiment (😊=positive, 😠=negative)
5. ALL CAPS often indicates strong emotion (usually frustration)
6. Be precise - don't default to neutral if there's clear emotion

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

## CATEGORIES (use these exact category names)
- **question**: Asks something, wants information, expresses curiosity
- **appreciation**: Thanks, praise, positive reaction, expressing love for content
- **complaint**: Negative feedback, criticism, expressing disappointment or frustration
- **suggestion**: Ideas for future content, recommendations, feature requests
- **discussion**: Adds to the conversation, shares personal experience, general commentary
- **spam**: Promotional content, off-topic, bot-like, self-promotion
- **other**: Doesn't fit other categories

## CLASSIFICATION GUIDELINES
1. Be accurate - the category should match what the commenter is actually doing
2. A negative comment expressing frustration = complaint
3. A positive comment thanking the creator = appreciation
4. Someone asking "how" or "what" or "why" = question
5. "You should make a video about X" = suggestion
6. Personal stories related to topic = discussion

## INSTRUCTIONS
For each comment:
1. Assign a primary_category (use exact names above)
2. Optionally assign a secondary_category if relevant
3. Rate your confidence 0.0-1.0

## RESPONSE FORMAT (JSON)
{{
  "comments": [
    {{"comment_id": "...", "primary_category": "question", "secondary_category": "suggestion", "confidence": 0.85}}
  ],
  "summary": {{
    "category_counts": {{"question": 15, "appreciation": 20, "complaint": 5, "suggestion": 8, "discussion": 10, "spam": 2, "other": 3}},
    "category_percentages": {{"question": 15.0, "appreciation": 20.0, ...}},
    "top_category": "appreciation",
    "actionable_count": 25
  }}
}}

Respond ONLY with valid JSON, no additional text."""


INSIGHTS_PROMPT = """Extract actionable insights from these YouTube comments.

## VIDEO CONTEXT (CRITICAL - ALL INSIGHTS MUST RELATE TO THIS)
Title: {video_title}
Channel: {channel_name}
Description: {video_description}

## COMMENTS DATA
{comments_json}

## CRITICAL RULES
1. **ALL content ideas MUST be directly related to the video's topic** (shown above)
2. DO NOT suggest unrelated video topics - stay within the video's domain
3. Base suggestions ONLY on what viewers explicitly request or ask about in comments
4. If a video is about "habits", suggest habit-related content only
5. If a video is about "coding", suggest coding-related content only
6. If comments don't contain clear requests, extract themes from the video topic itself

## EXTRACT THE FOLLOWING

### 1. KEY THEMES (3-5)
What topics/themes from the video come up repeatedly in comments? Include:
- Theme name (must relate to the video's topic)
- How many comments mention it
- Overall sentiment toward this theme
- 2-3 example comments

### 2. CONTENT IDEAS (3-5) - MUST BE RELATED TO VIDEO TOPIC
Based on questions, requests, and discussions, what FOLLOW-UP videos should the creator make?
**IMPORTANT**: Each idea must be a logical continuation or expansion of the video's main topic.
- For a video about "habits" → suggest more habit/productivity content
- For a video about "cooking" → suggest more cooking/recipe content
- NEVER suggest completely unrelated topics like "coding" for a "habits" video

For each idea include:
- Specific video title idea (related to the original video's domain)
- Why this would work (based on comment evidence - quote actual comments)
- Confidence level
- The specific comments that requested or inspired this idea

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
