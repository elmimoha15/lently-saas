"""
Gemini AI Exceptions
"""


class GeminiError(Exception):
    """Base Gemini exception"""
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ContentFilteredError(GeminiError):
    """Content was blocked by Gemini's safety filters"""
    def __init__(self, message: str = "Content was blocked by safety filters"):
        super().__init__(message, {"reason": "safety_filter"})


class RateLimitError(GeminiError):
    """Gemini API rate limit exceeded"""
    def __init__(self, message: str = "Rate limit exceeded, please try again later"):
        super().__init__(message, {"reason": "rate_limit"})


class InvalidPromptError(GeminiError):
    """The prompt was invalid or too long"""
    def __init__(self, message: str = "Invalid or too long prompt"):
        super().__init__(message, {"reason": "invalid_prompt"})


class ModelOverloadedError(GeminiError):
    """The model is temporarily overloaded"""
    def __init__(self, message: str = "Model is temporarily overloaded"):
        super().__init__(message, {"reason": "overloaded"})


class JSONParseError(GeminiError):
    """Failed to parse JSON response from Gemini"""
    def __init__(self, message: str = "Failed to parse AI response"):
        super().__init__(message, {"reason": "json_parse_error"})
