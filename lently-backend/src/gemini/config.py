"""
Gemini AI Configuration
"""

# Model to use - Gemini 2.0 Flash Lite is fast and cost-effective
GEMINI_MODEL = "gemini-2.0-flash-lite"

# Generation configuration
# Low temperature (0.2) ensures consistent, deterministic outputs
# This is critical for Hero Insight quality - users expect same results for same video
GENERATION_CONFIG = {
    "temperature": 0.2,  # Low for consistent, reliable outputs across analyses
    "top_p": 0.85,       # More focused token selection
    "top_k": 20,         # Reduced randomness for consistency
    "max_output_tokens": 8192,  # Increased for batch processing
}

# More permissive settings for analyzing YouTube comments
# Comments may contain frustration, criticism, etc. that we need to analyze
SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
]

# Token limits for different operations
TOKEN_LIMITS = {
    "summary": 1024,
    "classification": 512,
    "sentiment": 512,
    "ask_ai": 2048,
    "reply_generation": 512,
}

# Maximum comments to include in a single prompt
MAX_COMMENTS_PER_PROMPT = 100

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1
