import DROButtonV2 from "./DROButtonV2";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

interface NumericKeypadV2Props {
  onNumber: (num: string) => void;
  onClear: () => void;
  onEnter: () => void;
  onSign: () => void;
  onDecimal: () => void;
  onArrow: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

const NumericKeypadV2 = ({
  onNumber,
  onClear,
  onEnter,
  onSign,
  onDecimal,
  onArrow,
}: NumericKeypadV2Props) => {
  return (
    <div 
      className="grid h-full w-full"
      style={{
        gridTemplateRows: 'repeat(5, 1fr)',
        gap: '4%',
      }}
    >
      {/* Row 1: 7, 8↑, 9 */}
      <div 
        className="grid"
        style={{
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '4%',
        }}
      >
        <DROButtonV2 onClick={() => onNumber('7')}>7</DROButtonV2>
        <DROButtonV2 onClick={() => onArrow('up')}>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[0.875rem] font-bold">8</span>
            <ArrowUp className="w-[0.75rem] h-[0.75rem] -mt-[0.125rem]" />
          </div>
        </DROButtonV2>
        <DROButtonV2 onClick={() => onNumber('9')}>9</DROButtonV2>
      </div>
      
      {/* Row 2: ←4, 5, 6→ */}
      <div 
        className="grid"
        style={{
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '4%',
        }}
      >
        <DROButtonV2 onClick={() => onArrow('left')}>
          <div className="flex items-center gap-[0.125rem]">
            <ArrowLeft className="w-[0.75rem] h-[0.75rem]" />
            <span className="text-[0.875rem] font-bold">4</span>
          </div>
        </DROButtonV2>
        <DROButtonV2 onClick={() => onNumber('5')}>5</DROButtonV2>
        <DROButtonV2 onClick={() => onArrow('right')}>
          <div className="flex items-center gap-[0.125rem]">
            <span className="text-[0.875rem] font-bold">6</span>
            <ArrowRight className="w-[0.75rem] h-[0.75rem]" />
          </div>
        </DROButtonV2>
      </div>
      
      {/* Row 3: 1, 2↓, 3 */}
      <div 
        className="grid"
        style={{
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '4%',
        }}
      >
        <DROButtonV2 onClick={() => onNumber('1')}>1</DROButtonV2>
        <DROButtonV2 onClick={() => onArrow('down')}>
          <div className="flex flex-col items-center leading-none">
            <ArrowDown className="w-[0.75rem] h-[0.75rem] -mb-[0.125rem]" />
            <span className="text-[0.875rem] font-bold">2</span>
          </div>
        </DROButtonV2>
        <DROButtonV2 onClick={() => onNumber('3')}>3</DROButtonV2>
      </div>
      
      {/* Row 4: +/-, 0, . */}
      <div 
        className="grid"
        style={{
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '4%',
        }}
      >
        <DROButtonV2 onClick={onSign}>
          <span className="text-[0.75rem] font-bold">+/-</span>
        </DROButtonV2>
        <DROButtonV2 onClick={() => onNumber('0')}>0</DROButtonV2>
        <DROButtonV2 onClick={onDecimal}>.</DROButtonV2>
      </div>
      
      {/* Row 5: C, ent */}
      <div 
        className="grid"
        style={{
          gridTemplateColumns: '1fr 2fr',
          gap: '4%',
        }}
      >
        <DROButtonV2 onClick={onClear}>C</DROButtonV2>
        <DROButtonV2 onClick={onEnter}>
          <span className="font-bold">ent</span>
        </DROButtonV2>
      </div>
    </div>
  );
};

export default NumericKeypadV2;
