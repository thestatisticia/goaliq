"use client";

/** Lightweight chat formatting — uses theme tokens for sharp, readable text. */
export function ChatMessageBody({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-base leading-relaxed text-goaliq-fg">
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
    return (
      <h4 className="mt-2 text-sm font-semibold uppercase tracking-wide text-goaliq-gold">
        {inline(trimmed.slice(4))}
      </h4>
    );
  }
  if (trimmed.startsWith("## ")) {
    return <h3 className="mb-1 mt-3 font-semibold text-goaliq-fg">{inline(trimmed.slice(3))}</h3>;
  }
  if (trimmed.startsWith("# ")) {
    return <h2 className="mb-1 mt-1 text-lg font-bold text-goaliq-fg">{inline(trimmed.slice(2))}</h2>;
  }

  if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
    const cells = trimmed.split("|").filter(Boolean).map((c) => c.trim());
    if (cells.every((c) => /^-+$/.test(c))) return null;
    const isHeaderRow = cells.some((c) => c === "---" || /^-+$/.test(c));
    if (isHeaderRow) return null;
    return (
      <div className="grid grid-cols-3 gap-2 border-b border-goaliq-border py-1.5 text-sm">
        {cells.map((cell, j) => (
          <span key={j} className={j === 0 ? "text-goaliq-muted" : "tabular-nums text-goaliq-fg"}>
            {inline(cell)}
          </span>
        ))}
      </div>
    );
  }

  if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
    return (
      <p className="relative pl-3 text-goaliq-fg before:absolute before:left-0 before:text-goaliq-accent before:content-['•']">
        {inline(trimmed.replace(/^[-•]\s*/, ""))}
      </p>
    );
  }

  if (trimmed.startsWith("_") && trimmed.endsWith("_")) {
    return <p className="text-sm italic text-goaliq-muted">{trimmed.slice(1, -1)}</p>;
  }

  return <p className="text-goaliq-fg">{inline(trimmed)}</p>;
}

function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-goaliq-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
