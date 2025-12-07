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
      className="grid grid-cols-2 gap-x-3 px-4 py-3 rounded-sm h-full content-between"
      style={{
        background: 'linear-gradient(to bottom, #f0d000, #d4b800)',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
      }}
      role="group"
      aria-label="Axis selection and zeroing"
    >
      {axes.map((axis) => (
        <>
          <div key={`select-${axis}`} className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold text-black/80">{axis}</span>
            <DROButton 
              variant="dark" 
              onClick={() => onAxisSelect(axis)}
              isActive={activeAxis === axis}
              aria-label={`Select ${axis} axis`}
              aria-pressed={activeAxis === axis}
            >
              <span className="sr-only">{axis}</span>
            </DROButton>
          </div>
          <div key={`zero-${axis}`} className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold text-black/80">{axis}<sub className="text-[9px]">0</sub></span>
            <DROButton 
              variant="dark" 
              onClick={() => onAxisZero(axis)}
              aria-label={`Zero ${axis} axis`}
            >
              <span className="sr-only">{axis}0</span>
            </DROButton>
          </div>
        </>
      ))}
    </div>
  );
};

export default AxisPanel;
