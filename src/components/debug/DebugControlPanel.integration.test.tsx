import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DebugControlPanel } from './DebugControlPanel';
import { useMillStore } from '../../stores/millStore';
import { DebugMillAdapter } from '../../adapters/DebugMillAdapter';
import { NoOpMillAdapter } from '../../adapters/NoOpMillAdapter';
import { createDefaultMillState } from '../../types/millState';

function renderDebugPanel() {
  const adapter = new DebugMillAdapter();

  // Setup mill store with debug adapter
  useMillStore.setState({
    millState: { ...createDefaultMillState('debug'), connected: true },
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
    server: adapter.getServer(),
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

      // Header
      expect(screen.getByText('Axes')).toBeInTheDocument();

      // Position table headers
      expect(screen.getByText('Axis')).toBeInTheDocument();
      expect(screen.getByText('Position')).toBeInTheDocument();

      // Axis labels
      expect(screen.getByText('X')).toBeInTheDocument();
      expect(screen.getByText('Y')).toBeInTheDocument();
      expect(screen.getByText('Z')).toBeInTheDocument();

      // Probe control
      expect(screen.getByText(/Probe:/i)).toBeInTheDocument();

      // Jog buttons
      expect(screen.getByTestId('jog-x-positive')).toBeInTheDocument();
      expect(screen.getByTestId('jog-y-positive')).toBeInTheDocument();
      expect(screen.getByTestId('jog-z-positive')).toBeInTheDocument();
    });

    it('updates position when jog button is clicked', () => {
      const { server } = renderDebugPanel();

      // Click jog X+ button
      screen.getByTestId('jog-x-positive').click();

      // Advance timers past the broadcast interval
      vi.advanceTimersByTime(150);

      const state = server.getState();
      expect(state.position.x).toBe(1);
    });

    it('toggles probe state when probe button is clicked', () => {
      const { server } = renderDebugPanel();

      // Click probe toggle
      screen.getByTestId('probe-toggle').click();

      // Advance timers
      vi.advanceTimersByTime(150);

      const state = server.getState();
      expect(state.probeState).toBe('P');
    });

    it('resets position to origin when reset button is clicked', () => {
      const { server } = renderDebugPanel();

      // Move to a position first
      screen.getByTestId('jog-x-positive').click();
      vi.advanceTimersByTime(150);
      expect(server.getState().position.x).toBe(1);

      // Reset
      screen.getByTestId('jog-reset').click();
      vi.advanceTimersByTime(150);

      const state = server.getState();
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
