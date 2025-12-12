import { useState, useCallback } from "react";
import BrandLogo from "./BrandLogo";
import HousingEdge from "./HousingEdge";
import DisplayPanel from "./DisplayPanel";
import AxisPanelSection from "./AxisPanelSection";
import KeypadSection from "./KeypadSection";
import PrimaryFunctionSection from "./PrimaryFunctionSection";
import SecondaryFunctionSection from "./SecondaryFunctionSection";

interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

const noop = () => {};

const EL400Simulator = () => {
  const [axisValues, setAxisValues] = useState<AxisValues>({
    X: 0,
    Y: 0,
    Z: 0,
  });
  
  const [activeAxis, setActiveAxis] = useState<'X' | 'Y' | 'Z' | null>(null);
  const [isAbs, setIsAbs] = useState(true);
  const [isInch, setIsInch] = useState(true);
  const [inputBuffer, setInputBuffer] = useState('');

  const handleAxisSelect = (axis: 'X' | 'Y' | 'Z') => {
    setActiveAxis(axis);
    setInputBuffer('');
  };

  const handleAxisZero = (axis: 'X' | 'Y' | 'Z') => {
    setAxisValues(prev => ({ ...prev, [axis]: 0 }));
  };

  const handleNumber = useCallback((num: string) => {
    if (!activeAxis) {
      return;
    }
    setInputBuffer(prev => prev + num);
  }, [activeAxis]);

  const handleDecimal = useCallback(() => {
    if (!activeAxis) {
      return;
    }
    if (!inputBuffer.includes('.')) {
      setInputBuffer(prev => prev + '.');
    }
  }, [activeAxis, inputBuffer]);

  const handleSign = useCallback(() => {
    if (!activeAxis) {
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
  }, []);

  const handleEnter = useCallback(() => {
    if (!activeAxis || !inputBuffer) {
      return;
    }
    const value = parseFloat(inputBuffer);
    if (!isNaN(value)) {
      setAxisValues(prev => ({ ...prev, [activeAxis]: value }));
    }
    setInputBuffer('');
  }, [activeAxis, inputBuffer]);


  const handleToggleUnit = () => {
    setIsInch(!isInch);
  };

  const handleZeroAll = () => {
    setAxisValues({ X: 0, Y: 0, Z: 0 });
  };

  const handleToggleAbs = () => {
    setIsAbs(!isAbs);
  };

  const handleHalf = () => {
    if (activeAxis) {
      setAxisValues(prev => ({
        ...prev,
        [activeAxis]: prev[activeAxis] / 2
      }));
    }
  };

  return (
    <div 
      className="relative rounded-2xl select-none overflow-hidden"
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
      {/* Top raised edge */}
      <HousingEdge position="top" />

      {/* Main content area */}
      <div className="px-14 pb-2 pt-4">
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
          />
        </div>

        {/* Bottom section */}
        <div className="mt-5 flex items-end justify-between">
          <PrimaryFunctionSection 
            isInch={isInch}
            isAbs={isAbs}
            onToggleUnit={handleToggleUnit}
            onSettings={noop}
            onCalibrate={noop}
            onCenter={noop}
            onZeroAll={handleZeroAll}
          />

          <SecondaryFunctionSection
            onToolOffset={noop}
            onBoltCircle={noop}
            onLinearPattern={noop}
            onHalf={handleHalf}
            onSDM={noop}
            onFunction={noop}
          />
        </div>

        
      </div>

      {/* Bottom raised edge */}
      <HousingEdge position="bottom" />
    </div>
  );
};

export default EL400Simulator;
