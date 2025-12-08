import AxisDisplay from "./AxisDisplay";
import LEDIndicator from "./LEDIndicator";
import BeveledFrame from "./BeveledFrame";

interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

interface DisplayPanelProps {
  axisValues: AxisValues;
  isAbs: boolean;
  isInch: boolean;
  onToggleAbs: () => void;
  onToggleUnit: () => void;
}

const DisplayPanel = ({ 
  axisValues, 
  isAbs, 
  isInch, 
  onToggleAbs, 
  onToggleUnit 
}: DisplayPanelProps) => {
  return (
    <div className="flex flex-col">
      <BeveledFrame className="h-full">
        <div 
          className="p-4 rounded-lg h-full flex flex-col"
          style={{
            background: 'linear-gradient(180deg, #080808 0%, #030303 100%)',
            boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.9)',
            minWidth: '340px',
          }}
        >
          <div className="flex flex-col gap-3">
            <AxisDisplay value={axisValues.X} axis="X" />
            <AxisDisplay value={axisValues.Y} axis="Y" />
            <AxisDisplay value={axisValues.Z} axis="Z" />
          </div>
          
          {/* LED Indicators */}
          <div className="flex justify-between px-1">
            {/* Mode Toggle Group */}
            <div role="radiogroup" aria-label="Positioning mode" className="flex gap-4">
              <LEDIndicator 
                label="abs" 
                isOn={isAbs} 
                onClick={onToggleAbs}
                isInteractive
                groupLabel="Absolute mode"
              />
              <LEDIndicator 
                label="inc" 
                isOn={!isAbs}
                onClick={onToggleAbs}
                isInteractive
                groupLabel="Incremental mode"
              />
            </div>
            
            {/* Units Toggle Group */}
            <div role="radiogroup" aria-label="Measurement units" className="flex gap-4">
              <LEDIndicator 
                label="inch" 
                isOn={isInch}
                onClick={onToggleUnit}
                isInteractive
                groupLabel="Inches"
              />
              <LEDIndicator 
                label="mm" 
                isOn={!isInch}
                onClick={onToggleUnit}
                isInteractive
                groupLabel="Millimeters"
              />
            </div>
            
            {/* Status indicators */}
            <div className="flex gap-4">
              <LEDIndicator label="Ø" isOn={false} />
              <LEDIndicator label="r" isOn={false} />
            </div>
          </div>
        </div>
      </BeveledFrame>
    </div>
  );
};

export default DisplayPanel;
