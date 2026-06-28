"""
ai/ingest.py
────────────────────────────────────────────────────────────────────────────────
Document ingestion pipeline.

Responsibilities:
  1. Parse raw file bytes into plain text (PDF, PPTX, DOCX, TXT, MD).
  2. Split text into overlapping chunks for better retrieval coverage.
  3. Embed each chunk with the sentence-transformer model.
  4. Store chunks + embeddings + metadata in ChromaDB.

Entry point:
    chunks_stored = ingest(file_bytes, filename, file_id, folder_id, user_id)

Each chunk is stored with metadata so it can be filtered per-user and per-folder
at query time, keeping workspaces isolated from each other.
"""

import os
import tempfile
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb

load_dotenv()

# ── Embedding model ────────────────────────────────────────────────────────────
_model_name = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
embedding_model = SentenceTransformer(_model_name)

# ── ChromaDB cloud client ──────────────────────────────────────────────────────
_chroma_client = chromadb.CloudClient(
    api_key=os.getenv("CHROMA_API_KEY"),
    tenant=os.getenv("CHROMA_TENANT"),
    database=os.getenv("CHROMA_DATABASE"),
)
collection = _chroma_client.get_or_create_collection(name="study_notes")

# ── Text splitter (shared config) ─────────────────────────────────────────────
_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)

SUPPORTED_EXTENSIONS = {"pdf", "ppt", "pptx", "docx", "txt", "md"}


def _extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from a supported file type."""
    ext = filename.rsplit(".", 1)[-1].lower()

    if ext == "pdf":
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return "\n".join(
            page.get_text().strip() for page in doc if page.get_text().strip()
        )

    if ext in {"ppt", "pptx"}:
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        from langchain_community.document_loaders import UnstructuredPowerPointLoader
        pages = UnstructuredPowerPointLoader(tmp_path).load()
        os.unlink(tmp_path)
        return "\n".join(p.page_content for p in pages)

    if ext == "docx":
        import docx
        from io import BytesIO
        document = docx.Document(BytesIO(file_bytes))
        return "\n".join(p.text for p in document.paragraphs if p.text.strip())

    if ext in {"txt", "md"}:
        return file_bytes.decode("utf-8", errors="replace")

    raise ValueError(f"Unsupported file type: .{ext}")


def ingest(
    file_bytes: bytes,
    filename: str,
    file_id: str,
    folder_id: str,
    user_id: str,
) -> int:
    """
    Parse, chunk, embed, and store a document in ChromaDB.

    Returns:
        Number of chunks stored.
    """
    text = _extract_text(file_bytes, filename)
    if not text.strip():
        raise ValueError("Document appears to be empty or unreadable.")

    chunks = _splitter.split_text(text)

    for i, chunk in enumerate(chunks):
        embedding = embedding_model.encode(chunk).tolist()
        collection.add(
            ids=[f"{file_id}_{i}"],
            embeddings=[embedding],
            documents=[chunk],
            metadatas=[{
                "user_id": user_id,
                "folder_id": folder_id,
                "file_id": file_id,
                "filename": filename,
            }],
        )

    return len(chunks)


def delete_embeddings(file_id: str | None = None, folder_id: str | None = None) -> None:
    """
    Remove vectors from ChromaDB.

    Pass file_id to delete a single file's chunks.
    Pass folder_id to wipe an entire workspace.
    """
    if file_id:
        collection.delete(where={"file_id": file_id})
    elif folder_id:
        collection.delete(where={"folder_id": folder_id})
