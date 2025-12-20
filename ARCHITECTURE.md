# EL400 DRO Architecture

## Quick Reference

* **State Machine:** `src/stores/dro/` - All DRO behavior (colocated with Zustand store)
* **Adapters:** `src/adapters/` - `CncjsMillConnection`, `NoopMillConnection`
* **Types:** `src/types/` - `MillState`, `VolatileMemory`, `NonVolatileMemory`

## State Management (Zustand)

Three stores with granular selectors:

```typescript
// src/stores/droStore.ts - DRO state machine
useDROStore: { stateName, stateData, vMem, dispatch }

// src/stores/millStore.ts - Connection lifecycle
useMillStore: { millState, connection, isConnecting, error }

// src/stores/settingsStore.ts - Persisted settings (localStorage)
useSettingsStore: { nvMem, updateNvMem, resetMemory }
```

## Core Types

```typescript
// DRO reducer state (src/stores/dro/types.ts)
interface DROStatePayload {
  stateName: DROStateName;     // 'idle' | 'boot' | 'function-menu-*' | 'calculator-*' | ...
  stateData: DROStateData;     // Feature context (discriminated by stateDataType)
  vMem: VolatileMemoryState;   // Runtime memory
}

// Mill state from adapters (src/types/millState.ts)
interface MillState {
  position: { x: number; y: number; z: number };
  probe: { pinState: string; triggered: boolean };
  connected: boolean;
  controllerType: 'cncjs' | 'linuxcnc' | 'mock' | 'noop';
}

// Persisted settings (src/types/nonVolatileMemory.ts)
interface NonVolatileMemory {
  beepEnabled: boolean;
  defaultUnit: 'inch' | 'mm';
  precision: number;
  bootMessageMode: 'show' | 'skip';
}
```

## Event Names (DROEventPayload)

* Keypad: `KEY_0`..`KEY_9`, `KEY_DECIMAL`, `KEY_SIGN`, `KEY_CLEAR`, `KEY_ENTER`
* Navigation: `KEY_2_DOWN`, `KEY_4_LEFT`, `KEY_6_RIGHT`, `KEY_8_UP`
* Axis: `BTN_SELECT_X/Y/Z`, `BTN_ZERO_X/Y/Z`, `BTN_ZERO_ALL`
* Mode: `BTN_ABS_INC`, `BTN_INCH_MM`
* Function: `BTN_HALF`, `BTN_FUNCTION`, `BTN_CALCULATOR`
* Internal: `BOOT_STARTED`, `BOOT_MESSAGE_TIMEOUT`, `MODE_TOGGLE_COMPLETE`, `SET_INPUT_BUFFER`

## Hooks

```typescript
// DRO state (src/stores/droStore.ts, re-exported from src/stores/dro/index.ts)
useDROState()      // → DROStateName
useDROContext()    // → DROStateData
useDROVMem()       // → VolatileMemoryState
useDRODispatch()   // → dispatch({ eventName: 'KEY_5' })

// Mill state (src/stores/millStore.ts)
useMillState()     // → MillState
useConnection()    // → MillConnection
useIsConnecting()  // → boolean

// Settings (src/stores/settingsStore.ts)
useNvMem()         // → NonVolatileMemory
useDefaultUnit()   // → 'inch' | 'mm'
useUpdateNvMem()   // → (partial) => void

// Volatile memory with actions (src/hooks/useVolatileMemory.ts)
useVolatileMemory() // → { displayValues, mode, toggleMode, zeroAxis, ... }
```

## File Structure

```
src/stores/
├── index.ts              # Re-exports
├── droStore.ts           # DRO state machine store
├── millStore.ts          # Mill connection lifecycle
├── settingsStore.ts      # Persisted settings (localStorage)
└── dro/                  # DRO state machine module
    ├── index.ts          # Public exports (re-exports hooks from droStore)
    ├── types.ts          # DROStatePayload, FeatureReducer, DROReducerContext
    ├── droStateMachine.ts # DROStateName, DROEventPayload, DROStateData
    ├── reducer.ts        # Root reducer (composes features)
    ├── test-utils.ts     # Test helpers (createTestState, DEFAULT_TEST_CONTEXT)
    └── features/
        ├── boot.ts           # boot → showMessage → idle
        ├── idle.ts           # Idle state handling
        ├── keypad.ts         # KEY_0-9, KEY_DECIMAL, KEY_SIGN
        ├── axis-operations.ts # BTN_SELECT_*, BTN_ZERO_*
        ├── mode-toggle.ts    # BTN_ABS_INC
        ├── half.ts           # BTN_HALF
        ├── abs-inc.ts        # ABS/INC state transitions
        ├── inch-mm.ts        # Inch/MM toggle
        ├── menu.ts           # Function menu ring
        ├── center-finding.ts # Point collection
        └── calculator.ts     # +/-/×/÷ operations

src/adapters/
├── MillConnection.ts     # Interface
├── CncjsMillConnection.ts # WebSocket to CNCjs
├── MockMillConnection.ts  # Test/dev simulation
└── NoOpMillConnection.ts  # Default fallback (manual mode)
```

## Feature Reducer Pattern

```typescript
type FeatureReducer = (
  state: DROStatePayload,
  event: DROEventPayload,
  context: { millState: MillState; nvMem: NonVolatileMemory }
) => DROStatePayload | null;  // null = not handled, try next reducer
```

Root reducer tries each feature reducer in priority order until one handles the event.

## State Data (Discriminated Union)

```typescript
type DROStateData =
  | { stateDataType: 'none' }
  | { stateDataType: 'center-finding'; storedPoints: StoredPoint[]; centerResult: AxisValues | null }
  | { stateDataType: 'calculator'; firstValue: number | null; operation: 'ADD' | 'SUB' | 'MULTI' | 'DIV' | null; currentValue: number | string }
  | { stateDataType: 'bolt-hole'; holeCount: number; radius: number; startAngle: number; currentHole: number }
  | { stateDataType: 'arc' };  // TODO: not yet implemented
```

---

## Detailed Reference

### Data Flow

```
EL400Simulator (consumes via hooks)
        ↑
   Zustand Stores (granular selectors)
   ├── droStore ←── reads millStore, settingsStore on dispatch
   ├── millStore ←── connection.subscribe()
   └── settingsStore (persist middleware → localStorage)
        ↑
   MillConnection interface
        ↑
   CncjsMillConnection | MockMillConnection | NoOpMillConnection
```

Initialization in `App.tsx`: `initializeMillStore(connection)` connects store to adapter.

### MillConnection Interface

```typescript
interface MillConnection {
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(listener: MillStateListener): () => void;
  getState(): MillState;
  readonly controllerType: ControllerType;
}
```

### CNCjs Controller Mapping

| Controller | Position | Probe |
|------------|----------|-------|
| GRBL | `status.mpos[]` | `status.pn` contains 'P' |
| GrblHAL | `status.mpos[]` | `status.substate.probe > 0` |
| TinyG | `sr.posx/posy/posz` | `sr.prb === 1` |
| Smoothie/Marlin | `status.pos{}` | N/A |

### Volatile Memory Behavior

**ABS Mode:** Display = machine position - work offset. Zero captures offset. Value entry adjusts offset.
**INC Mode:** Display = incremental counter. Zero resets to 0. Value entry sets directly.

### URL Configuration

```
/?source=cncjs&host=192.168.1.100&port=8000
/?source=mock
/?source=manual  (default, uses noop connection)
```

### CNCjs WebSocket Events

`connect`, `disconnect`, `controller:state`, `serialport:open`, `serialport:close`

---

## Testing

**Unit:** `src/**/*.test.ts(x)` - Vitest
**Integration:** `*.integration.test.tsx` - Use `data-testid`
**E2E:** `e2e/**/*.spec.ts` - Playwright

Key test files:
- `src/stores/dro/reducer.test.ts`
- `src/stores/dro/features/*.test.ts`
- `src/adapters/*.test.ts`

## Deployment

**CNCjs Widget:** iframe, localStorage works, URL params config
**Standalone:** Direct browser, connect to remote CNCjs
