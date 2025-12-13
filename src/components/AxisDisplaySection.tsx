import SevenSegmentDigit from "./SevenSegmentDigit";
import LEDIndicator from "./LEDIndicator";
import BeveledFrame from "./BeveledFrame";

interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

interface AxisDisplaySectionProps {
  axisValues: AxisValues;
  isAbs: boolean;
  isInch: boolean;
  onToggleAbs: () => void;
  onToggleUnit: () => void;
}

interface AxisDisplayProps {
  value: number;
  axis: 'X' | 'Y' | 'Z';
}

const AxisDisplay = ({ value, axis }: AxisDisplayProps) => {
  const formatValue = (num: number): { char: string; hasDecimal: boolean }[] => {
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const formatted = absNum.toFixed(4);

    const result: { char: string; hasDecimal: boolean }[] = [];

    result.push({ char: isNegative ? '-' : ' ', hasDecimal: false });

    const [intPart, decPart] = formatted.split('.');
    const paddedInt = intPart.padStart(3, ' ');

    for (let i = 0; i < paddedInt.length; i++) {
      result.push({
        char: paddedInt[i],
        hasDecimal: i === paddedInt.length - 1,
      });
    }

    for (const char of decPart) {
      result.push({ char, hasDecimal: false });
    }

    return result;
  };

  const digits = formatValue(value);

  return (
    <div
      className="flex items-center gap-0.5 px-2"
      aria-hidden="true"
      data-testid={`axis-display-${axis.toLowerCase()}`}
    >
      <div className="flex items-center -space-x-1">
        {digits.map((digit, index) => (
          <div key={index} className="w-12 h-20">
            <SevenSegmentDigit value={digit.char} showDecimal={digit.hasDecimal} />
          </div>
        ))}
      </div>
    </div>
  );
};

const AxisDisplaySection = ({
  axisValues,
  isAbs,
  isInch,
  onToggleAbs,
  onToggleUnit,
}: AxisDisplaySectionProps) => {
  return (
    <div className="flex flex-col">
      <h2 className="sr-only">Axis display</h2>
      <BeveledFrame className="h-full">
        <div
          className="p-4 rounded-lg h-full flex flex-col"
          style={{
            background: 'linear-gradient(180deg, #080808 0%, #030303 100%)',
            boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.9)',
            minWidth: '340px',
          }}
        >
          {/* Screen reader accessible table for axis values */}
          <table className="sr-only" aria-label="Axis positions">
            <thead>
              <tr>
                <th>Axis</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">X</th>
                <td aria-live="polite" aria-atomic="true" data-testid="axis-value-x">
                  {axisValues.X.toFixed(4)}
                </td>
              </tr>
              <tr>
                <th scope="row">Y</th>
                <td aria-live="polite" aria-atomic="true" data-testid="axis-value-y">
                  {axisValues.Y.toFixed(4)}
                </td>
              </tr>
              <tr>
                <th scope="row">Z</th>
                <td aria-live="polite" aria-atomic="true" data-testid="axis-value-z">
                  {axisValues.Z.toFixed(4)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex flex-col gap-3 flex-1 justify-center">
            <AxisDisplay value={axisValues.X} axis="X" />
            <AxisDisplay value={axisValues.Y} axis="Y" />
            <AxisDisplay value={axisValues.Z} axis="Z" />
          </div>

          {/* LED Indicators */}
          <div className="flex justify-between mt-1 px-1">
            {/* Mode Toggle Group */}
            <div role="radiogroup" aria-label="Positioning mode" className="flex gap-4">
              <LEDIndicator
                label="abs"
                isOn={isAbs}
                onClick={onToggleAbs}
                isInteractive
                groupLabel="Absolute mode"
                data-testid="led-abs"
              />
              <LEDIndicator
                label="inc"
                isOn={!isAbs}
                onClick={onToggleAbs}
                isInteractive
                groupLabel="Incremental mode"
                data-testid="led-inc"
              />
            </div>

            {/* Units Toggle Group */}
            <div role="radiogroup" aria-label="Measurement units" className="flex gap-4">
              <LEDIndicator
                label="inch"
                isOn={isInch}
                onClick={onToggleUnit}
                isInteractive
                groupLabel="Inches"
                data-testid="led-inch"
              />
              <LEDIndicator
                label="mm"
                isOn={!isInch}
                onClick={onToggleUnit}
                isInteractive
                groupLabel="Millimeters"
                data-testid="led-mm"
              />
            </div>

            {/* Status indicators */}
            <div className="flex gap-4">
              <LEDIndicator label="Ø" isOn={false} />
              <LEDIndicator label="r" isOn={false} />
            </div>
          </div>
        </div>
      </BeveledFrame>
    </div>
  );
};

export default AxisDisplaySection;
