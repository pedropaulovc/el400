import { cn } from "@/lib/utils";

interface SevenSegmentDigitProps {
  value: string;
  showDecimal?: boolean;
  className?: string;
}

// SVG-based 7-segment display for authentic look
const SevenSegmentDigit = ({ value, showDecimal = false, className }: SevenSegmentDigitProps) => {
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
  };

  const segments = segmentMap[value] || segmentMap[' '];

  const onColor = "hsl(120, 100%, 50%)";
  const offColor = "hsl(120, 100%, 8%)";

  return (
    <div className={cn("relative", className)}>
      <svg viewBox="-8 0 68 90" className="w-full h-full" style={{ overflow: 'visible' }}>
        <g transform="skewX(-10)">
          {/* Segment A (top) */}
          <polygon
            points="4,2 40,2 34,10 10,10"
            fill={segments[0] ? onColor : offColor}
            filter={segments[0] ? "url(#glow)" : undefined}
          />
          {/* Segment B (top right) */}
          <polygon
            points="41,4 41,43 35,37 35,11"
            fill={segments[1] ? onColor : offColor}
            filter={segments[1] ? "url(#glow)" : undefined}
          />
          {/* Segment C (bottom right) */}
          <polygon
            points="41,47 41,86 35,79 35,53"
            fill={segments[2] ? onColor : offColor}
            filter={segments[2] ? "url(#glow)" : undefined}
          />
          {/* Segment D (bottom) */}
          <polygon
            points="4,88 40,88 34,80 10,80"
            fill={segments[3] ? onColor : offColor}
            filter={segments[3] ? "url(#glow)" : undefined}
          />
          {/* Segment E (bottom left) */}
          <polygon
            points="3,47 3,86 9,79 9,53"
            fill={segments[4] ? onColor : offColor}
            filter={segments[4] ? "url(#glow)" : undefined}
          />
          {/* Segment F (top left) */}
          <polygon
            points="3,4 3,43 9,37 9,11"
            fill={segments[5] ? onColor : offColor}
            filter={segments[5] ? "url(#glow)" : undefined}
          />
          {/* Segment G (middle) - hexagonal */}
          <polygon
            points="4,45 10,41 34,41 40,45 34,49 10,49"
            fill={segments[6] ? onColor : offColor}
            filter={segments[6] ? "url(#glow)" : undefined}
          />
          
          {/* Decimal point segment (bottom right of digit) */}
          <circle
            cx="47"
            cy="85"
            r="4"
            fill={showDecimal ? onColor : offColor}
            filter={showDecimal ? "url(#glow)" : undefined}
          />
        </g>
        
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
    </div>
  );
};

export default SevenSegmentDigit;
