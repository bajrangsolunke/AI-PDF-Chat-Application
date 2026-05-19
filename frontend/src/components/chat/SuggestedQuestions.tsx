const SUGGESTIONS = [
  "Summarize this document in 3 bullet points.",
  "What are the key findings?",
  "List the action items mentioned.",
];

export function SuggestedQuestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="grid sm:grid-cols-3 gap-2 mt-6">
      {SUGGESTIONS.map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          className="text-left text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
