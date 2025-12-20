# EL400 DRO Simulator

Web-based simulator of Electronica EL400 (MagXact MX-100M) digital readout for CNC mills.

## Quick Reference

| Category | Location |
|----------|----------|
| State Machine | `src/stores/dro/` (Zustand + reducer) |
| Feature Reducers | `src/stores/dro/features/` - boot, idle, keypad, calculator, etc. |
| Adapters | `src/adapters/` - CNCjs, Mock, NoOp |
| Types | `src/types/` - MillState, VolatileMemory, NonVolatileMemory |
| Components | `src/components/` - EL400Simulator root |
| User Stories | `project/user-stories/*` |

## Commands

```bash
npm run dev              # Development server
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # TypeScript type checking (tsc)
npm run test             # Unit and integration tests (Vitest)
npm run test:coverage    # Unit and integration tests with coverage, min 70% enforced
npm run test:storybook   # Storybook interaction tests
npm run test:e2e         # Playwright E2E
npm run test:all         # REQUIRED before push (lint + coverage + e2e + storybook)
```

## Testing Exit Criteria

**All changes:** `npm run test:all` must pass
**New features:** 1-2 E2E tests + integration tests + unit tests

| Type | Pattern | Notes |
|------|---------|-------|
| Unit | `src/**/*.test.tsx` | Primary. Use Vitest + RTL |
| Integration | `*.integration.test.tsx` | Use `data-testid`, helpers in `src/tests/helpers/`. Test happy AND unhappy paths |
| E2E | `e2e/**/*.spec.ts` | Playwright. Critical flows only |
| Stories | `src/**/*.stories.tsx` | Visual docs only, no behavior tests |

## Architecture

```
EL400Simulator (hooks)
      ↑
Zustand Stores
├── droStore ←── reads millStore, settingsStore
├── millStore ←── connection.subscribe()
└── settingsStore (localStorage)
      ↑
MillAdapter interface
      ↑
CncjsMillAdapter | MockMillAdapter | NoOpMillAdapter
```

### Stores

```typescript
useDROStore: { stateName, stateData, vMem, dispatch }
useMillStore: { millState, connection, isConnecting, error }
useSettingsStore: { nvMem, updateNvMem, resetMemory }
```

### Key Hooks

```typescript
useDROState()       // → DROStateName
useDRODispatch()    // → dispatch({ eventName: 'KEY_5' })
useMillState()      // → MillState
useNvMem()          // → NonVolatileMemory
useVolatileMemory() // → { displayValues, mode, toggleMode, zeroAxis }
```

### Events (DROEventPayload)

- Keypad: `KEY_0`..`KEY_9`, `KEY_DECIMAL`, `KEY_SIGN`, `KEY_CLEAR`, `KEY_ENTER`
- Navigation: `KEY_2_DOWN`, `KEY_4_LEFT`, `KEY_6_RIGHT`, `KEY_8_UP`
- Axis: `BTN_SELECT_X/Y/Z`, `BTN_ZERO_X/Y/Z`, `BTN_ZERO_ALL`
- Mode: `BTN_ABS_INC`, `BTN_INCH_MM`
- Function: `BTN_HALF`, `BTN_FUNCTION`, `BTN_CALCULATOR`
- Internal: `BOOT_STARTED`, `BOOT_MESSAGE_TIMEOUT`, `MODE_TOGGLE_COMPLETE`, `SET_INPUT_BUFFER`

### URL Config

```
/?source=cncjs&host=192.168.1.100&port=8000
/?source=mock
/?source=manual  (default)
```

## DRO State Names

States are a **flat collection** (not nested). Each feature may define multiple states:

- Boot: `boot`, `boot-show-message`
- Idle: `idle`
- Calculator: `calculator-first-operand`, `calculator-operator-selected`, `calculator-second-operand`, `calculator-result`
- Center Finding: `center-finding-collect`, `center-finding-result`
- Function Menu: `function-menu-ring`, `function-menu-*`

## Core Types

```typescript
interface DROStatePayload {
  stateName: DROStateName;   // Flat enum - see section above
  stateData: DROStateData;   // Feature context (discriminated union)
  vMem: VolatileMemoryState;
}

interface MillState {
  position: { x: number; y: number; z: number };
  probe: { pinState: string; triggered: boolean };
  connected: boolean;
  controllerType: 'cncjs' | 'linuxcnc' | 'mock' | 'noop';
}

interface NonVolatileMemory {
  beepEnabled: boolean;
  defaultUnit: 'inch' | 'mm';
  precision: number;
  bootMessageMode: 'show' | 'skip';
}
```

## File Structure

```
src/stores/dro/
├── droStateMachine.ts  # State names, events, data types
├── reducer.ts          # Root reducer (composes features)
├── test-utils.ts       # createTestState, DEFAULT_TEST_CONTEXT
└── features/           # boot, idle, keypad, axis-operations, etc.

src/adapters/
├── MillAdapter.ts         # Interface
├── CncjsMillAdapter.ts    # WebSocket to CNCjs
├── MockMillAdapter.ts     # Test/dev simulation
└── NoOpMillAdapter.ts     # Manual mode fallback
```

## Feature Reducer Pattern

```typescript
type FeatureReducer = (
  state: DROStatePayload,
  event: DROEventPayload,
  context: { millState: MillState; nvMem: NonVolatileMemory }
) => DROStatePayload | null;  // null = not handled
```

## Tech Stack

React 18, TypeScript (strict), Vite, Tailwind CSS, Zustand, socket.io-client, Vitest, Playwright, Storybook

## Component Hierarchy

- `Index.tsx` → `EL400Simulator` (root)
  - `MultiAxisSection` - Seven-segment displays
  - `AxisSelectionSection` - X/Y/Z buttons
  - `KeypadSection` - Numeric input
  - `PrimaryFunctionSection` - Settings, calibrate, center, zero all
  - `SecondaryFunctionSection` - Tool offset, bolt circle, linear pattern
