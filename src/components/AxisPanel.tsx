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
      className="grid grid-cols-2 gap-x-3 px-4 py-4 rounded-sm h-full"
      style={{
        background: 'linear-gradient(to bottom, #f0d000, #d4b800)',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
      }}
      role="group"
      aria-label="Axis selection and zeroing"
    >
      {axes.map((axis) => (
        <>
          <DROButton 
            key={`select-${axis}`}
            variant="dark" 
            onClick={() => onAxisSelect(axis)}
            isActive={activeAxis === axis}
            aria-label={`Select ${axis} axis`}
            aria-pressed={activeAxis === axis}
            className="h-full"
          >
            <span className="text-white font-bold text-lg">{axis}</span>
          </DROButton>
          <DROButton 
            key={`zero-${axis}`}
            variant="dark" 
            onClick={() => onAxisZero(axis)}
            aria-label={`Zero ${axis} axis`}
            className="h-full"
          >
            <span className="text-white font-bold text-sm">{axis}<sub className="text-[8px]">0</sub></span>
          </DROButton>
        </>
      ))}
    </div>
  );
};

export default AxisPanel;
