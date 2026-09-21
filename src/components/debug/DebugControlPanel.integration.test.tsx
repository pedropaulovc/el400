import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '../../tests/helpers/render-utils';
import { renderSimulator } from '../../tests/helpers/integration-test-utils';
import type { UserEvent } from '@testing-library/user-event';
import { DebugControlPanel } from './DebugControlPanel';
import { useMillStore } from '../../stores/millStore';
import { DebugMillAdapter } from '../../adapters/DebugMillAdapter';
import { createDefaultMillState } from '../../types/millState';
let activeAdapter: DebugMillAdapter | null = null;


async function renderDebugPanel() {
  const adapter = new DebugMillAdapter();
  activeAdapter = adapter;
  const view = await renderSimulator({ millSource: 'noop' });

  useMillStore.setState({
    millState: { ...createDefaultMillState('debug'), connected: true },
    connection: adapter,
    isConnecting: false,
    error: null,
  });
  void adapter.connect();
  view.rerender(<DebugControlPanel />);

  return {
    ...view,
    server: adapter.getServer(),
  };
}

async function setPhysicalPosition(
  user: UserEvent,
  axis: 'x' | 'y' | 'z',
  value: string,
) {
  const input = screen.getByTestId(`debug-position-input-${axis}`);
  await user.clear(input);
  await user.type(input, value);
  await user.click(screen.getByTestId(`debug-position-submit-${axis}`));
}
afterEach(() => {
  activeAdapter?.disconnect();
  activeAdapter = null;
});


describe('DebugControlPanel Integration', () => {

  describe('Debug Mode', () => {

    it('updates position when jog button is clicked', async () => {
      const { server, user } = await renderDebugPanel();

      await user.click(screen.getByTestId('jog-x-positive'));

      const state = server.getState();
      expect(state.position.x).toBe(1);
    });

    it('sets precise physical-mm positions independently with accessible controls', async () => {
      const { server, user } = await renderDebugPanel();
      const xInput = screen.getByTestId('debug-position-input-x');
      const xSubmit = screen.getByTestId('debug-position-submit-x');
      expect(xInput).toHaveAccessibleName('Set X position in millimetres');
      expect(xSubmit).toHaveAccessibleName('Set X position');

      await setPhysicalPosition(user, 'x', '12.3456');
      expect(server.getState().position).toEqual({ x: 12.3456, y: 0, z: 0 });

      await setPhysicalPosition(user, 'z', '-98.7654');
      expect(server.getState().position).toEqual({
        x: 12.3456,
        y: 0,
        z: -98.7654,
      });
    });

    it('toggles probe state when probe button is clicked', async () => {
      const { server, user } = await renderDebugPanel();

      await user.click(screen.getByTestId('probe-toggle'));

      const state = server.getState();
      expect(state.probeState).toBe('P');
    });

    it('resets position to origin when reset button is clicked', async () => {
      const { server, user } = await renderDebugPanel();

      await user.click(screen.getByTestId('jog-x-positive'));
      expect(server.getState().position.x).toBe(1);

      await user.click(screen.getByTestId('jog-reset'));

      const state = server.getState();
      expect(state.position.x).toBe(0);
      expect(state.position.y).toBe(0);
      expect(state.position.z).toBe(0);
    });
  });

  describe('Non-debug Mode', () => {
    it('shows unavailable message when not in debug mode', () => {
      render(<DebugControlPanel />);

      expect(screen.getByText(/Debug Panel Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/\?source=debug/i)).toBeInTheDocument();
    });
  });
});
