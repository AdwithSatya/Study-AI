"""
ai/
────────────────────────────────────────────────────────────────────────────────
AI layer — document ingestion, vector retrieval, and LLM agent.

Modules:
  ingest.py   → parse documents, chunk text, embed and store in ChromaDB
  retrieve.py → semantic search against ChromaDB using query embeddings
  agent.py    → LangChain LLM agent with conversation memory and RAG context
"""
