export function TypingIndicator() {
  return (
    <div className="flex w-full mb-4 justify-start">
      <p className="text-sm text-ink-soft font-sans">
        Atlas is reading…
        <span className="cursor-blink ml-0.5 text-accent">▍</span>
      </p>
    </div>
  );
}
