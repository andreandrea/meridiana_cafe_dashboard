const ICONS = {
  coffee: (
    <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8ZM6 1v3M10 1v3M14 1v3" />
  ),
  food: (
    <path d="M3 2v7c0 1.1.9 2 2 2s2-.9 2-2V2M5 11v11M12 2c-1.5 2-1.5 5 0 7v13" />
  ),
  interior: (
    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
  ),
  location: (
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
  ),
} as const;

type PlaceholderImageProps = {
  variant?: keyof typeof ICONS;
  label?: string;
  className?: string;
};

export function PlaceholderImage({
  variant = "coffee",
  label,
  className = "",
}: PlaceholderImageProps) {
  return (
    <div
      className={`brand-gradient-bg relative flex items-center justify-center overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeOpacity={0.55}
        strokeWidth={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-1/3 w-1/3"
      >
        {ICONS[variant]}
      </svg>
      {label && (
        <span className="absolute bottom-2 right-3 text-[10px] uppercase tracking-wide text-white/60">
          {label}
        </span>
      )}
    </div>
  );
}
