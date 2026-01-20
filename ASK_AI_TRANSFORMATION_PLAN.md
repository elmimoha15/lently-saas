# Ask AI Feature Transformation Plan
## From Data Reporter → Strategic Growth Advisor

**Created:** January 19, 2026  
**Goal:** Transform Ask AI from a comment analysis tool into a strategic growth advisor that YouTubers genuinely want to pay for.

---

## 🎯 CORE PHILOSOPHY SHIFT

### BEFORE (Current State)
- Reports what the data shows
- Answers questions literally
- Provides sentiment percentages and classifications
- Feels like a data dashboard

### AFTER (Target State)
- **Thinks like a strategic advisor, but answers ANY question**
- **Adapts response style to the question asked**
- **Provides info + context when asked, action when needed**
- **Feels like talking to an expert who "gets it"**

### KEY PRINCIPLE: FLEXIBLE BUT STRATEGIC

The AI should answer **any** question users ask:
- ✅ "What did people complain about?" → Direct answer with examples
- ✅ "Is this video a hit?" → Evidence-based sentiment analysis
- ✅ "Do they love my editing?" → Specific praise with quotes
- ✅ "What should I do next?" → Strategic action plan
- ✅ "Tell me about the comments" → Valuable patterns and insights
- ✅ "Why are people mentioning X?" → Focused analysis on that topic

**The strategic lens means:**
- Even when just reporting, add useful context
- Connect insights to what matters (growth, engagement, time saved)
- Use creator-friendly language, not academic jargon
- Provide actionable suggestions **when appropriate**, not forced

---

## 📋 IMPLEMENTATION PHASES

### **PHASE 1: Foundation - Transform the AI Brain** ⭐ START HERE

#### 1.1 Create New Strategic System Prompt
**File:** `lently-backend/src/gemini/prompts/ask_ai.py`

Replace current prompt with **growth-advisor persona**:

```python
"""
You are a YouTube Growth Strategist for Lently.

Your job is to help creators understand their audience and make better decisions.

You answer ANY question about their comments, but you think like a strategist:
- When they ask "what did people complain about?" → Give specifics + how to fix it
- When they ask "is this a hit?" → Explain what's working and why
- When they ask "do they love it?" → Show evidence + what to double down on
- When they ask "what should I do next?" → Provide clear action plan

CRITICAL RULES:
1. ANSWER THE QUESTION DIRECTLY - Don't deflect or redirect
2. BE SPECIFIC - Use actual comment quotes and exact numbers
3. THINK STRATEGICALLY - Even when just reporting, add strategic context
4. USE HUMAN LANGUAGE - Avoid percentages without context
5. ADAPT YOUR STYLE - Match the depth and tone to their question

RESPONSE STYLES BY QUESTION TYPE:

📊 ANALYTICAL ("What did people say about X?")
→ Direct answer with examples, then strategic insight

❤️ SENTIMENT ("Do they love it? Is it a hit?")
→ Show evidence + explain what drives the sentiment

🎯 STRATEGIC ("What should I do next?")
→ Lead with action, prioritize by impact

🔍 EXPLORATORY ("Tell me about the comments")
→ Surface interesting patterns + what they reveal

💡 SPECIFIC ("Why did people mention [topic]?")
→ Answer directly, quote examples, explain significance
"""
```

**Key Changes:**
- Reframe from "comment analyzer" to "growth strategist"
- **Answer ANY question, but through a strategic lens**
- When appropriate, connect insights to actionable decisions
- Use creator-friendly language, not academic data-speak

**IMPORTANT:** Users can ask ANY question:
- "What did people complain about?" → Answer directly, then suggest fixes
- "Is this video a hit?" → Analyze reception, explain what made it successful/unsuccessful
- "Do they really love it?" → Show sentiment + specific examples of praise
- "What should I do next?" → Provide strategic recommendations

The AI adapts its response style to the question, but always thinks strategically.

#### 1.2 Add Comment Intelligence Preprocessing
**File:** `lently-backend/src/ask_ai/service.py`

**New Method:** `_preprocess_comments_for_strategy()`

```python
async def _preprocess_comments_for_strategy(
    self,
    comments: list[dict],
    analysis_data: dict
) -> dict:
    """
    Preprocess comments to extract strategic insights BEFORE sending to AI.
    
    Returns structured data that makes strategic analysis easier:
    - Grouped questions (with frequency)
    - Identified superfans
    - Content requests by demand
    - Confusion patterns
    - Praise patterns
    - Criticism patterns
    """
    
    # 1. FILTER OUT SPAM & LOW-VALUE
    valuable_comments = self._filter_spam_and_low_value(comments)
    
    # 2. GROUP REPEATED QUESTIONS
    question_groups = self._group_similar_questions(valuable_comments)
    
    # 3. IDENTIFY SUPERFANS
    superfans = self._identify_superfans(valuable_comments, analysis_data)
    
    # 4. DETECT CONTENT REQUESTS
    content_requests = self._extract_content_requests(valuable_comments)
    
    # 5. FIND CONFUSION PATTERNS
    confusion_points = self._identify_confusion_patterns(valuable_comments)
    
    # 6. EXTRACT SPECIFIC PRAISE
    specific_praise = self._extract_specific_praise(valuable_comments)
    
    # 7. EXTRACT ACTIONABLE CRITICISM
    actionable_criticism = self._extract_actionable_criticism(valuable_comments)
    
    return {
        "valuable_comments": valuable_comments,
        "question_groups": question_groups,  # [{"question": "...", "count": 12, "examples": [...]}]
        "superfans": superfans,  # [{"author": "...", "engagement_score": 95}]
        "content_requests": content_requests,  # [{"topic": "...", "demand": 23}]
        "confusion_points": confusion_points,  # [{"issue": "...", "frequency": 15}]
        "specific_praise": specific_praise,  # [{"what": "editing style", "count": 34}]
        "actionable_criticism": actionable_criticism  # [{"issue": "intro too long", "count": 18}]
    }
```

**Why This Matters:**
- AI gets pre-processed strategic data, not raw comments
- Reduces token usage (more efficient)
- Makes pattern detection more accurate
- Enables quantified recommendations ("mentioned by 47 viewers")

---

### **PHASE 2: Add Strategic Analysis Functions**

#### 2.1 Spam & Low-Value Filter
**Method:** `_filter_spam_and_low_value()`

```python
def _filter_spam_and_low_value(self, comments: list[dict]) -> list[dict]:
    """
    Remove comments that don't provide strategic value.
    
    ALWAYS IGNORE:
    - Generic praise ("great video!", "nice!", "first!")
    - Obvious spam/bots
    - Promotional spam
    - Pure trolling with no feedback
    
    ALWAYS KEEP:
    - Specific questions
    - Detailed feedback (positive or negative)
    - Content requests
    - Constructive criticism
    - Timestamp references
    """
    
    spam_patterns = [
        r"^(first|second|third)!?$",
        r"^(nice|great|awesome) video!?$",
        r"^(love it|loved this)!?$",
        r"(check out my channel|subscribe to me)",
        r"^❤+$",
        r"^🔥+$",
    ]
    
    min_word_count = 5  # Comments must have substance
    
    valuable = []
    for comment in comments:
        text = comment.get("text", "").strip().lower()
        
        # Skip if too short
        if len(text.split()) < min_word_count:
            continue
            
        # Skip if matches spam patterns
        if any(re.match(pattern, text, re.IGNORECASE) for pattern in spam_patterns):
            continue
            
        # Keep if has substance
        valuable.append(comment)
    
    return valuable
```

#### 2.2 Question Grouping Engine
**Method:** `_group_similar_questions()`

```python
def _group_similar_questions(self, comments: list[dict]) -> list[dict]:
    """
    Group similar questions to show demand patterns.
    
    Example output:
    [
        {
            "question_theme": "How does your editing workflow work?",
            "count": 27,
            "examples": [
                "What editing software do you use?",
                "Can you show your editing process?",
                "How long does editing take you?"
            ],
            "video_idea": "Complete Guide to My Editing Workflow (Step-by-Step)",
            "demand_level": "high"  # high/medium/low
        }
    ]
    """
    
    # Filter to question-type comments
    questions = [c for c in comments if c.get("is_question") or "?" in c.get("text", "")]
    
    # Use simple keyword clustering
    # In production, could use embeddings for better grouping
    groups = {}
    
    for comment in questions:
        text = comment.get("text", "")
        
        # Extract key topics (simplified)
        # Could use NLP or Gemini for better grouping
        keywords = self._extract_question_keywords(text)
        
        # Group by similar keywords
        group_key = tuple(sorted(keywords))
        if group_key not in groups:
            groups[group_key] = {
                "examples": [],
                "count": 0
            }
        
        groups[group_key]["examples"].append(text)
        groups[group_key]["count"] += 1
    
    # Format output
    result = []
    for keywords, data in sorted(groups.items(), key=lambda x: x[1]["count"], reverse=True):
        if data["count"] >= 3:  # Minimum 3 similar questions
            result.append({
                "question_theme": data["examples"][0],  # Use first as representative
                "count": data["count"],
                "examples": data["examples"][:3],
                "video_idea": self._generate_video_idea(keywords),
                "demand_level": "high" if data["count"] >= 15 else "medium" if data["count"] >= 8 else "low"
            })
    
    return result[:10]  # Top 10 question groups
```

#### 2.3 Superfan Identification
**Method:** `_identify_superfans()`

```python
def _identify_superfans(
    self,
    comments: list[dict],
    analysis_data: dict
) -> list[dict]:
    """
    Identify community members who add value and deserve recognition.
    
    Superfan criteria:
    - Multiple thoughtful comments (not just "nice!")
    - Asks constructive questions
    - Provides detailed feedback
    - High engagement (likes, replies)
    - Supportive but not generic
    
    Returns top 5-10 superfans with engagement scores.
    """
    
    # Count authors
    author_stats = {}
    
    for comment in comments:
        author = comment.get("author", "Unknown")
        text = comment.get("text", "")
        word_count = len(text.split())
        
        if author not in author_stats:
            author_stats[author] = {
                "author": author,
                "comment_count": 0,
                "total_words": 0,
                "total_likes": 0,
                "has_questions": False,
                "has_feedback": False
            }
        
        author_stats[author]["comment_count"] += 1
        author_stats[author]["total_words"] += word_count
        author_stats[author]["total_likes"] += comment.get("likes", 0)
        
        if "?" in text:
            author_stats[author]["has_questions"] = True
        if comment.get("is_feedback"):
            author_stats[author]["has_feedback"] = True
    
    # Calculate engagement score
    superfans = []
    for author, stats in author_stats.items():
        if stats["comment_count"] < 2:  # Must comment at least twice
            continue
            
        score = (
            stats["comment_count"] * 10 +
            min(stats["total_words"], 500) / 10 +
            stats["total_likes"] * 2 +
            (20 if stats["has_questions"] else 0) +
            (20 if stats["has_feedback"] else 0)
        )
        
        superfans.append({
            "author": author,
            "engagement_score": int(score),
            "comment_count": stats["comment_count"],
            "reason": "Frequent, thoughtful commenter"
        })
    
    # Return top 10
    superfans.sort(key=lambda x: x["engagement_score"], reverse=True)
    return superfans[:10]
```

#### 2.4 Content Request Detector
**Method:** `_extract_content_requests()`

```python
def _extract_content_requests(self, comments: list[dict]) -> list[dict]:
    """
    Find what viewers want next.
    
    Patterns:
    - "Can you make a video about..."
    - "I'd love to see..."
    - "Please do a tutorial on..."
    - "Next video should be..."
    
    Returns ranked list of content ideas by demand.
    """
    
    request_patterns = [
        r"make a video (about|on) (.+)",
        r"(would|could) you (do|make) (.+)",
        r"tutorial (on|about) (.+)",
        r"i'?d love to see (.+)",
        r"please (cover|do|make) (.+)",
        r"next video (should|could) be (.+)"
    ]
    
    requests = {}
    
    for comment in comments:
        text = comment.get("text", "").lower()
        
        for pattern in request_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                # Extract topic (simplified - could use NLP)
                topic = str(matches[0]) if matches else "various topics"
                topic = topic[:100]  # Limit length
                
                if topic not in requests:
                    requests[topic] = 0
                requests[topic] += 1
    
    # Format and rank
    result = [
        {
            "topic": topic,
            "demand": count,
            "video_title_suggestion": f"Complete Guide to {topic.title()}",
            "priority": "high" if count >= 10 else "medium" if count >= 5 else "low"
        }
        for topic, count in sorted(requests.items(), key=lambda x: x[1], reverse=True)
    ]
    
    return result[:10]  # Top 10
```

---

### **PHASE 3: Update AI Prompt to Use Strategic Data**

#### 3.1 New Prompt Structure
**File:** `lently-backend/src/gemini/prompts/ask_ai.py`

```python
STRATEGIC_ASK_AI_PROMPT = """
You are a YouTube Growth Strategist helping creators make decisions that drive channel growth.

## VIDEO CONTEXT
Title: {video_title}
Channel: {channel_name}
Comments Analyzed: {total_comments}

## STRATEGIC INTELLIGENCE (Pre-processed for you)

### QUESTION PATTERNS (What viewers keep asking)
{question_groups_json}

### CONTENT REQUESTS (What viewers want next)
{content_requests_json}

### TOP SUPERFANS (Community builders worth engaging)
{superfans_json}

### CONFUSION POINTS (What's unclear)
{confusion_points_json}

### SPECIFIC PRAISE (What's working well)
{specific_praise_json}

### ACTIONABLE CRITICISM (What to improve)
{actionable_criticism_json}

### SAMPLE COMMENTS (For reference)
{sample_comments_json}

## CREATOR'S QUESTION
{question}

## HOW TO RESPOND:

**ALWAYS:**
- Answer the question they actually asked (don't force "next steps" if they want info)
- Use specific examples and numbers from the comments
- Think like a strategist, even when just reporting facts
- Adapt your depth and style to match their question

**RESPONSE APPROACH BY QUESTION TYPE:**

**If they ask about sentiment/reception:**
"Is this a hit?" "Do they love it?" "How did people react?"
→ Show clear evidence with numbers and quotes
→ Explain WHAT drove that sentiment
→ Only add "what to do" if it's natural

**If they ask about specific topics:**
"What did people say about X?" "Why are they mentioning Y?"
→ Direct answer with examples
→ Add context about why it matters
→ Surface any patterns

**If they ask for strategy:**
"What should I do next?" "How can I improve?"
→ Lead with action
→ Prioritize by impact
→ Clear next steps

**If they ask exploratory questions:**
"Tell me about the comments" "What's interesting here?"
→ Surface the most valuable patterns
→ What would surprise them or help them most?

## RESPONSE FORMAT (JSON)

{
  "answer": "Answer their actual question directly and naturally. Use 2-3 paragraphs. Be conversational. Include specific numbers and quotes. If the question calls for strategy, provide it. If they just want info, give them great info with strategic context.",
  
  "confidence": 0.9,
  
  "key_actions": [
    // ONLY include if the question is strategic or if actions are natural
    // If they just asked "what did people complain about?", this can be empty
    "Specific action #1 with clear impact",
    "Specific action #2 with clear impact"
  ],
  
  "impact_analysis": {
    // ONLY if question is strategic/action-oriented
    // Skip for pure info questions
    "potential_views": "Estimate if this could increase views",
    "engagement_boost": "How this improves community",
    "time_investment": "How much effort required",
    "priority": "high|medium|low"
  },
  
  "video_ideas": [
    // ONLY if relevant to their question
    {
      "title": "Specific video title based on demand",
      "demand_level": "27 viewers asked about this",
      "why_it_will_perform": "Clear explanation of why this will get views"
    }
  ],
  
  "questions_to_answer": [
    // ONLY if relevant to their question
    {
      "question": "Grouped question theme",
      "frequency": "Asked 15 times",
      "best_response_method": "Pin comment | Community post | New video",
      "reach": "Would address 34% of viewer confusion"
    }
  ],
  
  "community_actions": [
    // ONLY if relevant to their question
    {
      "action": "Reply to @username",
      "why": "Top superfan who always adds value",
      "suggested_reply": "Optional: Suggest authentic reply"
    }
  ],
  
  "follow_up_questions": [
    "Natural follow-up question #1",
    "Natural follow-up question #2"
  ]
}

**KEY PRINCIPLE:** Match your response to their question. Don't force strategic recommendations when they just want information. But when you DO provide info, think strategically about context and relevance.

**EXAMPLES:**

Question: "What did people complain about?"
→ Answer: List specific complaints with frequency, then optionally note which are easiest to fix

Question: "Is this video a hit?"
→ Answer: Show evidence of strong/weak performance, explain what's driving it

Question: "What should I make next?"
→ Answer: Lead with top video ideas ranked by demand, include clear reasoning

Question: "Do they really love my editing style?"
→ Answer: Show specific praise with quotes, note frequency, suggest doubling down

Remember: Answer what they asked, but think like a strategist.
"""
```

---

### **PHASE 4: Frontend UX Transformation**

#### 4.1 Add Strategic Quick Actions
**File:** `frontend/src/pages/AskAI.tsx`

Replace generic suggestions with **strategic action buttons**:

```typescript
const STRATEGIC_SUGGESTIONS = [
  {
    category: "🎬 Content Strategy",
    questions: [
      "What video should I make next based on audience demand?",
      "What topics are viewers requesting most?",
      "What questions could become high-performing videos?"
    ]
  },
  {
    category: "📈 Improvement",
    questions: [
      "What confused viewers that I need to clarify?",
      "What did people criticize that I should improve?",
      "What should I do differently in my next video?"
    ]
  },
  {
    category: "✨ Double Down",
    questions: [
      "What did viewers love that I should keep doing?",
      "What specific moments or styles resonated most?",
      "What makes my content different from competitors?"
    ]
  },
  {
    category: "💬 Engagement",
    questions: [
      "Who are my superfans I should engage with?",
      "What are the top 5 questions I should answer?",
      "Which comments deserve my response?"
    ]
  },
  {
    category: "📊 Audience Insight",
    questions: [
      "How does this video's reception compare to my usual?",
      "What's the overall mood of my audience?",
      "What assumptions did I make that confused people?"
    ]
  }
];
```

#### 4.2 Enhanced Response Display
**File:** `frontend/src/components/ask-ai/AiMessage.tsx`

Add visual sections for strategic data:

```typescript
interface EnhancedAiResponse {
  answer: string;
  key_actions?: string[];
  impact_analysis?: {
    potential_views: string;
    engagement_boost: string;
    time_investment: string;
    priority: "high" | "medium" | "low";
  };
  video_ideas?: Array<{
    title: string;
    demand_level: string;
    why_it_will_perform: string;
  }>;
  questions_to_answer?: Array<{
    question: string;
    frequency: string;
    best_response_method: string;
    reach: string;
  }>;
  community_actions?: Array<{
    action: string;
    why: string;
    suggested_reply?: string;
  }>;
}

// Display with clear action sections
<div className="space-y-4">
  {/* Main answer */}
  <div className="prose">{response.answer}</div>
  
  {/* Key Actions - Always visible */}
  {response.key_actions && (
    <div className="bg-primary/5 border-l-4 border-primary p-4 rounded">
      <h4 className="font-semibold mb-2">⚡ Action Items</h4>
      <ul>
        {response.key_actions.map(action => (
          <li key={action} className="mb-1">{action}</li>
        ))}
      </ul>
    </div>
  )}
  
  {/* Video Ideas */}
  {response.video_ideas && (
    <VideoIdeasSection ideas={response.video_ideas} />
  )}
  
  {/* Questions to Answer */}
  {response.questions_to_answer && (
    <QuestionsSection questions={response.questions_to_answer} />
  )}
  
  {/* Community Actions */}
  {response.community_actions && (
    <CommunitySection actions={response.community_actions} />
  )}
</div>
```

---

### **PHASE 5: Testing & Refinement**

#### 5.1 Test Scenarios

Create test cases for **diverse question types** (not just strategic questions):

**Test 1: Strategic - Content Ideas**
- Question: "What should my next video be?"
- Expected: Ranked list of video ideas with demand numbers
- Success: Creator can immediately pick a video topic

**Test 2: Strategic - Improvement**
- Question: "What should I improve?"
- Expected: Specific, actionable criticism with frequency
- Success: Clear action items, not vague feedback

**Test 3: Analytical - Complaints**
- Question: "What did people complain about?"
- Expected: Direct list of complaints with examples and frequency
- Success: Clear understanding without forced "next steps"

**Test 4: Sentiment - Reception**
- Question: "Is this video a hit? Do people love it?"
- Expected: Evidence-based sentiment analysis with specific examples
- Success: Clear yes/no with reasoning, not just percentages

**Test 5: Exploratory - Patterns**
- Question: "What's interesting in these comments?"
- Expected: Surface surprising patterns or valuable insights
- Success: Creator learns something they didn't expect

**Test 6: Specific Topic**
- Question: "What did people say about my editing?"
- Expected: Direct quotes and patterns about editing specifically
- Success: Focused answer on the exact topic asked

**Test 7: Efficiency - Community**
- Question: "Who should I reply to?"
- Expected: Top superfans with why they matter
- Success: Can engage meaningfully in < 5 minutes

**Test 8: Comparative**
- Question: "How does this compare to my last video?"
- Expected: Sentiment/engagement comparison with insights
- Success: Clear understanding of performance differences

#### 5.2 Metrics to Track

- **User satisfaction:** "Was this insight valuable?" thumbs up/down
- **Action taken:** Did they actually make a video/reply/change based on this?
- **Time saved:** Can they understand 500 comments in 30 seconds?
- **Conversion:** Do insights lead to plan upgrades?

---

## 🚀 IMPLEMENTATION ORDER

### Week 1: Core Transformation
1. ✅ Create new strategic system prompt
2. ✅ Add spam/low-value filtering
3. ✅ Implement question grouping
4. ✅ Add superfan identification
5. ✅ Test with real video data

### Week 2: Enhancement
6. ✅ Add content request detection
7. ✅ Add confusion pattern analysis
8. ✅ Implement sentiment comparison (vs previous videos)
9. ✅ Update prompt with strategic data structure

### Week 3: Frontend Polish
10. ✅ Add strategic quick actions
11. ✅ Redesign response display
12. ✅ Add impact indicators (high/medium/low)
13. ✅ Test full user flow

### Week 4: Refinement
14. ✅ User testing with real YouTubers
15. ✅ Refine prompts based on feedback
16. ✅ Add metrics tracking
17. ✅ Documentation

---

## 📝 KEY FILES TO MODIFY

### Backend
1. `lently-backend/src/gemini/prompts/ask_ai.py` - New strategic prompts
2. `lently-backend/src/ask_ai/service.py` - Add preprocessing methods
3. `lently-backend/src/ask_ai/schemas.py` - Add new response fields

### Frontend
1. `frontend/src/pages/AskAI.tsx` - Add strategic suggestions
2. `frontend/src/components/ask-ai/` - Enhanced response display
3. `frontend/src/components/ask-ai/AiMessage.tsx` - New sections

---

## 🎯 SUCCESS CRITERIA

The transformation is successful when:

✅ **Flexibility:** Can answer ANY question naturally (not just "what should I do next?")  
✅ **Clarity:** Responses are clear and direct - answers the actual question asked  
✅ **Strategic Context:** Even info questions include valuable strategic context  
✅ **Actionability:** When appropriate, clear next steps are provided  
✅ **Specificity:** Uses actual quotes, exact numbers, concrete examples  
✅ **Speed:** Insights feel instant (< 3 seconds)  
✅ **Retention:** Users come back repeatedly for various question types  
✅ **Conversion:** Free users see clear value to upgrade  

---

## 💡 FUTURE ENHANCEMENTS (Post-Launch)

1. **Trend Detection:** "This topic is 3x more popular than last month"
2. **Competitive Analysis:** Compare sentiment vs. competitor videos
3. **Reply Generation:** Smart reply suggestions that don't sound robotic
4. **Video Moment Analysis:** "Viewers loved the part at 3:45"
5. **Long-term Tracking:** "Your intros are getting better - 40% less complaints"
6. **Community Segmentation:** "Your technical audience wants X, casual wants Y"

---

## 🔥 CALL TO ACTION

Start with **Phase 1** immediately. The system prompt transformation is the highest-leverage change - it costs nothing and changes everything.

**Next Steps:**
1. Review this plan
2. Approve strategic direction
3. Start with prompt rewrite + spam filtering
4. Test with 5-10 real videos
5. Iterate based on results

**Timeline:** 2-4 weeks for full transformation

**Impact:** Transform Ask AI from "nice feature" to "can't live without it"

---

_Last updated: January 19, 2026_
