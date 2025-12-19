/**
 * No-op mill connection - an implementation that never emits events.
 * Used when no external data source is configured.
 */

import type { Dispatch } from 'react';
import type { MillConnection } from './MillConnection';
import type { MillState, MillStateListener } from '../types/millState';
import type { DROEventPayload } from '../dro-state-machine/droStateMachine';
import { createDefaultMillState } from '../types/millState';

/**
 * A no-op implementation of MillConnection that represents no external connection.
 * Always reports as connected with position at origin, but never emits updates.
 */
export class NoOpMillConnection implements MillConnection {
  readonly controllerType = 'noop' as const;
  private readonly state: MillState;

  constructor() {
    this.state = {
      ...createDefaultMillState('noop'),
      connected: true,
    };
  }

  async connect(): Promise<void> {
    // No-op - always "connected"
  }

  disconnect(): void {
    // No-op
  }

  subscribe(listener: MillStateListener): () => void {
    // Emit initial state once, then never again
    listener(this.state);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  }

  getState(): MillState {
    return this.state;
  }

  setDispatch(_dispatch: Dispatch<DROEventPayload> | null): void {
    // No-op - never dispatches events
  }
}
