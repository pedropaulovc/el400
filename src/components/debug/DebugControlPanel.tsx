import { useState, useCallback } from 'react';
import { CncjsMillAdapter } from '../../adapters/CncjsMillAdapter';
import { useMillStore } from '../../stores/millStore';
import { DebugProbeControl } from './DebugProbeControl';
import { DebugEventLog, type LogEntry } from './DebugEventLog';

interface DebugControlPanelProps {
  onClose?: () => void;
}

const STEP_SIZES = [0.001, 0.01, 0.1, 1] as const;

export function DebugControlPanel({ onClose }: DebugControlPanelProps) {
  const millStore = useMillStore();
  const millState = millStore.millState;
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const [stepSize, setStepSize] = useState(1);
  const [showLog, setShowLog] = useState(true);

  const addLogEntry = useCallback((type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setEventLog(prev => [...prev, { timestamp, type, message }]);
  }, []);

  // Type guard: only works with CncjsMillAdapter in local mode
  const adapter = millStore.connection;
  if (!(adapter instanceof CncjsMillAdapter)) {
    return (
      <div className="fixed right-0 top-0 h-full w-80 bg-white text-gray-800 shadow-xl border-l border-gray-300 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="text-yellow-500 text-4xl mb-3">⚠</div>
          <h2 className="text-lg font-bold mb-2">Debug Panel Unavailable</h2>
          <p className="text-gray-500 mb-3 text-sm">
            Debug panel only available in debug mode.
          </p>
          <p className="text-xs text-gray-400 font-mono">
            Add <code className="bg-gray-100 px-1.5 py-0.5 rounded">?source=debug</code> to URL
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-4 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  const server = adapter.getLocalServer();
  if (!server) {
    return (
      <div className="fixed right-0 top-0 h-full w-80 bg-white text-gray-800 shadow-xl border-l border-gray-300 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="text-yellow-500 text-4xl mb-3">⚠</div>
          <h2 className="text-lg font-bold mb-2">Debug Panel Unavailable</h2>
          <p className="text-gray-500 mb-3 text-sm">
            Debug panel only available in debug mode.
          </p>
          <p className="text-xs text-gray-400 font-mono">
            Add <code className="bg-gray-100 px-1.5 py-0.5 rounded">?source=debug</code> to URL
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-4 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleJog = (axis: 'x' | 'y' | 'z', delta: number) => {
    const currentPos = millState.position;
    const newValue = currentPos[axis] + delta;

    addLogEntry('success', `Jog ${axis.toUpperCase()}${delta > 0 ? '+' : '-'}${Math.abs(delta).toFixed(3)} → ${newValue.toFixed(3)}`);
    server.moveRelative(axis, delta);
  };

  const handleDiagonalJog = (xDelta: number, yDelta: number) => {
    const xSign = xDelta > 0 ? '+' : '-';
    const ySign = yDelta > 0 ? '+' : '-';
    addLogEntry('success', `Jog X${xSign}Y${ySign} (${Math.abs(xDelta).toFixed(3)})`);
    server.moveRelative('x', xDelta);
    server.moveRelative('y', yDelta);
  };

  const handleReset = () => {
    addLogEntry('warning', 'Reset to origin (0, 0, 0)');
    server.reset();
  };

  const handleProbeToggle = () => {
    const newState = !millState.probe.triggered;
    addLogEntry(newState ? 'success' : 'info', `Probe ${newState ? 'TRIGGERED' : 'cleared'}`);
    server.setProbe(newState);
  };

  const btnClass = "px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 active:bg-gray-200 text-gray-700 text-sm font-medium rounded transition-colors disabled:opacity-50";
  const btnPrimaryClass = "px-3 py-2 bg-gray-100 border border-gray-300 hover:bg-gray-200 active:bg-gray-300 text-gray-700 text-sm rounded transition-colors";

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white text-gray-800 shadow-xl border-l border-gray-300 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-100 border-b border-gray-300 px-3 py-2 flex items-center justify-between z-10">
        <span className="font-semibold text-gray-700">Axes</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowLog(!showLog); }}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
            title="Toggle Event Log"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Position Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs">
              <th className="text-left py-1 font-normal">Axis</th>
              <th className="text-right py-1 font-normal">Position</th>
              <th className="text-right py-1 font-normal w-16">Action</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <tr key={axis} className="border-t border-gray-200">
                <td className="py-2 font-bold text-lg text-gray-700">{axis.toUpperCase()}</td>
                <td className="py-2 text-right text-lg">
                  {millState.position[axis].toFixed(3)}
                  <span className="text-xs text-gray-400 ml-1">mm</span>
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => {
                      server.setPosition(axis, 0);
                      addLogEntry('info', `Zero ${axis.toUpperCase()}`);
                    }}
                    className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded"
                  >
                    Zero
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Jog Controls Grid - CNCjs Style with Diagonals */}
        <div className="space-y-1.5">
          {/* Row 1: X-Y+, Y+, X+Y+, Z+ */}
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={() => { handleDiagonalJog(-stepSize, stepSize); }}
              className={`${btnClass} text-xs`}
              title="X- Y+"
            >
              ↖
            </button>
            <button
              onClick={() => { handleJog('y', stepSize); }}
              className={btnClass}
              data-testid="jog-y-positive"
            >
              Y+
            </button>
            <button
              onClick={() => { handleDiagonalJog(stepSize, stepSize); }}
              className={`${btnClass} text-xs`}
              title="X+ Y+"
            >
              ↗
            </button>
            <button
              onClick={() => { handleJog('z', stepSize); }}
              className={btnClass}
              data-testid="jog-z-positive"
            >
              Z+
            </button>
            <div /> {/* Empty */}
          </div>

          {/* Row 2: X-, X/Y, X+, 0Z */}
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={() => { handleJog('x', -stepSize); }}
              className={btnClass}
              data-testid="jog-x-negative"
            >
              X-
            </button>
            <button
              onClick={handleReset}
              className={`${btnPrimaryClass} text-xs`}
              data-testid="jog-reset"
              title="Reset to Origin"
            >
              X/Y/Z
            </button>
            <button
              onClick={() => { handleJog('x', stepSize); }}
              className={btnClass}
              data-testid="jog-x-positive"
            >
              X+
            </button>
            <button
              onClick={() => {
                server.setPosition('z', 0);
                addLogEntry('info', 'Zero Z');
              }}
              className={btnPrimaryClass}
            >
              0Z
            </button>
            <div /> {/* Empty */}
          </div>

          {/* Row 3: X-Y-, Y-, X+Y-, Z- */}
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={() => { handleDiagonalJog(-stepSize, -stepSize); }}
              className={`${btnClass} text-xs`}
              title="X- Y-"
            >
              ↙
            </button>
            <button
              onClick={() => { handleJog('y', -stepSize); }}
              className={btnClass}
              data-testid="jog-y-negative"
            >
              Y-
            </button>
            <button
              onClick={() => { handleDiagonalJog(stepSize, -stepSize); }}
              className={`${btnClass} text-xs`}
              title="X+ Y-"
            >
              ↘
            </button>
            <button
              onClick={() => { handleJog('z', -stepSize); }}
              className={btnClass}
              data-testid="jog-z-negative"
            >
              Z-
            </button>
            <div /> {/* Empty */}
          </div>
        </div>

        {/* Step Size Selection */}
        <div className="flex gap-1">
          {STEP_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => { setStepSize(size); }}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded border transition-colors ${
                stepSize === size
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {size}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => { setStepSize(Math.max(0.001, stepSize / 10)); }}
              className="px-2 py-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-100 rounded"
            >
              −
            </button>
            <button
              onClick={() => { setStepSize(Math.min(100, stepSize * 10)); }}
              className="px-2 py-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-100 rounded"
            >
              +
            </button>
          </div>
        </div>

        {/* Probe Control - Compact */}
        <DebugProbeControl
          probeTriggered={millState.probe.triggered}
          onToggle={handleProbeToggle}
        />

        {/* Event Log - Collapsible */}
        {showLog && (
          <DebugEventLog entries={eventLog} maxEntries={50} />
        )}
      </div>
    </div>
  );
}
