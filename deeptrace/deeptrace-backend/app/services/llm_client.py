import os
from typing import Optional
from groq import Groq
from openai import OpenAI
from app.config import settings

def get_llm_client():
    """
    Returns an LLM client based on available environment variables.
    Prefers Groq, falls back to OpenAI.
    """
    if settings.groq_api_key:
        return Groq(api_key=settings.groq_api_key), "groq"
    elif settings.openai_api_key:
        return OpenAI(api_key=settings.openai_api_key), "openai"
    return None, "none"

def generate_json_completion(system_prompt: str, user_prompt: str) -> Optional[str]:
    """
    Generates a completion strictly enforcing JSON response.
    """
    client, provider = get_llm_client()
    if not client:
        return None
        
    try:
        if provider == "groq":
            response = client.chat.completions.create(
                model="llama3-8b-8192", # or another groq model
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            return response.choices[0].message.content
        elif provider == "openai":
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            return response.choices[0].message.content
    except Exception as e:
        import logging
        logging.error(f"LLM Generation Error: {e}")
        return None
    return None
