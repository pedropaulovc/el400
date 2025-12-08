import NumericKeypadV2 from "./NumericKeypadV2";
import BeveledFrameV2 from "./BeveledFrameV2";

interface KeypadSectionV2Props {
  onNumber: (num: string) => void;
  onClear: () => void;
  onEnter: () => void;
  onSign: () => void;
  onDecimal: () => void;
  onArrow: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

const KeypadSectionV2 = ({
  onNumber,
  onClear,
  onEnter,
  onSign,
  onDecimal,
  onArrow,
}: KeypadSectionV2Props) => {
  return (
    <BeveledFrameV2 className="h-full">
      <div 
        className="rounded-sm h-full w-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)',
          padding: '4%',
        }}
      >
        <NumericKeypadV2 
          onNumber={onNumber}
          onClear={onClear}
          onEnter={onEnter}
          onSign={onSign}
          onDecimal={onDecimal}
          onArrow={onArrow}
        />
      </div>
    </BeveledFrameV2>
  );
};

export default KeypadSectionV2;
