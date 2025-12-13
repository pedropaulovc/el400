import SevenSegmentDigit from "./SevenSegmentDigit";
import LEDIndicator from "./LEDIndicator";
import BeveledFrame from "./BeveledFrame";
import { convertForDisplay } from "../lib/unitConversion";

interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

interface AxisDisplaySectionProps {
  axisValues: AxisValues;
  isAbs: boolean;
  isInch: boolean;
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
}: AxisDisplaySectionProps) => {
  // Convert values for display based on selected unit
  // Internal values are stored in mm, convert to inch if needed
  const displayUnit = isInch ? 'inch' : 'mm';
  const displayValues = {
    X: convertForDisplay(axisValues.X, displayUnit),
    Y: convertForDisplay(axisValues.Y, displayUnit),
    Z: convertForDisplay(axisValues.Z, displayUnit),
  };

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
                <td 
                  aria-live="polite" 
                  aria-atomic="true" 
                  data-testid="axis-value-x"
                  data-internal-value-x={axisValues.X.toFixed(4)}
                >
                  {displayValues.X.toFixed(4)}
                </td>
              </tr>
              <tr>
                <th scope="row">Y</th>
                <td 
                  aria-live="polite" 
                  aria-atomic="true" 
                  data-testid="axis-value-y"
                  data-internal-value-y={axisValues.Y.toFixed(4)}
                >
                  {displayValues.Y.toFixed(4)}
                </td>
              </tr>
              <tr>
                <th scope="row">Z</th>
                <td 
                  aria-live="polite" 
                  aria-atomic="true" 
                  data-testid="axis-value-z"
                  data-internal-value-z={axisValues.Z.toFixed(4)}
                >
                  {displayValues.Z.toFixed(4)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex flex-col gap-3 flex-1 justify-center">
            <AxisDisplay value={displayValues.X} axis="X" />
            <AxisDisplay value={displayValues.Y} axis="Y" />
            <AxisDisplay value={displayValues.Z} axis="Z" />
          </div>

          {/* LED Indicators */}
          <div className="flex justify-between mt-1 px-1">
            {/* Mode indicators */}
            <fieldset className="flex gap-4 border-0 p-0 m-0">
              <legend className="sr-only">Positioning mode</legend>
              <LEDIndicator
                label="abs"
                name="positioning-mode"
                isOn={isAbs}
                data-testid="led-abs"
              />
              <LEDIndicator
                label="inc"
                name="positioning-mode"
                isOn={!isAbs}
                data-testid="led-inc"
              />
            </fieldset>

            {/* Units indicators */}
            <fieldset className="flex gap-4 border-0 p-0 m-0">
              <legend className="sr-only">Measurement units</legend>
              <LEDIndicator
                label="inch"
                name="measurement-units"
                isOn={isInch}
                data-testid="led-inch"
              />
              <LEDIndicator
                label="mm"
                name="measurement-units"
                isOn={!isInch}
                data-testid="led-mm"
              />
            </fieldset>

            {/* Status indicators */}
            <fieldset className="flex gap-4 border-0 p-0 m-0">
              <legend className="sr-only">Status</legend>
              <LEDIndicator label="Ø" name="status" isOn={false} />
              <LEDIndicator label="r" name="status" isOn={false} />
            </fieldset>
          </div>
        </div>
      </BeveledFrame>
    </div>
  );
};

export default AxisDisplaySection;
