import { useDROStore } from '../stores/droStore';
import { useAuxiliaryTransport } from '../stores/auxiliaryTransport';
import { useSettingsStore } from '../stores/settingsStore';

/** Explicit simulator I/O boundary: no physical output-pin emulation is claimed. */
export function AuxiliaryIOPanel() {
  const data = useDROStore((state) => state.stateData);
  const stateName = useDROStore((state) => state.stateName);
  const program = useDROStore((state) => state.vMem.outputProgram);
  const count = useDROStore((state) => state.vMem.outputCount);
  const countingMode = useSettingsStore((state) => state.nvMem.countingMode);
  const transport = useAuxiliaryTransport();
  return (
    <section aria-label="Auxiliary I/O" className="rounded border border-gray-500 bg-gray-900 p-3 text-sm text-white">
      <h2 className="font-bold">Auxiliary I/O</h2>
      <p>Logical outputs only; no physical pins. Pulse visualization: 1 second.</p>
      <ol aria-label="Six logical outputs">
        {program.map((entry, index) => (
          <li key={index} data-testid={`output-${String(index + 1)}`}>
            Output {index + 1}: <output>{stateName === 'six-output-run' && data.stateDataType === 'six-output' ? data.outputs[index] : 'low'}</output>
            {' — '}{entry.axis} {entry.positionMm} {countingMode[entry.axis] === 'angular' ? '°' : 'mm'}{index >= count ? ' (outside program count)' : ''}
          </li>
        ))}
      </ol>
      <h3 className="mt-3 font-bold">Serial terminal</h3>
      <p>9600 baud · 8 data bits · no parity · 1 stop bit · no flow control.</p>
      <p>Continuous simulator sample interval: 250 ms. Virtual delivery is not physical transmission.</p>
      <p role="status">Serial connection: {transport.connection}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="virtual-serial-connect" onClick={() => { void transport.connectVirtual(); }}>Connect virtual receiver</button>
        <button type="button" onClick={() => { void transport.connectPhysical(); }}>Connect physical serial port</button>
        <button type="button" data-testid="serial-disconnect" onClick={() => { void transport.disconnect(); }}>Disconnect serial</button>
        <button type="button" onClick={transport.clearTerminal}>Clear terminal</button>
      </div>
      <label>
        <input type="checkbox" data-testid="serial-failure" checked={transport.failure === 'on'} onChange={(event) => { transport.setFailure(event.target.checked ? 'on' : 'off'); }} />
        Simulate virtual receiver failure
      </label>
      {transport.error && <p role="alert">{transport.error}</p>}
      <pre data-testid="serial-terminal" aria-label="Transmitted serial records" className="max-h-48 overflow-auto whitespace-pre-wrap">{transport.terminal.join('\n')}</pre>
    </section>
  );
}
