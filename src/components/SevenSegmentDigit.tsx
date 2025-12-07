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
      <svg viewBox="0 0 36 60" className="w-full h-full">
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
        
        {/* Segment A (top) */}
        <polygon
          points="5,2 31,2 27,7 9,7"
          fill={segments[0] ? onColor : offColor}
          style={segments[0] ? { filter: 'drop-shadow(0 0 3px hsl(120, 100%, 50%))' } : undefined}
        />
        {/* Segment B (top right) */}
        <polygon
          points="32,3 32,28 28,24 28,9"
          fill={segments[1] ? onColor : offColor}
          style={segments[1] ? { filter: 'drop-shadow(0 0 3px hsl(120, 100%, 50%))' } : undefined}
        />
        {/* Segment C (bottom right) */}
        <polygon
          points="32,32 32,57 28,51 28,36"
          fill={segments[2] ? onColor : offColor}
          style={segments[2] ? { filter: 'drop-shadow(0 0 3px hsl(120, 100%, 50%))' } : undefined}
        />
        {/* Segment D (bottom) */}
        <polygon
          points="5,58 31,58 27,53 9,53"
          fill={segments[3] ? onColor : offColor}
          style={segments[3] ? { filter: 'drop-shadow(0 0 3px hsl(120, 100%, 50%))' } : undefined}
        />
        {/* Segment E (bottom left) */}
        <polygon
          points="4,32 4,57 8,51 8,36"
          fill={segments[4] ? onColor : offColor}
          style={segments[4] ? { filter: 'drop-shadow(0 0 3px hsl(120, 100%, 50%))' } : undefined}
        />
        {/* Segment F (top left) */}
        <polygon
          points="4,3 4,28 8,24 8,9"
          fill={segments[5] ? onColor : offColor}
          style={segments[5] ? { filter: 'drop-shadow(0 0 3px hsl(120, 100%, 50%))' } : undefined}
        />
        {/* Segment G (middle) */}
        <polygon
          points="6,29 30,29 28,33 8,33"
          fill={segments[6] ? onColor : offColor}
          style={segments[6] ? { filter: 'drop-shadow(0 0 3px hsl(120, 100%, 50%))' } : undefined}
        />
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
