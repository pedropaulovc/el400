/**
 * Store-free indirection between the global afterEach (setup.ts) and the mill
 * harness.
 *
 * setup.ts must NOT import mill-harness directly: mill-harness pulls in the
 * Zustand store graph, and importing it during setup's import phase causes
 * settingsStore's persist middleware to capture `localStorage` BEFORE setup.ts
 * installs the jsdom localStorage mock — yielding "storage.setItem is not a
 * function". This module has no store imports, so setup.ts can depend on it
 * safely; mill-harness registers the real teardown lazily when a test first
 * imports it (by which point the mock is in place).
 */
let teardown: (() => void) | null = null;

export function registerMillTeardown(fn: () => void): void {
  teardown = fn;
}

export function runMillTeardown(): void {
  teardown?.();
}
