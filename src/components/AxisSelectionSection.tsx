import { Fragment } from "react";
import DROButton from "./DROButton";
import BeveledFrame from "./BeveledFrame";
import { useVolatileMemory } from "../hooks/useVolatileMemory";
import { useDRODispatch } from "../stores/dro";

const AxisSelectionSection = () => {
  const vMem = useVolatileMemory();
  const dispatch = useDRODispatch();
  const axes: ('X' | 'Y' | 'Z')[] = ['X', 'Y', 'Z'];

  const handleAxisSelect = (axis: 'X' | 'Y' | 'Z') => {
    // Dispatch button event - reducers decide what to do based on current state
    // In calculator mode, calculatorReducer handles BTN_SELECT_Y as operation cycling
    // In other modes, axis operations reducer handles axis selection
    dispatch({ eventName: `BTN_SELECT_${axis}` as const });
  };

  return (
    <>
      <h2 className="sr-only">Axis selection</h2>
      <BeveledFrame>
      <div
        className="grid grid-cols-2 gap-x-3 px-4 py-3 rounded-lg h-full content-between"
        style={{
          background: 'linear-gradient(to bottom, #f0d000, #d4b800)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
        }}
        role="group"
        aria-label="Axis selection and zeroing"
      >
        {axes.map((axis) => (
          <Fragment key={axis}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-bold text-black/80">{axis}</span>
              <DROButton
                variant="dark"
                size="axis"
                onClick={() => { handleAxisSelect(axis); }}
                isActive={vMem.activeAxis === axis}
                aria-pressed={vMem.activeAxis === axis}
                data-testid={`axis-select-${axis.toLowerCase()}`}
                title={`Select ${axis} axis`}
              >
                <span className="sr-only">Select {axis} axis</span>
              </DROButton>
            </div>
            <div className="flex flex-col items-center gap-1 mt-5">
              <span className="text-lg font-bold text-black/80">{axis}<sub className="text-xs">0</sub></span>
              <DROButton
                variant="dark"
                size="square"
                onClick={() => { vMem.zeroAxis(axis); }}
                data-testid={`axis-zero-${axis.toLowerCase()}`}
                title={`Zero ${axis} axis`}
              >
                <span className="sr-only">Zero {axis} axis</span>
              </DROButton>
            </div>
          </Fragment>
        ))}
      </div>
    </BeveledFrame>
    </>
  );
};

export default AxisSelectionSection;
