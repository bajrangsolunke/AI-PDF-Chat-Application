const SUGGESTIONS = [
  "Summarise this document in three points.",
  "What are the main risks identified?",
  "Where does the author cite primary sources?",
  "List every claim that uses a number.",
];

export function SuggestedQuestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-ink-soft pb-2 border-b border-rule">
        Try asking
      </p>
      <ul className="mt-6 space-y-2.5">
        {SUGGESTIONS.map((q) => (
          <li key={q}>
            <button
              onClick={() => onPick(q)}
              className="group text-left text-ink hover:text-accent transition-colors text-base font-display italic flex items-baseline gap-2"
              style={{ fontFeatureSettings: "'opsz' 144" }}
            >
              <span className="text-accent not-italic font-sans">›</span>
              <span className="relative">
                <span>{q}</span>
                <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-accent transition-all duration-300 ease-out group-hover:w-full" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
