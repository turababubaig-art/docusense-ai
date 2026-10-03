from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from typing import Any

import httpx

from config import Settings

logger=logging.getLogger("docusense.ai")

class AIProviderError(RuntimeError): pass

class AIProvider(ABC):
    @abstractmethod
    async def generate(self,system:str,user:str,structured:bool=False)->dict[str,Any]: ...

class OpenAICompatibleProvider(AIProvider):
    def __init__(self,settings:Settings):
        self.settings=settings
        self.base=(settings.ai_base_url or "https://api.openai.com/v1").rstrip("/")
    async def generate(self,system:str,user:str,structured:bool=False)->dict[str,Any]:
        if not self.settings.openai_api_key: raise AIProviderError("AI provider is not configured.")
        payload={"model":self.settings.ai_model,"messages":[{"role":"system","content":system},{"role":"user","content":user}],"temperature":self.settings.ai_temperature,"max_tokens":self.settings.ai_max_output_tokens}
        if structured: payload["response_format"]={"type":"json_object"}
        try:
            async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
                response=await client.post(self.base+"/chat/completions",headers={"Authorization":f"Bearer {self.settings.openai_api_key}","Content-Type":"application/json"},json=payload)
        except httpx.RequestError as exc: raise AIProviderError("AI provider request failed.") from exc
        if response.status_code==429: raise AIProviderError("AI provider rate limit reached.")
        if not response.is_success: raise AIProviderError(f"AI provider returned HTTP {response.status_code}.")
        try: body=response.json(); content=body["choices"][0]["message"]["content"]
        except (ValueError,KeyError,IndexError,TypeError) as exc: raise AIProviderError("AI provider returned an invalid response.") from exc
        if structured:
            try:return json.loads(content)
            except json.JSONDecodeError as exc: raise AIProviderError("AI provider returned invalid JSON.") from exc
        return {"text":content}

class RapidAPIProvider(AIProvider):
    def __init__(self,settings:Settings): self.settings=settings
    async def generate(self,system:str,user:str,structured:bool=False)->dict[str,Any]:
        if not all((self.settings.rapidapi_key,self.settings.rapidapi_host,self.settings.rapidapi_endpoint)):
            raise AIProviderError("RapidAPI provider is not configured.")
        payload={"question":user,"context":system}
        try:
            async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
                response=await client.post(self.settings.rapidapi_endpoint,headers={"x-rapidapi-key":self.settings.rapidapi_key,"x-rapidapi-host":self.settings.rapidapi_host,"Content-Type":"application/json"},json=payload)
        except httpx.RequestError as exc: raise AIProviderError("RapidAPI request failed.") from exc
        if not response.is_success: raise AIProviderError(f"RapidAPI returned HTTP {response.status_code}.")
        try:return response.json()
        except ValueError:return {"text":response.text}

class LocalFallbackProvider(AIProvider):
    async def generate(self,system:str,user:str,structured:bool=False)->dict[str,Any]:
        raise AIProviderError("No external AI provider is configured; deterministic document analysis is available instead.")

class AIService:
    def __init__(self,settings:Settings):
        provider=settings.ai_provider.lower().strip()
        if provider in {"openai","openai-compatible","compatible"}: self.provider=OpenAICompatibleProvider(settings)
        elif provider=="rapidapi": self.provider=RapidAPIProvider(settings)
        else: self.provider=LocalFallbackProvider()
        self.provider_name=provider or "none"

    @property
    def available(self)->bool:
        return not isinstance(self.provider,LocalFallbackProvider)

    async def answer(self,question:str,context:str)->dict[str,Any]:
        system="You answer questions only from supplied document evidence. If evidence is insufficient, explicitly say so. Do not invent facts."
        return await self.provider.generate(system,f"Question:\n{question}\n\nDocument evidence:\n{context}",structured=False)

    async def structured_analysis(self,context:str)->dict[str,Any]:
        system="Return only valid JSON. Extract document_type, summary, executive_summary, parties, effective_date, expiration_date, governing_law, payment_terms, obligations, risks, clauses, financials, deadlines. Every material finding should include page and evidence when present. Never invent missing facts; use null or an empty list."
        return await self.provider.generate(system,context,structured=True)
