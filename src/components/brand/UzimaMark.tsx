/**
 * IOU Exchange mark — geometric U with lime liquidity node.
 * Reads as capital + continuity; works at 16–48px.
 */
export default function UzimaMark({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="40" height="40" rx="10" fill="#0E1F1A" />
      {/* U stroke */}
      <path
        d="M11 10.5v11.2c0 5.05 3.7 8.8 9 8.8s9-3.75 9-8.8V10.5"
        stroke="#F3FAF5"
        strokeWidth="3.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Lime liquidity node */}
      <circle cx="29.5" cy="11" r="3.4" fill="#D3F36B" />
    </svg>
  );
}
