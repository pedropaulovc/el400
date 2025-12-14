import SevenSegmentDigit from "./SevenSegmentDigit";
import LEDIndicator from "./LEDIndicator";
import BeveledFrame from "./BeveledFrame";

type AxisDisplayValue = number | string;

interface AxisValues {
  X: AxisDisplayValue;
  Y: AxisDisplayValue;
  Z: AxisDisplayValue;
}

interface AxisDisplaySectionProps {
  axisValues: AxisValues;
  isAbs: boolean;
  isInch: boolean;
}

interface AxisDisplayProps {
  value: AxisDisplayValue;
  axis: 'X' | 'Y' | 'Z';
}

const DISPLAY_WIDTH = 8;

const AxisDisplay = ({ value, axis }: AxisDisplayProps) => {
  const formatNumberValue = (num: number): { char: string; hasDecimal: boolean }[] => {
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

  const formatTextValue = (text: string): { char: string; hasDecimal: boolean }[] => {
    const raw: { char: string; hasDecimal: boolean }[] = [];

    for (const char of text) {
      if (char === '.') {
        if (raw.length > 0) {
          raw[raw.length - 1].hasDecimal = true;
        }
        continue;
      }
      raw.push({ char, hasDecimal: false });
    }

    const truncated = raw.slice(-DISPLAY_WIDTH);
    const padded = Array.from({ length: DISPLAY_WIDTH - truncated.length }, () => ({ char: ' ', hasDecimal: false }));

    return padded.concat(truncated);
  };

  const digits = typeof value === 'number' ? formatNumberValue(value) : formatTextValue(value);

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
  const formatForScreenReader = (value: AxisDisplayValue) =>
    typeof value === 'number' ? value.toFixed(4) : value;

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
                  {formatForScreenReader(axisValues.X)}
                </td>
              </tr>
              <tr>
                <th scope="row">Y</th>
                <td aria-live="polite" aria-atomic="true" data-testid="axis-value-y">
                  {formatForScreenReader(axisValues.Y)}
                </td>
              </tr>
              <tr>
                <th scope="row">Z</th>
                <td aria-live="polite" aria-atomic="true" data-testid="axis-value-z">
                  {formatForScreenReader(axisValues.Z)}
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
