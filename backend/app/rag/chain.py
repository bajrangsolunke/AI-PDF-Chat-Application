from typing import Any, Iterable

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from app.core.config import get_settings

SYSTEM_PROMPT = """You are a precise document Q&A assistant.
Answer ONLY using the provided context snippets.
If the answer is not in the context, say you don't have enough information.
When citing, reference snippets by their bracketed numbers like [1], [2].
Be concise."""


def build_chat_model() -> Any:
    s = get_settings()

    if s.llm_provider == "gemini":
        if not s.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set; required when LLM_PROVIDER=gemini")
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=s.gemini_chat_model,
            google_api_key=s.gemini_api_key,
            temperature=0.2,
        )

    if s.llm_provider == "openai":
        if not s.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not set; required when LLM_PROVIDER=openai")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=s.openai_chat_model,
            api_key=s.openai_api_key,
            streaming=True,
            temperature=0.2,
        )

    raise RuntimeError(f"unknown LLM_PROVIDER={s.llm_provider!r}; expected 'gemini' or 'openai'")


def format_context(snippets: list[dict]) -> str:
    lines = []
    for i, snip in enumerate(snippets, start=1):
        meta = snip["metadata"]
        lines.append(f"[{i}] ({meta['filename']} p.{meta['page']}) {snip['text']}")
    return "\n\n".join(lines)


def build_messages(
    history: list[dict],
    snippets: list[dict],
    user_query: str,
    history_window: int = 6,
) -> list:
    msgs: list = [SystemMessage(content=SYSTEM_PROMPT)]
    recent = history[-history_window:]
    for m in recent:
        if m["role"] == "user":
            msgs.append(HumanMessage(content=m["content"]))
        else:
            msgs.append(AIMessage(content=m["content"]))
    context_block = format_context(snippets) if snippets else "(no relevant context found)"
    msgs.append(HumanMessage(content=f"Context:\n{context_block}\n\nQuestion: {user_query}"))
    return msgs


def stream_response(model: Any, messages: list) -> Iterable[str]:
    for chunk in model.stream(messages):
        if chunk.content:
            yield chunk.content
