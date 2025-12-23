interface DebugProbeControlProps {
  probeTriggered: boolean;
  onToggle: () => void;
}

export function DebugProbeControl({ probeTriggered, onToggle }: DebugProbeControlProps) {
  return (
    <div className="border border-gray-300 rounded p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              probeTriggered ? 'bg-green-500' : 'bg-gray-300'
            }`}
            data-testid="probe-indicator"
          />
          <span className="text-sm text-gray-600">
            Probe: <span className={`font-medium ${probeTriggered ? 'text-green-600' : 'text-gray-500'}`}>
              {probeTriggered ? 'TRIGGERED' : 'Open'}
            </span>
          </span>
        </div>

        <button
          onClick={onToggle}
          className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
            probeTriggered
              ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
              : 'bg-green-50 text-green-600 border-green-300 hover:bg-green-100'
          }`}
          data-testid="probe-toggle"
        >
          {probeTriggered ? 'Clear' : 'Trigger'}
        </button>
      </div>
    </div>
  );
}
