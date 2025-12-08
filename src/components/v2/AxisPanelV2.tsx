import DROButtonV2 from "./DROButtonV2";

interface AxisPanelV2Props {
  activeAxis: 'X' | 'Y' | 'Z' | null;
  onAxisSelect: (axis: 'X' | 'Y' | 'Z') => void;
  onAxisZero: (axis: 'X' | 'Y' | 'Z') => void;
}

const AxisPanelV2 = ({ activeAxis, onAxisSelect, onAxisZero }: AxisPanelV2Props) => {
  const axes: ('X' | 'Y' | 'Z')[] = ['X', 'Y', 'Z'];

  return (
    <div 
      className="grid h-full w-full rounded-sm"
      style={{
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '0.5fr 1fr 1fr 1fr 0.5fr',
        columnGap: '8%',
        rowGap: '4%',
        padding: '4% 8%',
        background: 'linear-gradient(to bottom, #f0d000, #d4b800)',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
      }}
      role="group"
      aria-label="Axis selection and zeroing"
    >
      {/* Left column: X, Y, Z buttons - rows 1-3 */}
      {axes.map((axis, index) => (
        <div 
          key={`select-${axis}`} 
          className="flex flex-col items-center justify-center gap-[5%]"
          style={{ gridColumn: 1, gridRow: index + 1 }}
        >
          <span className="text-[1em] font-bold text-black/80">{axis}</span>
          <DROButtonV2 
            variant="dark" 
            onClick={() => onAxisSelect(axis)}
            isActive={activeAxis === axis}
            aria-label={`Select ${axis} axis`}
            aria-pressed={activeAxis === axis}
          >
            <span className="sr-only">{axis}</span>
          </DROButtonV2>
        </div>
      ))}
      
      {/* Right column: X0, Y0, Z0 buttons - offset by 0.5 row (rows 2-4) */}
      {axes.map((axis, index) => (
        <div 
          key={`zero-${axis}`} 
          className="flex flex-col items-center justify-center gap-[5%]"
          style={{ gridColumn: 2, gridRow: index + 2 }}
        >
          <span className="text-[1em] font-bold text-black/80">{axis}<sub className="text-[0.65em]">0</sub></span>
          <DROButtonV2 
            variant="dark" 
            onClick={() => onAxisZero(axis)}
            aria-label={`Zero ${axis} axis`}
          >
            <span className="sr-only">{axis}0</span>
          </DROButtonV2>
        </div>
      ))}
    </div>
  );
};

export default AxisPanelV2;
