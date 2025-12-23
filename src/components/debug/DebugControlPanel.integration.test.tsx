import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DebugControlPanel } from './DebugControlPanel';
import { useMillStore } from '../../stores/millStore';
import { CncjsMillAdapter } from '../../adapters/CncjsMillAdapter';
import { LocalSocketIOServer } from '../../adapters/LocalSocketIOServer';
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

  describe('Position Display', () => {
    it('displays current position from mill state', () => {
      renderDebugPanel();

      expect(screen.getByText(/Current Position/i)).toBeInTheDocument();
      expect(screen.getByText(/0.000 mm/i)).toBeInTheDocument(); // Initial position
    });

    it('updates position display when jog controls are used', async () => {
      const user = userEvent.setup({ delay: null });
      renderDebugPanel();

      // Jog X axis
      await user.click(screen.getByTestId('jog-x-positive'));

      // Advance timers to allow state broadcast
      vi.advanceTimersByTime(200);

      await waitFor(() => {
        expect(screen.getByText(/1.000 mm/i)).toBeInTheDocument();
      });
    });
  });

  describe('Jog Controls', () => {
    it('jogs X axis positive', async () => {
      const user = userEvent.setup({ delay: null });
      const { localServer } = renderDebugPanel();

      await user.click(screen.getByTestId('jog-x-positive'));
      vi.advanceTimersByTime(200);

      const state = localServer.getState();
      expect(state.position.x).toBe(1);
      expect(state.position.y).toBe(0);
      expect(state.position.z).toBe(0);
    });

    it('jogs X axis negative', async () => {
      const user = userEvent.setup({ delay: null });
      const { localServer } = renderDebugPanel();

      await user.click(screen.getByTestId('jog-x-negative'));
      vi.advanceTimersByTime(200);

      const state = localServer.getState();
      expect(state.position.x).toBe(-1);
      expect(state.position.y).toBe(0);
      expect(state.position.z).toBe(0);
    });

    it('jogs Y axis positive', async () => {
      const user = userEvent.setup({ delay: null });
      const { localServer } = renderDebugPanel();

      await user.click(screen.getByTestId('jog-y-positive'));
      vi.advanceTimersByTime(200);

      const state = localServer.getState();
      expect(state.position.x).toBe(0);
      expect(state.position.y).toBe(1);
      expect(state.position.z).toBe(0);
    });

    it('jogs Y axis negative', async () => {
      const user = userEvent.setup({ delay: null });
      const { localServer } = renderDebugPanel();

      await user.click(screen.getByTestId('jog-y-negative'));
      vi.advanceTimersByTime(200);

      const state = localServer.getState();
      expect(state.position.x).toBe(0);
      expect(state.position.y).toBe(-1);
      expect(state.position.z).toBe(0);
    });

    it('jogs Z axis positive', async () => {
      const user = userEvent.setup({ delay: null });
      const { localServer } = renderDebugPanel();

      await user.click(screen.getByTestId('jog-z-positive'));
      vi.advanceTimersByTime(200);

      const state = localServer.getState();
      expect(state.position.x).toBe(0);
      expect(state.position.y).toBe(0);
      expect(state.position.z).toBe(1);
    });

    it('jogs Z axis negative', async () => {
      const user = userEvent.setup({ delay: null });
      const { localServer } = renderDebugPanel();

      await user.click(screen.getByTestId('jog-z-negative'));
      vi.advanceTimersByTime(200);

      const state = localServer.getState();
      expect(state.position.x).toBe(0);
      expect(state.position.y).toBe(0);
      expect(state.position.z).toBe(-1);
    });

    it('accumulates multiple jog operations', async () => {
      const user = userEvent.setup({ delay: null });
      const { localServer } = renderDebugPanel();

      await user.click(screen.getByTestId('jog-x-positive'));
      vi.advanceTimersByTime(50);
      await user.click(screen.getByTestId('jog-x-positive'));
      vi.advanceTimersByTime(50);
      await user.click(screen.getByTestId('jog-y-positive'));
      vi.advanceTimersByTime(100);

      const state = localServer.getState();
      expect(state.position.x).toBe(2);
      expect(state.position.y).toBe(1);
      expect(state.position.z).toBe(0);
    });
  });

  describe('Reset Button', () => {
    it('resets all axes to origin', async () => {
      const user = userEvent.setup({ delay: null });
      const { localServer } = renderDebugPanel();

      // Move to a position
      await user.click(screen.getByTestId('jog-x-positive'));
      await user.click(screen.getByTestId('jog-y-positive'));
      await user.click(screen.getByTestId('jog-z-positive'));
      vi.advanceTimersByTime(200);

      let state = localServer.getState();
      expect(state.position.x).toBe(1);
      expect(state.position.y).toBe(1);
      expect(state.position.z).toBe(1);

      // Reset
      await user.click(screen.getByTestId('jog-reset'));
      vi.advanceTimersByTime(200);

      state = localServer.getState();
      expect(state.position.x).toBe(0);
      expect(state.position.y).toBe(0);
      expect(state.position.z).toBe(0);
    });

    it('clears probe state on reset', async () => {
      const user = userEvent.setup({ delay: null });
      const { localServer } = renderDebugPanel();

      // Trigger probe
      await user.click(screen.getByTestId('probe-toggle'));
      vi.advanceTimersByTime(200);

      let state = localServer.getState();
      expect(state.probeState).toBe('P');

      // Reset
      await user.click(screen.getByTestId('jog-reset'));
      vi.advanceTimersByTime(200);

      state = localServer.getState();
      expect(state.probeState).toBe('');
    });
  });

  describe('Probe Control', () => {
    it('triggers probe', async () => {
      const user = userEvent.setup({ delay: null });
      const { localServer } = renderDebugPanel();

      await user.click(screen.getByTestId('probe-toggle'));
      vi.advanceTimersByTime(200);

      const state = localServer.getState();
      expect(state.probeState).toBe('P');
    });

    it('clears probe', async () => {
      const user = userEvent.setup({ delay: null });
      const { localServer } = renderDebugPanel();

      // Trigger
      await user.click(screen.getByTestId('probe-toggle'));
      vi.advanceTimersByTime(100);

      // Clear
      await user.click(screen.getByTestId('probe-toggle'));
      vi.advanceTimersByTime(100);

      const state = localServer.getState();
      expect(state.probeState).toBe('');
    });

    it('updates probe indicator when triggered', async () => {
      const user = userEvent.setup({ delay: null });
      renderDebugPanel();

      const indicator = screen.getByTestId('probe-indicator');
      expect(indicator).toHaveClass('bg-gray-600');

      await user.click(screen.getByTestId('probe-toggle'));
      vi.advanceTimersByTime(200);

      await waitFor(() => {
        expect(indicator).toHaveClass('bg-green-500');
      });
    });
  });

  describe('Event Log', () => {
    it('displays event log container', () => {
      renderDebugPanel();
      expect(screen.getByTestId('event-log-container')).toBeInTheDocument();
    });

    it('logs position changes', async () => {
      const user = userEvent.setup({ delay: null });
      renderDebugPanel();

      await user.click(screen.getByTestId('jog-x-positive'));
      vi.advanceTimersByTime(200);

      await waitFor(() => {
        expect(screen.getAllByTestId('event-log-entry').length).toBeGreaterThan(0);
      });
    });

    it('logs probe state changes', async () => {
      const user = userEvent.setup({ delay: null });
      renderDebugPanel();

      await user.click(screen.getByTestId('probe-toggle'));
      vi.advanceTimersByTime(200);

      await waitFor(() => {
        expect(screen.getAllByTestId('event-log-entry').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Non-debug Mode', () => {
    it('shows error message when not in debug mode', () => {
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
