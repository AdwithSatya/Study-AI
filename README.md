# 📚 Study AI

Study AI is a production-ready AI-powered learning platform that enables users to upload study materials, organize them into folders, and ask context-aware questions using Retrieval-Augmented Generation (RAG).

Instead of relying solely on a Large Language Model, Study AI retrieves relevant information from user-uploaded documents, ensuring accurate, context-aware, and source-grounded responses.

---

## ✨ Features

- 🔐 Secure JWT Authentication
- 📄 PDF & Document Upload
- 📂 Folder & Workspace Management
- 🧠 Retrieval-Augmented Generation (RAG)
- 🔎 Semantic Search with ChromaDB
- 📑 Metadata-based Document Filtering
- ⚡ FastAPI REST API
- 🗄 PostgreSQL Database
- 🤖 AI-powered Question Answering
- 📚 Persistent Vector Storage
- 📝 Automatic Document Chunking & Embedding
- 🛡 Clean Backend Architecture

---

## 🏗 Tech Stack

**Backend**
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic

**AI**
- ChromaDB
- Sentence Transformers
- LangChain
- RAG Pipeline

**Authentication**
- JWT
- OAuth2 Password Flow

**Storage**
- Local File Storage
- Vector Database

---

## 📖 How it Works

1. User uploads study materials.
2. Documents are processed and chunked.
3. Text chunks are converted into vector embeddings.
4. Embeddings are stored in ChromaDB.
5. User asks a question.
6. Relevant chunks are retrieved using semantic search.
7. The retrieved context is passed to the LLM.
8. The AI generates an accurate, context-aware response.

---

## 🚀 Future Improvements

- Streaming AI Responses
- Redis Caching
- Background Processing
- OCR Support
- Multi-file Chat
- Real-time Collaboration
- Cloud Storage Integration
- Docker Deployment

---

## 📄 License

MIT License
