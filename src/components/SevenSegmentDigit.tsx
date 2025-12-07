import { cn } from "@/lib/utils";

interface SevenSegmentDigitProps {
  value: string;
  className?: string;
}

// SVG-based 7-segment display for authentic look
const SevenSegmentDigit = ({ value, className }: SevenSegmentDigitProps) => {
  // Segment definitions: which segments are on for each character
  const segmentMap: Record<string, boolean[]> = {
    // [a, b, c, d, e, f, g] - standard 7-segment naming
    '0': [true, true, true, true, true, true, false],
    '1': [false, true, true, false, false, false, false],
    '2': [true, true, false, true, true, false, true],
    '3': [true, true, true, true, false, false, true],
    '4': [false, true, true, false, false, true, true],
    '5': [true, false, true, true, false, true, true],
    '6': [true, false, true, true, true, true, true],
    '7': [true, true, true, false, false, false, false],
    '8': [true, true, true, true, true, true, true],
    '9': [true, true, true, true, false, true, true],
    '-': [false, false, false, false, false, false, true],
    ' ': [false, false, false, false, false, false, false],
    '.': [false, false, false, false, false, false, false], // Handled separately
  };

  const segments = segmentMap[value] || segmentMap[' '];
  const isDecimal = value === '.';

  const onColor = "hsl(120, 100%, 45%)";
  const offColor = "hsl(120, 100%, 6%)";

  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 32 52" className="w-full h-full">
        {/* Segment A (top) - thicker */}
        <polygon
          points="4,2 28,2 24,7 8,7"
          fill={segments[0] ? onColor : offColor}
          filter={segments[0] ? "url(#glow)" : undefined}
        />
        {/* Segment B (top right) - thicker */}
        <polygon
          points="29,3 29,24 25,21 25,8"
          fill={segments[1] ? onColor : offColor}
          filter={segments[1] ? "url(#glow)" : undefined}
        />
        {/* Segment C (bottom right) - thicker */}
        <polygon
          points="29,28 29,49 25,44 25,31"
          fill={segments[2] ? onColor : offColor}
          filter={segments[2] ? "url(#glow)" : undefined}
        />
        {/* Segment D (bottom) - thicker */}
        <polygon
          points="4,50 28,50 24,45 8,45"
          fill={segments[3] ? onColor : offColor}
          filter={segments[3] ? "url(#glow)" : undefined}
        />
        {/* Segment E (bottom left) - thicker */}
        <polygon
          points="3,28 3,49 7,44 7,31"
          fill={segments[4] ? onColor : offColor}
          filter={segments[4] ? "url(#glow)" : undefined}
        />
        {/* Segment F (top left) - thicker */}
        <polygon
          points="3,3 3,24 7,21 7,8"
          fill={segments[5] ? onColor : offColor}
          filter={segments[5] ? "url(#glow)" : undefined}
        />
        {/* Segment G (middle) - thicker */}
        <polygon
          points="6,25 26,25 24,28 8,28 6,25"
          fill={segments[6] ? onColor : offColor}
          filter={segments[6] ? "url(#glow)" : undefined}
        />
        
        {/* Glow filter */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      
      {/* Decimal point */}
      {isDecimal && (
        <div 
          className="absolute bottom-1 right-0 w-2.5 h-2.5 rounded-full"
          style={{ 
            backgroundColor: onColor,
            boxShadow: `0 0 8px 3px ${onColor}`
          }}
        />
      )}
    </div>
  );
};

export default SevenSegmentDigit;
