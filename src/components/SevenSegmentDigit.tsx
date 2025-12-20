import { cn } from "@/lib/utils";
import "./SevenSegmentDigit.css";

interface SevenSegmentDigitProps {
  value: string;
  showDecimal?: boolean;
  className?: string;
}

// CSS-based 7-segment display for authentic look
const SevenSegmentDigit = ({
  value,
  showDecimal = false,
  className
}: SevenSegmentDigitProps) => {
  // Segment definitions: which segments are on for each character
  const segmentMap: Record<string, boolean[]> = {
    // [a, b, c, d, e, f, g] - standard 7-segment naming

    // Digits
    '0': [true,  true,  true,  true,  true,  true,  false],
    '1': [false, true,  true,  false, false, false, false],
    '2': [true,  true,  false, true,  true,  false, true ],
    '3': [true,  true,  true,  true,  false, false, true ],
    '4': [false, true,  true,  false, false, true,  true ],
    '5': [true,  false, true,  true,  false, true,  true ],
    '6': [true,  false, true,  true,  true,  true,  true ],
    '7': [true,  true,  true,  false, false, false, false],
    '8': [true,  true,  true,  true,  true,  true,  true ],
    '9': [true,  true,  true,  true,  false, true,  true ],

    // Symbols
    '-': [false, false, false, false, false, false, true ],
    ' ': [false, false, false, false, false, false, false],

    // Letters actually used in the screenshots
    'A': [true,  true,  true,  false, true,  true,  true ],
    'b': [false, false, true,  true,  true,  true,  true ],
    'C': [true,  false, false, true,  true,  true,  false],
    'c': [false, false, false, true,  true,  false, true ],
    'd': [false, true,  true,  true,  true,  false, true ],
    'E': [true,  false, false, true,  true,  true,  true ],
    'F': [true,  false, false, false, true,  true,  true ],
    'G': [true,  false, true,  true,  true,  true,  false],
    'h': [false, false, true,  false, true,  true,  true ],
    'I': [false, true,  true,  false, false, false, false],
    'i': [false, false, true,  false, false, false, false],
    'J': [false, true,  true,  true,  true,  false, false],
    'L': [false, false, false, true,  true,  true,  false],
    'l': [false, false, false, true,  true,  true,  false],

    // m = n with top segment (a) lit (used to distinguish between m and n on 7-segment displays)
    'n': [false, false, true,  false, true,  false, true ],
    'm': [true,  false, true,  false, true,  false, true ],
    'o': [false, false, true,  true,  true,  false, true ],

    'P': [true,  true,  false, false, true,  true,  true ],
    'r': [false, false, false, false, true,  false, true ],
    'S': [true,  false, true,  true,  false, true,  true ],
    't': [false, false, false, true,  true,  true,  true ],
    'U': [false, true,  true,  true,  true,  true,  false],
    'v': [false, true,  true,  true,  true,  true,  false],
    'X': [false, true,  true,  false, true,  true,  true ],
    'Y': [false, true,  true,  true,  false, true,  true ],
  };

  // Throw exception for unsupported characters (case-sensitive)
  if (!(value in segmentMap)) {
    const supportedChars = Object.keys(segmentMap);
    const digits = supportedChars.filter(c => /\d/.test(c));
    const symbols = supportedChars.filter(c => /[-\s]/.test(c));
    const letters = supportedChars.filter(c => /[A-Za-z]/.test(c));

    throw new Error(
      `Unsupported character: "${value}". ` +
      `Supported: digits (${digits.join('')}), symbols (${symbols.map(s => s === ' ' ? 'space' : s).join(', ')}), ` +
      `letters (${letters.join(', ')})`
    );
  }

  const segments = segmentMap[value];
  if (!segments) {
    throw new Error(`Internal error: segments should be defined for value "${value}"`);
  }
  const segmentNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;

  return (
    <div className={cn("relative py-[15px]", className)} aria-hidden="true">
      <div className="seven-segment-digit">
        {segmentNames.map((name, i) => (
          <span
            key={name}
            className={cn(`seg-${name}`, segments[i] ? "seg-on" : "seg-off")}
          />
        ))}
        <span className={cn("seg-dp", showDecimal ? "seg-on" : "seg-off")} />
      </div>
    </div>
  );
};

export default SevenSegmentDigit;
