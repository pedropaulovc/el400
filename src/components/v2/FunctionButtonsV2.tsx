import DROButtonV2 from "./DROButtonV2";
import { Wrench, RotateCcw, Crosshair, ArrowRightToLine, Grid3X3, Ruler, Target, Settings } from "lucide-react";

interface FunctionButtonsV2Props {
  isInch: boolean;
  isAbs: boolean;
  onToggleUnit: () => void;
  onSettings: () => void;
  onCalibrate: () => void;
  onCenter: () => void;
  onZeroAll: () => void;
}

const FunctionButtonsV2 = ({
  onSettings,
  onCalibrate,
  onToggleUnit,
  onCenter,
  onZeroAll,
}: FunctionButtonsV2Props) => {
  return (
    <div 
      className="grid w-full h-full"
      style={{
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '4%',
      }}
    >
      <DROButtonV2 onClick={onSettings} size="lg">
        <Wrench className="w-[1.25rem] h-[1.25rem]" />
      </DROButtonV2>
      <DROButtonV2 onClick={onCalibrate} size="lg">
        <RotateCcw className="w-[1.25rem] h-[1.25rem]" />
      </DROButtonV2>
      <DROButtonV2 onClick={onToggleUnit} size="lg">
        <div className="flex flex-col items-center leading-none">
          <span className="text-[0.5625rem] font-bold">in</span>
          <span className="text-[0.5625rem] font-bold">mm</span>
        </div>
      </DROButtonV2>
      <DROButtonV2 onClick={onCenter} size="lg">
        <Crosshair className="w-[1.25rem] h-[1.25rem]" />
      </DROButtonV2>
      <DROButtonV2 onClick={onZeroAll} size="lg">
        <span className="flex items-center gap-[0.125rem]">
          <ArrowRightToLine className="w-[0.75rem] h-[0.75rem]" />
          <span className="text-[0.875rem] font-bold">0</span>
        </span>
      </DROButtonV2>
    </div>
  );
};

export const SecondaryFunctionButtonsV2 = ({
  onToolOffset,
  onBoltCircle,
  onLinearPattern,
  onHalf,
  onSDM,
  onFunction,
}: {
  onToolOffset: () => void;
  onBoltCircle: () => void;
  onLinearPattern: () => void;
  onHalf: () => void;
  onSDM: () => void;
  onFunction: () => void;
}) => {
  return (
    <div 
      className="grid w-full h-full"
      style={{
        gridTemplateRows: '1fr 1fr',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '6%',
      }}
    >
      {/* Top row */}
      <DROButtonV2 onClick={onToolOffset} variant="dark" size="lg">
        <Target className="w-[1rem] h-[1rem] text-white" />
      </DROButtonV2>
      <DROButtonV2 onClick={onBoltCircle} variant="dark" size="lg">
        <div 
          className="border-2 border-white rounded-full flex items-center justify-center"
          style={{ width: '1rem', height: '1rem' }}
        >
          <div className="bg-white rounded-full" style={{ width: '0.25rem', height: '0.25rem' }} />
        </div>
      </DROButtonV2>
      <DROButtonV2 onClick={onLinearPattern} variant="dark" size="lg">
        <Ruler className="w-[1rem] h-[1rem] text-white" />
      </DROButtonV2>
      <DROButtonV2 onClick={() => {}} variant="dark" size="lg">
        <Settings className="w-[1rem] h-[1rem] text-white" />
      </DROButtonV2>
      
      {/* Bottom row */}
      <DROButtonV2 onClick={() => {}} variant="dark" size="lg">
        <Grid3X3 className="w-[1rem] h-[1rem] text-white" />
      </DROButtonV2>
      <DROButtonV2 onClick={onHalf} variant="dark" size="lg">
        <span className="text-[0.875rem] font-bold text-white">½</span>
      </DROButtonV2>
      <DROButtonV2 onClick={onSDM} variant="dark" size="lg">
        <span className="text-[0.4375rem] font-bold text-white">SDM</span>
      </DROButtonV2>
      <DROButtonV2 onClick={onFunction} variant="dark" size="lg">
        <span className="text-[0.75rem] text-white">f<sup>n</sup></span>
      </DROButtonV2>
    </div>
  );
};

export default FunctionButtonsV2;
