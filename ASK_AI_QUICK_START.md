# Ask AI Quick Start Implementation Guide

## 🚀 Start Here: 30-Minute Quick Win

The fastest way to see the transformation in action is to start with the system prompt. This requires ZERO code changes to the service logic - just a prompt rewrite.

**KEY PHILOSOPHY:** The AI should answer ANY question users ask, but think like a strategic advisor. It adapts its response style to match the question - providing pure information when asked, and strategic guidance when appropriate.

---

## STEP 1: Update the System Prompt (10 minutes)

**File:** `lently-backend/src/gemini/prompts/ask_ai.py`

### What to Change

Replace the current `ASK_AI_PROMPT` with a flexible, strategic version that:
1. Answers ANY question users ask (not just "what should I do next?")
2. Adapts response style to match the question type
3. Uses concrete examples instead of percentages
4. Adds strategic context when appropriate (not forced)
5. Speaks like a knowledgeable advisor, not a data analyst

### Before/After Examples

**❌ CURRENT (Data-focused):**
```
"Your comments show 68% positive sentiment and 23% questions."
```

**✅ NEW (Flexible & Strategic):**

*When asked: "What did people complain about?"*
```
"The most common complaint (mentioned in 34 comments) is that your intro feels too long. 

Viewers specifically cite 45-60 seconds as when they consider skipping. Several note they 'almost clicked away' but stayed for the content.

This is actually a quick win - trimming intros to 15-20 seconds could reduce early drop-off."
```

*When asked: "Is this video a hit?"*
```
"Yes, this is performing well above your average. Comments show 82% positive sentiment with unusually high engagement.

What's driving it: Viewers are specifically praising your 'calm teaching style' (47 mentions) and 'practical examples' (31 mentions). Several comments say 'finally someone explains this clearly.'

This suggests you've hit a sweet spot with this explanatory format."
```

*When asked: "What should I make next?"*
```
"Based on audience demand, create a tutorial on [specific topic] - 27 viewers explicitly requested this.

Your audience is consistently asking for step-by-step workflow guides. A video titled 'Complete Guide to [topic]' would likely perform well since people are actively searching for this.

Second priority: Address the confusion around [another topic] mentioned in 19 comments."
```

---

## STEP 2: Add Spam Filtering (10 minutes)

**File:** `lently-backend/src/ask_ai/service.py`

Add this method to the `AskAIService` class:

```python
def _filter_spam_and_low_value(self, comments: list[dict]) -> list[dict]:
    """Remove comments that don't provide strategic value"""
    import re
    
    spam_patterns = [
        r"^(first|second|third)!?$",
        r"^(nice|great|awesome) video!?$",
        r"^(love it|loved this)!?$",
        r"(check out my channel|subscribe to me)",
        r"^[❤🔥]+$",  # Just emojis
    ]
    
    min_word_count = 5
    
    valuable = []
    for comment in comments:
        text = comment.get("text", "").strip().lower()
        
        # Skip if too short
        if len(text.split()) < min_word_count:
            continue
            
        # Skip if matches spam patterns
        is_spam = any(re.match(pattern, text, re.IGNORECASE) for pattern in spam_patterns)
        if is_spam:
            continue
            
        valuable.append(comment)
    
    return valuable
```

Then update `_get_relevant_comments()` to use it:

```python
async def _get_relevant_comments(...):
    # ... existing code to get comments ...
    
    # ADD THIS LINE before filtering by context
    relevant_comments = self._filter_spam_and_low_value(relevant_comments)
    
    # ... rest of existing code ...
```

---

## STEP 3: Test with Real Data (10 minutes)

### Manual Test

1. **Start backend:**
   ```bash
   cd lently-backend
   source venv/bin/activate
   python -m uvicorn src.main:app --reload
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test these diverse questions:**
   - "What did people complain about?" (info question)
   - "Is this video a hit?" (sentiment question)
   - "What should my next video be?" (strategic question)
   - "What did viewers say about my editing?" (specific topic)
   - "Do they really love it?" (validation question)
   - "Who are my most engaged community members?" (community question)

### What to Look For

✅ **Good Signs:**
- **Answers the actual question asked** (doesn't deflect to "here's what to do")
- **Specific numbers and examples** ("47 viewers mentioned..." not "many people")
- **Strategic context when helpful** (adds "why this matters" without forcing it)
- **Adapts style to question** (info for info questions, action for strategy questions)

❌ **Bad Signs:**
- Forces "next steps" on every answer (even info questions)
- Starts with percentages without context ("68% positive sentiment...")
- Vague insights ("People liked your content")
- Ignores the actual question to push an agenda

---

## STEP 4: Add Quick Action Buttons (Bonus)

**File:** `frontend/src/pages/AskAI.tsx`

Replace the default suggestions with strategic ones:

```typescript
const STRATEGIC_SUGGESTIONS = [
  // Strategic/Action Questions
  "What video should I make next based on audience demand?",
  "What should I improve in my next video?",
  "Who should I reply to first?",
  
  // Analytical/Info Questions
  "What did people complain about?",
  "What confused viewers the most?",
  "What did people say about my editing?",
  
  // Sentiment/Validation Questions
  "Is this video a hit?",
  "Do they really love it?",
  "How does this compare to my last video?",
  
  // Exploratory Questions
  "What's the most interesting pattern in the comments?",
  "What surprised viewers?",
  "Who are my superfans?"
];
```

Update the suggestions array around line 114:

```typescript
const suggestions = suggestionsData?.suggestions || STRATEGIC_SUGGESTIONS;
```

---

## 📊 Measuring Success

After implementing these changes, track:

1. **Flexibility:** Does it answer ANY type of question naturally?
2. **Directness:** Does it answer the actual question asked?
3. **Specificity:** Are actual comment examples and numbers included?
4. **Strategic Context:** Does it add helpful context without forcing "next steps"?
5. **Value:** Would a creator say "this is genuinely helpful"?

---

## 🎯 Next Steps After Quick Start

Once the basic transformation works:

1. ✅ Add question grouping (group similar questions with frequency)
2. ✅ Add superfan identification (highlight repeat valuable commenters)
3. ✅ Add content request detection (surface video ideas by demand)
4. ✅ Enhance frontend display (show action items prominently)

See `ASK_AI_TRANSFORMATION_PLAN.md` for the complete roadmap.

---

## 🚨 Common Issues

### Issue: AI still sounds too data-focused

**Fix:** Update the system instruction in `src/gemini/prompts/system.py`:

```python
LENTLY_SYSTEM_INSTRUCTION = """
You are a YouTube Growth Strategist who can answer any question about comments.

Your job: Help creators understand their audience and make better decisions.

Always:
- Answer the question they actually asked
- Use specific examples and numbers
- Add strategic context when helpful (not forced)
- Adapt your style to match their question type

Question Types:
- Info questions ("what did people say?") → Direct answer with examples
- Sentiment questions ("do they love it?") → Evidence-based analysis
- Strategic questions ("what should I do?") → Action-focused guidance
- Exploratory ("what's interesting?") → Surface valuable patterns

Never:
- Force "next steps" on every answer
- Give vague insights ("people liked it")
- Just report percentages without context
"""
```

### Issue: AI forces strategy on info questions

**Fix:** In the prompt, emphasize:
```
Match your response to their question type.
If they ask "what did people complain about?", list complaints - don't force action items.
If they ask "what should I do?", then provide strategic recommendations.
```

### Issue: Not enough specific examples

**Fix:** In prompt, emphasize:
```
Always quote actual comments when making a point.
Use exact numbers: "47 viewers asked..." not "many viewers"
```

---

## 💡 Pro Tips

1. **Test with diverse questions:** Try info questions, sentiment questions, and strategy questions
2. **Read responses out loud:** Does it answer what was asked, or deflect?
3. **Check flexibility:** Can it handle "what did people complain about?" as naturally as "what should I do next?"
4. **Be specific:** "34 viewers mentioned X" > "Many people mentioned X"
5. **Match the vibe:** Strategic questions get action, info questions get great info

---

Ready to transform Ask AI into a flexible, strategic advisor? Start with Step 1! 🚀
