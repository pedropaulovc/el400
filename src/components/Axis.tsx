import SevenSegmentDigit from "./SevenSegmentDigit";
import { useDROStore, useDisplayX, useDisplayY, useDisplayZ, useReferenceWaitingAxis, useZeroApproachX, useZeroApproachY, useZeroApproachZ } from "../stores/droStore";
import { useAxisDisplayDecimals } from "../stores/settingsStore";
import { formatAxisDigits } from "./axisDigits";
import type { DROStatePayload } from "../stores/dro/types";

export type AxisDisplayValue = number | string;

/** Map axis to its corresponding hook */
const axisHooks = {
  X: useDisplayX,
  Y: useDisplayY,
  Z: useDisplayZ,
} as const;

/** Map axis to its Near-Zero Warning flash hook (US-024). */
const zeroApproachHooks = {
  X: useZeroApproachX,
  Y: useZeroApproachY,
  Z: useZeroApproachZ,
} as const;

interface AxisProps {
  axis: 'X' | 'Y' | 'Z';
}

/** Shared marker routing; feature layers extend this switch with their result states. */
function functionMarker(
  { stateName }: DROStatePayload,
  axis: AxisProps['axis']
): 'none' | 'leading' | 'terminal' {
  switch (stateName) {
    case 'distance-to-go':
      return 'leading';
    case 'function-menu-center-line-result':
    case 'function-menu-center-circle-result':
      return axis === 'Z' ? 'none' : 'terminal';
    default:
      return 'none';
  }
}

const Axis = ({ axis }: AxisProps) => {
  // Each axis subscribes to its own value only
  const useAxisValue = axisHooks[axis];
  const value = useAxisValue();
  const marker = useDROStore((state) => functionMarker(state, axis));
  // Reference waiting (§7.7.1): the selected axis's zero blinks until the mark is crossed.
  const blinkAxis = useReferenceWaitingAxis();
  // Near-Zero Warning (US-024): this axis flashes while within BP DIST of zero.
  const useAxisZeroApproach = zeroApproachHooks[axis];
  const isNearZero = useAxisZeroApproach();
  const isBlinking = blinkAxis === axis || isNearZero;
  // dP display resolution (US-022): fractional digits to render for this axis.
  const decimals = useAxisDisplayDecimals(axis);


  const digits = formatAxisDigits(value, { decimals });

  const markerIndex = marker === 'leading' ? 1 : digits.length - 1;
  if (marker !== 'none') {
    const digit = digits[markerIndex];
    if (digit) digits[markerIndex] = { ...digit, hasDecimal: true };
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
