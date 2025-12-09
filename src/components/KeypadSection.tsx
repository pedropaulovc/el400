import NumericKeypad from "./NumericKeypad";
import BeveledFrame from "./BeveledFrame";

interface KeypadSectionProps {
  onNumber: (num: string) => void;
  onClear: () => void;
  onEnter: () => void;
  onSign: () => void;
  onDecimal: () => void;
}

const KeypadSection = ({
  onNumber,
  onClear,
  onEnter,
  onSign,
  onDecimal,
}: KeypadSectionProps) => {
  return (
    <BeveledFrame>
        <div 
          className="p-2 rounded-lg h-full flex items-center"
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
        />
      </div>
    </BeveledFrame>
  );
};

export default KeypadSection;
