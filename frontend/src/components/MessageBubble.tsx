interface Props {
  role: "user" | "ai";
  content: string;
  sources?: string[];
}

export default function MessageBubble({ role, content, sources }: Props) {
  const isUser = role === "user";

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 16,
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent), #a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, marginRight: 10, flexShrink: 0, alignSelf: "flex-end",
        }}>🧠</div>
      )}

      <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{
          padding: "12px 16px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? "linear-gradient(135deg, var(--accent), #a78bfa)"
            : "var(--bg-card)",
          border: isUser ? "none" : "1px solid var(--border)",
          fontSize: 14,
          lineHeight: 1.6,
          color: isUser ? "#fff" : "var(--text-primary)",
          boxShadow: isUser ? "0 4px 16px rgba(108, 99, 255, 0.3)" : "none",
          whiteSpace: "pre-wrap",
        }}>
          {content}
        </div>

        {/* Source citations */}
        {!isUser && sources && sources.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 4 }}>
            {sources.map((s) => (
              <span key={s} style={{
                fontSize: 10, padding: "2px 8px",
                background: "var(--accent-dim)",
                color: "var(--accent-light)",
                borderRadius: 20,
                border: "1px solid rgba(108, 99, 255, 0.3)",
              }}>
                📎 {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "var(--bg-hover)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, marginLeft: 10, flexShrink: 0, alignSelf: "flex-end",
          border: "1px solid var(--border)",
        }}>👤</div>
      )}
    </div>
  );
}
