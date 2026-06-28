"""
ai/agent.py
────────────────────────────────────────────────────────────────────────────────
LLM agent with conversation memory and optional RAG context.

Flow for each user message:
  1. Load full conversation history from the database.
  2. Run semantic retrieval against the user's uploaded documents.
  3. Build a system prompt — injecting document excerpts if relevant.
  4. Call the LLM with: [system] + [history] + [new question].
  5. Persist both the question and the answer to the database.
  6. Return the answer and source file references.

The agent behaves as a general-purpose assistant. Uploaded documents are
provided as optional reference context — the LLM uses them naturally when
relevant, without being forced to reference them for every message.
"""

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import Message, Response
from ai.retrieve import retrieve
import uuid
from datetime import datetime, timezone

llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.6, max_tokens=2048)

_SYSTEM_BASE = """You are NoteAI, a smart and friendly AI assistant.

You can talk about anything — answer questions, help with writing, explain concepts, chat casually, or anything else the user needs.

If the user has uploaded documents and the question seems related to them, you may use the provided document excerpts to give a more accurate, grounded answer. But do this naturally — don't announce it unless it's helpful to reference the source.

If no document context is provided or it isn't relevant, just answer from your own knowledge as you normally would.

Never refuse to answer just because something "isn't in the notes". Be genuinely helpful."""


async def get_response(
    question: str,
    chat_id: uuid.UUID,
    user_id: uuid.UUID,
    folder_id: uuid.UUID,
    db: AsyncSession,
) -> Response:
    """
    Generate an AI response with conversation memory and optional document context.

    Args:
        question:  The user's current message.
        chat_id:   The active chat session (for conversation history).
        user_id:   The authenticated user (for scoping RAG results).
        folder_id: The user's workspace (for scoping RAG results).
        db:        The async database session.

    Returns:
        Response(answer=str, sources=list[str])
    """
    # 1. Load conversation history
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at)
    )
    history = [
        HumanMessage(content=msg.content) if msg.role == "user"
        else AIMessage(content=msg.content)
        for msg in result.scalars().all()
    ]

    # 2. Semantic retrieval — failures are caught silently so chat always works
    sources: list[str] = []
    doc_context = ""
    try:
        retrieval = retrieve(
            question=question,
            user_id=str(user_id),
            folder_id=str(folder_id),
        )
        chunks = retrieval.get("chunks", [])
        sources = retrieval.get("sources", [])
        if chunks and any(c.strip() for c in chunks):
            doc_context = "\n\n".join(c.strip() for c in chunks if c.strip())
    except Exception:
        pass  # Chat still works without document context

    # 3. Build system message
    if doc_context:
        system_content = (
            f"{_SYSTEM_BASE}\n\n"
            "---\n"
            "The following excerpts are from documents the user has uploaded "
            "to their workspace. Use them if they're relevant to the question:\n\n"
            f"{doc_context}\n"
            "---"
        )
    else:
        system_content = _SYSTEM_BASE

    # 4. Assemble full message list
    messages = [SystemMessage(content=system_content)] + history + [HumanMessage(content=question)]

    # 5. Call LLM
    resp = await llm.ainvoke(messages)

    # 6. Persist both turns
    now = datetime.now(timezone.utc)
    db.add(Message(
        message_id=uuid.uuid4(),
        content=question,
        user_id=user_id,
        chat_id=chat_id,
        created_at=now,
        role="user",
    ))
    db.add(Message(
        message_id=uuid.uuid4(),
        content=resp.content,
        user_id=user_id,
        chat_id=chat_id,
        created_at=now,
        role="assistant",
    ))
    await db.commit()

    return Response(answer=resp.content, sources=list(set(sources)))
