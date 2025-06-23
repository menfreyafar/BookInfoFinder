export default function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main orange circle */}
      <circle cx="50" cy="50" r="47" fill="#FF7F00" />
      
      {/* Outer decorative dashes */}
      <g stroke="black" strokeWidth="2" fill="none" strokeLinecap="round">
        {/* Top */}
        <path d="M 25 12 L 22 15" />
        <path d="M 35 8 L 32 12" />
        <path d="M 50 6 L 50 10" />
        <path d="M 65 8 L 68 12" />
        <path d="M 75 12 L 78 15" />
        
        {/* Right */}
        <path d="M 88 25 L 85 22" />
        <path d="M 92 35 L 88 32" />
        <path d="M 94 50 L 90 50" />
        <path d="M 92 65 L 88 68" />
        <path d="M 88 75 L 85 78" />
        
        {/* Bottom */}
        <path d="M 75 88 L 78 85" />
        <path d="M 65 92 L 68 88" />
        <path d="M 50 94 L 50 90" />
        <path d="M 35 92 L 32 88" />
        <path d="M 25 88 L 22 85" />
        
        {/* Left */}
        <path d="M 12 75 L 15 78" />
        <path d="M 8 65 L 12 68" />
        <path d="M 6 50 L 10 50" />
        <path d="M 8 35 L 12 32" />
        <path d="M 12 25 L 15 22" />
      </g>
      
      {/* Inner yellow circle */}
      <circle cx="50" cy="50" r="30" fill="#FFD700" />
      
      {/* Middle decorative dashes */}
      <g stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round">
        {/* Top */}
        <path d="M 35 25 L 33 27" />
        <path d="M 45 22 L 43 25" />
        <path d="M 55 22 L 57 25" />
        <path d="M 65 25 L 67 27" />
        
        {/* Right */}
        <path d="M 75 35 L 73 33" />
        <path d="M 78 45 L 75 43" />
        <path d="M 78 55 L 75 57" />
        <path d="M 75 65 L 73 67" />
        
        {/* Bottom */}
        <path d="M 65 75 L 67 73" />
        <path d="M 55 78 L 57 75" />
        <path d="M 45 78 L 43 75" />
        <path d="M 35 75 L 33 73" />
        
        {/* Left */}
        <path d="M 25 65 L 27 67" />
        <path d="M 22 55 L 25 57" />
        <path d="M 22 45 L 25 43" />
        <path d="M 25 35 L 27 33" />
      </g>
      
      {/* Central spiral design */}
      <g stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round">
        {/* Outer spiral */}
        <path d="M 50 35 Q 60 40 55 50 Q 50 60 40 55 Q 30 50 35 40 Q 40 30 50 35" />
        
        {/* Middle spiral */}
        <path d="M 50 40 Q 55 43 53 50 Q 50 57 43 55 Q 36 52 38 45 Q 41 38 48 40" />
        
        {/* Inner spiral */}
        <path d="M 50 45 Q 52 47 51 50 Q 50 53 47 52 Q 44 51 45 48 Q 46 45 49 46" />
        
        {/* Center dot */}
        <circle cx="50" cy="50" r="2" fill="black" />
      </g>
    </svg>
  );
}