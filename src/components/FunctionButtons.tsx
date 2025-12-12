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
        <Icon name="reference" alt="Calibrate" />
      </DROButton>
      <DROButton onClick={onToggleUnit} size="icon" className="p-0">
        <Icon name="inch-mm" alt="Toggle units" />
      </DROButton>
      <DROButton onClick={onCenter} size="icon" className="p-0">
        <Icon name="reference" alt="Center" />
      </DROButton>
      <DROButton onClick={onZeroAll} size="icon" className="p-0">
        <Icon name="preset" alt="Zero all axes" />
      </DROButton>
    </div>
  );
};

export const SecondaryFunctionButtons = ({
  onToolOffset,
  onBoltCircle,
  onLinearPattern,
  onHalf,
  onSDM,
  onFunction,
}: {
  onToolOffset: () => void;
  onBoltCircle: () => void;
  onLinearPattern: () => void;
  onHalf: () => void;
  onSDM: () => void;
  onFunction: () => void;
}) => {
  return (
    <div className="flex flex-col gap-4 h-full justify-center">
      {/* Top row */}
      <div className="flex gap-4 justify-between">
        <DROButton onClick={onToolOffset} variant="dark" size="icon" className="p-0">
          <Icon name="tool-offsets" className="invert" alt="Tool offset" />
        </DROButton>
        <DROButton onClick={onBoltCircle} variant="dark" size="icon" className="p-0">
          <Icon name="bolt-hole-pcd-function" className="invert" alt="Bolt circle" />
        </DROButton>
        <DROButton onClick={onLinearPattern} variant="dark" size="icon" className="p-0">
          <Icon name="grid-hole-function" className="invert" alt="Linear pattern" />
        </DROButton>
        <DROButton onClick={() => {}} variant="dark" size="icon" className="p-0">
          <Icon name="calculator" className="invert" alt="Calculator" />
        </DROButton>
      </div>

      {/* Bottom row */}
      <div className="flex gap-4 justify-between">
        <DROButton onClick={() => {}} variant="dark" size="icon" className="p-0">
          <Icon name="abs-inc-v1" className="invert" alt="Abs/Inc" />
        </DROButton>
        <DROButton onClick={onHalf} variant="dark" size="icon" className="p-0">
          <Icon name="half-function" className="invert" alt="Half" />
        </DROButton>
        <DROButton onClick={onSDM} variant="dark" size="icon" className="p-0">
          <Icon name="sdm-function" className="invert" alt="SDM" />
        </DROButton>
        <DROButton onClick={onFunction} variant="dark" size="icon" className="p-0">
          <Icon name="function" className="invert" alt="Function" />
        </DROButton>
      </div>
    </div>
  );
};

export default FunctionButtons;
