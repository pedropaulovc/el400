import DROButton from "./DROButton";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

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
}: NumericKeypadProps) => {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Row 1: 7, 8↑, 9 */}
      <div className="flex gap-1.5">
        <DROButton onClick={() => onNumber('7')}>7</DROButton>
        <DROButton onClick={() => { onNumber('8'); onArrow('up'); }} className="relative">
          <span>8</span>
          <ArrowUp className="w-3 h-3 absolute top-0.5 right-0.5" />
        </DROButton>
        <DROButton onClick={() => onNumber('9')}>9</DROButton>
      </div>
      
      {/* Row 2: ←4, 5, 6→ */}
      <div className="flex gap-1.5">
        <DROButton onClick={() => { onNumber('4'); onArrow('left'); }} className="relative">
          <ArrowLeft className="w-3 h-3 absolute top-0.5 left-0.5" />
          <span>4</span>
        </DROButton>
        <DROButton onClick={() => onNumber('5')}>5</DROButton>
        <DROButton onClick={() => { onNumber('6'); onArrow('right'); }} className="relative">
          <span>6</span>
          <ArrowRight className="w-3 h-3 absolute top-0.5 right-0.5" />
        </DROButton>
      </div>
      
      {/* Row 3: 1, 2↓, 3 */}
      <div className="flex gap-1.5">
        <DROButton onClick={() => onNumber('1')}>1</DROButton>
        <DROButton onClick={() => { onNumber('2'); onArrow('down'); }} className="relative">
          <span>2</span>
          <ArrowDown className="w-3 h-3 absolute bottom-0.5 right-0.5" />
        </DROButton>
        <DROButton onClick={() => onNumber('3')}>3</DROButton>
      </div>
      
      {/* Row 4: +/-, 0, . */}
      <div className="flex gap-1.5">
        <DROButton onClick={onSign}>
          <span className="text-xs font-bold">+/-</span>
        </DROButton>
        <DROButton onClick={() => onNumber('0')}>0</DROButton>
        <DROButton onClick={onDecimal}>.</DROButton>
      </div>
      
      {/* Row 5: C, ent */}
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
