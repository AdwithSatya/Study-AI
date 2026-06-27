import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import { askQuestion, listFiles, uploadFile, type FileItem } from "../api";
import { useAppState, useAppDispatch } from "../store";

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
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-expand input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || loading || !token || !selectedChat) return;

    const question = input.trim();
    setInput("");
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
        {
          role: "ai",
          content: "⚠️ Couldn't reach the backend. Is the server running?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    if (!token || !selectedFolder) {
      onToast("❌ Select a workspace first", "error");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "ppt", "pptx", "docx", "txt", "md"].includes(ext || "")) {
      onToast("❌ Only PDF, PPTX, DOCX, TXT and MD files are supported", "error");
      return;
    }
    setUploading(true);
    // Optimistic temp file addition
    const tempFile: FileItem = { file_id: `temp-${Date.now()}`, file_name: file.name, status: "processing" };
    dispatch({ type: "ADD_FILE", file: tempFile });

    try {
      const res = await uploadFile(token, selectedFolder.folder_id, file);
      const updated = await listFiles(token, selectedFolder.folder_id);
      dispatch({ type: "SET_FILES", files: updated });
      onToast(`✅ "${res.filename}" indexed successfully`, "success");
    } catch {
      onToast("❌ Upload failed", "error");
      const updated = await listFiles(token, selectedFolder.folder_id).catch(() => files.filter(f => !f.file_id.startsWith("temp-")));
      dispatch({ type: "SET_FILES", files: updated });
    } finally {
      setUploading(false);
    }
  };

  // ── Render Helpers ───────────────────────────────────────────────────────────

  const renderFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") {
      return (
        <div className="w-10 h-12 bg-red-500/10 rounded border border-red-500/30 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-red-400 text-[20px]">picture_as_pdf</span>
        </div>
      );
    }
    if (["ppt", "pptx"].includes(ext || "")) {
      return (
        <div className="w-10 h-12 bg-amber-500/10 rounded border border-amber-500/30 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-amber-400 text-[20px]">slideshow</span>
        </div>
      );
    }
    return (
      <div className="w-10 h-12 bg-blue-500/10 rounded border border-blue-500/30 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-blue-400 text-[20px]">article</span>
      </div>
    );
  };

  // Empty state: no workspace or chat selected
  if (!selectedFolder) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center bg-background text-on-surface p-xl">
        <div className="text-center space-y-md max-w-md">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto">
            <span className="material-symbols-outlined text-3xl">folder</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">No Workspace Selected</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Create or select a workspace in the sidebar to start organizing your study materials and chatting with your notes.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex-grow flex overflow-hidden bg-background">
      {/* Middle: Chat panel */}
      <section className="flex-grow flex flex-col h-full relative border-r border-outline-variant/30 min-w-0">
        {/* Chat header */}
        <header className="flex justify-between items-center px-margin-desktop py-sm bg-background/80 backdrop-blur-md border-b border-outline-variant/20 sticky top-0 z-10">
          <div className="flex flex-col truncate pr-md">
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface truncate">
              {selectedChat ? selectedChat.chat_name : "General Workspace Chat"}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant truncate">
              📁 {selectedFolder.folder_name} • {files.length} study sources
            </p>
          </div>
        </header>

        {/* Chat Messages */}
        <div ref={scrollRef} className="flex-grow overflow-y-auto px-margin-desktop py-lg space-y-lg custom-scrollbar pb-[100px]">
          {!selectedChat && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto space-y-md py-xl">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary animate-[float_4s_ease-in-out_infinite]">
                <span className="material-symbols-outlined">chat_bubble</span>
              </div>
              <h3 className="font-title-md text-title-md font-bold text-on-surface">Start a conversation</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Select or create a conversation in the sidebar to start asking questions about this workspace's resources.
              </p>
            </div>
          )}

          {selectedChat && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto space-y-md py-xl">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary animate-[float_5s_ease-in-out_infinite]">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <h3 className="font-title-md text-title-md font-bold text-on-surface">Ask your Workspace</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Ask a question about the uploaded materials. The AI will synthesize answers referencing your specific files.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} sources={m.sources} />
          ))}

          {loading && (
            <div className="flex gap-md">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-primary text-[20px] animate-spin">sync</span>
              </div>
              <div className="flex flex-col gap-sm">
                <span className="text-on-surface-variant italic font-body-md animate-pulse">
                  AI is analyzing sources and typing...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input box (Fixed bottom) */}
        {selectedChat && (
          <div className="absolute bottom-sm left-sm right-sm bg-background/90 backdrop-blur-md pt-xs">
            <div className="max-w-3xl mx-auto border border-outline-variant/30 rounded-2xl p-xs flex items-end gap-sm bg-surface-container-lowest/80 shadow-2xl">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-sm text-on-surface-variant hover:text-primary transition-colors flex items-center shrink-0"
                title="Upload Study Material"
              >
                <span className="material-symbols-outlined">attach_file</span>
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-grow bg-transparent border-none focus:ring-0 text-on-surface font-body-lg resize-none py-2 max-h-32 outline-none"
                placeholder="Ask about your research..."
                rows={1}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 active:scale-95 ${loading || !input.trim() ? "bg-surface-container text-[#484555]" : "bg-primary text-on-primary hover:bg-primary/95"}`}
              >
                <span className="material-symbols-outlined">arrow_upward</span>
              </button>
            </div>
            <div className="flex justify-center mt-1 pb-1">
              <p className="text-[10px] text-outline-variant">NoteAI can make mistakes. Verify important citations.</p>
            </div>
          </div>
        )}
      </section>

      {/* Right: Knowledge Base Bento Panel */}
      <section className="w-80 shrink-0 border-l border-outline-variant bg-surface-container-low hidden xl:flex flex-col h-full overflow-hidden">
        <div className="px-md py-lg border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-title-md text-title-md font-bold text-on-surface">Knowledge Base</h3>
          <span className="text-[11px] px-sm py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold">
            {files.length} Sources
          </span>
        </div>

        {/* Scrollable cards list */}
        <div className="flex-grow overflow-y-auto px-md py-sm space-y-sm custom-scrollbar">
          {files.map((f, i) => (
            <div
              key={f.file_id || i}
              className="bg-surface-container rounded-xl p-sm border border-outline-variant hover:bg-surface-container-high transition-all cursor-pointer group flex items-start gap-sm"
              title={f.file_name}
            >
              {renderFileIcon(f.file_name)}
              <div className="flex flex-col gap-1 overflow-hidden min-w-0 flex-grow">
                <span className="font-body-md text-body-md font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                  {f.file_name}
                </span>
                <div className="flex justify-between items-center w-full">
                  <span className="font-label-sm text-label-sm text-on-surface-variant text-[11px]">
                    Status
                  </span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${f.status === "ready" ? "text-emerald-400" : "text-[#cabeff] animate-pulse"}`}>
                    {f.status}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {files.length === 0 && (
            <div className="text-center py-xl text-outline-variant font-body-md">
              No sources in this workspace. Drop files below to add some!
            </div>
          )}
        </div>

        {/* Bottom Uploader Zone */}
        <div className="p-md border-t border-outline-variant bg-surface-container-low">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleUpload(f);
            }}
            className={`border-2 border-dashed rounded-xl p-md flex flex-col items-center justify-center text-center gap-xs transition-all group cursor-pointer bg-surface-container-lowest ${dragOver ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary"}`}
          >
            {uploading ? (
              <>
                <span className="material-symbols-outlined text-primary animate-spin">sync</span>
                <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider text-[11px]">Indexing...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">upload_file</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant group-hover:text-on-surface text-[11px]">
                  Drop files to add sources
                </span>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.ppt,.pptx,.docx,.txt,.md"
            hidden
            onChange={handleFileSelect}
          />
        </div>
      </section>
    </div>
  );
}
