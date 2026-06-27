from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.db_models import Message
from models.schemas import Response
from rag_pipeline import query
import uuid
from datetime import datetime, timezone

llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0, max_tokens=1024)

async def response(question: str, chat_id: uuid.UUID, user_id: uuid.UUID, folder_id: uuid.UUID, db: AsyncSession):
    # 1. Fetch past messages from DB
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at)
    )
    past_messages = result.scalars().all()

    # 2. Build message history for LLM
    messages = []
    for msg in past_messages:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        else:
            messages.append(AIMessage(content=msg.content))

    # 3. RAG retrieval
    retrieval = query(
        question=question,
        user_id=str(user_id),
        folder_id=str(folder_id)
    )
    chunks = retrieval["chunks"]
    sources = retrieval["sources"]
    context = "\n\n---\n\n".join(chunks)

    # 4. System prompt + current question
    messages.append(SystemMessage(content=f"""You are a helpful study assistant.
Answer using ONLY the notes below.
If not in notes, say "I couldn't find this in your notes."

NOTES:
{context}"""))
    messages.append(HumanMessage(content=question))

    # 5. Call LLM
    resp = await llm.ainvoke(messages)

    # 6. Save both messages to DB
    db.add(Message(
        message_id=uuid.uuid4(),
        content=question,
        user_id=user_id,
        chat_id=chat_id,
        created_at=datetime.now(timezone.utc),
        role="user"
    ))
    db.add(Message(
        message_id=uuid.uuid4(),
        content=resp.content,
        user_id=user_id,
        chat_id=chat_id,
        created_at=datetime.now(timezone.utc),
        role="assistant"
    ))
    await db.commit()

    return Response(answer=resp.content, sources=list(set(sources)))