import { Fragment } from "react";
import DROButton from "./DROButton";
import BeveledFrame from "./BeveledFrame";

interface AxisSelectionSectionProps {
  activeAxis: 'X' | 'Y' | 'Z' | null;
  onAxisSelect: (axis: 'X' | 'Y' | 'Z') => void;
  onAxisZero: (axis: 'X' | 'Y' | 'Z') => void;
}

const AxisSelectionSection = ({ activeAxis, onAxisSelect, onAxisZero }: AxisSelectionSectionProps) => {
  const axes: ('X' | 'Y' | 'Z')[] = ['X', 'Y', 'Z'];

  return (
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
                onClick={() => onAxisSelect(axis)}
                isActive={activeAxis === axis}
                aria-label={`Select ${axis} axis`}
                aria-pressed={activeAxis === axis}
                data-testid={`axis-select-${axis.toLowerCase()}`}
              >
                <span className="sr-only">{axis}</span>
              </DROButton>
            </div>
            <div className="flex flex-col items-center gap-1 mt-5">
              <span className="text-lg font-bold text-black/80">{axis}<sub className="text-xs">0</sub></span>
              <DROButton
                variant="dark"
                size="square"
                onClick={() => onAxisZero(axis)}
                aria-label={`Zero ${axis} axis`}
                data-testid={`axis-zero-${axis.toLowerCase()}`}
              >
                <span className="sr-only">{axis}0</span>
              </DROButton>
            </div>
          </Fragment>
        ))}
      </div>
    </BeveledFrame>
  );
};

export default AxisSelectionSection;
