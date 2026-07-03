from __future__ import annotations

import logging
from typing import Optional

import httpx
from openai import OpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client: Optional[OpenAI] = None


def get_llm_client() -> OpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        # Initialize OpenAI client with verify=False to bypass corporate proxies
        _client = OpenAI(
            api_key=settings.openai_api_key,
            http_client=httpx.Client(verify=False)
        )

        logger.info(
            "OpenAI client initialized with SSL verification disabled (model=%s)",
            settings.llm_model
        )

    return _client


class LLMClient:
    """Thin wrapper providing a consistent interface for LLM calls with token tracking."""

    def __init__(self):
        self.client = get_llm_client()
        self.settings = get_settings()
        self.total_tokens_used = 0

    def chat(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> str:
        messages = []

        if system:
            messages.append({"role": "system", "content": system})

        messages.append({"role": "user", "content": prompt})

        kwargs: dict = {
            "model": self.settings.llm_model,
            "temperature": temperature if temperature is not None else self.settings.llm_temperature,
            "max_tokens": max_tokens or self.settings.llm_max_tokens,
            "messages": messages,
        }

        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = self.client.chat.completions.create(**kwargs)

            usage = response.usage
            if usage:
                self.total_tokens_used += usage.total_tokens

            return response.choices[0].message.content.strip()

        except Exception:
            logger.exception("LLM call failed")
            raise