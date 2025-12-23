import { useState, useCallback } from 'react';
import { CncjsMillAdapter } from '../../adapters/CncjsMillAdapter';
import { useMillStore } from '../../stores/millStore';
import { DebugJogControls } from './DebugJogControls';
import { DebugProbeControl } from './DebugProbeControl';
import { DebugEventLog, type LogEntry } from './DebugEventLog';

interface DebugControlPanelProps {
  onClose?: () => void;
}

export function DebugControlPanel({ onClose }: DebugControlPanelProps) {
  const millStore = useMillStore();
  const millState = millStore.millState;
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);

  const addLogEntry = useCallback((type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setEventLog(prev => [...prev, { timestamp, type, message }]);
  }, []);

  // Type guard: only works with CncjsMillAdapter in local mode
  const adapter = millStore.connection;
  if (!(adapter instanceof CncjsMillAdapter)) {
    return (
      <div className="fixed right-4 top-0 h-full w-96 bg-gray-900 text-white shadow-xl overflow-y-auto p-6">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-yellow-500 text-6xl mb-4">⚠</div>
          <h2 className="text-xl font-bold mb-2">Debug Panel Unavailable</h2>
          <p className="text-gray-400 mb-4">
            Debug panel only available in debug mode.
          </p>
          <p className="text-sm text-gray-500 font-mono">
            Add <code className="bg-gray-800 px-2 py-1 rounded">?source=debug</code> to URL
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  // After instanceof check, TypeScript knows adapter is CncjsMillAdapter
  const server = adapter.getLocalServer();
  if (!server) {
    return (
      <div className="fixed right-4 top-0 h-full w-96 bg-gray-900 text-white shadow-xl overflow-y-auto p-6">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-yellow-500 text-6xl mb-4">⚠</div>
          <h2 className="text-xl font-bold mb-2">Debug Panel Unavailable</h2>
          <p className="text-gray-400 mb-4">
            Debug panel only available in debug mode.
          </p>
          <p className="text-sm text-gray-500 font-mono">
            Add <code className="bg-gray-800 px-2 py-1 rounded">?source=debug</code> to URL
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
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

    addLogEntry('success', `Jog ${axis.toUpperCase()}${delta > 0 ? '+' : '-'}${Math.abs(delta).toFixed(3)} to ${newValue.toFixed(3)}`);
    server.moveRelative(axis, delta);
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

  return (
    <div className="fixed right-4 top-0 h-full w-96 bg-gray-900 text-white shadow-xl overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between z-10">
        <h2 className="text-xl font-bold">Debug Controls</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Position Display */}
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Current Position</h3>
          <div className="font-mono text-lg space-y-1">
            <div className="flex justify-between">
              <span className="text-blue-400">X:</span>
              <span className="text-white">{millState.position.x.toFixed(3)} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">Y:</span>
              <span className="text-white">{millState.position.y.toFixed(3)} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">Z:</span>
              <span className="text-white">{millState.position.z.toFixed(3)} mm</span>
            </div>
          </div>
        </div>

        {/* Jog Controls */}
        <DebugJogControls onJog={handleJog} onReset={handleReset} />

        {/* Probe Control */}
        <DebugProbeControl
          probeTriggered={millState.probe.triggered}
          onToggle={handleProbeToggle}
        />

        {/* Event Log */}
        <DebugEventLog entries={eventLog} maxEntries={100} />
      </div>
    </div>
  );
}
