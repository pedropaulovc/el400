import SevenSegmentDigit from "./SevenSegmentDigit";

interface AxisDisplayProps {
  value: number;
  axis: 'X' | 'Y' | 'Z';
}

const AxisDisplay = ({ value, axis }: AxisDisplayProps) => {
  // Format number to display format: sign + digits with decimal (no leading spaces)
  const formatValue = (num: number): string[] => {
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const formatted = absNum.toFixed(4);
    
    const chars: string[] = [];
    
    // Add sign (always show space or minus for alignment)
    chars.push(isNegative ? '-' : ' ');
    
    // Pad to ensure consistent width (total 8 chars: XX.XXXX)
    const padded = formatted.padStart(7, ' ');
    
    for (const char of padded) {
      chars.push(char);
    }
    
    return chars;
  };

  const digits = formatValue(value);

  // Screen reader friendly value
  const srValue = value.toFixed(4);

  return (
    <div 
      className="flex items-center px-1"
      role="region"
      aria-label={`${axis} axis position`}
    >
      {/* Screen reader accessible value */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {axis} axis: {srValue}
      </span>
      
      {/* Visual 7-segment display (hidden from screen readers) */}
      <div className="flex items-center" aria-hidden="true">
        {digits.map((digit, index) => (
          <div key={index} className="w-5 h-10">
            {digit === '.' ? (
              <div className="relative w-full h-full flex items-end justify-center pb-0.5">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: 'hsl(120, 100%, 45%)',
                    boxShadow: '0 0 8px 3px hsl(120, 100%, 45%)'
                  }}
                />
              </div>
            ) : (
              <SevenSegmentDigit value={digit} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AxisDisplay;
