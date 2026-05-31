import LEDIndicator from "./LEDIndicator";
import BeveledFrame from "./BeveledFrame";
import Axis, { type AxisDisplayValue } from "./Axis";
import { useDisplayX, useDisplayY, useDisplayZ } from "../stores/droStore";
import { useDefaultUnit, useNvMem } from "../stores/settingsStore";
import { useDROState, useDRODispatch, useBootSequence, useMode, useBoltHoleIntro, useAngleHoleIntro, useGridIntro, useArcContourIntro, useSdmIntro, useReferenceMarkTestHook, isFnLedActive, isSdmActive } from "../stores/dro";

export interface AxisValues {
  X: AxisDisplayValue;
  Y: AxisDisplayValue;
  Z: AxisDisplayValue;
}

export type { AxisDisplayValue };

const SCREEN_READER_AXIS_HOOKS = {
  X: useDisplayX,
  Y: useDisplayY,
  Z: useDisplayZ,
} as const;

/** Screen-reader-only value display - subscribes to its own axis only */
const ScreenReaderAxisValue = ({ axis }: { axis: 'X' | 'Y' | 'Z' }) => {
  const value = SCREEN_READER_AXIS_HOOKS[axis]();
  // Format numeric values to exactly 4 decimal places, keep text values as-is
  const formatted = typeof value === 'number' ? value.toFixed(4) : value;
  return (
    <tr>
      <th scope="row">{axis}</th>
      <td aria-live="polite" aria-atomic="true" data-testid={`axis-value-${axis.toLowerCase()}`}>
        {formatted}
      </td>
    </tr>
  );
};

/**
 * Displays the three-axis DRO readout with LED mode indicators.
 *
 * This component owns the boot sequence logic. Each axis subscribes
 * to its own display value independently for optimal performance.
 */
const MultiAxisSection = () => {
  // Boot sequence - this component shows the boot message
  const droState = useDROState();
  const dispatch = useDRODispatch();
  const nvMem = useNvMem();
  useBootSequence(dispatch, droState, nvMem);

  // Bolt hole intro timing - auto-advances after delay
  useBoltHoleIntro(dispatch, droState);

  // Angle hole intro timing - auto-advances after delay
  useAngleHoleIntro(dispatch, droState);

  // Grid intro timing - auto-advances after delay
  useGridIntro(dispatch, droState);

  // Arc contour intro timing - auto-advances after delay
  useArcContourIntro(dispatch, droState);

  // SDM intro timing - auto-advances after delay (US-009)
  useSdmIntro(dispatch, droState);

  // Reference-mark crossing hook for E2E (US-012)
  useReferenceMarkTestHook(dispatch);

  // LED indicators
  const mode = useMode();
  const defaultUnit = useDefaultUnit();

  const isAbs = mode === 'abs';
  const isInch = defaultUnit === 'inch';

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
              <ScreenReaderAxisValue axis="X" />
              <ScreenReaderAxisValue axis="Y" />
              <ScreenReaderAxisValue axis="Z" />
            </tbody>
          </table>

          <div className="flex flex-col gap-3 flex-1 justify-center">
            <Axis axis="X" />
            <Axis axis="Y" />
            <Axis axis="Z" />
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
              <LEDIndicator
                label="fn"
                name="status"
                isOn={isFnLedActive(droState)}
                data-testid="led-fn"
              />
              <LEDIndicator
                label="sdm"
                name="status"
                isOn={isSdmActive(droState)}
                data-testid="led-sdm"
              />
            </fieldset>
          </div>
        </div>
      </BeveledFrame>
    </div>
  );
};

export default MultiAxisSection;
