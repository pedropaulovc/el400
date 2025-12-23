import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DebugControlPanel } from './DebugControlPanel';
import { useMillStore } from '../../stores/millStore';
import { CncjsMillAdapter } from '../../adapters/CncjsMillAdapter';
import { LocalSocketIOServer } from '../../adapters/LocalSocketIOServer';
import { NoOpMillAdapter } from '../../adapters/NoOpMillAdapter';
import { createDefaultMillState } from '../../types/millState';

function renderDebugPanel() {
  const localServer = new LocalSocketIOServer();
  const adapter = new CncjsMillAdapter({ localServer });

  // Setup mill store with debug adapter
  useMillStore.setState({
    millState: { ...createDefaultMillState('cncjs'), connected: true },
    connection: adapter,
    isConnecting: false,
    error: null,
  });

  // Connect the adapter to get state updates
  void adapter.connect();

  return {
    ...render(
      <BrowserRouter>
        <DebugControlPanel />
      </BrowserRouter>
    ),
    localServer,
    adapter,
  };
}

describe('DebugControlPanel Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Debug Mode', () => {
    it('displays debug panel with position controls in debug mode', () => {
      renderDebugPanel();

      expect(screen.getByText(/Current Position/i)).toBeInTheDocument();
      expect(screen.getByText(/Jog Controls/i)).toBeInTheDocument();
      expect(screen.getByText(/Probe Control/i)).toBeInTheDocument();
      expect(screen.getByText(/Event Log/i)).toBeInTheDocument();
    });

    it('updates position when jog button is clicked', () => {
      const { localServer } = renderDebugPanel();

      // Click jog X+ button
      screen.getByTestId('jog-x-positive').click();

      // Advance timers past the broadcast interval
      vi.advanceTimersByTime(150);

      const state = localServer.getState();
      expect(state.position.x).toBe(1);
    });

    it('toggles probe state when probe button is clicked', () => {
      const { localServer } = renderDebugPanel();

      // Click probe toggle
      screen.getByTestId('probe-toggle').click();

      // Advance timers
      vi.advanceTimersByTime(150);

      const state = localServer.getState();
      expect(state.probeState).toBe('P');
    });

    it('resets position to origin when reset button is clicked', () => {
      const { localServer } = renderDebugPanel();

      // Move to a position first
      screen.getByTestId('jog-x-positive').click();
      vi.advanceTimersByTime(150);
      expect(localServer.getState().position.x).toBe(1);

      // Reset
      screen.getByTestId('jog-reset').click();
      vi.advanceTimersByTime(150);

      const state = localServer.getState();
      expect(state.position.x).toBe(0);
      expect(state.position.y).toBe(0);
      expect(state.position.z).toBe(0);
    });
  });

  describe('Non-debug Mode', () => {
    it('shows unavailable message when not in debug mode', () => {
      // Setup with NoOpMillAdapter (not debug mode)
      useMillStore.setState({
        millState: createDefaultMillState('noop'),
        connection: new NoOpMillAdapter(),
        isConnecting: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <DebugControlPanel />
        </BrowserRouter>
      );

      expect(screen.getByText(/Debug Panel Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/\?source=debug/i)).toBeInTheDocument();
    });
  });
});
