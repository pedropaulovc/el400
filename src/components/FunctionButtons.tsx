import DROButton from "./DROButton";
import Icon from "./Icon";

interface FunctionButtonsProps {
  isInch: boolean;
  isAbs: boolean;
  onToggleUnit: () => void;
  onSettings: () => void;
  onCalibrate: () => void;
  onCenter: () => void;
  onZeroAll: () => void;
}

const FunctionButtons = ({
  onSettings,
  onCalibrate,
  onToggleUnit,
  onCenter,
  onZeroAll,
}: FunctionButtonsProps) => {
  return (
    <div className="flex justify-between w-full">
      <DROButton onClick={onSettings} size="icon" className="p-0">
        <Icon name="setup" alt="Settings" />
      </DROButton>
      <DROButton onClick={onCalibrate} size="icon" className="p-0">
        <Icon name="abs-inc" alt="Abs/Inc" />
      </DROButton>
      <DROButton onClick={onToggleUnit} size="icon" className="p-0">
        <Icon name="inch-mm" alt="Toggle units" />
      </DROButton>
      <DROButton onClick={onCenter} size="icon" className="p-0">
        <Icon name="reference" alt="Reference" />
      </DROButton>
      <DROButton onClick={onZeroAll} size="icon" className="p-0">
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
        <DROButton onClick={onBoltCircle} variant="dark" size="icon" className="p-0">
          <Icon name="bolt-hole-pcd-function" alt="Bolt hole" />
        </DROButton>
        <DROButton onClick={onArcContour} variant="dark" size="icon" className="p-0">
          <Icon name="arc-contouring-function" alt="Arc contour" />
        </DROButton>
        <DROButton onClick={onAngleHole} variant="dark" size="icon" className="p-0">
          <Icon name="angle-hole-function" alt="Angle hole" />
        </DROButton>
        <DROButton onClick={onGridHole} variant="dark" size="icon" className="p-0">
          <Icon name="grid-hole-function" alt="Grid hole" />
        </DROButton>
      </div>

      {/* Bottom row */}
      <div className="flex gap-4 justify-between">
        <DROButton onClick={onCalculator} variant="dark" size="icon-wide" className="p-0">
          <Icon name="calculator" alt="Calculator" />
        </DROButton>
        <DROButton onClick={onHalf} variant="dark" size="icon" className="p-0">
          <Icon name="half-function" alt="Half" />
        </DROButton>
        <DROButton onClick={onSDM} variant="dark" size="icon-wide" className="p-0">
          <Icon name="sdm-function" alt="SDM" />
        </DROButton>
        <DROButton onClick={onFunction} variant="dark" size="icon" className="p-0">
          <Icon name="function" alt="Function" />
        </DROButton>
      </div>
    </div>
  );
};

export default FunctionButtons;
