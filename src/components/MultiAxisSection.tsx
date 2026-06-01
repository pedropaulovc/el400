import LEDIndicator from "./LEDIndicator";
import BeveledFrame from "./BeveledFrame";
import Axis, { type AxisDisplayValue } from "./Axis";
import { useDisplayX, useDisplayY, useDisplayZ, useProbeTriggered, useIsAsleep } from "../stores/droStore";
import { useDefaultUnit, useNvMem, useAxisDisplayDecimals } from "../stores/settingsStore";
import { useSleepTimer } from "../stores/dro/features/sleep";
import { useDROState, useDRODispatch, useBootSequence, useMode, useBoltHoleIntro, useAngleHoleIntro, useGridIntro, useArcContourIntro, useSdmIntro, useSetupSavedConfirmation, useOemRejectedDismiss, useReferenceMarkTestHook, isFnLedActive, isSdmActive } from "../stores/dro";
import { useZeroApproachWarning } from "../hooks/useZeroApproachWarning";

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
  // dP display resolution (US-022): render numeric values to this axis's decimal
  // count; keep text values (menu labels) as-is.
  const decimals = useAxisDisplayDecimals(axis);
  const formatted = typeof value === 'number' ? value.toFixed(decimals) : value;
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

  // SAV CHG save-confirmation timing - auto-returns to setup after delay (US-027)
  useSetupSavedConfirmation(dispatch, droState);

  // OEM Mode wrong-password flash - auto-returns to setup after delay (US-044)
  useOemRejectedDismiss(dispatch, droState);

  // Reference-mark crossing hook for E2E (US-012)
  useReferenceMarkTestHook(dispatch);

  // Near-Zero Warning (US-024): plays the continuous beep while an axis is within
  // BP DIST of zero; returns whether the visual indicator should show.
  const zeroApproachActive = useZeroApproachWarning();
  // Display sleep timer (US-026): arm the idle countdown from the SLEEP T setting.
  useSleepTimer(dispatch, droState, nvMem.sleepTimeout);

  // LED indicators
  const mode = useMode();
  const defaultUnit = useDefaultUnit();
  // Touch-probe trigger indication (US-032, AC 32.8): lights when a probe
  // contact is captured during a probe function.
  const probeTriggered = useProbeTriggered();
  // Display sleep state (US-026): dims the readout and flashes the wrench LED.
  const isAsleep = useIsAsleep();

  const isAbs = mode === 'abs';
  const isInch = defaultUnit === 'inch';

  return (
    <div className="flex flex-col">
      <h2 className="sr-only">Axis display</h2>
      <BeveledFrame className="h-full">
        <div
          data-testid="display-panel"
          data-display-power={isAsleep ? 'asleep' : 'awake'}
          // US-026: when asleep the readout dims (display switched off, note *4).
          className={`p-4 rounded-lg h-full flex flex-col${isAsleep ? ' sleeping opacity-10 transition-opacity' : ' transition-opacity'}`}
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

          {/* Near-Zero Warning indicator (US-024): rendered only while the warning
              is active, so its presence/absence drives the audio-indicator assertion.
              aria-live announces the alert to screen-reader users. */}
          {zeroApproachActive && (
            <div
              data-testid="audio-indicator"
              role="status"
              aria-live="assertive"
              className="mt-1 flex items-center justify-center gap-1 text-red-400 animate-blink"
            >
              <span aria-hidden="true" className="text-lg leading-none">♪</span>
              <span className="sr-only">Near zero warning</span>
            </div>
          )}

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
              <LEDIndicator
                label="prb"
                name="status"
                isOn={probeTriggered}
                data-testid="led-probe"
              />
              {/* US-026: wrench/sleep LED flashes while the display is asleep. */}
              <LEDIndicator
                label="slp"
                name="status"
                isOn={isAsleep}
                className={isAsleep ? 'flashing animate-blink' : ''}
                data-testid="sleep-led"
              />
            </fieldset>
          </div>
        </div>
      </BeveledFrame>
    </div>
  );
};

export default MultiAxisSection;
