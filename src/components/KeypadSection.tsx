import NumericKeypad from "./NumericKeypad";
import BeveledFrame from "./BeveledFrame";

interface KeypadSectionProps {
  onNumber: (num: string) => void;
  onClear: () => void;
  onEnter: () => void;
  onSign: () => void;
  onDecimal: () => void;
  onArrow: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

const KeypadSection = ({
  onNumber,
  onClear,
  onEnter,
  onSign,
  onDecimal,
  onArrow,
}: KeypadSectionProps) => {
  return (
    <BeveledFrame>
      <div 
        className="p-2 rounded-sm h-full flex items-center"
        style={{
          background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)',
        }}
      >
        <NumericKeypad 
          onNumber={onNumber}
          onClear={onClear}
          onEnter={onEnter}
          onSign={onSign}
          onDecimal={onDecimal}
          onArrow={onArrow}
        />
      </div>
    </BeveledFrame>
  );
};

export default KeypadSection;
