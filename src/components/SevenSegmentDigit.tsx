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
  const offColor = "hsl(120, 50%, 6%)";

  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 28 48" className="w-full h-full">
        {/* Glow filter - defined first */}
        <defs>
          <filter id="segmentGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Segment A (top) - thicker horizontal */}
        <polygon
          points="4,2 24,2 21,6 7,6"
          fill={segments[0] ? onColor : offColor}
          filter={segments[0] ? "url(#segmentGlow)" : undefined}
        />
        {/* Segment B (top right) - thicker vertical */}
        <polygon
          points="25,3 25,22 21,19 21,7"
          fill={segments[1] ? onColor : offColor}
          filter={segments[1] ? "url(#segmentGlow)" : undefined}
        />
        {/* Segment C (bottom right) */}
        <polygon
          points="25,26 25,45 21,41 21,29"
          fill={segments[2] ? onColor : offColor}
          filter={segments[2] ? "url(#segmentGlow)" : undefined}
        />
        {/* Segment D (bottom) */}
        <polygon
          points="4,46 24,46 21,42 7,42"
          fill={segments[3] ? onColor : offColor}
          filter={segments[3] ? "url(#segmentGlow)" : undefined}
        />
        {/* Segment E (bottom left) */}
        <polygon
          points="3,26 3,45 7,41 7,29"
          fill={segments[4] ? onColor : offColor}
          filter={segments[4] ? "url(#segmentGlow)" : undefined}
        />
        {/* Segment F (top left) */}
        <polygon
          points="3,3 3,22 7,19 7,7"
          fill={segments[5] ? onColor : offColor}
          filter={segments[5] ? "url(#segmentGlow)" : undefined}
        />
        {/* Segment G (middle) - thicker */}
        <polygon
          points="5,23 23,23 21,26 7,26 5,23"
          fill={segments[6] ? onColor : offColor}
          filter={segments[6] ? "url(#segmentGlow)" : undefined}
        />
      </svg>
      
      {/* Decimal point */}
      {isDecimal && (
        <div 
          className="absolute bottom-0.5 right-0 w-2.5 h-2.5 rounded-full"
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
