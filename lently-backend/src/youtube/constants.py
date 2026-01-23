"""
YouTube API Constants
"""

# API Limits
MAX_COMMENTS_PER_REQUEST = 100
DEFAULT_COMMENTS_FETCH = 100

# Sort Orders
SORT_BY_RELEVANCE = "relevance"  # Top-ranked, most helpful comments
SORT_BY_TIME = "time"  # Most recent first

# Minimum engagement thresholds for "important" comments
MIN_LIKES_THRESHOLD = 1  # Comments with at least 1 like
MIN_REPLY_THRESHOLD = 0  # Comments with replies indicate discussion

# Comment quality filters
SPAM_INDICATORS = [
    "check out my channel",
    "sub4sub",
    "subscribe to me",
    "first!",
    "who's watching in",
    "like if you",
    "👇 check",
]

# Maximum comment length to process (very long = often spam)
MAX_COMMENT_LENGTH = 2000
MIN_COMMENT_LENGTH = 10  # Too short = usually not useful
