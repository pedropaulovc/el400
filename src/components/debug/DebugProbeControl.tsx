interface DebugProbeControlProps {
  probeTriggered: boolean;
  onToggle: () => void;
}

export function DebugProbeControl({ probeTriggered, onToggle }: DebugProbeControlProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-white">Probe Control</h3>

      <div className="flex items-center justify-between p-4 bg-gray-800 rounded">
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full ${
              probeTriggered ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
            }`}
            data-testid="probe-indicator"
          />
          <span className="text-sm text-gray-300">
            Probe Status: <span className="font-semibold text-white">
              {probeTriggered ? 'TRIGGERED' : 'Open'}
            </span>
          </span>
        </div>

        <button
          onClick={onToggle}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            probeTriggered
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
          data-testid="probe-toggle"
        >
          {probeTriggered ? 'Clear' : 'Trigger'}
        </button>
      </div>
    </div>
  );
}
