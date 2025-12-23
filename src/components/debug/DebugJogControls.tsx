import { useState } from 'react';

interface DebugJogControlsProps {
  onJog: (axis: 'x' | 'y' | 'z', delta: number) => void;
  onReset: () => void;
}

export function DebugJogControls({ onJog, onReset }: DebugJogControlsProps) {
  const [stepSize, setStepSize] = useState({ x: 1, y: 1, z: 1 });

  const handleStepChange = (axis: 'x' | 'y' | 'z', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setStepSize(prev => ({ ...prev, [axis]: numValue }));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Jog Controls</h3>

      {/* X Axis */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">X Axis</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={stepSize.x}
              onChange={(e) => { handleStepChange('x', e.target.value); }}
              className="w-20 px-2 py-1 bg-gray-800 text-white border border-gray-600 rounded text-sm"
              min="0.001"
              step="0.1"
            />
            <span className="text-xs text-gray-400">mm</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { onJog('x', -stepSize.x); }}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            data-testid="jog-x-negative"
          >
            X-
          </button>
          <button
            onClick={() => { onJog('x', stepSize.x); }}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            data-testid="jog-x-positive"
          >
            X+
          </button>
        </div>
      </div>

      {/* Y Axis */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Y Axis</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={stepSize.y}
              onChange={(e) => { handleStepChange('y', e.target.value); }}
              className="w-20 px-2 py-1 bg-gray-800 text-white border border-gray-600 rounded text-sm"
              min="0.001"
              step="0.1"
            />
            <span className="text-xs text-gray-400">mm</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { onJog('y', -stepSize.y); }}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
            data-testid="jog-y-negative"
          >
            Y-
          </button>
          <button
            onClick={() => { onJog('y', stepSize.y); }}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
            data-testid="jog-y-positive"
          >
            Y+
          </button>
        </div>
      </div>

      {/* Z Axis */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Z Axis</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={stepSize.z}
              onChange={(e) => { handleStepChange('z', e.target.value); }}
              className="w-20 px-2 py-1 bg-gray-800 text-white border border-gray-600 rounded text-sm"
              min="0.001"
              step="0.1"
            />
            <span className="text-xs text-gray-400">mm</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { onJog('z', -stepSize.z); }}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors"
            data-testid="jog-z-negative"
          >
            Z-
          </button>
          <button
            onClick={() => { onJog('z', stepSize.z); }}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors"
            data-testid="jog-z-positive"
          >
            Z+
          </button>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
        data-testid="jog-reset"
      >
        Reset to Origin
      </button>
    </div>
  );
}
