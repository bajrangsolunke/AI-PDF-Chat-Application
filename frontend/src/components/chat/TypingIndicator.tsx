export function TypingIndicator() {
  return (
    <div className="flex w-full mb-4 justify-start">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
        <div className="flex gap-1">
          <span className="size-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="size-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="size-2 rounded-full bg-slate-400 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
