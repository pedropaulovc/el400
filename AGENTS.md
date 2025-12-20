# EL400 DRO Simulator

Web-based simulator of Electronica EL400 (MagXact MX-100M) digital readout for CNC mills.

## Quick Reference

| Category | Location |
|----------|----------|
| State Machine | `src/stores/dro/` (Zustand + reducer) |
| Adapters | `src/adapters/` - CNCjs, Mock, NoOp |
| Types | `src/types/` - MillState, VolatileMemory, NonVolatileMemory |
| Components | `src/components/` - EL400Simulator root |
| User Stories | `project/user-stories/*` |

## Commands

```bash
npm run dev              # Development server
npm run build            # Production build
npm run test             # Unit tests (Vitest)
npm run test:coverage    # Min 70% enforced
npm run test:e2e         # Playwright E2E
npm run test:all         # REQUIRED before commit
```

## Testing Exit Criteria

**All changes:** `npm run test:all` must pass
**New features:** 1-2 E2E tests + integration tests + unit tests

| Type | Pattern | Notes |
|------|---------|-------|
| Unit | `src/**/*.test.tsx` | Primary. Use Vitest + RTL |
| Integration | `*.integration.test.tsx` | Use `data-testid`, helpers in `src/tests/helpers/` |
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
MillConnection interface
      ↑
CncjsMillConnection | MockMillConnection | NoOpMillConnection
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

### URL Config

```
/?source=cncjs&host=192.168.1.100&port=8000
/?source=mock
/?source=manual  (default)
```

## Core Types

```typescript
interface DROStatePayload {
  stateName: DROStateName;   // 'idle' | 'boot' | 'function-menu-*' | 'calculator-*'
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
├── MillConnection.ts      # Interface
├── CncjsMillConnection.ts # WebSocket to CNCjs
├── MockMillConnection.ts  # Test/dev simulation
└── NoOpMillConnection.ts  # Manual mode fallback
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

React 18, TypeScript (strict), Vite, Tailwind CSS, Zustand, socket.io-client, Vitest, Playwright

## Component Hierarchy

- `Index.tsx` → `EL400Simulator` (root)
  - `MultiAxisSection` - Seven-segment displays
  - `AxisSelectionSection` - X/Y/Z buttons
  - `KeypadSection` - Numeric input
  - `PrimaryFunctionSection` - Settings, calibrate, center, zero all
  - `SecondaryFunctionSection` - Tool offset, bolt circle, linear pattern
