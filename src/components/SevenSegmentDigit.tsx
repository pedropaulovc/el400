import { cn } from "@/lib/utils";
interface SevenSegmentDigitProps {
  value: string;
  showDecimal?: boolean;
  className?: string;
}

// SVG-based 7-segment display for authentic look
const SevenSegmentDigit = ({
  value,
  showDecimal = false,
  className
}: SevenSegmentDigitProps) => {
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
    // Letters for displaying messages
    'S': [true, false, true, true, false, true, true],  // Same as 5
    'E': [true, false, false, true, true, true, true],
    'L': [false, false, false, true, true, true, false],
    'C': [true, false, false, true, true, true, false],
    'T': [false, false, false, true, true, true, true],
    's': [true, false, true, true, false, true, true],  // lowercase same as uppercase
    'e': [true, false, false, true, true, true, true],
    'l': [false, false, false, true, true, true, false],
    'c': [true, false, false, true, true, true, false],
    't': [false, false, false, true, true, true, true]
  };
  const segments = segmentMap[value] || segmentMap[' '];
  const onColor = "hsl(120, 100%, 50%)";
  const offColor = "hsl(120, 100%, 8%)";
  
  return (
    <div className={cn("relative", className)}>
      <svg viewBox="-8 0 68 79.8" style={{ overflow: 'visible' }} className="w-full h-full py-[15px]">
        <style>{`
          @media (forced-colors: active) {
            .segment-on { fill: CanvasText; }
            .segment-off { fill: transparent; }
          }
        `}</style>
        <g transform="skewX(-10)">
          {/* Segment A (top) */}
          <polygon 
            className={segments[0] ? "segment-on" : "segment-off"}
            points="4,2.28 40,2.28 34,11.4 10,11.4" 
            fill={segments[0] ? onColor : offColor} 
            filter={segments[0] ? "url(#glow)" : undefined} 
          />
          {/* Segment B (top right) */}
          <polygon 
            className={segments[1] ? "segment-on" : "segment-off"}
            points="41,4.56 41,37.62 35,31.92 35,12.54" 
            fill={segments[1] ? onColor : offColor} 
            filter={segments[1] ? "url(#glow)" : undefined} 
          />
          {/* Segment C (bottom right) */}
          <polygon 
            className={segments[2] ? "segment-on" : "segment-off"}
            points="41,42.18 41,75.24 35,67.26 35,47.88" 
            fill={segments[2] ? onColor : offColor} 
            filter={segments[2] ? "url(#glow)" : undefined} 
          />
          {/* Segment D (bottom) */}
          <polygon 
            className={segments[3] ? "segment-on" : "segment-off"}
            points="4,77.52 40,77.52 34,68.4 10,68.4" 
            fill={segments[3] ? onColor : offColor} 
            filter={segments[3] ? "url(#glow)" : undefined} 
          />
          {/* Segment E (bottom left) */}
          <polygon 
            className={segments[4] ? "segment-on" : "segment-off"}
            points="3,42.18 3,75.24 9,67.26 9,47.88" 
            fill={segments[4] ? onColor : offColor} 
            filter={segments[4] ? "url(#glow)" : undefined} 
          />
          {/* Segment F (top left) */}
          <polygon 
            className={segments[5] ? "segment-on" : "segment-off"}
            points="3,4.56 3,37.62 9,31.92 9,12.54" 
            fill={segments[5] ? onColor : offColor} 
            filter={segments[5] ? "url(#glow)" : undefined} 
          />
          {/* Segment G (middle) - hexagonal */}
          <polygon 
            className={segments[6] ? "segment-on" : "segment-off"}
            points="4,39.9 10,35.34 34,35.34 40,39.9 34,44.46 10,44.46" 
            fill={segments[6] ? onColor : offColor} 
            filter={segments[6] ? "url(#glow)" : undefined} 
          />
          
          {/* Decimal point segment (bottom right of digit) */}
          <circle 
            className={showDecimal ? "segment-on" : "segment-off"}
            cx="47" 
            cy="74.1" 
            r="4" 
            fill={showDecimal ? onColor : offColor} 
            filter={showDecimal ? "url(#glow)" : undefined} 
          />
        </g>
        
        {/* Glow filter */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
};
export default SevenSegmentDigit;