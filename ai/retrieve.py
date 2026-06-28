"""
ai/retrieve.py
────────────────────────────────────────────────────────────────────────────────
Semantic retrieval from ChromaDB.

Uses the same embedding model as ingest.py to convert the user's question into
a vector, then queries ChromaDB for the nearest-neighbour chunks within the
user's specific folder — keeping workspaces fully isolated.

Entry point:
    result = retrieve(question, user_id, folder_id, n_results=5)
    # result = {"chunks": [...], "sources": [...]}
"""

import os
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import chromadb

load_dotenv()


def _require_env(name: str) -> str:
    """Read a required environment variable; raise clearly if it is missing."""
    value = os.getenv(name)
    if value is None:
        raise RuntimeError(
            f"Required environment variable '{name}' is not set. "
            "Check your .env file."
        )
    return value


# ── Shared singletons (initialised once at import time) ───────────────────────
_model_name = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
embedding_model = SentenceTransformer(_model_name)

_chroma_client = chromadb.CloudClient(
    api_key=_require_env("CHROMA_API_KEY"),
    tenant=_require_env("CHROMA_TENANT"),
    database=_require_env("CHROMA_DATABASE"),
)
collection = _chroma_client.get_or_create_collection(name="study_notes")


def retrieve(
    question: str,
    user_id: str,
    folder_id: str,
    n_results: int = 5,
) -> dict[str, list]:
    """
    Embed the question and return the most semantically similar document chunks.

    Results are filtered to the given user + folder so users only see their
    own uploaded content.

    Returns:
        {
            "chunks":  list[str]  — raw text chunks,
            "sources": list[str]  — corresponding file_ids (for citation),
        }
    """
    query_embedding = embedding_model.encode(question).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        where={
            "$and": [
                {"user_id": user_id},
                {"folder_id": folder_id},
            ]
        },
        n_results=n_results,
        include=["documents", "metadatas"],
    )

    chunks: list[str] = results["documents"][0]
    sources: list[str] = [m["file_id"] for m in results["metadatas"][0]]

    return {"chunks": chunks, "sources": sources}
