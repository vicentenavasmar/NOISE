"""
Centralized client for calls to IBM Granite via watsonx.ai.

All calls to watsonx.ai go through this module. The public interface
(`generar_texto`) is kept identical to the previous Ollama-based client so
callers do not need to change.
"""

import asyncio
import os
from typing import Optional

from fastapi import HTTPException

from ibm_watsonx_ai import APIClient, Credentials
from ibm_watsonx_ai.foundation_models import ModelInference

WATSONX_APIKEY = os.getenv("WATSONX_APIKEY")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")
WATSONX_URL = os.getenv("WATSONX_URL", "https://eu-de.ml.cloud.ibm.com")
WATSONX_MODEL_ID = os.getenv("WATSONX_MODEL_ID", "ibm/granite-4-h-small")
WATSONX_MAX_TOKENS = int(os.getenv("WATSONX_MAX_TOKENS", "1024"))
WATSONX_TIMEOUT = 120.0

# Cache of ModelInference instances keyed by model id
_models: dict[str, ModelInference] = {}


def _get_model() -> ModelInference:
    if not WATSONX_APIKEY or not WATSONX_PROJECT_ID:
        raise HTTPException(
            status_code=503,
            detail=(
                "watsonx.ai is not configured: set WATSONX_APIKEY and "
                "WATSONX_PROJECT_ID in the .env file"
            ),
        )
    if WATSONX_MODEL_ID not in _models:
        credentials = Credentials(api_key=WATSONX_APIKEY, url=WATSONX_URL)
        api_client = APIClient(credentials, project_id=WATSONX_PROJECT_ID)
        _models[WATSONX_MODEL_ID] = ModelInference(
            model_id=WATSONX_MODEL_ID,
            api_client=api_client,
            # Skip the model-spec fetch at construction time; let errors surface
            # at inference with a clearer message.
            validate=False,
        )
    return _models[WATSONX_MODEL_ID]


def _build_messages(prompt: str, system_prompt: Optional[str] = None) -> list[dict]:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    return messages


def _extract_tokens(response: dict) -> int:
    # watsonx returns usage under "usage"; guard against missing/None values
    usage = response.get("usage") or {}
    return usage.get("total_tokens") or 0


def _extract_content(response: dict) -> str:
    choices = response.get("choices") or []
    if not choices:
        return ""
    message = choices[0].get("message") or {}
    return message.get("content") or ""


def _watsonx_unavailable(exc: Exception) -> bool:
    error_str = str(exc).lower()
    return any(
        keyword in error_str
        for keyword in ("connection", "connect", "refused", "unreachable", "timeout")
    )


async def generar_texto(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    json_mode: bool = False,
) -> dict:
    """
    Generate text using IBM Granite via watsonx.ai.

    Returns:
        dict with keys "texto" and "tokens_usados".
    """
    model = _get_model()
    messages = _build_messages(prompt, system_prompt)

    params: dict = {"temperature": temperature, "max_tokens": WATSONX_MAX_TOKENS}
    if json_mode:
        params["response_format"] = {"type": "json_object"}

    try:
        # The watsonx.ai SDK is synchronous; run it off the event loop.
        response = await asyncio.wait_for(
            asyncio.to_thread(model.chat, messages=messages, params=params),
            timeout=WATSONX_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"watsonx.ai took too long to respond (timeout of {int(WATSONX_TIMEOUT)} seconds)",
        )
    except HTTPException:
        raise
    except Exception as exc:
        if _watsonx_unavailable(exc):
            raise HTTPException(
                status_code=503,
                detail=f"watsonx.ai is not available at {WATSONX_URL}",
            )
        raise HTTPException(
            status_code=503,
            detail=f"Error communicating with watsonx.ai: {exc}",
        )

    return {
        "texto": _extract_content(response),
        "tokens_usados": _extract_tokens(response),
    }
