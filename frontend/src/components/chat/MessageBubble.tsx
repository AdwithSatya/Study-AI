import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  role: "user" | "ai";
  content: string;
  sources?: string[];
}

export default function MessageBubble({ role, content, sources }: Props) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="user-bubble px-4 py-3 rounded-2xl rounded-tr-sm text-white text-sm leading-relaxed whitespace-pre-wrap max-w-xl">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-3">
      <div className="ai-avatar w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
      </div>
      <div style={{ maxWidth: "680px", minWidth: 0 }}>
        <div className="ai-bubble px-4 py-3 rounded-2xl rounded-tl-sm">
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>

        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 pl-1" aria-label="Sources">
            {sources.map((source, i) => (
              <span key={i} className="source-pill px-2.5 py-0.5 rounded-full flex items-center gap-1" title={source}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>link</span>
                <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {source}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
