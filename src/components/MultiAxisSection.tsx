import LEDIndicator from "./LEDIndicator";
import BeveledFrame from "./BeveledFrame";
import Axis, { type AxisDisplayValue } from "./Axis";
import { useVolatileMemory } from "../hooks/useVolatileMemory";
import { useNonVolatileMemoryContext } from "../context/NonVolatileMemoryContext";
import { useDROState, isFunctionActive } from "../dro-state-machine";

export interface AxisValues {
  X: AxisDisplayValue;
  Y: AxisDisplayValue;
  Z: AxisDisplayValue;
}

export type { AxisDisplayValue };

interface MultiAxisSectionProps {
  /** Pre-computed display values (already unit-converted where appropriate) */
  axisValues: AxisValues;
}

/**
 * Displays the three-axis DRO readout with LED mode indicators.
 *
 * This component is a pure renderer - it displays whatever values are passed
 * and has no knowledge of calculator mode or unit conversion. Those concerns
 * are handled by the useDisplayValues hook upstream.
 */
const MultiAxisSection = ({
  axisValues,
}: MultiAxisSectionProps) => {
  const vMem = useVolatileMemory();
  const { nvMem } = useNonVolatileMemoryContext();
  const droState = useDROState();

  const isAbs = vMem.mode === 'abs';
  const isInch = nvMem.defaultUnit === 'inch';

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
            <Axis value={axisValues.X} axis="X" />
            <Axis value={axisValues.Y} axis="Y" />
            <Axis value={axisValues.Z} axis="Z" />
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
                isOn={isFunctionActive(droState)}
                data-testid="led-fn"
              />
            </fieldset>
          </div>
        </div>
      </BeveledFrame>
    </div>
  );
};

export default MultiAxisSection;
