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
      {/* Row 1: 7, 8, 9 */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={() => onNumber('7')} className="p-0" data-testid="key-7">
          <Icon name="number-7" alt="7" />
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('8')} className="p-0" data-testid="key-8">
          <Icon name="number-8" alt="8" />
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('9')} className="p-0" data-testid="key-9">
          <Icon name="number-9" alt="9" />
        </DROButton>
      </div>

      {/* Row 2: 4, 5, 6 */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={() => onNumber('4')} className="p-0" data-testid="key-4">
          <Icon name="number-4" alt="4" />
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('5')} className="p-0" data-testid="key-5">
          <Icon name="number-5" alt="5" />
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('6')} className="p-0" data-testid="key-6">
          <Icon name="number-6" alt="6" />
        </DROButton>
      </div>

      {/* Row 3: 1, 2, 3 */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={() => onNumber('1')} className="p-0" data-testid="key-1">
          <Icon name="number-1" alt="1" />
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('2')} className="p-0" data-testid="key-2">
          <Icon name="number-2" alt="2" />
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('3')} className="p-0" data-testid="key-3">
          <Icon name="number-3" alt="3" />
        </DROButton>
      </div>

      {/* Row 4: +/-, 0, . */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={onSign} className="p-0" data-testid="key-sign">
          <Icon name="toggle-sign" alt="Toggle sign" />
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('0')} className="p-0" data-testid="key-0">
          <Icon name="number-0" alt="0" />
        </DROButton>
        <DROButton size="square" onClick={onDecimal} className="p-0" data-testid="key-decimal">
          <Icon name="dot" alt="Decimal point" />
        </DROButton>
      </div>

      {/* Row 5: C, ent */}
      <div className="flex gap-3">
        <DROButton size="square" onClick={onClear} className="p-0" data-testid="key-clear">
          <Icon name="cancel" alt="Cancel" />
        </DROButton>
        <DROButton size="enter" onClick={onEnter} className="p-0" data-testid="key-enter">
          <Icon name="enter" alt="Enter" />
        </DROButton>
      </div>
    </div>
  );
};

export default NumericKeypad;
