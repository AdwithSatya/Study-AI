import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import { askQuestion } from "../api";

interface Message {
  role: "user" | "ai";
  content: string;
  sources?: string[];
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hi! I'm StudyAI. Upload your notes in the sidebar, then ask me anything about them!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // We hardcode session_id for MVP, Phase 2 will support multiple sessions
  const sessionId = "user_1"; 

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await askQuestion(userMsg, sessionId);
      const answer = res.data.answer;
      const sources = res.data.sources;
      setMessages(prev => [...prev, { role: "ai", content: answer, sources }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I couldn't connect to the backend. Is the server running?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      background: "var(--bg-primary)", position: "relative"
    }}>
      {/* Header */}
      <header style={{
        height: 64, borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", padding: "0 24px",
        background: "rgba(13, 15, 20, 0.8)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 10
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 500 }}>Chat Session</h2>
      </header>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto", padding: "32px 15%",
        display: "flex", flexDirection: "column"
      }}>
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} sources={m.sources} />
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 8, padding: 16, alignItems: "center", color: "var(--text-muted)" }}>
            <div className="dot-pulse"></div> Generating answer...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        padding: "24px 15%",
        background: "linear-gradient(translate, transparent, var(--bg-primary) 20%)",
        borderTop: "1px solid rgba(255, 255, 255, 0.02)"
      }}>
        <div style={{
          position: "relative",
          background: "var(--bg-card)",
          borderRadius: 24, border: "1px solid var(--border)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
          display: "flex", alignItems: "center"
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about your notes..."
            style={{
              flex: 1, background: "transparent", border: "none",
              padding: "16px 24px", fontSize: 15, color: "var(--text-primary)",
              outline: "none",
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: input.trim() ? "var(--accent)" : "var(--bg-hover)",
              border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginRight: 8, transition: "background 0.2s"
            }}
          >
            <span style={{ color: "#fff", translate: "2px 0" }}>➤</span>
          </button>
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 12 }}>
          StudyAI can make mistakes. Check your notes.
        </div>
      </div>
      
      {/* Simple css for the loading pulse */}
      <style>{`
        .dot-pulse {
          position: relative; width: 6px; height: 6px; border-radius: 5px;
          background-color: var(--accent); color: var(--accent);
          box-shadow: 9999px 0 0 -5px; animation: dot-pulse 1.5s infinite linear;
          animation-delay: 0.25s; margin-left: -9999px; marginRight: 20px;
        }
        .dot-pulse::before, .dot-pulse::after {
          content: ""; display: inline-block; position: absolute; top: 0;
          width: 6px; height: 6px; border-radius: 5px;
          background-color: var(--accent); color: var(--accent);
        }
        .dot-pulse::before {
          box-shadow: 9984px 0 0 -5px; animation: dot-pulse-before 1.5s infinite linear;
          animation-delay: 0s;
        }
        .dot-pulse::after {
          box-shadow: 10014px 0 0 -5px; animation: dot-pulse-after 1.5s infinite linear;
          animation-delay: 0.5s;
        }
        @keyframes dot-pulse-before {
          0% { box-shadow: 9984px 0 0 -5px; }
          30% { box-shadow: 9984px 0 0 2px; }
          60%, 100% { box-shadow: 9984px 0 0 -5px; }
        }
        @keyframes dot-pulse {
          0% { box-shadow: 9999px 0 0 -5px; }
          30% { box-shadow: 9999px 0 0 2px; }
          60%, 100% { box-shadow: 9999px 0 0 -5px; }
        }
        @keyframes dot-pulse-after {
          0% { box-shadow: 10014px 0 0 -5px; }
          30% { box-shadow: 10014px 0 0 2px; }
          60%, 100% { box-shadow: 10014px 0 0 -5px; }
        }
      `}</style>
    </div>
  );
}
