"""
Gemini AI Client
Handles all interactions with the Gemini API
"""

import json
import logging
import asyncio
from typing import Optional, Any

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from src.config import get_settings
from src.gemini.config import (
    GEMINI_MODEL, GENERATION_CONFIG, SAFETY_SETTINGS,
    MAX_RETRIES, RETRY_DELAY_SECONDS, TOKEN_LIMITS
)
from src.gemini.exceptions import (
    GeminiError, ContentFilteredError, RateLimitError,
    InvalidPromptError, ModelOverloadedError, JSONParseError
)
from src.gemini.prompts.system import LENTLY_SYSTEM_INSTRUCTION

logger = logging.getLogger(__name__)
settings = get_settings()


class GeminiClient:
    """
    Gemini AI Client for Lently
    
    Handles:
    - Text generation with structured JSON output
    - Retry logic for transient failures
    - Safety filter handling
    - Token/rate limit management
    """
    
    def __init__(self):
        if not settings.gemini_api_key or settings.gemini_api_key == "your-gemini-api-key":
            raise ValueError("Gemini API key not configured")
        
        genai.configure(api_key=settings.gemini_api_key)
        self._model = None
        self._initialized = False
    
    def _get_model(self, system_instruction: Optional[str] = None) -> genai.GenerativeModel:
        """Get or create the Gemini model instance"""
        instruction = system_instruction or LENTLY_SYSTEM_INSTRUCTION
        
        return genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=instruction,
            generation_config=GENERATION_CONFIG,
            safety_settings=self._convert_safety_settings()
        )
    
    def _convert_safety_settings(self) -> dict:
        """Convert safety settings to the format Gemini expects"""
        threshold_map = {
            "BLOCK_NONE": HarmBlockThreshold.BLOCK_NONE,
            "BLOCK_ONLY_HIGH": HarmBlockThreshold.BLOCK_ONLY_HIGH,
            "BLOCK_MEDIUM_AND_ABOVE": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            "BLOCK_LOW_AND_ABOVE": HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        }
        
        category_map = {
            "HARM_CATEGORY_HARASSMENT": HarmCategory.HARM_CATEGORY_HARASSMENT,
            "HARM_CATEGORY_HATE_SPEECH": HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            "HARM_CATEGORY_SEXUALLY_EXPLICIT": HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            "HARM_CATEGORY_DANGEROUS_CONTENT": HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        }
        
        return {
            category_map[s["category"]]: threshold_map[s["threshold"]]
            for s in SAFETY_SETTINGS
            if s["category"] in category_map
        }
    
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Generate text response from Gemini
        
        Args:
            prompt: The prompt to send
            system_instruction: Optional custom system instruction
            max_tokens: Optional override for max output tokens
            
        Returns:
            Generated text response
        """
        model = self._get_model(system_instruction)
        
        for attempt in range(MAX_RETRIES):
            try:
                # Configure generation with custom max tokens if specified
                config = GENERATION_CONFIG.copy()
                if max_tokens:
                    config["max_output_tokens"] = max_tokens
                
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=config
                )
                
                # Check for blocked content
                if not response.candidates:
                    raise ContentFilteredError("Response was blocked by safety filters")
                
                candidate = response.candidates[0]
                
                # Check finish reason
                if hasattr(candidate, 'finish_reason'):
                    finish_reason = str(candidate.finish_reason)
                    if 'SAFETY' in finish_reason:
                        raise ContentFilteredError("Response blocked due to safety concerns")
                    if 'RECITATION' in finish_reason:
                        raise ContentFilteredError("Response blocked due to recitation")
                
                return response.text
                
            except ContentFilteredError:
                raise  # Don't retry safety blocks
            except Exception as e:
                error_str = str(e).lower()
                
                if 'quota' in error_str or 'rate' in error_str or '429' in error_str:
                    if attempt < MAX_RETRIES - 1:
                        wait_time = RETRY_DELAY_SECONDS * (2 ** attempt)
                        logger.warning(f"Rate limited, waiting {wait_time}s before retry")
                        await asyncio.sleep(wait_time)
                        continue
                    raise RateLimitError()
                
                if 'overloaded' in error_str or '503' in error_str:
                    if attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(RETRY_DELAY_SECONDS)
                        continue
                    raise ModelOverloadedError()
                
                if 'invalid' in error_str or 'too long' in error_str:
                    raise InvalidPromptError(str(e))
                
                logger.error(f"Gemini API error (attempt {attempt + 1}): {e}")
                if attempt == MAX_RETRIES - 1:
                    raise GeminiError(f"Failed after {MAX_RETRIES} attempts: {str(e)}")
                
                await asyncio.sleep(RETRY_DELAY_SECONDS)
        
        raise GeminiError("Unexpected error in generate")
    
    async def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> dict:
        """
        Generate structured JSON response from Gemini
        
        Args:
            prompt: The prompt (should request JSON output)
            system_instruction: Optional custom system instruction
            max_tokens: Optional override for max output tokens
            
        Returns:
            Parsed JSON as dictionary
        """
        response_text = await self.generate(
            prompt=prompt,
            system_instruction=system_instruction,
            max_tokens=max_tokens
        )
        
        # Try to parse JSON
        try:
            # Clean up the response - remove markdown code blocks if present
            text = response_text.strip()
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            return json.loads(text.strip())
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.debug(f"Raw response: {response_text[:500]}")
            raise JSONParseError(f"Failed to parse AI response as JSON: {str(e)}")
    
    async def generate_with_schema(
        self,
        prompt: str,
        response_schema: dict,
        system_instruction: Optional[str] = None,
    ) -> dict:
        """
        Generate response with a specific JSON schema
        
        Note: Gemini 2.0 Flash Lite supports structured output mode
        """
        # Add schema hint to prompt
        schema_prompt = f"""{prompt}

## REQUIRED RESPONSE SCHEMA
Your response must be valid JSON matching this structure:
{json.dumps(response_schema, indent=2)}

Respond with ONLY the JSON object, no additional text."""
        
        return await self.generate_json(
            prompt=schema_prompt,
            system_instruction=system_instruction
        )
    
    async def count_tokens(self, text: str) -> int:
        """Estimate token count for a text"""
        model = self._get_model()
        try:
            result = await asyncio.to_thread(
                model.count_tokens,
                text
            )
            return result.total_tokens
        except Exception as e:
            logger.warning(f"Failed to count tokens: {e}")
            # Rough estimate: ~4 chars per token
            return len(text) // 4


# Singleton instance
_gemini_client: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    """Get or create Gemini client singleton"""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
