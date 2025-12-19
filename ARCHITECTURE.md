# EL400 DRO Architecture

Technical documentation for developers working on the EL400 DRO simulator.

## Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     EL400Simulator                              │
│  (consumes DROState, vMem via hooks)                            │
└─────────────────────────────────────────────────────────────────┘
                              ▲
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────────────────────────┐   ┌─────────────────────────────┐
│      DROStateContext        │   │  NonVolatileMemoryContext   │
│  (dro-state-machine)        │   │  - Persisted settings       │
│  - Operation state machine  │   │  - beepEnabled, defaultUnit │
│  - vMem (volatile memory)   │   │  - localStorage persistence │
│  - Input buffer, axis ops   │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
          ▲
          │ context: { millState, nvMem }
          │
┌─────────────────────────────────────────────────────────────────┐
│                   MillStateContext                               │
│  - Connection lifecycle (connect/disconnect)                    │
│  - Mill state from connection                                   │
│  - Connection status (isConnecting, error)                      │
└─────────────────────────────────────────────────────────────────┘
          ▲
          │
┌─────────────────────────────────────────────────────────────────┐
│                   MillConnection (Interface)                     │
│  - connect(): Promise<void>                                     │
│  - disconnect(): void                                           │
│  - subscribe(callback): unsubscribe                             │
│  - getState(): MillState                                        │
└─────────────────────────────────────────────────────────────────┘
                              ▲
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌───────────────────┐ ┌─────────────────┐ ┌───────────────────┐
│CncjsMillConnection│ │LinuxCncConnection│ │MockMillConnection │
│ (WebSocket)       │ │ (future)        │ │ (for testing)     │
└───────────────────┘ └─────────────────┘ └───────────────────┘
```

## Memory Model

The DRO uses three types of memory:

### DRO State Machine (`src/dro-state-machine/`)
Unified state that controls DRO behavior, including:

- **Operation state:** boot, idle, function menus, center finding, calculator
- **Volatile memory (vMem):** mode, activeAxis, workOffsets, incrementalValues, inputBuffer
- **Feature-specific context data:** stored points, calculation results

### Mill State
Runtime state from external connections (managed by MillStateContext):

- Mill position from external connection
- Probe state
- Connection state and errors
- Connection lifecycle

### Non-Volatile Memory
Persisted settings saved to localStorage. Includes:
- Default unit (inch/mm)
- Beep enabled
- Display precision
- Boot message mode

## DRO State Machine

The DRO uses a flat state machine pattern with integrated volatile memory. Components emit raw events (KEY_*, BTN_*) and feature reducers handle all state transitions.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DROProvider                              │
│  (React Context + useReducer)                                   │
│  Injects context: { millState, nvMem }                          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ dispatch(DROEvent)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        droReducer                               │
│  (composes feature reducers in priority order)                  │
│  State: { stateName, stateData, vMem }                          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
    ┌─────────────┬───────────┼───────────┬─────────────┐
    │             │           │           │             │
┌────────┐ ┌───────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐
│  boot  │ │  keypad   │ │  menu   │ │  half   │ │calculator │
│        │ │           │ │         │ │         │ │           │
│ - boot │ │ - digits  │ │ - nav   │ │ - half  │ │ - +/-/×/÷ │
│ - msg  │ │ - buffer  │ │ - ring  │ │ - axis  │ │ - result  │
│ - idle │ │ - decimal │ │         │ │         │ │           │
└────────┘ └───────────┘ └─────────┘ └─────────┘ └───────────┘
    │             │           │           │             │
┌────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│mode-toggle │ │axis-operati.│ │centerFinding│ │  abs-inc    │
│            │ │             │ │             │ │  inch-mm    │
│ - ABS/INC  │ │ - select    │ │ - points    │ │             │
│ - preserve │ │ - zero      │ │ - calculate │ │             │
│   axis     │ │ - set value │ │             │ │             │
└────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### File Structure

```
src/dro-state-machine/
├── index.ts              # Public API exports
├── types.ts              # DROStatePayload, FeatureReducer, DROReducerContext
├── droStateMachine.ts    # DROStateName, DROEventPayload, DROStateData types
├── reducer.ts            # Root reducer (composes features)
├── context.tsx           # DROProvider, hooks (injects millState, nvMem)
├── test-utils.ts         # Test helpers (createTestState, DEFAULT_TEST_CONTEXT)
└── features/
    ├── boot.ts           # Boot sequence: boot → showMessage → idle
    ├── idle.ts           # Idle state event handling
    ├── keypad.ts         # Digit input, buffer management (KEY_0-9, KEY_DECIMAL, KEY_SIGN)
    ├── axis-operations.ts # Axis selection, zeroing, value entry (BTN_SELECT_*, BTN_ZERO_*)
    ├── mode-toggle.ts    # ABS/INC toggle (BTN_ABS_INC)
    ├── half.ts           # Half axis value (BTN_HALF)
    ├── abs-inc.ts        # Legacy ABS/INC state transitions
    ├── inch-mm.ts        # Inch/MM toggle: idle ↔ inch-mm-mode
    ├── menu.ts           # Function menu navigation ring
    ├── center-finding.ts # Point collection and center calculation
    └── calculator.ts     # Basic calculator operations
```

### State Payload Structure

The reducer manages a unified state payload:

```typescript
interface DROStatePayload {
  stateName: DROStateName;     // Current operation state
  stateData: DROStateData;     // Feature-specific context data
  vMem: VolatileMemoryState;   // Volatile memory (mode, axis, buffer, etc.)
}

interface VolatileMemoryState {
  mode: DatumMode;                    // 'abs' | 'inc'
  activeAxis: Axis | null;            // Currently selected axis
  workOffsets: AxisValues;            // Work coordinate offsets
  incrementalValues: AxisValues;      // Incremental mode values
  manualAbsoluteValues: AxisValues;   // Manual mode absolute values
  inputBuffer: string;                // Keypad input accumulator
}
```

### Reducer Context

Feature reducers receive external dependencies via context:

```typescript
interface DROReducerContext {
  millState: MillState;        // Machine position, connection status
  nvMem: NonVolatileMemory;    // Persisted settings (unit, precision)
}

type FeatureReducer = (
  statePayload: DROStatePayload,
  eventPayload: DROEventPayload,
  context: DROReducerContext
) => DROStatePayload | null;
```

### Raw Events

Components emit raw events; the state machine interprets their meaning:

```typescript
type DROEventPayload =
  // Keypad events
  | { eventName: 'KEY_0' } | { eventName: 'KEY_1' } | ... | { eventName: 'KEY_9' }
  | { eventName: 'KEY_2_DOWN' } | { eventName: 'KEY_4_LEFT' }
  | { eventName: 'KEY_6_RIGHT' } | { eventName: 'KEY_8_UP' }
  | { eventName: 'KEY_DECIMAL' }
  | { eventName: 'KEY_SIGN' }
  | { eventName: 'KEY_CLEAR' }
  | { eventName: 'KEY_ENTER'; value?: number }
  // Axis selection/zero buttons
  | { eventName: 'BTN_SELECT_X' } | { eventName: 'BTN_SELECT_Y' } | { eventName: 'BTN_SELECT_Z' }
  | { eventName: 'BTN_ZERO_X' } | { eventName: 'BTN_ZERO_Y' } | { eventName: 'BTN_ZERO_Z' }
  | { eventName: 'BTN_ZERO_ALL' }
  // Mode buttons
  | { eventName: 'BTN_ABS_INC' }
  | { eventName: 'BTN_INCH_MM' }
  // Function buttons
  | { eventName: 'BTN_HALF' }
  | { eventName: 'BTN_FUNCTION' }
  | { eventName: 'BTN_CALCULATOR' }
  // ... other events
```

### Feature Reducer Pattern

Feature reducers handle a subset of states and return `null` if they don't handle the current state/event combination. The root reducer tries each in order until one handles the event.

```typescript
// Example: keypad.ts
export const keypadReducer: FeatureReducer = (state, event, _context) => {
  // Only handle idle state and calculator states
  if (state.stateName !== 'idle' && !state.stateName.startsWith('calculator-')) {
    return null;
  }

  const { vMem } = state;

  switch (event.eventName) {
    case 'KEY_5': {
      // Append digit to buffer (only if axis selected or in calculator)
      if (vMem.activeAxis === null && state.stateName === 'idle') {
        return null;
      }
      return {
        ...state,
        vMem: { ...vMem, inputBuffer: vMem.inputBuffer + '5' },
      };
    }
    // ... other digit/buffer events
    default:
      return null;
  }
};
```

### Context Data (Discriminated Union)

Each feature can have its own context data type, discriminated by `stateDataType`:

```typescript
type DROStateData =
  | { stateDataType: 'none' }
  | { stateDataType: 'center-finding'; storedPoints: StoredPoint[]; centerResult: AxisValues | null }
  | { stateDataType: 'calculator'; firstValue: number | null; operation: 'ADD' | 'SUB' | 'MULTI' | 'DIV' | null; currentValue: number | string }
  | { stateDataType: 'bolt-hole'; holeCount: number; radius: number; /* ... */ };
```

### Hooks

```typescript
// Get current state string
const state = useDROState();  // 'idle' | 'function-menu-center' | 'calculator-add' | ...

// Get context data
const data = useDROContext();  // { stateDataType: 'none' } | { stateDataType: 'calculator', ... }

// Get volatile memory
const vMem = useDROVMem();  // { mode, activeAxis, inputBuffer, ... }

// Dispatch events
const dispatch = useDRODispatch();
dispatch({ eventName: 'KEY_5' });
dispatch({ eventName: 'BTN_SELECT_X' });

// Convenience hooks
const result = useCenterResult();      // AxisValues | null
const count = useStoredPointsCount();  // number

// Helper functions
const value = getBufferValue(vMem.inputBuffer);  // number | null
```

### Rationale

1. **Unified state** - Operation state and volatile memory in one reducer, no separate contexts
2. **Raw events** - Components emit blind key/button events; state machine decides meaning
3. **Context injection** - Reducers receive millState and nvMem as read-only context
4. **Feature reducers** - Each feature is isolated and testable independently
5. **Discriminated context** - Type-safe feature data without nested state objects

## Core Types

### MillState (`src/types/millState.ts`)

Types for mill data from external connections:

```typescript
interface MillPosition {
  x: number;
  y: number;
  z: number;
}

interface ProbeState {
  pinState: string;    // Raw: '', 'P', 'XP', 'XYZPD'
  triggered: boolean;  // Derived: pinState.includes('P')
}

type ControllerType = 'cncjs' | 'linuxcnc' | 'mock' | 'manual';

interface MillState {
  position: MillPosition;
  workPosition?: MillPosition;
  probe: ProbeState;
  connected: boolean;
  controllerType: ControllerType;
}

interface DataSourceConfig {
  type: ControllerType;
  host: string;
  port: number;
  sessionId?: string;
}
```

### VolatileMemory (`src/types/volatileMemory.ts`)

Types for DRO runtime state (managed by DRO reducer):

```typescript
interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

type Axis = 'X' | 'Y' | 'Z';
type DatumMode = 'abs' | 'inc';

// State stored in DRO reducer
interface VolatileMemoryState {
  mode: DatumMode;
  activeAxis: Axis | null;
  workOffsets: AxisValues;
  incrementalValues: AxisValues;
  manualAbsoluteValues: AxisValues;
  inputBuffer: string;
}

// Computed values + state for consumers
interface VolatileMemory {
  displayValues: AxisValues;   // Computed from mode + millState
  absolute: AxisValues;        // Computed from millState - workOffsets
  incremental: AxisValues;
  mode: DatumMode;
  workOffsets: AxisValues;
  activeAxis: Axis | null;
}

interface VolatileMemoryActions {
  toggleMode: () => void;
  setMode: (mode: DatumMode) => void;
  zeroAxis: (axis: Axis) => void;
  zeroAll: () => void;
  setAxisValue: (axis: Axis, value: number) => void;
  selectAxis: (axis: Axis | null) => void;
  halfAxis: (axis: Axis) => void;
}
```

### NonVolatileMemory (`src/types/nonVolatileMemory.ts`)

```typescript
interface NonVolatileMemory {
  beepEnabled: boolean;        // Audio feedback on button press
  defaultUnit: 'inch' | 'mm';  // Display unit
  precision: number;           // Decimal places (e.g., 4 for 0.0001)
  bootMessageMode: 'show' | 'skip';  // Boot sequence behavior
}
```

## Adapters

### MillConnection Interface (`src/adapters/MillConnection.ts`)

All connections implement this interface:

```typescript
interface MillConnection {
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(listener: MillStateListener): () => void;
  getState(): MillState;
  readonly controllerType: ControllerType;
}
```

### CncjsMillConnection (`src/adapters/CncjsMillConnection.ts`)

Connects to CNCjs via Socket.IO and normalizes data from multiple controllers:

| Controller | Position Source | Probe State |
|------------|----------------|-------------|
| GRBL | `status.mpos[]` array | `status.pn` contains 'P' |
| GrblHAL | `status.mpos[]` array | `status.substate.probe > 0` |
| TinyG | `sr.posx/posy/posz` | `sr.prb === 1` |
| Smoothie | `status.pos{}` object | Not available |
| Marlin | `status.pos{}` object | Not available |

### MockMillConnection (`src/adapters/MockMillConnection.ts`)

Simulates machine movement for testing and development. Useful for:
- Unit tests
- Storybook stories
- Development without hardware

## Hooks

### useMillState (`src/hooks/useMillState.ts`)

Convenience hook for accessing mill state from MillStateContext:

```typescript
const { millState } = useMillState();

// Returns MillState:
{
  position,      // { x, y, z }
  workPosition,  // { x, y, z } (optional)
  probe,         // { pinState, triggered }
  connected,     // boolean
  controllerType // 'cncjs' | 'linuxcnc' | 'mock' | 'manual'
}
```

### useVolatileMemory (`src/hooks/useVolatileMemory.ts`)

Hook that reads from DRO vMem and dispatches events for actions:

```typescript
const vm = useVolatileMemory();

// Returns computed values + action dispatchers:
{
  displayValues,   // Computed: mode === 'abs' ? absolute : incremental
  absolute,        // Computed: millState.position - workOffsets (or manualAbsoluteValues)
  incremental,     // From vMem.incrementalValues
  mode,            // From vMem.mode
  workOffsets,     // From vMem.workOffsets
  activeAxis,      // From vMem.activeAxis
  toggleMode,      // Dispatches BTN_ABS_INC
  setMode,         // Dispatches BTN_ABS_INC if different
  zeroAxis,        // Dispatches BTN_ZERO_X/Y/Z
  zeroAll,         // Dispatches BTN_ZERO_ALL
  setAxisValue,    // Dispatches BTN_SELECT_* + KEY_ENTER with value
  selectAxis,      // Dispatches BTN_SELECT_* or KEY_CLEAR
  halfAxis,        // Dispatches BTN_SELECT_* + BTN_HALF
}
```

**Note:** This hook reads from `useDROVMem()` and dispatches raw events to the DRO reducer.

**ABS Mode Behavior:**
- Display shows machine position minus work offset
- Zero captures current machine position as offset
- Value entry adjusts work offset

**INC Mode Behavior:**
- Display shows incremental counter
- Zero resets counter to zero
- Value entry sets counter directly

### useNonVolatileMemory (`src/hooks/useNonVolatileMemory.ts`)

Manages DRO settings with localStorage persistence:

```typescript
const { memory, updateMemory, resetMemory } = useNonVolatileMemory();
```

- Loads from `localStorage['el400-dro-non-volatile-memory']` on mount
- Debounces writes (300ms) to reduce I/O
- Works in both standalone and iframe contexts

### useDataSourceConfig (`src/hooks/useDataSourceConfig.ts`)

Parses URL parameters for data source configuration:

```
/?source=cncjs&host=192.168.1.100&port=8000
/?source=mock
/?source=manual  (or no params - default)
```

## Contexts

### MillStateContext (`src/context/MillStateContext.tsx`)

Manages connection lifecycle and mill state from external data sources. This is the single source of truth for mill position, probe state, and connection status.

```typescript
interface MillStateContextValue {
  millState: MillState;            // Current mill state (position, probe, connected)
  connection: MillConnection;      // Current connection instance (defaults to NoOpMillConnection)
  isConnecting: boolean;           // True while connection.connect() is pending
  error: Error | null;             // Connection error, if any
  setConnection: (connection: MillConnection) => void; // Switch connections
}
```

**Responsibilities:**
- Connection connect/disconnect lifecycle management
- Subscribe to connection state updates and propagate to consumers
- Track connection status (connecting, connected, error)
- Clean up subscriptions when connection changes or unmounts

### NonVolatileMemoryContext (`src/context/NonVolatileMemoryContext.tsx`)

Provides settings to the component tree:

```typescript
interface NonVolatileMemoryContextValue {
  nvMem: NonVolatileMemory;
  updateNvMem: (partial: Partial<NonVolatileMemory>) => void;
  resetNvMem: () => void;
}
```

### DROProvider (`src/dro-state-machine/context.tsx`)

Unified state machine provider that manages operation state and volatile memory:

```typescript
interface DROContextValue {
  state: DROStateName;           // Current operation state
  data: DROStateData;            // Feature-specific context data
  vMem: VolatileMemoryState;     // Volatile memory state
  dispatch: Dispatch<DROEventPayload>;
}
```

**Provider Order:** The contexts must be nested in this order:

```tsx
<NonVolatileMemoryProvider>
  <MillStateProvider initialConnection={connection}>
    <DROProvider>
      {children}
    </DROProvider>
  </MillStateProvider>
</NonVolatileMemoryProvider>
```

## URL Configuration

The DRO can be configured via URL query parameters:

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `source` | `cncjs`, `linuxcnc`, `mock`, `manual` | `manual` | Data source type |
| `host` | hostname/IP | `localhost` | CNCjs server host |
| `port` | number | `8000` | CNCjs server port |

Examples:
```
http://localhost:5173/                           # Manual mode
http://localhost:5173/?source=mock               # Mock adapter
http://localhost:5173/?source=cncjs&host=192.168.1.100&port=8000
```

## CNCjs WebSocket Events

The CncjsMillConnection subscribes to these Socket.IO events:

| Event | Purpose |
|-------|---------|
| `connect` | WebSocket connected |
| `disconnect` | WebSocket disconnected |
| `controller:state` | Position/status update from controller |
| `serialport:open` | Controller serial port opened |
| `serialport:close` | Controller serial port closed |

## Testing

### Unit Tests

```
src/adapters/__tests__/MockMillConnection.test.ts
src/adapters/__tests__/CncjsMillConnection.test.ts
src/utils/__tests__/unitConversion.test.ts
src/dro-state-machine/reducer.test.ts
src/dro-state-machine/context.test.tsx
src/dro-state-machine/type-guards.test.ts
src/dro-state-machine/features/boot.test.ts
src/dro-state-machine/features/menu.test.ts
src/dro-state-machine/features/center-finding.test.ts
src/dro-state-machine/features/abs-inc.test.ts
src/dro-state-machine/features/inch-mm.test.ts
src/dro-state-machine/features/keypad.test.ts
src/dro-state-machine/features/mode-toggle.test.ts
src/dro-state-machine/features/calculator.test.ts
```

### Integration Tests

```
src/components/PrimaryFunctionSection.integration.test.tsx
src/components/SecondaryFunctionSection.integration.test.tsx
src/components/AxisSelectionSection.integration.test.tsx
src/components/UnitConversion.integration.test.tsx
src/dro-state-machine/features/boot.integration.test.tsx
src/dro-state-machine/features/calculator.integration.test.tsx
```

### E2E Tests

```
e2e/02-core-operations/US-003-abs-inc-mode.spec.ts
e2e/02-core-operations/US-005-zero-axes.spec.ts
e2e/04-calculations/US-013-basic-calculator.spec.ts
e2e/08-accessibility/US-037-keyboard-navigation.spec.ts
e2e/09-integration/US-035-external-machine-connection.spec.ts
e2e/09-integration/US-036-settings-persistence.spec.ts
```

### Storybook Stories

```
src/stories/MillState.stories.tsx
src/stories/DataSourceDemo.stories.tsx
```

## Deployment Contexts

The DRO runs in two main contexts:

### CNCjs Widget (iframe)

- Embedded in CNCjs dashboard
- localStorage works (same-origin)
- URL params configure data source
- Communicates with CNCjs via WebSocket

### Standalone Browser

- Direct browser access
- Full localStorage support
- Can connect to remote CNCjs instances
- Useful for separate touch screen displays
