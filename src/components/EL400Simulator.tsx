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

      {/* Brand Logo */}
      <div className="absolute top-4 right-6 flex items-center gap-2">
        <div 
          className="px-3 py-1 rounded-sm"
          style={{
            background: 'linear-gradient(180deg, #f8f8f8 0%, #e0e0e0 100%)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
              <div className="w-2.5 h-1.5 bg-white/60 rounded-full" />
            </div>
            <span className="text-cyan-600 font-bold text-xs tracking-wide">electronica</span>
          </div>
        </div>
      </div>

      <div className="flex gap-5 items-stretch">
        {/* Left side - Display Panel with beveled frame */}
        <div className="flex flex-col" style={{ width: '358px' }}>
          {/* Beveled frame around display */}
          <div 
            className="p-1 rounded h-full w-full"
            style={{
              background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
              boxShadow: `
                inset 3px 3px 6px rgba(0,0,0,0.5),
                inset -1px -1px 2px rgba(255,255,255,0.05),
                2px 2px 4px rgba(0,0,0,0.3)
              `,
            }}
          >
            {/* Main Display */}
            <div 
              className="p-4 rounded-sm h-full flex flex-col w-full"
              style={{
                background: 'linear-gradient(180deg, #080808 0%, #030303 100%)',
                boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.9)',
              }}
            >
              <div className="flex flex-col gap-3 flex-1 justify-center">
                <AxisDisplay value={axisValues.X} axis="X" />
                <AxisDisplay value={axisValues.Y} axis="Y" />
                <AxisDisplay value={axisValues.Z} axis="Z" />
              </div>
              
              {/* LED Indicators */}
              <div className="flex justify-between mt-1 px-1">
                {/* Mode Toggle Group */}
                <div role="radiogroup" aria-label="Positioning mode" className="flex gap-4">
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
                <div role="radiogroup" aria-label="Measurement units" className="flex gap-4">
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
                <div className="flex gap-4">
                  <LEDIndicator label="Ø" isOn={false} />
                  <LEDIndicator label="r" isOn={false} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle - Axis Panel with beveled frame */}
        <div 
          className="p-1 rounded"
          style={{
            background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
            boxShadow: `
              inset 3px 3px 6px rgba(0,0,0,0.5),
              inset -1px -1px 2px rgba(255,255,255,0.05),
              2px 2px 4px rgba(0,0,0,0.3)
            `,
          }}
        >
          <AxisPanel 
            activeAxis={activeAxis}
            onAxisSelect={handleAxisSelect}
            onAxisZero={handleAxisZero}
          />
        </div>

        {/* Right side - Keypad with beveled frame */}
        <div 
          className="p-1 rounded"
          style={{
            background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
            boxShadow: `
              inset 3px 3px 6px rgba(0,0,0,0.5),
              inset -1px -1px 2px rgba(255,255,255,0.05),
              2px 2px 4px rgba(0,0,0,0.3)
            `,
          }}
        >
          <div 
            className="p-2 rounded-sm h-full flex items-center"
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
              onArrow={handleArrow}
            />
          </div>
        </div>
      </div>

      {/* Bottom section with beveled frame */}
      <div className="mt-5 flex items-end gap-4">
        {/* Function Buttons with beveled frame */}
        <div className="flex flex-col items-start gap-2" style={{ width: '358px' }}>
          <div 
            className="p-1 rounded w-full"
            style={{
              background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
              boxShadow: `
                inset 3px 3px 6px rgba(0,0,0,0.5),
                inset -1px -1px 2px rgba(255,255,255,0.05),
                2px 2px 4px rgba(0,0,0,0.3)
              `,
            }}
          >
            <div 
              className="p-2 rounded-sm w-full"
              style={{
                background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)',
              }}
            >
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
          </div>
          
          {/* Power LED with bezel - under wrench button */}
          <div 
            className="flex items-center justify-center w-6 h-6 rounded-full ml-3"
            style={{
              background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
              boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.05)',
            }}
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #ff6666 0%, #cc0000 50%, #990000 100%)',
                boxShadow: '0 0 8px 2px rgba(255,0,0,0.6), inset 0 -1px 2px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        </div>

        {/* Secondary Function Buttons with beveled frame - right aligned */}
        <div 
          className="ml-auto p-1 rounded"
          style={{
            background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
            boxShadow: `
              inset 3px 3px 6px rgba(0,0,0,0.5),
              inset -1px -1px 2px rgba(255,255,255,0.05),
              2px 2px 4px rgba(0,0,0,0.3)
            `,
          }}
        >
          <div 
            className="p-2 rounded-sm"
            style={{
              background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)',
            }}
          >
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
      </div>

      {/* Input Buffer Display */}
      {inputBuffer && activeAxis && (
        <div 
          className="absolute bottom-10 left-24 px-2 py-1 rounded text-sm font-mono"
          style={{
            color: 'hsl(120, 100%, 50%)',
            backgroundColor: 'rgba(0,0,0,0.9)',
            textShadow: '0 0 8px hsl(120, 100%, 50%)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          {activeAxis}: {inputBuffer}_
        </div>
      )}
    </div>
  );
};

export default EL400Simulator;
