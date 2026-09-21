import SevenSegmentDigit from "./SevenSegmentDigit";
import { useDROStore, useDisplayX, useDisplayY, useDisplayZ, useReferenceWaitingAxis, useZeroApproachX, useZeroApproachY, useZeroApproachZ, useIsAsleep } from "../stores/droStore";
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

function functionMarker(
  { stateName, stateData, vMem, display }: DROStatePayload,
  axis: AxisProps['axis']
): 'none' | 'leading' | 'terminal' {
  if (typeof display[axis] !== 'number') return 'none';

  switch (stateName) {
    case 'distance-to-go':
      return stateData.stateDataType === 'preset' && stateData.presetTargets[axis] !== null
        ? 'leading' : 'none';
    case 'sdm-run-active':
      return stateData.stateDataType === 'sdm' && stateData.navigationPhase === 'browse'
        ? 'leading' : 'none';
    case 'bolt-hole-circle-navigate':
    case 'bolt-hole-arc-navigate':
    case 'arc-contour-navigate':
    case 'angle-hole-navigate':
    case 'grid-navigate':
      return axis !== 'Z' && 'navigationPhase' in stateData
        && stateData.navigationPhase === 'distance-to-go' ? 'leading' : 'none';
    case 'linear-bolt-hole-navigate':
      return stateData.stateDataType === 'linear-bolt-hole' && stateData.axis === axis
        ? 'leading' : 'none';
    case 'function-menu-center-line-result':
    case 'function-menu-center-circle-result':
      return axis === 'Z' ? 'none' : 'terminal';
    case 'six-output-run':
      for (let index = 0; index < vMem.outputCount; index++) {
        if (vMem.outputProgram[index]?.axis === axis) return 'terminal';
      }
      return 'none';
    default:
      return 'none';
  }
}

const Axis = ({ axis }: AxisProps) => {
  // Each axis subscribes to its own value only
  const useAxisValue = axisHooks[axis];
  const value = useAxisValue();
  const marker = useDROStore((state) => functionMarker(state, axis));
  // Reference waiting (§7.7.1): only the selected axis's last digit flashes.
  const blinkAxis = useReferenceWaitingAxis();
  // Near-Zero Warning (US-024): this axis flashes while within BP DIST of zero.
  const useAxisZeroApproach = zeroApproachHooks[axis];
  const isNearZero = useAxisZeroApproach();
  const isAsleep = useIsAsleep();
  const isBlinking = !isAsleep && isNearZero;
  // dP display resolution (US-022): fractional digits to render for this axis.
  const decimals = useAxisDisplayDecimals(axis);
  const digits = formatAxisDigits(isAsleep ? '' : value, { decimals });

  // The manual distinguishes leading DTG dots from terminal center/output dots.
  const markerIndex = marker === 'leading' ? 1 : digits.length - 1;
  if (!isAsleep && marker !== 'none') {
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
          <div key={index} className={`w-12 h-20${!isAsleep && blinkAxis === axis && index === digits.length - 1 ? ' animate-blink' : ''}`}>
            <SevenSegmentDigit value={digit.char} showDecimal={digit.hasDecimal} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Axis;
