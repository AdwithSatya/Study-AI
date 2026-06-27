import { useState, useRef } from "react";
import { uploadFile } from "../api";

interface Props {
  onUploadSuccess: (filename: string) => void;
}

export default function Sidebar({ onUploadSuccess }: Props) {
  const [docs, setDocs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) return alert("Only PDF files supported.");
    setUploading(true);
    try {
      const res = await uploadFile(file);
      const { filename, chunks_stored } = res.data;
      setDocs((d) => [...d, filename]);
      onUploadSuccess(`✅ "${filename}" ingested (${chunks_stored} chunks)`);
    } catch {
      onUploadSuccess("❌ Upload failed. Is the server running?");
    }
    setUploading(false);
  };

  return (
    <aside style={{
      width: 280, minWidth: 280,
      background: "var(--bg-secondary)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      padding: "24px 16px", gap: 24,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, var(--accent), #a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>🧠</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>StudyAI</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>RAG Study Assistant</div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        style={{
          border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 12,
          padding: "20px 12px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          background: dragOver ? "var(--accent-dim)" : "transparent",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {uploading ? "Uploading..." : "Drop PDF or click to upload"}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Notes will be chunked & indexed
        </div>
        <input ref={inputRef} type="file" accept=".pdf" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {/* Documents List */}
      {docs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Uploaded Notes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {docs.map((d) => (
              <div key={d} style={{
                background: "var(--bg-card)",
                borderRadius: 8, padding: "8px 12px",
                fontSize: 12, color: "var(--text-secondary)",
                display: "flex", alignItems: "center", gap: 8,
                border: "1px solid var(--border)",
              }}>
                <span style={{ color: "var(--accent)" }}>📎</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: "auto", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
        Powered by Groq + ChromaDB
      </div>
    </aside>
  );
}
