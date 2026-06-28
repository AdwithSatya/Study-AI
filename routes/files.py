"""
routes/files.py
────────────────────────────────────────────────────────────────────────────────
File (document) management endpoints:

  POST   /files/upload          → upload + ingest a document into a workspace
  GET    /files/list            → list all files in a workspace
  PUT    /files/{file_id}       → rename a file
  DELETE /files/{file_id}       → delete file record + remove its vectors
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import asyncio
import uuid

from database import get_db
from models import User, Folder, File as FileModel, UploadResponse, FileUpdate
from core.auth_deps import get_current_user
from ai.ingest import ingest, delete_embeddings

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED_EXTENSIONS = {"pdf", "ppt", "pptx", "docx", "txt", "md"}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "text/x-markdown",
}

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    folder_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Folder).where(Folder.folder_id == folder_id))
    folder = result.scalar_one_or_none()

    if not folder or folder.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # MIME type check
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid MIME type '{content_type}'. Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}",
        )

    file_bytes = await file.read()

    # File size check (after read to get actual byte count)
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is 20 MB.",
        )
    file_id = uuid.uuid4()

    new_file = FileModel(
        file_id=file_id,
        file_name=file.filename,
        folder_id=folder_id,
        user_id=current_user.user_id,
        created_at=datetime.now(timezone.utc),
        status="processing",
    )
    db.add(new_file)
    await db.commit()

    try:
        chunks_stored = await asyncio.to_thread(
            ingest,
            file_bytes,
            file.filename,
            str(file_id),
            str(folder_id),
            str(current_user.user_id),
        )
    except Exception as exc:
        new_file.status = "failed"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {exc}")

    new_file.status = "ready"
    await db.commit()

    return UploadResponse(filename=file.filename, chunks_stored=chunks_stored)


@router.get("/list")
async def list_files(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FileModel).where(
            FileModel.folder_id == folder_id,
            FileModel.user_id == current_user.user_id,
        )
    )
    files = result.scalars().all()
    return {
        "files": [
            {"file_id": f.file_id, "file_name": f.file_name, "status": f.status}
            for f in files
        ]
    }


@router.put("/{file_id}")
async def update_file(
    file_id: uuid.UUID,
    input: FileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FileModel).where(FileModel.file_id == file_id))
    file = result.scalar_one_or_none()

    if not file or file.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="File not found")

    file.file_name = input.file_name
    await db.commit()
    return {"file_id": file.file_id, "file_name": file.file_name, "status": file.status}


@router.delete("/{file_id}")
async def delete_file(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FileModel).where(FileModel.file_id == file_id))
    file = result.scalar_one_or_none()

    if not file or file.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="File not found")

    delete_embeddings(file_id=str(file_id))
    await db.delete(file)
    await db.commit()

    return {"detail": "File deleted successfully"}
