import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ConnectionStatus } from './ConnectionStatus';
import { useMillStore } from '../stores/millStore';
import { createDefaultMillState } from '../types/millState';

function setConnectionState(
  controllerType: 'cncjs' | 'debug' | 'noop',
  connected: boolean,
  isConnecting = false,
) {
  act(() => {
    useMillStore.setState({
      millState: {
        ...createDefaultMillState(controllerType),
        connected,
      },
      isConnecting,
      error: null,
    });
  });
}

describe('ConnectionStatus', () => {
  beforeEach(() => {
    setConnectionState('noop', false);
  });

  it('announces the live external connection state', () => {
    setConnectionState('cncjs', false, true);
    const { rerender } = render(<ConnectionStatus />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Machine connection: Connecting');
    expect(status).toHaveAttribute('data-connection-state', 'connecting');

    setConnectionState('cncjs', true);
    rerender(<ConnectionStatus />);
    expect(status).toHaveTextContent('Machine connection: Connected');
    expect(status).toHaveAttribute('data-connection-state', 'connected');

    setConnectionState('cncjs', false);
    rerender(<ConnectionStatus />);
    expect(status).toHaveTextContent('Machine connection: Disconnected');
    expect(status).toHaveAttribute('data-connection-state', 'disconnected');
  });

  it('distinguishes manual input from a failed external connection', () => {
    render(<ConnectionStatus />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Machine connection: Manual input');
    expect(status).toHaveAttribute('data-connection-state', 'manual');
  });
});
