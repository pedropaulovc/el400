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
    <div className="flex flex-col h-full">
      <h2 className="sr-only">Numeric keypad</h2>
      {/* Grid layout: visual order 7-8-9, 4-5-6, 1-2-3, ±-0-., C-Enter */}
      {/* HTML order: 1-9, 0, then modifiers for natural tab order */}
      <div className="grid grid-cols-3 gap-3 flex-1" style={{ gridTemplateRows: 'repeat(4, 1fr)' }}>
        <DROButton size="square" onClick={() => onNumber('1')} className="p-0 row-start-3 col-start-1" data-testid="key-1">
          <Icon name="number-1" /><span className="sr-only">1</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('2')} className="p-0 row-start-3 col-start-2" data-testid="key-2">
          <Icon name="number-2" /><span className="sr-only">2 (Down)</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('3')} className="p-0 row-start-3 col-start-3" data-testid="key-3">
          <Icon name="number-3" /><span className="sr-only">3</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('4')} className="p-0 row-start-2 col-start-1" data-testid="key-4">
          <Icon name="number-4" /><span className="sr-only">4 (Left)</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('5')} className="p-0 row-start-2 col-start-2" data-testid="key-5">
          <Icon name="number-5" /><span className="sr-only">5</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('6')} className="p-0 row-start-2 col-start-3" data-testid="key-6">
          <Icon name="number-6" /><span className="sr-only">6 (Right)</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('7')} className="p-0 row-start-1 col-start-1" data-testid="key-7">
          <Icon name="number-7" /><span className="sr-only">7</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('8')} className="p-0 row-start-1 col-start-2" data-testid="key-8">
          <Icon name="number-8" /><span className="sr-only">8 (Up)</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('9')} className="p-0 row-start-1 col-start-3" data-testid="key-9">
          <Icon name="number-9" /><span className="sr-only">9</span>
        </DROButton>
        <DROButton size="square" onClick={() => onNumber('0')} className="p-0 row-start-4 col-start-2" data-testid="key-0">
          <Icon name="number-0" /><span className="sr-only">0</span>
        </DROButton>
        <DROButton size="square" onClick={onSign} className="p-0 row-start-4 col-start-1" data-testid="key-sign">
          <Icon name="toggle-sign" /><span className="sr-only">Toggle sign</span>
        </DROButton>
        <DROButton size="square" onClick={onDecimal} className="p-0 row-start-4 col-start-3" data-testid="key-decimal">
          <Icon name="dot" /><span className="sr-only">.</span>
        </DROButton>
      </div>

      {/* Bottom row: C, Enter */}
      <div className="flex gap-3 mt-3">
        <DROButton size="square" onClick={onClear} className="p-0" data-testid="key-clear">
          <Icon name="cancel" /><span className="sr-only">Clear</span>
        </DROButton>
        <DROButton size="enter" onClick={onEnter} className="p-0" data-testid="key-enter">
          <Icon name="enter" /><span className="sr-only">Enter</span>
        </DROButton>
      </div>
    </div>
  );
};

export default NumericKeypad;
