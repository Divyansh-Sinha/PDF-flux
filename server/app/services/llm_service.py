from __future__ import annotations

import json
import logging
from typing import Any, Tuple

logger = logging.getLogger(__name__)

import google.generativeai as genai
from groq import Groq
from openai import OpenAI
import httpx

from app.config import settings
from app.models import TableSchema, UsageStats, AIProviderConfig


class LLMService:
    def __init__(self) -> None:
        self.groq_client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None
        
        self.gemini_model = None
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.gemini_model = genai.GenerativeModel("gemini-2.5-flash")
            
        self.openai_client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    def _build_prompt(self, schema: TableSchema, chunk_text: str, start_page: int, end_page: int) -> str:
        return (
            "You are a data extraction engine. Extract structured data from the document and "
            "return ONLY a valid JSON array. No explanation, no markdown, no preamble.\n\n"
            f"Schema:\n{schema.model_dump_json(indent=2)}\n\n"
            f"Document chunk (Page {start_page}-{end_page}):\n{chunk_text}\n\n"
            "Return: JSON array of objects matching the schema. Use null for missing fields."
        )

    def _parse_response(self, raw: str) -> list[dict[str, Any]]:
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            logger.error(f"Raw string failed to parse as JSON: {raw[:200]}...")
            raise ValueError("LLM output must be valid JSON")

        if isinstance(parsed, dict):
            possible_lists = [v for k, v in parsed.items() if isinstance(v, list)]
            if possible_lists:
                parsed = possible_lists[0]
            else:
                logger.error(f"LLM returned a dictionary with no lists: {parsed}")

        if not isinstance(parsed, list):
            logger.error(f"Final parsed object after unwrapping is still not an array: {type(parsed)}")
            raise ValueError("LLM output must be a JSON array")
            
        for row in parsed:
            if not isinstance(row, dict):
                raise ValueError("Each extracted row must be an object")
        return parsed

    def extract_rows_from_chunk(
        self, schema: TableSchema, chunk_text: str, start_page: int, end_page: int, provider_config: AIProviderConfig | None = None
    ) -> Tuple[list[dict[str, Any]], UsageStats | None]:
        
        prompt = self._build_prompt(schema, chunk_text, start_page, end_page)
        
        provider_name = provider_config.provider if provider_config else "groq"
        api_key = provider_config.api_key if provider_config else None
        custom_model = provider_config.model if provider_config and provider_config.model else None

        logger.info(f"Dispatching prompt to {provider_name.upper()} for pages {start_page} to {end_page}")
        
        raw_text = ""
        usage = None
        
        if provider_name == "groq":
            key = api_key or settings.groq_api_key
            model = custom_model or settings.llm_model
            if not key:
                raise RuntimeError("GROQ_API_KEY is not configured")
            client = Groq(api_key=key)
            res = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You must only respond with valid JSON arrays containing the extracted list of data objects."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
                max_tokens=settings.llm_max_tokens,
                response_format={"type": "json_object"}
            )
            raw_text = res.choices[0].message.content.strip()
            if res.usage:
                usage = UsageStats(prompt_tokens=res.usage.prompt_tokens, completion_tokens=res.usage.completion_tokens, total_tokens=res.usage.total_tokens)
                
        elif provider_name == "gemini":
            key = api_key or settings.gemini_api_key
            model = custom_model or "gemini-2.5-flash"
            if not key:
                raise RuntimeError("GEMINI_API_KEY is not configured")
            genai.configure(api_key=key)
            gm = genai.GenerativeModel(model)
            res = gm.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0,
                    max_output_tokens=settings.llm_max_tokens,
                    response_mime_type="application/json"
                )
            )
            raw_text = res.text.strip()
            if res.usage_metadata:
                usage = UsageStats(prompt_tokens=res.usage_metadata.prompt_token_count, completion_tokens=res.usage_metadata.candidates_token_count, total_tokens=res.usage_metadata.total_token_count)
                
        elif provider_name == "openai":
            key = api_key or settings.openai_api_key
            model = custom_model or "gpt-4o"
            if not key:
                raise RuntimeError("OPENAI_API_KEY is not configured")
            client = OpenAI(api_key=key)
            res = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You must only respond with valid JSON arrays containing the extracted list of data objects."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
                response_format={"type": "json_object"}
            )
            raw_text = res.choices[0].message.content.strip()
            if res.usage:
                usage = UsageStats(prompt_tokens=res.usage.prompt_tokens, completion_tokens=res.usage.completion_tokens, total_tokens=res.usage.total_tokens)
                
        elif provider_name == "mistral":
            key = api_key or settings.mistral_api_key
            model = custom_model or "mistral-large-latest"
            if not key:
                raise RuntimeError("MISTRAL_API_KEY is not configured")
            
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            payload = {
                "model": model,
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": "You must only respond with valid JSON arrays containing the extracted list of data objects."},
                    {"role": "user", "content": prompt}
                ]
            }
            res = httpx.post("https://api.mistral.ai/v1/chat/completions", headers=headers, json=payload, timeout=60.0)
            res.raise_for_status()
            data = res.json()
            raw_text = data["choices"][0]["message"]["content"].strip()
            
            if "usage" in data:
                u = data["usage"]
                usage = UsageStats(prompt_tokens=u.get("prompt_tokens", 0), completion_tokens=u.get("completion_tokens", 0), total_tokens=u.get("total_tokens", 0))
        else:
            raise ValueError(f"Unknown provider: {provider_name}")

        logger.info(f"Received response length: {len(raw_text)} chars")
        parsed = self._parse_response(raw_text)

        return parsed, usage


llm_service = LLMService()
