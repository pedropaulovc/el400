import DROButton from "./DROButton";
import { Home } from "lucide-react";

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
      {/* Row 1: 7, 8↑, 9, Home */}
      <div className="flex gap-1.5">
        <DROButton onClick={() => onNumber('7')}>7</DROButton>
        <DROButton onClick={() => { onNumber('8'); onArrow('up'); }}>
          <span className="flex flex-col items-center leading-none">
            <span className="text-[8px]">↑</span>
            <span>8</span>
          </span>
        </DROButton>
        <DROButton onClick={() => onNumber('9')}>9</DROButton>
        <DROButton onClick={onHome}>
          <Home className="w-4 h-4" />
        </DROButton>
      </div>
      
      {/* Row 2: 4←, 5, 6→ */}
      <div className="flex gap-1.5">
        <DROButton onClick={() => { onNumber('4'); onArrow('left'); }}>
          <span className="flex items-center leading-none">
            <span className="text-[8px]">←</span>
            <span>4</span>
          </span>
        </DROButton>
        <DROButton onClick={() => onNumber('5')}>5</DROButton>
        <DROButton onClick={() => { onNumber('6'); onArrow('right'); }}>
          <span className="flex items-center leading-none">
            <span>6</span>
            <span className="text-[8px]">→</span>
          </span>
        </DROButton>
        <div className="w-10 h-10" />
      </div>
      
      {/* Row 3: 1, 2↓, 3 */}
      <div className="flex gap-1.5">
        <DROButton onClick={() => onNumber('1')}>1</DROButton>
        <DROButton onClick={() => { onNumber('2'); onArrow('down'); }}>
          <span className="flex flex-col items-center leading-none">
            <span>2</span>
            <span className="text-[8px]">↓</span>
          </span>
        </DROButton>
        <DROButton onClick={() => onNumber('3')}>3</DROButton>
        <div className="w-10 h-10" />
      </div>
      
      {/* Row 4: +/-, 0, . */}
      <div className="flex gap-1.5">
        <DROButton onClick={onSign}>
          <span className="text-xs font-bold">+/-</span>
        </DROButton>
        <DROButton onClick={() => onNumber('0')}>0</DROButton>
        <DROButton onClick={onDecimal}>.</DROButton>
        <div className="w-10 h-10" />
      </div>
      
      {/* Row 5: C, ent (wider) */}
      <div className="flex gap-1.5">
        <DROButton onClick={onClear}>C</DROButton>
        <DROButton onClick={onEnter} className="w-[5.5rem]">
          <span className="font-bold">ent</span>
        </DROButton>
        <div className="w-10 h-10" />
      </div>
    </div>
  );
};

export default NumericKeypad;
