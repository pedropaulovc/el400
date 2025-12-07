import { useState, useCallback } from "react";
import AxisDisplay from "./AxisDisplay";
import AxisPanel from "./AxisPanel";
import NumericKeypad from "./NumericKeypad";
import FunctionButtons, { SecondaryFunctionButtons } from "./FunctionButtons";
import LEDIndicator from "./LEDIndicator";
import { toast } from "sonner";

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

  const handleHome = () => {
    setAxisValues({ X: 0, Y: 0, Z: 0 });
    toast('All axes homed');
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

  return (
    <div 
      className="relative p-6 rounded-lg select-none"
      style={{
        background: 'linear-gradient(145deg, #4a4a4a 0%, #3a3a3a 50%, #2a2a2a 100%)',
        boxShadow: `
          0 20px 60px rgba(0,0,0,0.5),
          inset 0 2px 4px rgba(255,255,255,0.1),
          inset 0 -2px 4px rgba(0,0,0,0.3)
        `,
        minWidth: '720px',
      }}
    >
      {/* Brand Logo */}
      <div className="absolute top-3 right-4 flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
          <div className="w-3 h-2 bg-white/50 rounded-full" />
        </div>
        <span className="text-cyan-400 font-bold text-sm tracking-wide">electronica</span>
      </div>

      <div className="flex gap-4">
        {/* Left side - Display Panel */}
        <div className="flex flex-col gap-2">
          {/* Main Display */}
          <div 
            className="p-4 rounded-sm"
            style={{
              background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.1)',
              minWidth: '320px',
            }}
          >
            <div className="flex flex-col gap-3">
              <AxisDisplay value={axisValues.X} axis="X" />
              <AxisDisplay value={axisValues.Y} axis="Y" />
              <AxisDisplay value={axisValues.Z} axis="Z" />
            </div>
            
            {/* LED Indicators */}
            <div className="flex gap-2 mt-4 px-2">
              {/* Mode Toggle Group */}
              <div role="radiogroup" aria-label="Positioning mode" className="flex gap-1">
                <LEDIndicator 
                  label="abs" 
                  isOn={isAbs} 
                  onClick={handleToggleAbs}
                  isInteractive
                  groupLabel="Absolute mode"
                />
                <LEDIndicator 
                  label="inc" 
                  isOn={!isAbs}
                  onClick={handleToggleAbs}
                  isInteractive
                  groupLabel="Incremental mode"
                />
              </div>
              
              {/* Units Toggle Group */}
              <div role="radiogroup" aria-label="Measurement units" className="flex gap-1 ml-2">
                <LEDIndicator 
                  label="inch" 
                  isOn={isInch}
                  onClick={handleToggleUnit}
                  isInteractive
                  groupLabel="Inches"
                />
                <LEDIndicator 
                  label="mm" 
                  isOn={!isInch}
                  onClick={handleToggleUnit}
                  isInteractive
                  groupLabel="Millimeters"
                />
              </div>
              
              {/* Status indicators */}
              <div className="flex gap-1 ml-2">
                <LEDIndicator label="Ø" isOn={false} />
                <LEDIndicator label="r" isOn={false} />
              </div>
            </div>
          </div>
        </div>

        {/* Middle - Axis Panel */}
        <AxisPanel 
          activeAxis={activeAxis}
          onAxisSelect={handleAxisSelect}
          onAxisZero={handleAxisZero}
        />

        {/* Right side - Keypad and Secondary Buttons */}
        <div className="flex flex-col gap-2">
          <NumericKeypad 
            onNumber={handleNumber}
            onClear={handleClear}
            onEnter={handleEnter}
            onSign={handleSign}
            onDecimal={handleDecimal}
            onArrow={handleArrow}
            onHome={handleHome}
          />
          <SecondaryFunctionButtons
            onToolOffset={() => toast('Tool offset')}
            onBoltCircle={() => toast('Bolt circle pattern')}
            onLinearPattern={() => toast('Linear pattern')}
            onHalf={() => {
              if (activeAxis) {
                setAxisValues(prev => ({
                  ...prev,
                  [activeAxis]: prev[activeAxis] / 2
                }));
                toast(`${activeAxis} halved`);
              } else {
                toast.error('Select an axis first');
              }
            }}
            onSDM={() => toast('Sub-datum mode')}
            onFunction={() => toast('Function menu')}
          />
        </div>
      </div>

      {/* Bottom section */}
      <div className="mt-4 flex items-start gap-4">
        {/* Power LED */}
        <div className="flex items-center pt-3">
          <div className="w-3 h-3 rounded-full bg-red-500 led-on" />
        </div>
        
        {/* Function Buttons */}
        <FunctionButtons 
          isInch={isInch}
          isAbs={isAbs}
          onToggleUnit={handleToggleUnit}
          onSettings={() => toast('Settings')}
          onCalibrate={() => toast('Calibration mode')}
          onCenter={() => toast('Center find mode')}
          onZeroAll={handleZeroAll}
        />
      </div>

      {/* Input Buffer Display */}
      {inputBuffer && activeAxis && (
        <div 
          className="absolute bottom-8 left-20 px-2 py-1 rounded text-sm font-mono"
          style={{
            color: 'hsl(120, 100%, 50%)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            textShadow: '0 0 8px hsl(120, 100%, 50%)'
          }}
        >
          {activeAxis}: {inputBuffer}_
        </div>
      )}
    </div>
  );
};

export default EL400Simulator;
