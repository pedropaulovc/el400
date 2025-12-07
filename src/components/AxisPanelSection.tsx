import AxisPanel from "./AxisPanel";
import BeveledFrame from "./BeveledFrame";

interface AxisPanelSectionProps {
  activeAxis: 'X' | 'Y' | 'Z' | null;
  onAxisSelect: (axis: 'X' | 'Y' | 'Z') => void;
  onAxisZero: (axis: 'X' | 'Y' | 'Z') => void;
}

const AxisPanelSection = ({ activeAxis, onAxisSelect, onAxisZero }: AxisPanelSectionProps) => {
  return (
    <BeveledFrame>
      <AxisPanel 
        activeAxis={activeAxis}
        onAxisSelect={onAxisSelect}
        onAxisZero={onAxisZero}
      />
    </BeveledFrame>
  );
};

export default AxisPanelSection;
