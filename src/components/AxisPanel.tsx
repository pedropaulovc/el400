import DROButton from "./DROButton";

interface AxisPanelProps {
  activeAxis: 'X' | 'Y' | 'Z' | null;
  onAxisSelect: (axis: 'X' | 'Y' | 'Z') => void;
  onAxisZero: (axis: 'X' | 'Y' | 'Z') => void;
}

const AxisPanel = ({ activeAxis, onAxisSelect, onAxisZero }: AxisPanelProps) => {
  const axes: ('X' | 'Y' | 'Z')[] = ['X', 'Y', 'Z'];

  return (
    <div 
      className="flex flex-col gap-3 px-4 py-6 rounded-sm"
      style={{
        background: 'linear-gradient(to bottom, #f0d000, #d4b800)',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
      }}
    >
      {axes.map((axis) => (
        <div key={axis} className="flex items-center gap-3">
          <DROButton 
            variant="dark" 
            onClick={() => onAxisSelect(axis)}
            className={activeAxis === axis ? 'ring-2 ring-white' : ''}
          >
            <span className="text-white font-bold text-lg">{axis}</span>
          </DROButton>
          <div className="flex flex-col items-start">
            <span className="text-[#1a1a1a] font-bold text-sm">{axis}<sub className="text-[10px]">0</sub></span>
          </div>
          <DROButton 
            variant="dark" 
            onClick={() => onAxisZero(axis)}
          >
            <span className="text-white font-bold text-sm">{axis}<sub className="text-[8px]">0</sub></span>
          </DROButton>
        </div>
      ))}
    </div>
  );
};

export default AxisPanel;
