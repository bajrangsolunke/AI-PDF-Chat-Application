from typing import Protocol


class Embedder(Protocol):
    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...
    def embed_query(self, text: str) -> list[float]: ...


def get_embedder() -> Embedder:
    from langchain_openai import OpenAIEmbeddings
    from app.core.config import get_settings
    settings = get_settings()
    return OpenAIEmbeddings(model=settings.openai_embed_model, api_key=settings.openai_api_key)
