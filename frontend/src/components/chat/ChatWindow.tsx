import { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble from "./MessageBubble";
import { askQuestion, listFiles, uploadFile, deleteFile, type FileItem } from "../../api";
import { useAppState, useAppDispatch } from "../../store";
import ConfirmDialog from "../ui/ConfirmDialog";

interface Message {
  role: "user" | "ai";
  content: string;
  sources?: string[];
}

interface Props {
  onToast: (msg: string, type: "success" | "error") => void;
}

export default function ChatWindow({ onToast }: Props) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { token, selectedChat, selectedFolder, files } = state;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Confirm dialog state instead of window.confirm()
  const [confirm, setConfirm] = useState<{
    title: string; body: string; onConfirm: () => void;
  } | null>(null);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  // Reset messages when chat changes
  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [selectedChat?.chat_id]);

  // Load files when folder changes
  useEffect(() => {
    if (!token || !selectedFolder) return;
    listFiles(token, selectedFolder.folder_id)
      .then((f) => dispatch({ type: "SET_FILES", files: f }))
      .catch(() => {});
  }, [token, selectedFolder, dispatch]);

  // Auto-scroll — only scroll to bottom, no layout thrash
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // requestAnimationFrame so we don't force layout sync mid-render
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, loading]);

  // Auto-expand textarea — debounced to avoid reflow per keystroke
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustHeight();
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !token || !selectedChat) return;

    const question = input.trim();
    setInput("");
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await askQuestion(token, selectedChat.chat_id, question);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: res.answer, sources: res.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "⚠️ Couldn't reach the backend. Is the server running?" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = ""; // reset so same file can be re-selected
  };

  const handleUpload = async (file: File) => {
    if (!token || !selectedFolder) {
      onToast("Select a workspace first", "error");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "ppt", "pptx", "docx", "txt", "md"].includes(ext || "")) {
      onToast("Only PDF, PPTX, DOCX, TXT and MD files are supported", "error");
      return;
    }
    setUploading(true);
    const tempFile: FileItem = {
      file_id: `temp-${Date.now()}`,
      file_name: file.name,
      status: "processing",
    };
    dispatch({ type: "ADD_FILE", file: tempFile });

    try {
      const res = await uploadFile(token, selectedFolder.folder_id, file);
      const updated = await listFiles(token, selectedFolder.folder_id);
      dispatch({ type: "SET_FILES", files: updated });
      onToast(`"${res.filename}" indexed successfully`, "success");
    } catch {
      onToast("Upload failed", "error");
      const updated = await listFiles(token, selectedFolder.folder_id).catch(
        () => files.filter((f) => !f.file_id.startsWith("temp-"))
      );
      dispatch({ type: "SET_FILES", files: updated });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = (e: React.MouseEvent, fileId: string, fileName: string) => {
    e.stopPropagation();
    if (!token) return;
    setConfirm({
      title: "Delete source?",
      body: `"${fileName}" will be permanently removed from this workspace and the search index.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteFile(token, fileId);
          dispatch({ type: "DELETE_FILE", file_id: fileId });
          onToast("Source deleted", "success");
        } catch {
          onToast("Failed to delete source", "error");
        }
      },
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return { icon: "picture_as_pdf", color: "#f87171", bg: "rgba(248,113,113,0.1)" };
    if (["ppt", "pptx"].includes(ext || "")) return { icon: "slideshow", color: "#fbbf24", bg: "rgba(251,191,36,0.1)" };
    return { icon: "article", color: "#60a5fa", bg: "rgba(96,165,250,0.1)" };
  };

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!selectedFolder) {
    return (
      <main className="flex-1 flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div className="chat-empty-icon mx-auto mb-4">
            <span className="material-symbols-outlined" style={{ fontSize: 26 }}>folder</span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>
            No Workspace Selected
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6 }}>
            Create or select a workspace from the sidebar to start organising your study materials.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          body={confirm.body}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "var(--bg-base)" }}>

        {/* ── Centre: Chat panel ──────────────────────────────────────────── */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>

          {/* Chat header — solid bg, NO blur for performance */}
          <header className="chat-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="chat-header-title truncate">
                {selectedChat ? selectedChat.chat_name : "Select a conversation"}
              </div>
              <div className="chat-header-sub truncate">
                📁 {selectedFolder.folder_name} · {files.length} source{files.length !== 1 ? "s" : ""}
              </div>
            </div>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="messages-scroll scroll-container">
            {/* Empty states */}
            {!selectedChat && messages.length === 0 && (
              <div className="chat-empty" style={{ flex: 1 }}>
                <div className="chat-empty-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: 26 }}>chat_bubble</span>
                </div>
                <div className="chat-empty-title">Start a conversation</div>
                <p className="chat-empty-sub">
                  Select or create a conversation in the sidebar to ask questions about your workspace.
                </p>
              </div>
            )}

            {selectedChat && messages.length === 0 && (
              <div className="chat-empty" style={{ flex: 1 }}>
                <div className="chat-empty-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: 26 }}>auto_awesome</span>
                </div>
                <div className="chat-empty-title">Ask your workspace</div>
                <p className="chat-empty-sub">
                  Ask anything about your uploaded materials. NoteAI will answer using your specific files.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} sources={m.sources} />
            ))}

            {/* Typing indicator — uses CSS dot animation, not spinning icon */}
            {loading && (
              <div className="flex gap-3 mb-3">
                <div className="ai-avatar w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
                </div>
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
          </div>

          {/* Input box — fixed bottom, NO backdrop-blur */}
          {selectedChat && (
            <div className="chat-input-area">
              <div className="chat-input-box"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleUpload(f);
                }}
                style={dragOver ? { borderColor: "var(--accent)", background: "var(--accent-dim)" } : {}}
              >
                <button className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Upload file">
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>attach_file</span>
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="chat-input"
                  placeholder="Ask about your study materials..."
                  rows={1}
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="send-btn"
                  title="Send (Enter)"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_upward</span>
                </button>
              </div>
              <p className="chat-input-hint">NoteAI can make mistakes — verify important information.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.ppt,.pptx,.docx,.txt,.md"
                hidden
                onChange={handleFileSelect}
              />
            </div>
          )}
        </section>

        {/* ── Right: Knowledge Base panel ─────────────────────────────────── */}
        <aside className="kb-panel" style={{ display: "none" }}
          ref={(el) => { if (el) el.style.display = window.innerWidth >= 1280 ? "flex" : "none"; }}
        >
          {/* We'll use a proper responsive approach */}
        </aside>

        {/* Knowledge Base — xl+ only */}
        <KnowledgePanel
          files={files}
          uploading={uploading}
          dragOver={dragOver}
          setDragOver={setDragOver}
          onUpload={handleUpload}
          onDelete={handleDeleteFile}
          onClickUpload={() => fileInputRef.current?.click()}
          getFileIcon={getFileIcon}
        />
      </div>
    </>
  );
}

// ── Knowledge Base side panel ──────────────────────────────────────────────────
interface KBProps {
  files: FileItem[];
  uploading: boolean;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onUpload: (f: File) => void;
  onDelete: (e: React.MouseEvent, id: string, name: string) => void;
  onClickUpload: () => void;
  getFileIcon: (name: string) => { icon: string; color: string; bg: string };
}

function KnowledgePanel({ files, uploading, dragOver, setDragOver, onUpload, onDelete, onClickUpload, getFileIcon }: KBProps) {
  return (
    <aside className="kb-panel" style={{ display: "flex", flexDirection: "column" }}
      id="kb-panel"
    >
      <style>{`@media (max-width: 1279px) { #kb-panel { display: none !important; } }`}</style>

      {/* Header */}
      <div className="kb-header">
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-1)" }}>Knowledge Base</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px",
          borderRadius: 999, background: "var(--bg-hover)", color: "var(--text-2)"
        }}>
          {files.length} {files.length === 1 ? "source" : "sources"}
        </span>
      </div>

      {/* File list */}
      <div className="scroll-container" style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {files.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-3)", fontSize: 13 }}>
            No sources yet. Drop files below to add them.
          </div>
        )}

        {files.map((f, i) => {
          const { icon, color, bg } = getFileIcon(f.file_name);
          return (
            <div key={f.file_id || i} className="kb-file-card">
              {/* File type icon */}
              <div style={{
                width: 36, height: 44, borderRadius: 6, flexShrink: 0,
                background: bg, border: `1px solid ${color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color }}>{icon}</span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
                <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                  {f.file_name}
                </div>
                <div style={{ marginTop: 3, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Status
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
                    color: f.status === "ready" ? "var(--ok)" : "var(--warn)",
                    animation: f.status !== "ready" ? "blink 1.5s ease-in-out infinite" : undefined,
                  }}>
                    {f.status}
                  </span>
                </div>
              </div>

              {/* Delete button — visible on hover via CSS */}
              <div className="kb-file-actions">
                <button
                  onClick={(e) => onDelete(e, f.file_id, f.file_name)}
                  className="icon-btn danger"
                  title="Delete source"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload zone */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
        <div
          onClick={onClickUpload}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) onUpload(f);
          }}
          className={`upload-zone ${dragOver ? "drag-over" : ""}`}
        >
          {uploading ? (
            <>
              <div className="upload-zone-icon">
                <span className="material-symbols-outlined" style={{ color: "var(--accent-2)", animation: "spin 1s linear infinite" }}>sync</span>
              </div>
              <div className="upload-zone-text" style={{ color: "var(--accent-2)", fontWeight: 700 }}>Indexing...</div>
            </>
          ) : (
            <>
              <div className="upload-zone-icon">
                <span className="material-symbols-outlined">upload_file</span>
              </div>
              <div className="upload-zone-text">Drop files to add sources</div>
              <div className="upload-zone-sub">PDF, PPTX, DOCX, TXT, MD</div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
