import DROButton from "./DROButton";
import Icon from "./Icon";
import BeveledFrame from "./BeveledFrame";
import PowerLED from "./PowerLED";

interface PrimaryFunctionSectionProps {
  isInch: boolean;
  isAbs: boolean;
  onToggleUnit: () => void;
  onSettings: () => void;
  onToggleAbs: () => void;
  onCenter: () => void;
  onZeroAll: () => void;
}

const PrimaryFunctionSection = ({
  onToggleUnit,
  onSettings,
  onToggleAbs,
  onCenter,
  onZeroAll,
}: PrimaryFunctionSectionProps) => {
  return (
    <div className="relative" style={{ width: '412px' }}>
      <h2 className="sr-only">Primary functions</h2>
      <BeveledFrame className="w-full">
        <div
          className="p-4 rounded-lg"
          style={{
            background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)',
          }}
        >
          <div className="flex justify-between w-full">
            <DROButton onClick={onSettings} size="icon" className="p-0" data-testid="btn-settings">
              <Icon name="setup" alt="Settings" /><span className="sr-only">Settings</span>
            </DROButton>
            <DROButton onClick={onToggleAbs} size="icon" className="p-0" data-testid="btn-abs-inc">
              <Icon name="abs-inc" alt="Abs/Inc" /><span className="sr-only">Abs/Inc</span>
            </DROButton>
            <DROButton onClick={onToggleUnit} size="icon" className="p-0" data-testid="btn-toggle-unit">
              <Icon name="inch-mm" alt="Toggle units" /><span className="sr-only">Toggle units</span>
            </DROButton>
            <DROButton onClick={onCenter} size="icon" className="p-0" data-testid="btn-center">
              <Icon name="reference" alt="Reference" /><span className="sr-only">Reference</span>
            </DROButton>
            <DROButton onClick={onZeroAll} size="icon" className="p-0" data-testid="btn-zero-all">
              <Icon name="preset" alt="Zero all axes" /><span className="sr-only">Zero all axes</span>
            </DROButton>
          </div>
        </div>
      </BeveledFrame>
      <div className="absolute -bottom-3 left-4">
        <PowerLED />
      </div>
    </div>
  );
};

export default PrimaryFunctionSection;
