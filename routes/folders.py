from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db import get_db
from models.db_models import User, Folder
from models.schemas import FolderCreate, FolderResponse
from core.deps import get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/folders", tags=["folders"])

@router.post("/create", response_model=FolderResponse)
async def create_folder(
    input: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_folder = Folder(
        folder_id=uuid.uuid4(),
        folder_name=input.folder_name,
        user_id=current_user.user_id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_folder)
    await db.commit()
    return FolderResponse(folder_id=new_folder.folder_id, folder_name=new_folder.folder_name)


@router.get("/list")
async def list_folders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Folder).where(Folder.user_id == current_user.user_id)
    )
    folders = result.scalars().all()
    return {"folders": [{"folder_id": f.folder_id, "folder_name": f.folder_name} for f in folders]}