const SUGGESTIONS = [
  "Summarise this document in three points.",
  "What are the main risks identified?",
  "Where does the author cite primary sources?",
  "List every claim that uses a number.",
];

export function SuggestedQuestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="mt-6">
      <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-ink-soft pb-2 border-b border-rule">
        Try asking
      </p>
      <ul className="mt-3 space-y-2">
        {SUGGESTIONS.map((q) => (
          <li key={q}>
            <button
              onClick={() => onPick(q)}
              className="text-base font-display italic text-ink hover:text-accent transition-colors text-left flex items-baseline gap-2"
              style={{ fontFeatureSettings: "'opsz' 144" }}
            >
              <span className="text-ink-soft text-sm not-italic font-sans">›</span>
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
