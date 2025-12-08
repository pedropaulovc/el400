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
      className="grid h-full w-full rounded-sm [&>*]:border-2 [&>*]:border-pink-500"
      style={{
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 2fr 2fr 2fr 1fr',
        columnGap: '6%',
        rowGap: '3%',
        padding: '5% 8%',
        background: 'linear-gradient(to bottom, #f0d000, #d4b800)',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
      }}
      role="group"
      aria-label="Axis selection and zeroing"
    >
      {/* X select - row 1-2 */}
      <div style={{ gridColumn: 1, gridRow: '1 / 3' }} className="flex flex-col items-center justify-center gap-[5%]">
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
      {/* X0 - row 2-3 (offset down by 1) */}
      <div style={{ gridColumn: 2, gridRow: '2 / 4' }} className="flex flex-col items-center justify-center gap-[5%]">
        <span className="text-[1em] font-bold text-black/80">X<sub className="text-[0.65em]">0</sub></span>
        <DROButtonV2 
          variant="dark" 
          onClick={() => onAxisZero('X')}
          aria-label="Zero X axis"
        >
          <span className="sr-only">X0</span>
        </DROButtonV2>
      </div>

      {/* Y select - row 2-3 */}
      <div style={{ gridColumn: 1, gridRow: '2 / 4' }} className="flex flex-col items-center justify-center gap-[5%]">
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
      {/* Y0 - row 3-4 */}
      <div style={{ gridColumn: 2, gridRow: '3 / 5' }} className="flex flex-col items-center justify-center gap-[5%]">
        <span className="text-[1em] font-bold text-black/80">Y<sub className="text-[0.65em]">0</sub></span>
        <DROButtonV2 
          variant="dark" 
          onClick={() => onAxisZero('Y')}
          aria-label="Zero Y axis"
        >
          <span className="sr-only">Y0</span>
        </DROButtonV2>
      </div>

      {/* Z select - row 3-4 */}
      <div style={{ gridColumn: 1, gridRow: '3 / 5' }} className="flex flex-col items-center justify-center gap-[5%]">
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
      {/* Z0 - row 4-5 */}
      <div style={{ gridColumn: 2, gridRow: '4 / 6' }} className="flex flex-col items-center justify-center gap-[5%]">
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
