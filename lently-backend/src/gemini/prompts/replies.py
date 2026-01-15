"""
Reply Generation Prompts
"""

REPLY_GENERATION_PROMPT = """Generate reply options for this YouTube comment.

## VIDEO CONTEXT
Title: {video_title}
Channel: {channel_name}

## COMMENT TO REPLY TO
Author: {comment_author}
Text: "{comment_text}"
Likes: {like_count}

## REQUESTED TONE
{tone_description}

## INSTRUCTIONS
Generate 3 different reply options that:
1. Acknowledge what the commenter said
2. Sound natural and human (not robotic)
3. Match the requested tone
4. Stay under {max_length} characters
5. {cta_instruction}

## TONE GUIDELINES
- **professional**: Polished, respectful, brand-safe
- **friendly**: Warm, personable, uses casual language
- **casual**: Very relaxed, may use internet slang
- **grateful**: Emphasizes appreciation, heartfelt
- **helpful**: Focuses on providing value/information

## RESPONSE FORMAT (JSON)
{{
  "replies": [
    {{
      "text": "Your reply text here",
      "tone": "{tone}",
      "word_count": 25,
      "has_cta": false
    }},
    {{
      "text": "Second variation",
      "tone": "{tone}",
      "word_count": 30,
      "has_cta": false
    }},
    {{
      "text": "Third variation", 
      "tone": "{tone}",
      "word_count": 28,
      "has_cta": false
    }}
  ]
}}

Respond ONLY with valid JSON, no additional text."""


TONE_DESCRIPTIONS = {
    "professional": "Professional and polished. Think brand spokesperson - respectful, articulate, brand-safe.",
    "friendly": "Warm and personable. Like chatting with a friend who happens to be the creator.",
    "casual": "Very relaxed and internet-native. Can use informal language, emojis, casual phrasing.",
    "grateful": "Heartfelt appreciation. Emphasize how much the comment/support means.",
    "helpful": "Focused on being useful. Provide information, answer questions, add value."
}

CTA_INSTRUCTIONS = {
    True: "Include a subtle call-to-action (like, subscribe, check out another video, etc.)",
    False: "Do NOT include any call-to-action. Keep it purely conversational."
}
