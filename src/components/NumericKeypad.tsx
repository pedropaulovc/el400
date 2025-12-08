import DROButton from "./DROButton";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

interface NumericKeypadProps {
  onNumber: (num: string) => void;
  onClear: () => void;
  onEnter: () => void;
  onSign: () => void;
  onDecimal: () => void;
  onArrow: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

const NumericKeypad = ({
  onNumber,
  onClear,
  onEnter,
  onSign,
  onDecimal,
  onArrow,
}: NumericKeypadProps) => {
  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Row 1: 7, 8↑, 9 */}
        <div className="flex gap-2">
        <DROButton size="square" onClick={() => onNumber('7')}>7</DROButton>
        <DROButton size="square" onClick={() => onArrow('up')}>
          <div className="flex flex-col items-center leading-none">
            <span className="text-sm font-bold">8</span>
            <ArrowUp className="w-3 h-3 -mt-0.5" />
          </div>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('9')}>9</DROButton>
      </div>
      
      {/* Row 2: ←4, 5, 6→ */}
        <div className="flex gap-2">
        <DROButton size="square" onClick={() => onArrow('left')}>
          <div className="flex items-center gap-0.5">
            <ArrowLeft className="w-3 h-3" />
            <span className="text-sm font-bold">4</span>
          </div>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('5')}>5</DROButton>
        <DROButton size="square" onClick={() => onArrow('right')}>
          <div className="flex items-center gap-0.5">
            <span className="text-sm font-bold">6</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </DROButton>
      </div>
      
      {/* Row 3: 1, 2↓, 3 */}
        <div className="flex gap-2">
        <DROButton size="square" onClick={() => onNumber('1')}>1</DROButton>
        <DROButton size="square" onClick={() => onArrow('down')}>
          <div className="flex flex-col items-center leading-none">
            <ArrowDown className="w-3 h-3 -mb-0.5" />
            <span className="text-sm font-bold">2</span>
          </div>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('3')}>3</DROButton>
      </div>
      
      {/* Row 4: +/-, 0, . */}
        <div className="flex gap-2">
        <DROButton size="square" onClick={onSign}>
          <span className="text-xs font-bold">+/-</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('0')}>0</DROButton>
        <DROButton size="square" onClick={onDecimal}>.</DROButton>
      </div>
      
      {/* Row 5: C, ent */}
      <div className="flex gap-2">
        <DROButton size="square" onClick={onClear}>C</DROButton>
        <DROButton size="square" onClick={onEnter} className="flex-1">
          <span className="font-bold">ent</span>
        </DROButton>
      </div>
    </div>
  );
};

export default NumericKeypad;
