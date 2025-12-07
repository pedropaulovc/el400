import DROButton from "./DROButton";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home } from "lucide-react";

interface NumericKeypadProps {
  onNumber: (num: string) => void;
  onClear: () => void;
  onEnter: () => void;
  onSign: () => void;
  onDecimal: () => void;
  onArrow: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onHome: () => void;
}

const NumericKeypad = ({
  onNumber,
  onClear,
  onEnter,
  onSign,
  onDecimal,
  onArrow,
  onHome,
}: NumericKeypadProps) => {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Top row: 7, up arrow, 9 */}
      <div className="flex gap-1.5">
        <DROButton onClick={() => onNumber('7')}>7</DROButton>
        <DROButton onClick={() => onArrow('up')}>
          <ArrowUp className="w-4 h-4" />
        </DROButton>
        <DROButton onClick={() => onNumber('9')}>9</DROButton>
      </div>
      
      {/* Second row: left arrow, 5, right arrow */}
      <div className="flex gap-1.5">
        <DROButton onClick={() => onArrow('left')}>
          <ArrowLeft className="w-4 h-4" />
        </DROButton>
        <DROButton onClick={() => onNumber('5')}>5</DROButton>
        <DROButton onClick={() => onArrow('right')}>
          <ArrowRight className="w-4 h-4" />
        </DROButton>
      </div>
      
      {/* Third row: 1, down arrow, 3 */}
      <div className="flex gap-1.5">
        <DROButton onClick={onHome}>
          <Home className="w-4 h-4" />
        </DROButton>
        <DROButton onClick={() => onArrow('down')}>
          <ArrowDown className="w-4 h-4" />
        </DROButton>
        <DROButton onClick={() => onNumber('3')}>3</DROButton>
      </div>
      
      {/* Fourth row: +/-, 0, . */}
      <div className="flex gap-1.5">
        <DROButton onClick={onSign}>
          <span className="text-xs font-bold">+/-</span>
        </DROButton>
        <DROButton onClick={() => onNumber('0')}>0</DROButton>
        <DROButton onClick={onDecimal}>.</DROButton>
      </div>
      
      {/* Fifth row: C, ent */}
      <div className="flex gap-1.5">
        <DROButton onClick={onClear}>C</DROButton>
        <DROButton onClick={onEnter} className="col-span-2 w-[5.5rem]">
          <span className="font-bold">ent</span>
        </DROButton>
      </div>
    </div>
  );
};

export default NumericKeypad;
