import { useCallback } from "react";
import NumericKeypad from "./NumericKeypad";
import BeveledFrame from "./BeveledFrame";
import { useVolatileMemory } from "../hooks/useVolatileMemory";
import { useInputBuffer } from "../hooks/useInputBuffer";

interface KeypadSectionProps {
  onClear: () => void; // For power-on dismiss
}

const KeypadSection = ({ onClear }: KeypadSectionProps) => {
  const vm = useVolatileMemory();
  const inputBuffer = useInputBuffer();

  const handleNumber = useCallback((num: string) => {
    if (!vm.activeAxis) {
      return;
    }
    inputBuffer.appendDigit(num);
  }, [vm.activeAxis, inputBuffer]);

  const handleDecimal = useCallback(() => {
    if (!vm.activeAxis) {
      return;
    }
    inputBuffer.appendDecimal();
  }, [vm.activeAxis, inputBuffer]);

  const handleSign = useCallback(() => {
    if (!vm.activeAxis) {
      return;
    }
    inputBuffer.toggleSign();
  }, [vm.activeAxis, inputBuffer]);

  const handleClear = useCallback(() => {
    inputBuffer.clear();
    onClear();
  }, [inputBuffer, onClear]);

  const handleEnter = useCallback(() => {
    if (!vm.activeAxis) {
      return;
    }
    const value = inputBuffer.getValue();
    if (value !== null) {
      vm.setAxisValue(vm.activeAxis, value);
      inputBuffer.clear();
    }
  }, [vm, inputBuffer]);

  return (
    <BeveledFrame>
      <div
        className="p-2 rounded-lg h-full flex items-center"
        style={{
          background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)',
        }}
      >
        <NumericKeypad
          onNumber={handleNumber}
          onClear={handleClear}
          onEnter={handleEnter}
          onSign={handleSign}
          onDecimal={handleDecimal}
        />
      </div>
    </BeveledFrame>
  );
};

export default KeypadSection;
