# EL400 DRO Architecture

Technical documentation for developers working on the EL400 DRO simulator.

## Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     EL400Simulator                              │
│  (consumes VolatileMemory via useVolatileMemory hook)           │
└─────────────────────────────────────────────────────────────────┘
                              ▲
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   VolatileMemoryContext     │   │  NonVolatileMemoryContext   │
│  - DRO memory (ABS/INC)     │   │  - Persisted settings       │
│  - activeAxis, workOffsets  │   │  - beepEnabled, defaultUnit │
│  - Boot sequence state      │   │  - localStorage persistence │
│  - Consumes MillState       │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
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

The DRO uses two types of memory:

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
- Boot sequence state

### Non-Volatile Memory
Persisted settings saved to localStorage. Includes:
- Default unit (inch/mm)
- Beep enabled
- Display precision

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

Types for DRO runtime state (does not include mill state - use MillStateContext for that):

```typescript
interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

type Axis = 'X' | 'Y' | 'Z';
type DatumMode = 'abs' | 'inc';
type BootStage = 'boot' | 'showMessage' | 'run';

interface VolatileMemory {
  displayValues: AxisValues;
  absolute: AxisValues;
  incremental: AxisValues;
  mode: DatumMode;
  workOffsets: AxisValues;
  activeAxis: Axis | null;
  bootStage: BootStage;
}

interface VolatileMemoryActions {
  toggleMode: () => void;
  setMode: (mode: DatumMode) => void;
  zeroAxis: (axis: Axis) => void;
  zeroAll: () => void;
  setAxisValue: (axis: Axis, value: number) => void;
  selectAxis: (axis: Axis | null) => void;
  halfAxis: (axis: Axis) => void;
  clearKeyPressed: () => void;
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
  bootStage,
  toggleMode,
  setMode,
  zeroAxis,
  zeroAll,
  setAxisValue,
  selectAxis,
  halfAxis,
  clearKeyPressed,
}
```

**Note:** For mill state (position, probe, connected), use `useMillState` instead.

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
  connection: MillConnection | null; // Current connection instance
  isConnecting: boolean;           // True while connection.connect() is pending
  error: Error | null;             // Connection error, if any
  setConnection: (connection: MillConnection | null) => void; // Switch connections
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
- Boot sequence state machine
- Calculate display values from machine position and offsets

**Note:** Mill state (position, probe, connected, connection) is accessed via MillStateContext, not VolatileMemoryContext.

### NonVolatileMemoryContext (`src/context/NonVolatileMemoryContext.tsx`)

Provides settings to the component tree:

```typescript
interface NonVolatileMemoryContextValue {
  memory: NonVolatileMemory;
  updateMemory: (partial: Partial<NonVolatileMemory>) => void;
  resetMemory: () => void;
}
```

**Provider Order:** The contexts must be nested in this order:
1. NonVolatileMemoryProvider (outer) - no dependencies
2. MillStateProvider - receives connection, manages connection
3. VolatileMemoryProvider (inner) - consumes both MillState and NonVolatileMemory

```tsx
<NonVolatileMemoryProvider>
  <MillStateProvider initialConnection={connection}>
    <VolatileMemoryProvider>
      {children}
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
