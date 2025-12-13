import DROButton from "./DROButton";
import Icon from "./Icon";

interface PrimaryFunctionButtonsProps {
  isInch: boolean;
  isAbs: boolean;
  onToggleUnit: () => void;
  onSettings: () => void;
  onToggleAbs: () => void;
  onCenter: () => void;
  onZeroAll: () => void;
}

const PrimaryFunctionButtons = ({
  onSettings,
  onToggleAbs,
  onToggleUnit,
  onCenter,
  onZeroAll,
}: PrimaryFunctionButtonsProps) => {
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

export default PrimaryFunctionButtons;
