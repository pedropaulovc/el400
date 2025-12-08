import FunctionButtonsV2 from "./FunctionButtonsV2";
import BeveledFrameV2 from "./BeveledFrameV2";
import PowerLEDV2 from "./PowerLEDV2";

interface PrimaryFunctionSectionV2Props {
  isInch: boolean;
  isAbs: boolean;
  onToggleUnit: () => void;
  onSettings: () => void;
  onCalibrate: () => void;
  onCenter: () => void;
  onZeroAll: () => void;
}

const PrimaryFunctionSectionV2 = ({
  isInch,
  isAbs,
  onToggleUnit,
  onSettings,
  onCalibrate,
  onCenter,
  onZeroAll,
}: PrimaryFunctionSectionV2Props) => {
  return (
    <div 
      className="grid h-full"
      style={{
        gridTemplateRows: '4fr 1fr',
        gap: '6%',
      }}
    >
      <BeveledFrameV2 className="w-full h-full">
        <div 
          className="rounded-sm h-full w-full"
          style={{
            background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)',
            padding: '3%',
          }}
        >
          <FunctionButtonsV2 
            isInch={isInch}
            isAbs={isAbs}
            onToggleUnit={onToggleUnit}
            onSettings={onSettings}
            onCalibrate={onCalibrate}
            onCenter={onCenter}
            onZeroAll={onZeroAll}
          />
        </div>
      </BeveledFrameV2>
      <PowerLEDV2 />
    </div>
  );
};

export default PrimaryFunctionSectionV2;
