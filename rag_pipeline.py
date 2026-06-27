import fitz  # PyMuPDF — reads PDFs
from sentence_transformers import SentenceTransformer
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

chroma_client = chromadb.PersistentClient(path="./chroma_db")

collection = chroma_client.get_or_create_collection(name="study_notes")


def ingest(file_bytes: bytes, filename: str, file_id: str, folder_id: str, user_id: str) -> int:
    ext = filename.split(".")[-1].lower()
    
    full_text = ""
    
    if ext == "pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page in doc:
            text = page.get_text().strip()
            if text:
                full_text += text + "\n"
    elif ext in ["ppt", "pptx"]:
        # save to temp file — UnstructuredPowerPointLoader needs file path
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        from langchain_community.document_loaders import UnstructuredPowerPointLoader
        loader = UnstructuredPowerPointLoader(tmp_path)
        pages = loader.load()
        full_text = "\n".join([p.page_content for p in pages])
    else:
        raise ValueError(f"Unsupported file type: {ext}")
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    chunks = splitter.split_text(full_text)

    for i, chunk in enumerate(chunks):
        embedding = embedding_model.encode(chunk).tolist()

        collection.add(
            ids=[f"{file_id}_{i}"],
            embeddings=[embedding],
            documents=[chunk],
            metadatas=[{
                "user_id": user_id,
                "folder_id": folder_id,
                "file_id": file_id
            }]
        )

    return len(chunks)



def query(question: str, user_id: str, folder_id: str, n_results: int = 5) -> dict:
    question_embedding = embedding_model.encode(question).tolist()

    results = collection.query(
    query_embeddings=[question_embedding],
    where={
        "$and": [
            {"user_id": user_id},
            {"folder_id": folder_id}
        ]
    },
    n_results=n_results,
    include=["documents", "metadatas"]
)

    chunks = results["documents"][0]
    sources = [m["file_id"] for m in results["metadatas"][0]]

    return {
        "chunks": chunks,
        "sources": sources
    }