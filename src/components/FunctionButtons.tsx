import DROButton from "./DROButton";
import Icon from "./Icon";

interface FunctionButtonsProps {
  isInch: boolean;
  isAbs: boolean;
  onToggleUnit: () => void;
  onSettings: () => void;
  onToggleAbs: () => void;
  onCenter: () => void;
  onZeroAll: () => void;
}

const FunctionButtons = ({
  onSettings,
  onToggleAbs,
  onToggleUnit,
  onCenter,
  onZeroAll,
}: FunctionButtonsProps) => {
  return (
    <div className="flex justify-between w-full">
      <DROButton onClick={onSettings} size="icon" className="p-0" data-testid="btn-settings">
        <Icon name="setup" alt="Settings" />
      </DROButton>
      <DROButton onClick={onToggleAbs} size="icon" className="p-0" data-testid="btn-abs-inc">
        <Icon name="abs-inc" alt="Abs/Inc" />
      </DROButton>
      <DROButton onClick={onToggleUnit} size="icon" className="p-0" data-testid="btn-toggle-unit">
        <Icon name="inch-mm" alt="Toggle units" />
      </DROButton>
      <DROButton onClick={onCenter} size="icon" className="p-0" data-testid="btn-center">
        <Icon name="reference" alt="Reference" />
      </DROButton>
      <DROButton onClick={onZeroAll} size="icon" className="p-0" data-testid="btn-zero-all">
        <Icon name="preset" alt="Zero all axes" />
      </DROButton>
    </div>
  );
};

export const SecondaryFunctionButtons = ({
  onBoltCircle,
  onArcContour,
  onAngleHole,
  onGridHole,
  onCalculator,
  onHalf,
  onSDM,
  onFunction,
}: {
  onBoltCircle: () => void;
  onArcContour: () => void;
  onAngleHole: () => void;
  onGridHole: () => void;
  onCalculator: () => void;
  onHalf: () => void;
  onSDM: () => void;
  onFunction: () => void;
}) => {
  return (
    <div className="flex flex-col gap-4 h-full justify-center">
      {/* Top row */}
      <div className="flex gap-4 justify-between">
        <DROButton onClick={onBoltCircle} variant="dark" size="secondary" className="p-0" data-testid="btn-bolt-circle">
          <Icon name="bolt-hole-pcd-function" alt="Bolt hole" />
        </DROButton>
        <DROButton onClick={onArcContour} variant="dark" size="secondary" className="p-0" data-testid="btn-arc-contour">
          <Icon name="arc-contouring-function" alt="Arc contour" />
        </DROButton>
        <DROButton onClick={onAngleHole} variant="dark" size="secondary" className="p-0" data-testid="btn-angle-hole">
          <Icon name="angle-hole-function" alt="Angle hole" />
        </DROButton>
        <DROButton onClick={onGridHole} variant="dark" size="secondary" className="p-0" data-testid="btn-grid-hole">
          <Icon name="grid-hole-function" alt="Grid hole" />
        </DROButton>
      </div>

      {/* Bottom row */}
      <div className="flex gap-4 justify-between">
        <DROButton onClick={onCalculator} variant="dark" size="secondary" className="p-0" data-testid="btn-calculator">
          <Icon name="calculator" alt="Calculator" />
        </DROButton>
        <DROButton onClick={onHalf} variant="dark" size="secondary" className="p-0" data-testid="btn-half">
          <Icon name="half-function" alt="Half" />
        </DROButton>
        <DROButton onClick={onSDM} variant="dark" size="secondary" className="p-0" data-testid="btn-sdm">
          <Icon name="sdm-function" alt="SDM" />
        </DROButton>
        <DROButton onClick={onFunction} variant="dark" size="secondary" className="p-0" data-testid="btn-function">
          <Icon name="function" alt="Function" />
        </DROButton>
      </div>
    </div>
  );
};

export default FunctionButtons;
