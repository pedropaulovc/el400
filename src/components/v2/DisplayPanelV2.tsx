import AxisDisplayV2 from "./AxisDisplayV2";
import LEDIndicatorV2 from "./LEDIndicatorV2";
import BeveledFrameV2 from "./BeveledFrameV2";

interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

interface DisplayPanelV2Props {
  axisValues: AxisValues;
  isAbs: boolean;
  isInch: boolean;
  onToggleAbs: () => void;
  onToggleUnit: () => void;
}

const DisplayPanelV2 = ({ 
  axisValues, 
  isAbs, 
  isInch, 
  onToggleAbs, 
  onToggleUnit 
}: DisplayPanelV2Props) => {
  return (
    <BeveledFrameV2 className="h-full">
      <div 
        className="h-full grid rounded-sm"
        style={{
          gridTemplateRows: '1fr auto',
          background: 'linear-gradient(180deg, #080808 0%, #030303 100%)',
          boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.9)',
          padding: '4%',
          gap: '2%',
        }}
      >
        <div 
          className="grid"
          style={{
            gridTemplateRows: '1fr 1fr 1fr',
            gap: '3%',
          }}
        >
          <AxisDisplayV2 value={axisValues.X} axis="X" />
          <AxisDisplayV2 value={axisValues.Y} axis="Y" />
          <AxisDisplayV2 value={axisValues.Z} axis="Z" />
        </div>
        
        {/* LED Indicators */}
        <div 
          className="grid"
          style={{
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '4%',
          }}
        >
          {/* Mode Toggle Group */}
          <div role="radiogroup" aria-label="Positioning mode" className="flex gap-[15%]">
            <LEDIndicatorV2 
              label="abs" 
              isOn={isAbs} 
              onClick={onToggleAbs}
              isInteractive
              groupLabel="Absolute mode"
            />
            <LEDIndicatorV2 
              label="inc" 
              isOn={!isAbs}
              onClick={onToggleAbs}
              isInteractive
              groupLabel="Incremental mode"
            />
          </div>
          
          {/* Units Toggle Group */}
          <div role="radiogroup" aria-label="Measurement units" className="flex gap-[15%] justify-center">
            <LEDIndicatorV2 
              label="inch" 
              isOn={isInch}
              onClick={onToggleUnit}
              isInteractive
              groupLabel="Inches"
            />
            <LEDIndicatorV2 
              label="mm" 
              isOn={!isInch}
              onClick={onToggleUnit}
              isInteractive
              groupLabel="Millimeters"
            />
          </div>
          
          {/* Status indicators */}
          <div className="flex gap-[15%] justify-end">
            <LEDIndicatorV2 label="Ø" isOn={false} />
            <LEDIndicatorV2 label="r" isOn={false} />
          </div>
        </div>
      </div>
    </BeveledFrameV2>
  );
};

export default DisplayPanelV2;
