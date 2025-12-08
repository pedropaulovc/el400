import FunctionButtons from "./FunctionButtons";
import BeveledFrame from "./BeveledFrame";
import PowerLED from "./PowerLED";

interface PrimaryFunctionSectionProps {
  isInch: boolean;
  isAbs: boolean;
  onToggleUnit: () => void;
  onSettings: () => void;
  onCalibrate: () => void;
  onCenter: () => void;
  onZeroAll: () => void;
}

const PrimaryFunctionSection = ({
  isInch,
  isAbs,
  onToggleUnit,
  onSettings,
  onCalibrate,
  onCenter,
  onZeroAll,
}: PrimaryFunctionSectionProps) => {
  return (
    <div className="flex flex-col gap-2" style={{ width: '380px' }}>
      <BeveledFrame className="w-full">
        <div 
          className="p-4 rounded-lg"
          style={{
            background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)',
          }}
        >
          <FunctionButtons 
            isInch={isInch}
            isAbs={isAbs}
            onToggleUnit={onToggleUnit}
            onSettings={onSettings}
            onCalibrate={onCalibrate}
            onCenter={onCenter}
            onZeroAll={onZeroAll}
          />
        </div>
      </BeveledFrame>
      <PowerLED />
    </div>
  );
};

export default PrimaryFunctionSection;
