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

  const onColor = "hsl(120, 100%, 50%)";
  const offColor = "hsl(120, 100%, 8%)";

  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 40 60" className="w-full h-full">
        {/* Segment A (top) */}
        <polygon
          points="6,2 34,2 30,8 10,8"
          fill={segments[0] ? onColor : offColor}
          filter={segments[0] ? "url(#glow)" : undefined}
        />
        {/* Segment B (top right) */}
        <polygon
          points="35,4 35,28 31,24 31,10"
          fill={segments[1] ? onColor : offColor}
          filter={segments[1] ? "url(#glow)" : undefined}
        />
        {/* Segment C (bottom right) */}
        <polygon
          points="35,32 35,56 31,50 31,36"
          fill={segments[2] ? onColor : offColor}
          filter={segments[2] ? "url(#glow)" : undefined}
        />
        {/* Segment D (bottom) */}
        <polygon
          points="6,58 34,58 30,52 10,52"
          fill={segments[3] ? onColor : offColor}
          filter={segments[3] ? "url(#glow)" : undefined}
        />
        {/* Segment E (bottom left) */}
        <polygon
          points="5,32 5,56 9,50 9,36"
          fill={segments[4] ? onColor : offColor}
          filter={segments[4] ? "url(#glow)" : undefined}
        />
        {/* Segment F (top left) */}
        <polygon
          points="5,4 5,28 9,24 9,10"
          fill={segments[5] ? onColor : offColor}
          filter={segments[5] ? "url(#glow)" : undefined}
        />
        {/* Segment G (middle) */}
        <polygon
          points="8,29 32,29 30,33 10,33 8,29"
          fill={segments[6] ? onColor : offColor}
          filter={segments[6] ? "url(#glow)" : undefined}
        />
        
        {/* Glow filter */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
          className="absolute bottom-1 right-0 w-2 h-2 rounded-full"
          style={{ 
            backgroundColor: onColor,
            boxShadow: `0 0 6px 2px ${onColor}`
          }}
        />
      )}
    </div>
  );
};

export default SevenSegmentDigit;
