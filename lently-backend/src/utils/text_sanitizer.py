"""
Text sanitization utilities for cleaning AI-generated output.
Ensures user-facing text is clean, properly formatted, and professional.
"""

import re
from typing import Optional


def sanitize_ai_text(text: Optional[str]) -> str:
    """
    Sanitize AI-generated text by removing broken formatting tags and fixing common issues.
    
    Handles:
    - Broken bold tags: {b}, {/b}, orphan [/b], orphan [b]
    - Markdown that shouldn't appear: **, __, etc.
    - Sentences starting with conjunctions (and, or, but)
    - Extra whitespace
    
    Args:
        text: The text to sanitize
        
    Returns:
        Clean, sanitized text ready for display
    """
    if not text:
        return ""
    
    cleaned = text
    
    # Remove curly brace formatting variants: {b}, {/b}
    cleaned = re.sub(r'\{/?b\}', '', cleaned, flags=re.IGNORECASE)
    
    # Remove orphan closing tags [/b] not preceded by [b]
    # Process by finding and removing unmatched [/b] tags
    cleaned = _remove_orphan_closing_tags(cleaned)
    
    # Remove orphan opening tags [b] not followed by [/b]
    cleaned = _remove_orphan_opening_tags(cleaned)
    
    # Remove empty bold tags [b][/b]
    cleaned = re.sub(r'\[b\]\s*\[/b\]', '', cleaned, flags=re.IGNORECASE)
    
    # Remove markdown bold/italic that shouldn't be in output
    cleaned = re.sub(r'\*\*([^*]+)\*\*', r'\1', cleaned)  # **text** -> text
    cleaned = re.sub(r'__([^_]+)__', r'\1', cleaned)      # __text__ -> text
    
    # Fix sentences starting with conjunctions (common AI mistake)
    # Pattern: period/newline followed by "and ", "or ", "but " at sentence start
    cleaned = re.sub(
        r'([.!?]\s*)\b(and|or|but)\s+([a-z])',
        lambda m: f"{m.group(1)}{m.group(3).upper()}",
        cleaned,
        flags=re.IGNORECASE
    )
    
    # Also fix numbered items starting with conjunctions: "1) and something"
    cleaned = re.sub(
        r'(\d+\))\s*(and|or|but)\s+',
        r'\1 ',
        cleaned,
        flags=re.IGNORECASE
    )
    
    # Clean up multiple spaces
    cleaned = re.sub(r' {2,}', ' ', cleaned)
    
    # Clean up multiple newlines  
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    
    return cleaned.strip()


def _remove_orphan_closing_tags(text: str) -> str:
    """Remove [/b] tags that don't have a matching [b] before them."""
    result = []
    i = 0
    open_count = 0
    
    while i < len(text):
        # Check for [b] opening tag
        if text[i:i+3].lower() == '[b]':
            open_count += 1
            result.append(text[i:i+3])
            i += 3
        # Check for [/b] closing tag
        elif text[i:i+4].lower() == '[/b]':
            if open_count > 0:
                result.append(text[i:i+4])
                open_count -= 1
            # If no open tag, skip this closing tag (orphan)
            i += 4
        else:
            result.append(text[i])
            i += 1
    
    return ''.join(result)


def _remove_orphan_opening_tags(text: str) -> str:
    """Remove [b] tags that don't have a matching [/b] after them."""
    result = []
    i = 0
    
    while i < len(text):
        # Check for [b] opening tag
        if text[i:i+3].lower() == '[b]':
            # Look ahead for matching [/b]
            remaining = text[i+3:]
            if '[/b]' in remaining.lower():
                result.append(text[i:i+3])
            # If no closing tag found, skip this opening tag (orphan)
            i += 3
        else:
            result.append(text[i])
            i += 1
    
    return ''.join(result)


def sanitize_priority_actions(actions: list[str]) -> list[str]:
    """
    Sanitize a list of priority action strings.
    
    Args:
        actions: List of action strings
        
    Returns:
        Cleaned list of actions
    """
    if not actions:
        return []
    
    cleaned_actions = []
    for action in actions:
        cleaned = sanitize_ai_text(action)
        # Ensure action starts with capital letter
        if cleaned and cleaned[0].islower():
            cleaned = cleaned[0].upper() + cleaned[1:]
        if cleaned:
            cleaned_actions.append(cleaned)
    
    return cleaned_actions
