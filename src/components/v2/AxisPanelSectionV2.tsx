import AxisPanelV2 from "./AxisPanelV2";
import BeveledFrameV2 from "./BeveledFrameV2";

interface AxisPanelSectionV2Props {
  activeAxis: 'X' | 'Y' | 'Z' | null;
  onAxisSelect: (axis: 'X' | 'Y' | 'Z') => void;
  onAxisZero: (axis: 'X' | 'Y' | 'Z') => void;
}

const AxisPanelSectionV2 = ({ activeAxis, onAxisSelect, onAxisZero }: AxisPanelSectionV2Props) => {
  return (
    <BeveledFrameV2 className="h-full">
      <AxisPanelV2 
        activeAxis={activeAxis}
        onAxisSelect={onAxisSelect}
        onAxisZero={onAxisZero}
      />
    </BeveledFrameV2>
  );
};

export default AxisPanelSectionV2;
