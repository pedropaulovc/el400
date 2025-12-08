import { SecondaryFunctionButtonsV2 } from "./FunctionButtonsV2";
import BeveledFrameV2 from "./BeveledFrameV2";

interface SecondaryFunctionSectionV2Props {
  onToolOffset: () => void;
  onBoltCircle: () => void;
  onLinearPattern: () => void;
  onHalf: () => void;
  onSDM: () => void;
  onFunction: () => void;
}

const SecondaryFunctionSectionV2 = ({
  onToolOffset,
  onBoltCircle,
  onLinearPattern,
  onHalf,
  onSDM,
  onFunction
}: SecondaryFunctionSectionV2Props) => {
  return (
    <BeveledFrameV2 className="h-full">
      <div 
        className="rounded-sm h-full w-full"
        style={{
          background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)',
          padding: '4%',
        }}
      >
        <SecondaryFunctionButtonsV2 
          onToolOffset={onToolOffset} 
          onBoltCircle={onBoltCircle} 
          onLinearPattern={onLinearPattern} 
          onHalf={onHalf} 
          onSDM={onSDM} 
          onFunction={onFunction} 
        />
      </div>
    </BeveledFrameV2>
  );
};

export default SecondaryFunctionSectionV2;
