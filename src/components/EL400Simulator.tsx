import { useState, useCallback } from "react";
import { toast } from "sonner";
import BrandLogo from "./BrandLogo";
import DisplayPanel from "./DisplayPanel";
import AxisPanelSection from "./AxisPanelSection";
import KeypadSection from "./KeypadSection";
import PrimaryFunctionSection from "./PrimaryFunctionSection";
import SecondaryFunctionSection from "./SecondaryFunctionSection";
import InputBufferDisplay from "./InputBufferDisplay";

interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

const EL400Simulator = () => {
  const [axisValues, setAxisValues] = useState<AxisValues>({
    X: 27.0302,
    Y: -8.4244,
    Z: 82.0990,
  });
  
  const [activeAxis, setActiveAxis] = useState<'X' | 'Y' | 'Z' | null>(null);
  const [isAbs, setIsAbs] = useState(true);
  const [isInch, setIsInch] = useState(true);
  const [inputBuffer, setInputBuffer] = useState('');

  const handleAxisSelect = (axis: 'X' | 'Y' | 'Z') => {
    setActiveAxis(axis);
    setInputBuffer('');
    toast(`Axis ${axis} selected`);
  };

  const handleAxisZero = (axis: 'X' | 'Y' | 'Z') => {
    setAxisValues(prev => ({ ...prev, [axis]: 0 }));
    toast(`Axis ${axis} zeroed`);
  };

  const handleNumber = useCallback((num: string) => {
    if (!activeAxis) {
      toast.error('Select an axis first');
      return;
    }
    setInputBuffer(prev => prev + num);
  }, [activeAxis]);

  const handleDecimal = useCallback(() => {
    if (!activeAxis) {
      toast.error('Select an axis first');
      return;
    }
    if (!inputBuffer.includes('.')) {
      setInputBuffer(prev => prev + '.');
    }
  }, [activeAxis, inputBuffer]);

  const handleSign = useCallback(() => {
    if (!activeAxis) {
      toast.error('Select an axis first');
      return;
    }
    setInputBuffer(prev => {
      if (prev.startsWith('-')) {
        return prev.slice(1);
      }
      return '-' + prev;
    });
  }, [activeAxis]);

  const handleClear = useCallback(() => {
    setInputBuffer('');
    toast('Input cleared');
  }, []);

  const handleEnter = useCallback(() => {
    if (!activeAxis || !inputBuffer) {
      return;
    }
    const value = parseFloat(inputBuffer);
    if (!isNaN(value)) {
      setAxisValues(prev => ({ ...prev, [activeAxis]: value }));
      toast(`${activeAxis} set to ${value}`);
    }
    setInputBuffer('');
  }, [activeAxis, inputBuffer]);

  const handleArrow = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!activeAxis) return;
    const delta = direction === 'up' || direction === 'right' ? 0.001 : -0.001;
    setAxisValues(prev => ({
      ...prev,
      [activeAxis]: prev[activeAxis] + delta
    }));
  };

  const handleToggleUnit = () => {
    setIsInch(!isInch);
    toast(`Units: ${!isInch ? 'Inches' : 'Millimeters'}`);
  };

  const handleZeroAll = () => {
    setAxisValues({ X: 0, Y: 0, Z: 0 });
    toast('All axes zeroed');
  };

  const handleToggleAbs = () => {
    setIsAbs(!isAbs);
    toast(`Mode: ${!isAbs ? 'Absolute' : 'Incremental'}`);
  };

  const handleHalf = () => {
    if (activeAxis) {
      setAxisValues(prev => ({
        ...prev,
        [activeAxis]: prev[activeAxis] / 2
      }));
      toast(`${activeAxis} halved`);
    } else {
      toast.error('Select an axis first');
    }
  };

  return (
    <div 
      className="relative p-8 rounded-lg select-none"
      style={{
        background: 'linear-gradient(160deg, #5a5a5a 0%, #404040 20%, #353535 50%, #2a2a2a 80%, #1a1a1a 100%)',
        boxShadow: `
          0 25px 80px rgba(0,0,0,0.6),
          0 8px 32px rgba(0,0,0,0.4),
          inset 0 1px 0 rgba(255,255,255,0.15),
          inset 0 -1px 0 rgba(0,0,0,0.4)
        `,
        minWidth: '780px',
      }}
    >
      {/* Outer beveled border effect */}
      <div 
        className="absolute inset-2 rounded pointer-events-none"
        style={{
          boxShadow: `
            inset 2px 2px 4px rgba(0,0,0,0.4),
            inset -2px -2px 4px rgba(255,255,255,0.08)
          `,
        }}
      />

      <BrandLogo />

      <div className="flex gap-5 items-stretch">
        <DisplayPanel 
          axisValues={axisValues}
          isAbs={isAbs}
          isInch={isInch}
          onToggleAbs={handleToggleAbs}
          onToggleUnit={handleToggleUnit}
        />

        <AxisPanelSection 
          activeAxis={activeAxis}
          onAxisSelect={handleAxisSelect}
          onAxisZero={handleAxisZero}
        />

        <KeypadSection 
          onNumber={handleNumber}
          onClear={handleClear}
          onEnter={handleEnter}
          onSign={handleSign}
          onDecimal={handleDecimal}
          onArrow={handleArrow}
        />
      </div>

      {/* Bottom section */}
      <div className="mt-5 flex items-end gap-5">
        <PrimaryFunctionSection 
          isInch={isInch}
          isAbs={isAbs}
          onToggleUnit={handleToggleUnit}
          onSettings={() => toast('Settings')}
          onCalibrate={() => toast('Calibration mode')}
          onCenter={() => toast('Center find mode')}
          onZeroAll={handleZeroAll}
        />

        <SecondaryFunctionSection
          onToolOffset={() => toast('Tool offset')}
          onBoltCircle={() => toast('Bolt circle pattern')}
          onLinearPattern={() => toast('Linear pattern')}
          onHalf={handleHalf}
          onSDM={() => toast('Sub-datum mode')}
          onFunction={() => toast('Function menu')}
        />
      </div>

      <InputBufferDisplay activeAxis={activeAxis} inputBuffer={inputBuffer} />
    </div>
  );
};

export default EL400Simulator;
