import SevenSegmentDigitV2 from "./SevenSegmentDigitV2";

interface AxisDisplayV2Props {
  value: number;
  axis: 'X' | 'Y' | 'Z';
}

const AxisDisplayV2 = ({ value, axis }: AxisDisplayV2Props) => {
  // Format number to display format: returns array of { char, hasDecimal }
  const formatValue = (num: number): { char: string; hasDecimal: boolean }[] => {
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const formatted = absNum.toFixed(4); // e.g., "123.4567"
    
    const result: { char: string; hasDecimal: boolean }[] = [];
    
    // Add sign
    result.push({ char: isNegative ? '-' : ' ', hasDecimal: false });
    
    // Pad the integer part to ensure consistent width
    const [intPart, decPart] = formatted.split('.');
    const paddedInt = intPart.padStart(3, ' ');
    
    // Add integer digits (last one gets the decimal point)
    for (let i = 0; i < paddedInt.length; i++) {
      result.push({ 
        char: paddedInt[i], 
        hasDecimal: i === paddedInt.length - 1 // decimal after last integer digit
      });
    }
    
    // Add decimal digits (no decimal points)
    for (const char of decPart) {
      result.push({ char, hasDecimal: false });
    }
    
    return result;
  };

  const digits = formatValue(value);

  // Screen reader friendly value
  const srValue = value.toFixed(4);

  return (
    <div 
      className="grid h-full w-full"
      style={{
        gridTemplateColumns: `repeat(${digits.length}, 1fr)`,
        gap: '0.5%',
        padding: '0 2%',
      }}
      role="region"
      aria-label={`${axis} axis position`}
    >
      {/* Screen reader accessible value */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {axis} axis: {srValue}
      </span>
      
      {/* Visual 7-segment display (hidden from screen readers) */}
      {digits.map((digit, index) => (
        <div key={index} className="h-full" aria-hidden="true">
          <SevenSegmentDigitV2 value={digit.char} showDecimal={digit.hasDecimal} />
        </div>
      ))}
    </div>
  );
};

export default AxisDisplayV2;
