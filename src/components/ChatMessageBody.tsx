"use client";

/** Lightweight chat formatting — no extra markdown dependency. */
export function ChatMessageBody({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => (
        <Line key={i} line={line} />
      ))}
    </div>
  );
}

function Line({ line }: { line: string }) {
  const trimmed = line.trim();

  if (!trimmed) return <div className="h-1" />;

  if (trimmed.startsWith("### ")) {
    return <h4 className="font-semibold text-goaliq-gold text-xs uppercase tracking-wide mt-2">{inline(trimmed.slice(4))}</h4>;
  }
  if (trimmed.startsWith("## ")) {
    return <h3 className="font-semibold text-white mt-3 mb-1">{inline(trimmed.slice(3))}</h3>;
  }
  if (trimmed.startsWith("# ")) {
    return <h2 className="font-bold text-base text-white mt-1 mb-1">{inline(trimmed.slice(2))}</h2>;
  }

  if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
    const cells = trimmed.split("|").filter(Boolean).map((c) => c.trim());
    if (cells.every((c) => /^-+$/.test(c))) return null;
    const isHeaderRow = cells.some((c) => c === "---" || /^-+$/.test(c));
    if (isHeaderRow) return null;
    return (
      <div className="grid grid-cols-3 gap-2 text-xs border-b border-gray-700/50 py-1">
        {cells.map((cell, j) => (
          <span key={j} className={j === 0 ? "text-gray-500" : "tabular-nums"}>
            {inline(cell)}
          </span>
        ))}
      </div>
    );
  }

  if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
    return (
      <p className="pl-3 text-gray-200 relative before:content-['•'] before:absolute before:left-0 before:text-goaliq-accent">
        {inline(trimmed.replace(/^[-•]\s*/, ""))}
      </p>
    );
  }

  if (trimmed.startsWith("_") && trimmed.endsWith("_")) {
    return <p className="text-xs text-gray-500 italic">{trimmed.slice(1, -1)}</p>;
  }

  return <p className="text-gray-200">{inline(trimmed)}</p>;
}

function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
