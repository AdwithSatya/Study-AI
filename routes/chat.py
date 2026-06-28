from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db import get_db
from models.db_models import User, Chat,Folder
from models.schemas import Request, Response
from agent import response as get_ai_response
from core.deps import get_current_user
import uuid
from datetime import datetime, timezone
router = APIRouter(prefix="/chat", tags=["chat"])
from models.schemas import ChatCreate, ChatResponse, ChatUpdate

@router.post("/create", response_model=ChatResponse)
async def create_chat(
    input: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify folder belongs to user
    result = await db.execute(
        select(Folder).where(Folder.folder_id == input.folder_id)
    )
    folder = result.scalar_one_or_none()

    if not folder or folder.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    new_chat = Chat(
        chat_id=uuid.uuid4(),
        chat_name=input.chat_name,
        user_id=current_user.user_id,
        folder_id=input.folder_id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_chat)
    await db.commit()

    return ChatResponse(chat_id=new_chat.chat_id, chat_name=new_chat.chat_name)

@router.post("/ask{chat_id}", response_model=Response)
async def ask(
    input: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get chat from DB — this gives us folder_id
    result = await db.execute(select(Chat).where(Chat.chat_id == input.chat_id))
    chat = result.scalar_one_or_none()
    
    if not chat or chat.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Now we have everything we need
    return await get_ai_response(
        question=input.question,
        chat_id=input.chat_id,
        user_id=current_user.user_id,
        folder_id=chat.folder_id,
        db=db
    )
@router.get("/list")
async def list_chats(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chat).where(
            Chat.folder_id == folder_id,
            Chat.user_id == current_user.user_id
        )
    )
    chats = result.scalars().all()
    return {"chats": [{"chat_id": c.chat_id, "chat_name": c.chat_name} for c in chats]}


@router.put("/{chat_id}", response_model=ChatResponse)
async def update_chat(
    chat_id: uuid.UUID,
    input: ChatUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chat).where(Chat.chat_id == chat_id)
    )
    chat = result.scalar_one_or_none()

    if not chat or chat.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Chat not found")

    chat.chat_name = input.chat_name
    await db.commit()
    return ChatResponse(chat_id=chat.chat_id, chat_name=chat.chat_name)


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chat).where(Chat.chat_id == chat_id)
    )
    chat = result.scalar_one_or_none()

    if not chat or chat.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Delete all messages in the chat history
    from sqlalchemy import delete
    from models.db_models import Message
    await db.execute(
        delete(Message).where(Message.chat_id == chat_id)
    )

    # Delete the chat record
    await db.delete(chat)
    await db.commit()

    return {"detail": "Chat and its history deleted successfully"}