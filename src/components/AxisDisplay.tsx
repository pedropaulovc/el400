import SevenSegmentDigit from "./SevenSegmentDigit";

interface AxisDisplayProps {
  value: number;
  axis: 'X' | 'Y' | 'Z';
}

const AxisDisplay = ({ value }: AxisDisplayProps) => {
  // Format number to display format: sign + 6 digits with decimal
  const formatValue = (num: number): string[] => {
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const formatted = absNum.toFixed(4).padStart(8, ' ');
    
    // Split into individual characters including the decimal
    const chars: string[] = [];
    
    // Add sign
    chars.push(isNegative ? '-' : ' ');
    
    // Add each character
    for (const char of formatted) {
      chars.push(char);
    }
    
    return chars;
  };

  const digits = formatValue(value);

  return (
    <div className="flex items-center gap-0.5 px-2">
      {digits.map((digit, index) => (
        <div key={index} className="w-8 h-12">
          {digit === '.' ? (
            <div className="relative w-full h-full flex items-end justify-center pb-1">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ 
                  backgroundColor: 'hsl(120, 100%, 50%)',
                  boxShadow: '0 0 6px 2px hsl(120, 100%, 50%)'
                }}
              />
            </div>
          ) : (
            <SevenSegmentDigit value={digit} />
          )}
        </div>
      ))}
    </div>
  );
};

export default AxisDisplay;
