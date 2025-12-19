# EL400 DRO Architecture

Technical documentation for developers working on the EL400 DRO simulator.

## Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     EL400Simulator                              │
│  (consumes DROState, VolatileMemoryState via hooks)             │
└─────────────────────────────────────────────────────────────────┘
                              ▲
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────────────────────────┐   ┌─────────────────────────────┐
│      DROStateContext        │   │  NonVolatileMemoryContext   │
│  (dro-state-machine)        │   │  - Persisted settings       │
│  - Operation state machine  │   │  - beepEnabled, defaultUnit │
│  - Function menu, center    │   │  - localStorage persistence │
│  - Mode toggles             │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
          │
┌─────────────────────────────┐
│   VolatileMemoryContext     │
│  - DRO memory (ABS/INC)     │
│  - activeAxis, workOffsets  │
│  - Consumes MillState       │
└─────────────────────────────┘
          ▲
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
Operation state that controls the DRO mode and UI behavior:

- Current operation state (boot, idle, function menus, center finding)
- Mode toggle states (abs-inc-mode, inch-mm-mode)
- Feature-specific context data (stored points, results)

### Volatile Memory
Runtime state that is lost on refresh. Split across two contexts:

**MillStateContext:**
- Mill position from external connection
- Probe state
- Connection state and errors
- Connection lifecycle

**VolatileMemoryContext:**
- DRO display values (ABS/INC modes)
- Active axis selection
- Work offsets

**Note:** Boot sequence state was moved from VolatileMemoryContext to the DRO State Machine (`src/dro-state-machine/`).

### Non-Volatile Memory
Persisted settings saved to localStorage. Includes:
- Default unit (inch/mm)
- Beep enabled
- Display precision

## DRO State Machine

The DRO uses a flat state machine pattern to manage operation modes, function menus, and multi-step workflows like center finding. This architecture replaces the previous boot stage state in VolatileMemoryContext and consolidates all operation control into a single reducer.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DROProvider                              │
│  (React Context + useReducer)                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ dispatch(DROEvent)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        droReducer                               │
│  (composes feature reducers in priority order)                  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  bootReducer    │ │  menuReducer    │ │centerFindingRed.│
│  - boot         │ │  - menu nav     │ │  - point collect│
│  - showMessage  │ │  - ring wrap    │ │  - calculate    │
│  - idle         │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
┌─────────────────┐ ┌─────────────────┐
│  absIncReducer  │ │  inchMmReducer  │
│  - mode toggle  │ │  - unit toggle  │
└─────────────────┘ └─────────────────┘
```

### File Structure

```
src/dro-state-machine/
├── index.ts              # Public API exports
├── types.ts              # DROStatePayload, DROReducerContext, FeatureReducer
├── droStateMachine.ts    # DROStateName, DROEventPayload, DROStateData types
├── reducer.ts            # Root reducer (composes features)
├── context.tsx           # DROProvider, hooks
└── features/
    ├── boot.ts           # Boot sequence: boot → showMessage → idle
    ├── abs-inc.ts        # ABS/INC toggle: idle ↔ abs-inc-mode
    ├── inch-mm.ts        # Inch/MM toggle: idle ↔ inch-mm-mode
    ├── menu.ts           # Function menu navigation ring
    └── center-finding.ts # Point collection and center calculation
```

### State Machine Design

**Flat State Union:** All states are simple strings in a discriminated union. No nested substates.

```typescript
type DROStateName =
  // Boot sequence
  | 'boot' | 'showMessage' | 'idle'
  // Mode toggles (transitional)
  | 'abs-inc-mode' | 'inch-mm-mode'
  // Function menu selection (ring navigation)
  | 'function-menu-center' | 'function-menu-circle'
  | 'function-menu-line' | 'function-menu-linear' | 'function-menu-polar'
  // Center line (2 points)
  | 'function-menu-center-line-point-1'
  | 'function-menu-center-line-point-2'
  | 'function-menu-center-line-result'
  // Center circle (3 points)
  | 'function-menu-center-circle-point-1'
  | 'function-menu-center-circle-point-2'
  | 'function-menu-center-circle-point-3'
  | 'function-menu-center-circle-result';
```

**State Transitions:**

```
boot → (BOOT_STARTED) →
  skipMessage=true  → idle
  skipMessage=false → showMessage

showMessage → (TIMEOUT | KEY_CLEAR) → idle

idle →
  BTN_ABS_INC  → abs-inc-mode → (MODE_TOGGLE_COMPLETE) → idle
  BTN_INCH_MM  → inch-mm-mode → (MODE_TOGGLE_COMPLETE) → idle
  BTN_FUNCTION → function-menu-center

function-menu-* →
  KEY_6_RIGHT → next menu item (wraps)
  KEY_4_LEFT  → prev menu item (wraps)
  KEY_ENTER   → start point collection
  KEY_CLEAR   → idle

center-line-point-1 → (KEY_6_RIGHT + point) → point-2 → result
center-circle-point-1 → point-2 → point-3 → result
```

### Feature Reducer Pattern

Feature reducers handle a subset of states and return `null` if they don't handle the current state/event combination. The root reducer tries each in order until one handles the event. Reducers receive context for read-only access to mill state and settings.

```typescript
type FeatureReducer = (
  statePayload: DROStatePayload,
  eventPayload: DROEventPayload,
  context: DROReducerContext
) => DROStatePayload | null;

// Example: boot.ts
export const bootReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName, stateData } = statePayload;
  const { eventName } = eventPayload;
  switch (stateName) {
    case 'boot':
      if (eventName === 'BOOT_STARTED') {
        return {
          stateName: eventPayload.skipBootMessage ? 'idle' : 'showMessage',
          stateData: INITIAL_DRO_STATE_DATA,
          vMem: statePayload.vMem,
        };
      }
      return statePayload;
    // ... other cases
    default:
      return null; // Not handled by this feature
  }
};
```

### Context Data (Discriminated Union)

Each feature can have its own context data type, discriminated by `stateDataType`:

```typescript
type DROStateData =
  | { stateDataType: 'none' }
  | { stateDataType: 'center-finding'; storedPoints: StoredPoint[]; centerResult: AxisValues | null }
  | { stateDataType: 'bolt-hole'; holeCount: number; radius: number; /* ... */ }
  | { stateDataType: 'arc'; /* ... */ };
```

### Hooks

```typescript
// Get current state string
const state = useDROState();  // 'idle' | 'function-menu-center' | ...

// Get context data
const data = useDROContext();  // { stateDataType: 'none' } | { stateDataType: 'center-finding', ... }

// Dispatch events
const dispatch = useDRODispatch();
dispatch({ eventName: 'BTN_FUNCTION' });

// Convenience hooks
const result = useCenterResult();      // AxisValues | null
const count = useStoredPointsCount();  // number
```

### Rationale

1. **Flat states** - Simple string union, exhaustive switch checking, easy debugging
2. **Feature reducers** - Each feature is isolated and testable independently
3. **Raw events** - Components emit blind key/button events; state machine decides meaning
4. **Discriminated context** - Type-safe feature data without nested state objects
5. **Single source of truth** - All operation state in one place, not spread across contexts

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

Types for DRO runtime state (does not include mill state or operation state):

```typescript
interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

type Axis = 'X' | 'Y' | 'Z';
type DatumMode = 'abs' | 'inc';

// Consumer-facing interface (what components see)
interface VolatileMemory {
  displayValues: AxisValues;
  absolute: AxisValues;
  incremental: AxisValues;
  mode: DatumMode;
  workOffsets: AxisValues;
  activeAxis: Axis | null;
}

// Internal state managed by the reducer
interface VolatileMemoryState {
  mode: DatumMode;
  activeAxis: Axis | null;
  workOffsets: AxisValues;
  incrementalValues: AxisValues;
  manualAbsoluteValues: AxisValues;
  inputBuffer: string;
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

Convenience hook that returns DRO memory state and actions:

```typescript
const vm = useVolatileMemory();

// Returns VolatileMemory & VolatileMemoryActions:
{
  displayValues,
  absolute,
  incremental,
  mode,
  workOffsets,
  activeAxis,
  toggleMode,
  setMode,
  zeroAxis,
  zeroAll,
  setAxisValue,
  selectAxis,
  halfAxis,
}
```

**Note:** For mill state (position, probe, connected), use `useMillState` instead.
**Note:** For operation state (boot, menus, center finding), use hooks from `dro-state-machine`.

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
const { nvMem, updateNvMem, resetMemory } = useNonVolatileMemory();
```

- Loads from `localStorage['el400-dro-non-volatile-memory']` on mount
- Debounces writes (300ms) to reduce I/O
- Works in both standalone and iframe contexts

### usePowerOnSequence (`src/hooks/usePowerOnSequence.ts`)

Manages the power-on display sequence:

```typescript
const { showPowerOnMessage, dismissPowerOnMessage } = usePowerOnSequence(durationMs);
```

### useInputBuffer (`src/hooks/useInputBuffer.ts`)

Manages numeric input accumulator for keypad entry:

```typescript
const { buffer, appendDigit, appendDecimal, toggleSign, clear, getValue } = useInputBuffer();
```

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

**Lifecycle:**
1. When `initialConnection` prop is provided or `setConnection` is called with a new connection
2. Context calls `connection.connect()` and sets `isConnecting: true`
3. On success: subscribes to connection updates, sets `isConnecting: false`
4. On failure: sets `error` with the connection error
5. On unmount or connection change: calls `connection.disconnect()` and unsubscribes

**Usage:**
```typescript
// Direct context access
const { millState, connection, setConnection } = useMillStateContext();

// Convenience hook (recommended)
const { millState } = useMillState();

// Check connection
if (millState.connected) {
  console.log(`Position: ${millState.position.x}, ${millState.position.y}`);
}
```

**Note:** VolatileMemoryContext consumes MillStateContext internally for DRO calculations. Components needing mill state should use `useMillState()` or `useMillStateContext()` directly.

### VolatileMemoryContext (`src/context/VolatileMemoryContext.tsx`)

Provides DRO memory to the component tree. Consumes mill state from MillStateContext internally for calculations:

```typescript
interface VolatileMemoryContextValue extends VolatileMemory, VolatileMemoryActions {}
```

Responsibilities:
- DRO memory (ABS/INC mode, work offsets, incremental values)
- Active axis selection
- Calculate display values from machine position and offsets

**Note:** Mill state (position, probe, connected, connection) is accessed via MillStateContext.
**Note:** Operation state (boot, menus, center finding) is accessed via DROProvider from `dro-state-machine`.

### NonVolatileMemoryContext (`src/context/NonVolatileMemoryContext.tsx`)

Provides settings to the component tree:

```typescript
interface UseNonVolatileMemoryReturn {
  nvMem: NonVolatileMemory;
  updateNvMem: (partial: Partial<NonVolatileMemory>) => void;
  resetMemory: () => void;
}
```

**Provider Order:** The contexts must be nested in this order:
1. NonVolatileMemoryProvider (outer) - no dependencies
2. MillStateProvider - receives connection, manages connection
3. VolatileMemoryProvider - consumes both MillState and NonVolatileMemory
4. DROProvider (inner) - operation state machine

```tsx
<NonVolatileMemoryProvider>
  <MillStateProvider initialConnection={connection}>
    <VolatileMemoryProvider>
      <DROProvider>
        {children}
      </DROProvider>
    </VolatileMemoryProvider>
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
```

### Integration Tests

```
src/components/PrimaryFunctionSection.integration.test.tsx
src/components/SecondaryFunctionSection.integration.test.tsx
src/components/AxisSelectionSection.integration.test.tsx
src/components/UnitConversion.integration.test.tsx
```

### E2E Tests

```
e2e/02-core-operations/US-003-abs-inc-mode.spec.ts
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
