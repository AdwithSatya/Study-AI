interface Props {
  role: "user" | "ai";
  content: string;
  sources?: string[];
}

export default function MessageBubble({ role, content, sources }: Props) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex gap-md justify-end">
        <div className="flex flex-col gap-sm max-w-xl bg-surface-container-high p-md rounded-2xl rounded-tr-none shadow-md">
          <p className="font-body-lg text-body-lg text-on-surface whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-md">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 text-on-primary">
        <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
      </div>
      <div className="flex flex-col gap-sm max-w-2xl">
        <p className="font-body-lg text-body-lg text-on-surface whitespace-pre-wrap">
          {content}
        </p>

        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-xs mt-xs" aria-label="Sources">
            {sources.map((source, i) => (
              <span
                key={i}
                className="bg-surface-container text-on-surface-variant text-[11px] px-sm py-1 rounded-full flex items-center gap-xs border border-outline-variant hover:bg-surface-container-high cursor-pointer transition-colors"
                title={source}
              >
                <span className="material-symbols-outlined text-[13px]">link</span>
                {source}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
