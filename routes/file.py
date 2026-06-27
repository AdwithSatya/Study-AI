from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db import get_db
from models.db_models import User, Folder, File as FileModel
from models.schemas import UploadResponse
from core.deps import get_current_user
from rag_pipeline import ingest
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/files", tags=["files"])

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    folder_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify folder belongs to current user
    result = await db.execute(
        select(Folder).where(Folder.folder_id == folder_id)
    )
    folder = result.scalar_one_or_none()

    if not folder or folder.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check file type
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["pdf", "ppt", "pptx"]:
        raise HTTPException(status_code=400, detail="Only PDF and PPT files supported")

    # Read file bytes
    file_bytes = await file.read()

    # Save file record to DB
    file_id = uuid.uuid4()
    new_file = FileModel(
        file_id=file_id,
        file_name=file.filename,
        folder_id=folder_id,
        user_id=current_user.user_id,
        created_at=datetime.now(timezone.utc),
        status="processing"
    )
    db.add(new_file)
    await db.commit()

    # Ingest into ChromaDB
    chunks_stored = ingest(
        file_bytes=file_bytes,
        filename=file.filename,
        file_id=str(file_id),
        folder_id=str(folder_id),
        user_id=str(current_user.user_id)
    )

    # Update file status
    new_file.status = "completed"
    await db.commit()

    return UploadResponse(
        filename=file.filename,
        chunks_stored=chunks_stored
    )


@router.get("/list")
async def list_files(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(FileModel).where(
            FileModel.folder_id == folder_id,
            FileModel.user_id == current_user.user_id
        )
    )
    files = result.scalars().all()
    return {"files": [{"file_id": f.file_id, "file_name": f.file_name, "status": f.status} for f in files]}