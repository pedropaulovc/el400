/**
 * Live-mill test harness — deterministic MILL_STATE_CHANGED ("tick") infrastructure.
 *
 * WHY THIS EXISTS
 * ---------------
 * In production the DRO is driven by a live encoder: a connected mill adapter
 * broadcasts `MILL_STATE_CHANGED` continuously (every ~100ms under `?source=debug`
 * or a real CNCjs/mock controller). Most state-machine logic must treat those
 * ticks as no-ops — but several real bugs (US-046 diagnostics auto-skip, the
 * exit-latch disarm, the keyboard-echo blanking) existed precisely BECAUSE no
 * integration test ever ran against a ticking source: they all rendered against
 * the dead `NoOpMillAdapter`, so a whole class of tick-sensitivity was invisible.
 *
 * THE MODEL ("F": tick at the user boundary, deterministically)
 * -------------------------------------------------------------
 * `renderSimulator()` connects a LIVE, dispatch-wired mill by default, but with
 * its wall-clock interval DISABLED (`autoTick:false`). Ticks are emitted
 * deterministically instead of racing real time:
 *   - after EVERY interaction on the harness-owned `user` (see wrapUserWithTicks)
 *   - on demand via `emitMillTick()` / `emitPosition()`
 *   - in a controlled burst via `expectStableUnderTicks()` (for dwell states that
 *     receive ticks WITHOUT any user input — e.g. a diagnostics step).
 *
 * Every emission is wrapped in `act()`, so updates are flushed and assertions are
 * race-free. There is no free-running timer, so nothing is flaky.
 *
 * A test cannot accidentally become tick-blind: the tick is bound to the act of
 * interacting (the wrapped `user`), not to remembering a specific helper. Raw
 * `userEvent.setup()` in `*.integration.test.tsx` is banned by lint to keep it so.
 */
import { act, screen } from '@testing-library/react';
import { expect } from 'vitest';
import { initializeDROMillConnection } from '../../stores/droStore';
import { initializeMillStore } from '../../stores/millStore';
import { MockMillAdapter } from '../../adapters/MockMillAdapter';
import { registerMillTeardown } from './mill-teardown-registry';

let activeMill: MockMillAdapter | null = null;
let activeCleanup: (() => void) | null = null;

/**
 * Connect a live, dispatch-wired mill with NO wall-clock interval.
 * Mirrors the production wiring (initializeDROMillConnection + initializeMillStore)
 * so MILL_STATE_CHANGED travels the real adapter -> millStore -> droStore path.
 * Awaited inside act() so the connect handshake is fully flushed.
 */
export async function connectLiveMill(): Promise<MockMillAdapter> {
  initializeDROMillConnection();
  const mill = new MockMillAdapter({ autoTick: false });
  await act(async () => {
    activeCleanup = await initializeMillStore(mill);
  });
  activeMill = mill;
  return mill;
}

/** The live mill connected by renderSimulator. Throws if rendered with millSource:'noop'. */
export function getActiveMill(): MockMillAdapter {
  if (!activeMill) {
    throw new Error(
      'No active mill. renderSimulator connects one by default; this test used ' +
      "millSource:'noop'. Pass a mill explicitly or drop the opt-out."
    );
  }
  return activeMill;
}

/** True when a live mill is connected (millSource:'live'). */
export function hasActiveMill(): boolean {
  return activeMill !== null;
}

/**
 * Disconnect the active mill and clear wiring. Called from the global afterEach
 * AFTER React unmount, so the final dispatch hits no mounted component.
 */
export function teardownActiveMill(): void {
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }
  activeMill = null;
}

// Hand the global afterEach (setup.ts) a reference to the teardown without
// forcing setup.ts to import this store-dependent module at import time.
registerMillTeardown(teardownActiveMill);

/**
 * Emit one bare MILL_STATE_CHANGED at the current position — the exact "encoder
 * still alive, nothing moved" broadcast that a connected DRO receives constantly.
 * Correct state logic must treat it as a no-op.
 */
export function emitMillTick(mill: MockMillAdapter = getActiveMill()): void {
  const { x, y, z } = mill.getState().position;
  act(() => {
    mill.setPosition(x, y, z);
  });
}

/** Emit a new absolute encoder position (real MILL_STATE_CHANGED path), act-wrapped. */
export function emitPosition(
  x: number,
  y: number,
  z: number,
  mill: MockMillAdapter = getActiveMill()
): void {
  act(() => {
    mill.setPosition(x, y, z);
  });
}

function snapshotDisplay(): Record<'x' | 'y' | 'z', string> {
  const read = (a: 'x' | 'y' | 'z') => screen.getByTestId(`axis-value-${a}`).textContent;
  return { x: read('x'), y: read('y'), z: read('z') };
}

/**
 * Assert that a state DWELL is stable under a burst of ticks — the coverage the
 * per-action auto-tick can't provide (ticks arriving while the operator does
 * NOTHING, e.g. sitting in a diagnostics step).
 *
 * Pass an `assert` callback to pin a specific expectation across the ticks
 * (it runs once before and once after the burst); omit it to assert the three
 * axis displays are byte-for-byte unchanged.
 *
 *   expectStableUnderTicks(() =>
 *     expect(screen.getByTestId('axis-value-x')).toHaveTextContent('rAmPASS'));
 */
export function expectStableUnderTicks(
  assert?: () => void,
  opts?: { ticks?: number; mill?: MockMillAdapter }
): void {
  const mill = opts?.mill ?? getActiveMill();
  const ticks = opts?.ticks ?? 5;
  const before = assert ? null : snapshotDisplay();

  assert?.();
  for (let i = 0; i < ticks; i++) {
    emitMillTick(mill);
  }
  assert?.();
  if (before) {
    expect(snapshotDisplay()).toEqual(before);
  }
}

/**
 * Wrap a userEvent instance so every interaction emits one act-wrapped tick
 * afterwards. This is the forcing function: ANY interaction (raw `user.click`,
 * `typeValue`, a helper written next year) runs the DRO under a live tick,
 * because the tick is bound to interacting — not to a particular helper.
 */
export function wrapUserWithTicks<T extends object>(user: T): T {
  return new Proxy(user, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (typeof value !== 'function') {
        return value;
      }
      return async (...args: unknown[]) => {
        const result = await (value as (...a: unknown[]) => unknown).apply(target, args);
        if (hasActiveMill()) {
          emitMillTick();
        }
        return result;
      };
    },
  });
}
