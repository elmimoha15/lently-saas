"""
Gemini prompts module
"""

from src.gemini.prompts.system import LENTLY_SYSTEM_INSTRUCTION
from src.gemini.prompts.analysis import (
    SENTIMENT_ANALYSIS_PROMPT,
    CLASSIFICATION_PROMPT,
    INSIGHTS_PROMPT,
    SUMMARY_PROMPT,
)
from src.gemini.prompts.ask_ai import ASK_AI_PROMPT
from src.gemini.prompts.replies import REPLY_GENERATION_PROMPT

__all__ = [
    'LENTLY_SYSTEM_INSTRUCTION',
    'SENTIMENT_ANALYSIS_PROMPT',
    'CLASSIFICATION_PROMPT',
    'INSIGHTS_PROMPT',
    'SUMMARY_PROMPT',
    'ASK_AI_PROMPT',
    'REPLY_GENERATION_PROMPT',
]
