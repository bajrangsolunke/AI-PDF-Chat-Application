export function TopographyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 600"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      {/* Concentric irregular contour lines, like a topographic map */}
      <path d="M 300 100 C 420 100 500 180 500 300 C 500 420 420 500 300 500 C 180 500 100 420 100 300 C 100 180 180 100 300 100 Z" />
      <path d="M 300 150 C 390 150 450 210 450 300 C 450 390 390 450 300 450 C 210 450 150 390 150 300 C 150 210 210 150 300 150 Z" />
      <path d="M 300 200 C 360 200 400 240 400 300 C 400 360 360 400 300 400 C 240 400 200 360 200 300 C 200 240 240 200 300 200 Z" />
      <path d="M 300 250 C 330 250 350 270 350 300 C 350 330 330 350 300 350 C 270 350 250 330 250 300 C 250 270 270 250 300 250 Z" />
      <path d="M 300 290 C 305 290 310 295 310 300 C 310 305 305 310 300 310 C 295 310 290 305 290 300 C 290 295 295 290 300 290 Z" />

      {/* A few asymmetric lines breaking the pattern, to feel like a real map */}
      <path d="M 100 200 Q 200 230 280 220 T 480 240" strokeDasharray="2 4" opacity="0.6" />
      <path d="M 80 380 Q 200 360 320 400 T 540 390" strokeDasharray="2 4" opacity="0.6" />

      {/* Subtle directional hatching on one side */}
      <path d="M 420 80 L 460 60 M 440 90 L 480 70 M 460 100 L 500 80" opacity="0.4" />

      {/* A tiny compass rose ornament in top-left */}
      <g transform="translate(120, 100)" opacity="0.5">
        <line x1="0" y1="-16" x2="0" y2="16" />
        <line x1="-16" y1="0" x2="16" y2="0" />
        <line x1="-10" y1="-10" x2="10" y2="10" opacity="0.5" />
        <line x1="-10" y1="10" x2="10" y2="-10" opacity="0.5" />
        <circle cx="0" cy="0" r="3" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
