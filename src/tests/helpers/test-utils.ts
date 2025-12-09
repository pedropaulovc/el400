/**
 * Common test utilities and mocks for unit tests
 */

/**
 * Mock window.matchMedia for tests that use responsive hooks
 */
export function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}

/**
 * Mock IntersectionObserver for tests that use intersection detection
 */
export function mockIntersectionObserver() {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as unknown as typeof IntersectionObserver;
}

/**
 * Mock ResizeObserver for tests that use resize detection
 */
export function mockResizeObserver() {
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
}

/**
 * Create a mock DRO state for testing
 */
export function createMockDROState() {
  return {
    mode: 'abs' as const,
    units: 'inch' as const,
    positions: {
      abs: { x: 0, y: 0, z: 0 },
      inc: { x: 0, y: 0, z: 0 },
    },
    selectedAxis: null as 'X' | 'Y' | 'Z' | null,
    inputBuffer: '',
    currentFunction: null as string | null,
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  { timeout = 3000, interval = 50 } = {}
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout waiting for condition after ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Simulate delay (for testing async behavior)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a spy function for testing callbacks
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function createSpy<T extends (...args: any[]) => any>(): T & { calls: any[][] } {
  const calls: any[][] = [];
  const spy = ((...args: any[]) => {
    calls.push(args);
  }) as T & { calls: any[][] };
  spy.calls = calls;
  return spy;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
