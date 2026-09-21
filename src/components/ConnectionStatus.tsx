import { useMillStore } from '../stores/millStore';

/**
 * Connection state shown beside the simulator, not on the faithful EL400 face.
 * The live status mirrors the mill store so adapter disconnects and reconnects
 * are announced without inventing a hardware-panel indicator.
 */
export function ConnectionStatus() {
  const controllerType = useMillStore((state) => state.millState.controllerType);
  const connected = useMillStore((state) => state.millState.connected);
  const isConnecting = useMillStore((state) => state.isConnecting);

  const isManual = controllerType === 'noop';
  const state = isManual
    ? 'manual'
    : isConnecting
      ? 'connecting'
      : connected
        ? 'connected'
        : 'disconnected';
  const label = isManual
    ? 'Machine connection: Manual input'
    : `Machine connection: ${state.charAt(0).toUpperCase()}${state.slice(1)}`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="connection-status"
      data-connection-state={state}
      className="mt-3 rounded border border-[#5a5a50] bg-[#efefe5] px-3 py-1.5 text-center text-sm font-semibold text-[#303028]"
    >
      {label}
    </div>
  );
}
