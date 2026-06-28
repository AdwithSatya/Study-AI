"""
routes/folders.py
────────────────────────────────────────────────────────────────────────────────
Workspace (folder) management endpoints:

  POST   /folders/create        → create a workspace + default chat
  GET    /folders/list          → list user's workspaces
  PUT    /folders/{folder_id}   → rename a workspace
  DELETE /folders/{folder_id}   → delete workspace + all chats, files, vectors
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime, timezone
import uuid

from database import get_db
from models import User, Folder, Chat, File, Message, FolderCreate, FolderResponse, FolderUpdate
from core.auth_deps import get_current_user
from ai.ingest import delete_embeddings

router = APIRouter(prefix="/folders", tags=["folders"])


@router.post("/create", response_model=FolderResponse)
async def create_folder(
    input: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    new_folder = Folder(
        folder_id=uuid.uuid4(),
        folder_name=input.folder_name,
        user_id=current_user.user_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_folder)
    await db.flush()

    # Auto-create a default chat so the workspace is immediately usable
    db.add(Chat(
        chat_id=uuid.uuid4(),
        chat_name="Default Chat",
        user_id=current_user.user_id,
        folder_id=new_folder.folder_id,
        created_at=datetime.now(timezone.utc),
    ))
    await db.commit()

    return FolderResponse(folder_id=new_folder.folder_id, folder_name=new_folder.folder_name)


@router.get("/list")
async def list_folders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder).where(Folder.user_id == current_user.user_id)
    )
    folders = result.scalars().all()
    return {"folders": [{"folder_id": f.folder_id, "folder_name": f.folder_name} for f in folders]}


@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: uuid.UUID,
    input: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Folder).where(Folder.folder_id == folder_id))
    folder = result.scalar_one_or_none()

    if not folder or folder.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder.folder_name = input.folder_name
    await db.commit()
    return FolderResponse(folder_id=folder.folder_id, folder_name=folder.folder_name)


@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Folder).where(Folder.folder_id == folder_id))
    folder = result.scalar_one_or_none()

    if not folder or folder.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Folder not found")

    # 1. Delete all messages from chats in this folder
    chats = (await db.execute(select(Chat).where(Chat.folder_id == folder_id))).scalars().all()
    chat_ids = [c.chat_id for c in chats]

    if chat_ids:
        await db.execute(delete(Message).where(Message.chat_id.in_(chat_ids)))
        await db.execute(delete(Chat).where(Chat.chat_id.in_(chat_ids)))

    # 2. Delete files and their ChromaDB vectors
    files = (await db.execute(select(File).where(File.folder_id == folder_id))).scalars().all()
    if files:
        await db.execute(delete(File).where(File.folder_id == folder_id))
        delete_embeddings(folder_id=str(folder_id))

    # 3. Delete folder
    await db.delete(folder)
    await db.commit()

    return {"detail": "Folder and all its contents deleted successfully"}