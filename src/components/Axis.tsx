import SevenSegmentDigit from "./SevenSegmentDigit";
import { useDisplayX, useDisplayY, useDisplayZ, useStateName, useReferenceWaitingAxis } from "../stores/droStore";
import { useAxisDisplayDecimals, useAxisIsAngular } from "../stores/settingsStore";
import { formatAxisDigits } from "./axisDigits";

export type AxisDisplayValue = number | string;

/** Map axis to its corresponding hook */
const axisHooks = {
  X: useDisplayX,
  Y: useDisplayY,
  Z: useDisplayZ,
} as const;

interface AxisProps {
  axis: 'X' | 'Y' | 'Z';
}

const Axis = ({ axis }: AxisProps) => {
  // Each axis subscribes to its own value only
  const useAxisValue = axisHooks[axis];
  const value = useAxisValue();
  const stateName = useStateName();
  // Reference waiting (§7.7.1): the selected axis's zero blinks until the mark is crossed.
  const blinkAxis = useReferenceWaitingAxis();
  const isBlinking = blinkAxis === axis;
  // dP display resolution (US-022): fractional digits to render for this axis.
  const decimals = useAxisDisplayDecimals(axis);
  // Angular axes (US-040) render their pre-formatted DMS string verbatim.
  const isAngular = useAxisIsAngular(axis);

  // Check if in function mode (distance-to-go displays leading decimal on 2nd digit)
  const isFunctionMode = stateName === 'distance-to-go';

  const digits = formatAxisDigits(value, { decimals, isAngular });

  // Add leading decimal to 2nd digit when in function mode
  if (isFunctionMode && digits.length >= 2) {
    const secondDigit = digits[1];
    if (secondDigit) {
      digits[1] = { ...secondDigit, hasDecimal: true };
    }
  }

  return (
    <div
      className="flex items-center gap-0.5 px-2"
      aria-hidden="true"
      data-testid={`axis-display-${axis.toLowerCase()}`}
    >
      <div className={`flex items-center -space-x-1${isBlinking ? ' animate-blink' : ''}`} data-blinking={isBlinking ? 'true' : undefined}>
        {digits.map((digit, index) => (
          <div key={index} className="w-12 h-20">
            <SevenSegmentDigit value={digit.char} showDecimal={digit.hasDecimal} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Axis;
