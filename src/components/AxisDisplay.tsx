import SevenSegmentDigit from "./SevenSegmentDigit";

interface AxisDisplayProps {
  value: number;
  axis: 'X' | 'Y' | 'Z';
}

const AxisDisplay = ({ value, axis }: AxisDisplayProps) => {
  // Format number to display format: returns array of { char, hasDecimal }
  // Display is fixed at 8 digits: sign + 3 integer + 4 decimal
  const formatValue = (num: number): { char: string; hasDecimal: boolean }[] => {
    const isNegative = num < 0;
    // Clamp to displayable range: -999.9999 to 999.9999
    const clampedNum = Math.max(-999.9999, Math.min(999.9999, Math.abs(num)));
    const formatted = clampedNum.toFixed(4); // e.g., "123.4567"
    
    const result: { char: string; hasDecimal: boolean }[] = [];
    
    // Add sign
    result.push({ char: isNegative ? '-' : ' ', hasDecimal: false });
    
    // Pad the integer part to ensure consistent width (always 3 digits)
    const [intPart, decPart] = formatted.split('.');
    const paddedInt = intPart.padStart(3, ' ').slice(-3); // Ensure max 3 integer digits
    
    // Add integer digits (last one gets the decimal point)
    for (let i = 0; i < paddedInt.length; i++) {
      result.push({ 
        char: paddedInt[i], 
        hasDecimal: i === paddedInt.length - 1 // decimal after last integer digit
      });
    }
    
    // Add decimal digits (always 4 digits)
    for (const char of decPart.slice(0, 4)) {
      result.push({ char, hasDecimal: false });
    }
    
    return result;
  };

  const digits = formatValue(value);

  // Screen reader friendly value
  const srValue = value.toFixed(4);

  return (
    <div
      className="flex items-center gap-0.5 px-2"
      role="region"
      aria-label={`${axis} axis position`}
    >
      {/* Screen reader accessible value */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {axis} axis: {srValue}
      </span>
      
      {/* Visual 7-segment display (hidden from screen readers) */}
      <div className="flex items-center -space-x-1" aria-hidden="true">
        {digits.map((digit, index) => (
          <div key={index} className="w-12 h-20">
            <SevenSegmentDigit value={digit.char} showDecimal={digit.hasDecimal} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AxisDisplay;
