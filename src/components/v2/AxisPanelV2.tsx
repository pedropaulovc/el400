import DROButtonV2 from "./DROButtonV2";

interface AxisPanelV2Props {
  activeAxis: 'X' | 'Y' | 'Z' | null;
  onAxisSelect: (axis: 'X' | 'Y' | 'Z') => void;
  onAxisZero: (axis: 'X' | 'Y' | 'Z') => void;
}

const AxisPanelV2 = ({ activeAxis, onAxisSelect, onAxisZero }: AxisPanelV2Props) => {
  return (
    <div 
      className="grid h-full w-full rounded-sm"
      style={{
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'repeat(7, 1fr)',
        gap: '3%',
        padding: '5% 8%',
        background: 'linear-gradient(to bottom, #f0d000, #d4b800)',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
      }}
      role="group"
      aria-label="Axis selection and zeroing"
    >
      {/* X row - select at row 1, zero at row 2 (offset by half) */}
      <div className="flex flex-col items-center justify-center gap-[5%]" style={{ gridRow: '1 / 3', gridColumn: '1' }}>
        <span className="text-[1em] font-bold text-black/80">X</span>
        <DROButtonV2 
          variant="dark" 
          onClick={() => onAxisSelect('X')}
          isActive={activeAxis === 'X'}
          aria-label="Select X axis"
          aria-pressed={activeAxis === 'X'}
        >
          <span className="sr-only">X</span>
        </DROButtonV2>
      </div>
      <div className="flex flex-col items-center justify-center gap-[5%]" style={{ gridRow: '2 / 4', gridColumn: '2' }}>
        <span className="text-[1em] font-bold text-black/80">X<sub className="text-[0.65em]">0</sub></span>
        <DROButtonV2 
          variant="dark" 
          onClick={() => onAxisZero('X')}
          aria-label="Zero X axis"
        >
          <span className="sr-only">X0</span>
        </DROButtonV2>
      </div>

      {/* Y row - select at row 3, zero at row 4 (offset by half) */}
      <div className="flex flex-col items-center justify-center gap-[5%]" style={{ gridRow: '3 / 5', gridColumn: '1' }}>
        <span className="text-[1em] font-bold text-black/80">Y</span>
        <DROButtonV2 
          variant="dark" 
          onClick={() => onAxisSelect('Y')}
          isActive={activeAxis === 'Y'}
          aria-label="Select Y axis"
          aria-pressed={activeAxis === 'Y'}
        >
          <span className="sr-only">Y</span>
        </DROButtonV2>
      </div>
      <div className="flex flex-col items-center justify-center gap-[5%]" style={{ gridRow: '4 / 6', gridColumn: '2' }}>
        <span className="text-[1em] font-bold text-black/80">Y<sub className="text-[0.65em]">0</sub></span>
        <DROButtonV2 
          variant="dark" 
          onClick={() => onAxisZero('Y')}
          aria-label="Zero Y axis"
        >
          <span className="sr-only">Y0</span>
        </DROButtonV2>
      </div>

      {/* Z row - select at row 5, zero at row 6 (offset by half) */}
      <div className="flex flex-col items-center justify-center gap-[5%]" style={{ gridRow: '5 / 7', gridColumn: '1' }}>
        <span className="text-[1em] font-bold text-black/80">Z</span>
        <DROButtonV2 
          variant="dark" 
          onClick={() => onAxisSelect('Z')}
          isActive={activeAxis === 'Z'}
          aria-label="Select Z axis"
          aria-pressed={activeAxis === 'Z'}
        >
          <span className="sr-only">Z</span>
        </DROButtonV2>
      </div>
      <div className="flex flex-col items-center justify-center gap-[5%]" style={{ gridRow: '6 / 8', gridColumn: '2' }}>
        <span className="text-[1em] font-bold text-black/80">Z<sub className="text-[0.65em]">0</sub></span>
        <DROButtonV2 
          variant="dark" 
          onClick={() => onAxisZero('Z')}
          aria-label="Zero Z axis"
        >
          <span className="sr-only">Z0</span>
        </DROButtonV2>
      </div>
    </div>
  );
};

export default AxisPanelV2;
