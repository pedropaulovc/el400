import DROButton from "./DROButton";

interface NumericKeypadProps {
  onNumber: (num: string) => void;
  onClear: () => void;
  onEnter: () => void;
  onSign: () => void;
  onDecimal: () => void;
}

const NumericKeypad = ({
  onNumber,
  onClear,
  onEnter,
  onSign,
  onDecimal,
}: NumericKeypadProps) => {
  return (
    <div className="flex flex-col justify-between h-full">
      {/* Row 1: 7, 8, 9 */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={() => onNumber('7')}>7</DROButton>
        <DROButton size="square" onClick={() => onNumber('8')}>8</DROButton>
        <DROButton size="square" onClick={() => onNumber('9')}>9</DROButton>
      </div>
      
      {/* Row 2: 4, 5, 6 */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={() => onNumber('4')}>4</DROButton>
        <DROButton size="square" onClick={() => onNumber('5')}>5</DROButton>
        <DROButton size="square" onClick={() => onNumber('6')}>6</DROButton>
      </div>
      
      {/* Row 3: 1, 2, 3 */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={() => onNumber('1')}>1</DROButton>
        <DROButton size="square" onClick={() => onNumber('2')}>2</DROButton>
        <DROButton size="square" onClick={() => onNumber('3')}>3</DROButton>
      </div>
      
      {/* Row 4: +/-, 0, . */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={onSign}>
          <span className="text-xs font-bold">+/-</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('0')}>0</DROButton>
        <DROButton size="square" onClick={onDecimal}>.</DROButton>
      </div>
      
      {/* Row 5: C, ent */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={onClear}>C</DROButton>
        <DROButton size="square" onClick={onEnter} className="flex-1">
          <span className="font-bold">ent</span>
        </DROButton>
      </div>
    </div>
  );
};

export default NumericKeypad;
