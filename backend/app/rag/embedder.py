from typing import Protocol


class Embedder(Protocol):
    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...
    def embed_query(self, text: str) -> list[float]: ...


def get_embedder() -> Embedder:
    from app.core.config import get_settings
    s = get_settings()

    if s.llm_provider == "gemini":
        if not s.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set; required when LLM_PROVIDER=gemini")
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        return GoogleGenerativeAIEmbeddings(model=s.gemini_embed_model, google_api_key=s.gemini_api_key)

    if s.llm_provider == "openai":
        if not s.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not set; required when LLM_PROVIDER=openai")
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(model=s.openai_embed_model, api_key=s.openai_api_key)

    raise RuntimeError(f"unknown LLM_PROVIDER={s.llm_provider!r}; expected 'gemini' or 'openai'")
