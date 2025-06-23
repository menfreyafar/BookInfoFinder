export default function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer orange circle */}
      <circle cx="200" cy="200" r="190" fill="hsl(25, 95%, 53%)" />
      
      {/* Outer decorative dashes */}
      <g stroke="black" strokeWidth="8" fill="none" strokeLinecap="round">
        <path d="M 200 50 A 150 150 0 0 1 265 78" />
        <path d="M 285 95 A 150 150 0 0 1 322 135" />
        <path d="M 335 160 A 150 150 0 0 1 350 200" />
        <path d="M 350 240 A 150 150 0 0 1 335 280" />
        <path d="M 322 305 A 150 150 0 0 1 285 345" />
        <path d="M 265 362 A 150 150 0 0 1 200 390" />
        <path d="M 135 362 A 150 150 0 0 1 115 345" />
        <path d="M 78 305 A 150 150 0 0 1 65 280" />
        <path d="M 50 240 A 150 150 0 0 1 50 200" />
        <path d="M 50 160 A 150 150 0 0 1 65 135" />
        <path d="M 78 95 A 150 150 0 0 1 115 78" />
        <path d="M 135 50 A 150 150 0 0 1 200 50" />
      </g>
      
      {/* Inner yellow circle */}
      <circle cx="200" cy="200" r="120" fill="hsl(45, 100%, 65%)" />
      
      {/* Inner decorative dashes */}
      <g stroke="black" strokeWidth="6" fill="none" strokeLinecap="round">
        <path d="M 200 100 A 100 100 0 0 1 245 120" />
        <path d="M 260 140 A 100 100 0 0 1 280 180" />
        <path d="M 300 200 A 100 100 0 0 1 280 240" />
        <path d="M 260 280 A 100 100 0 0 1 245 300" />
        <path d="M 200 320 A 100 100 0 0 1 155 300" />
        <path d="M 140 280 A 100 100 0 0 1 120 240" />
        <path d="M 100 200 A 100 100 0 0 1 120 160" />
        <path d="M 140 120 A 100 100 0 0 1 155 100" />
      </g>
      
      {/* Central spiral */}
      <g stroke="black" strokeWidth="4" fill="none" strokeLinecap="round">
        <path d="M 200 140 A 60 60 0 1 1 200 260" />
        <path d="M 200 160 A 40 40 0 1 1 200 240" />
        <path d="M 200 180 A 20 20 0 1 1 200 220" />
        <circle cx="200" cy="200" r="8" fill="black" />
      </g>
    </svg>
  );
}