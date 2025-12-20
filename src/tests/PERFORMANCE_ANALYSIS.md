# Render Performance Analysis

Generated: 2025-12-19

## Executive Summary

Integration tests are **15-25x slower** than unit tests due to cascading re-renders. All components re-render on every state change because no memoization is applied.

## Test Results

### Overall Metrics

| Metric | Unit Tests | Integration Tests | Ratio |
|--------|-----------|-------------------|-------|
| Test Count | 4 | 10 | - |
| Avg Renders/Test | 1.0 | 3.7 - 5.3 | ~4x |
| Avg Render Time | 4.8ms | 72-101ms | ~15-25x |
| Total Render Time | 19ms | 719ms | ~37x |

### Per-Test Breakdown

| Test | Renders | Render Time | Total Duration |
|------|---------|-------------|----------------|
| LEDIndicator - basic render (unit) | 1 | 17ms | 32ms |
| DROButton - basic render (unit) | 1 | 1.2ms | 2.7ms |
| DROButton - variants render (unit) | 1 | 0.8ms | 2.5ms |
| DROButton - with clicks (unit) | 1 | 0.3ms | 205ms |
| Simulator - initial render | 1 | 114ms | 120ms |
| Simulator - axis selection | 4 | 85ms | 331ms |
| Simulator - numeric entry | 3 | 68ms | 499ms |
| Simulator - long numeric entry | 5 | 89ms | 1237ms |
| Simulator - calculator | 5 | 79ms | 537ms |
| Simulator - zero axes | 7 | 119ms | 807ms |
| Simulator - complex workflow | 12 | 166ms | 2080ms |

## Component-Level Analysis

All components re-render on every state change, indicating a lack of memoization:

| Component | Renders | Total Time | Avg Time | Issue |
|-----------|---------|------------|----------|-------|
| EL400Simulator | 15 | 236.39ms | 15.76ms | High update count, slow renders |
| MultiAxisSection | 15 | 100.18ms | 6.68ms | High update count |
| KeypadSection | 15 | 41.77ms | 2.78ms | High update count |
| SecondaryFunctionSection | 15 | 37.90ms | 2.53ms | High update count |
| PrimaryFunctionSection | 15 | 25.53ms | 1.70ms | High update count |
| AxisSelectionSection | 15 | 16.33ms | 1.09ms | High update count |
| HousingEdge-top | 15 | 5.48ms | 0.37ms | Unnecessary renders (static) |
| HousingEdge-bottom | 15 | 3.47ms | 0.23ms | Unnecessary renders (static) |
| BrandLogo | 15 | 0.86ms | 0.06ms | Unnecessary renders (static) |

**Total:** 135 renders, 467.90ms

### Render Distribution

```
EL400Simulator       ████████████████████████████████████████████████ 236ms (51%)
MultiAxisSection     ████████████████████ 100ms (21%)
KeypadSection        ████████ 42ms (9%)
SecondaryFunctionSection ███████ 38ms (8%)
PrimaryFunctionSection █████ 26ms (5%)
AxisSelectionSection ███ 16ms (3%)
HousingEdge-top      █ 5ms (1%)
HousingEdge-bottom   █ 3ms (1%)
BrandLogo            │ 1ms (<1%)
```

## Root Cause Analysis

### Problem: Cascading Re-renders

All components re-render when ANY state changes because:

1. **No memoization:** Components don't use `React.memo()`
2. **Full store subscriptions:** Zustand hooks subscribe to entire store state
3. **Prop drilling:** Parent re-renders cause all children to re-render
4. **Static components affected:** Even HousingEdge and BrandLogo re-render

### Evidence

- HousingEdge and BrandLogo (purely static visual components) render 15 times
- KeypadSection re-renders even when only display values change
- Every component has 12 updates across 3 component profiling tests
- Base duration (ideal) vs actual duration shows overhead from re-renders

## Optimization Recommendations

### Priority 1: Quick Wins (< 1 hour, ~50ms savings)

#### 1.1 Memoize Static Components

These components never change after mount:

```tsx
// src/components/HousingEdge.tsx
import { memo } from 'react';
// ... component code ...
export default memo(HousingEdge);

// src/components/BrandLogo.tsx
import { memo } from 'react';
// ... component code ...
export default memo(BrandLogo);
```

**Expected savings:** ~10ms per test (eliminate 24 unnecessary renders)

#### 1.2 Memoize Section Components

These sections only need dispatch functions, not state:

```tsx
// src/components/KeypadSection.tsx
export default memo(KeypadSection);

// src/components/PrimaryFunctionSection.tsx
export default memo(PrimaryFunctionSection);

// src/components/SecondaryFunctionSection.tsx
export default memo(SecondaryFunctionSection);
```

**Expected savings:** ~100ms per integration test

### Priority 2: Medium Effort (~2-4 hours)

#### 2.1 Use Selective Zustand Subscriptions

Instead of subscribing to entire state:

```tsx
// Current (triggers re-render on ANY state change)
const droState = useDROState();

// Better (only re-renders when specific values change)
const selectedAxis = useDROStore((state) => state.vMem.selectedAxis);
const stateName = useDROStore((state) => state.stateName);
```

#### 2.2 Memoize Computed Values

```tsx
// In components that compute display values
const formattedValue = useMemo(() => {
  return formatAxisValue(rawValue, precision);
}, [rawValue, precision]);
```

### Priority 3: Architectural (Future)

- Split stateful containers from presentational components
- Consider React DevTools Profiler for production monitoring
- Implement render count assertions in tests

## How to Run Performance Tests

```bash
# Run all performance tests with verbose output
npm run test -- src/tests/render-performance.test.tsx --reporter=verbose

# Run with component-level profiling
# Tests automatically print detailed metrics at the end
```

## Files Created

| File | Purpose |
|------|---------|
| `src/tests/helpers/render-profiler.tsx` | Core profiling utilities using React Profiler API |
| `src/tests/helpers/ProfiledEL400Simulator.tsx` | Profiled simulator with per-component metrics |
| `src/tests/render-performance.test.tsx` | Performance test suite (14 tests) |
| `src/tests/PERFORMANCE_ANALYSIS.md` | This analysis document |

## Usage in Tests

### Enable profiling for a test

```tsx
import {
  renderSimulator,
  enableProfiling,
  startTestProfiling,
  endTestProfiling,
  printReport,
} from './helpers/integration-test-utils';

beforeAll(() => {
  enableProfiling(true);
});

it('measures renders', () => {
  startTestProfiling('My Test', 'integration');
  renderSimulator({ profile: true });
  // ... test actions ...
  const report = endTestProfiling();
  console.log(`Renders: ${report.totalRenderCount}, Time: ${report.totalRenderTime}ms`);
});

afterAll(() => {
  printReport();
});
```

### Enable component-level profiling

```tsx
import {
  enableComponentProfiling,
  clearComponentMetrics,
  printComponentMetrics,
} from './helpers/integration-test-utils';

beforeAll(() => {
  enableComponentProfiling(true);
  clearComponentMetrics();
});

it('measures individual components', async () => {
  renderSimulator({ componentProfiling: true });
  // ... test actions ...
});

afterAll(() => {
  printComponentMetrics();
});
```

## Success Metrics

After implementing optimizations, re-run tests and verify:

| Metric | Current | Target |
|--------|---------|--------|
| Re-renders per integration test | 5-12 | < 5 |
| Render time ratio (integration/unit) | 15-25x | < 10x |
| Static component renders | 15 | 1 (mount only) |
| Integration test total time | 719ms | < 300ms |
