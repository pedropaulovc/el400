import DROButton from "./DROButton";
import Icon from "./Icon";

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
      <h2 className="sr-only">Numeric keypad</h2>
      {/* Row 1: 7, 8, 9 */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={() => onNumber('7')} className="p-0" data-testid="key-7">
          <Icon name="number-7" alt="7" /><span className="sr-only">7</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('8')} className="p-0" data-testid="key-8">
          <Icon name="number-8" alt="8" /><span className="sr-only">8</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('9')} className="p-0" data-testid="key-9">
          <Icon name="number-9" alt="9" /><span className="sr-only">9</span>
        </DROButton>
      </div>

      {/* Row 2: 4, 5, 6 */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={() => onNumber('4')} className="p-0" data-testid="key-4">
          <Icon name="number-4" alt="4" /><span className="sr-only">4</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('5')} className="p-0" data-testid="key-5">
          <Icon name="number-5" alt="5" /><span className="sr-only">5</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('6')} className="p-0" data-testid="key-6">
          <Icon name="number-6" alt="6" /><span className="sr-only">6</span>
        </DROButton>
      </div>

      {/* Row 3: 1, 2, 3 */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={() => onNumber('1')} className="p-0" data-testid="key-1">
          <Icon name="number-1" alt="1" /><span className="sr-only">1</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('2')} className="p-0" data-testid="key-2">
          <Icon name="number-2" alt="2" /><span className="sr-only">2</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('3')} className="p-0" data-testid="key-3">
          <Icon name="number-3" alt="3" /><span className="sr-only">3</span>
        </DROButton>
      </div>

      {/* Row 4: +/-, 0, . */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={onSign} className="p-0" data-testid="key-sign">
          <Icon name="toggle-sign" alt="Toggle sign" /><span className="sr-only">Toggle sign</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('0')} className="p-0" data-testid="key-0">
          <Icon name="number-0" alt="0" /><span className="sr-only">0</span>
        </DROButton>
        <DROButton size="square" onClick={onDecimal} className="p-0" data-testid="key-decimal">
          <Icon name="dot" alt="Decimal point" /><span className="sr-only">.</span>
        </DROButton>
      </div>

      {/* Row 5: C, ent */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={onClear} className="p-0" data-testid="key-clear">
          <Icon name="cancel" alt="Cancel" /><span className="sr-only">Clear</span>
        </DROButton>
        <DROButton size="enter" onClick={onEnter} className="p-0" data-testid="key-enter">
          <Icon name="enter" alt="Enter" /><span className="sr-only">Enter</span>
        </DROButton>
      </div>
    </div>
  );
};

export default NumericKeypad;
