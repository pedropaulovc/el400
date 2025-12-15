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
│  - Consumes MachineState    │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
          ▲
          │
┌─────────────────────────────────────────────────────────────────┐
│                   MachineStateContext                            │
│  - Adapter lifecycle (connect/disconnect)                       │
│  - Machine state from adapter                                   │
│  - Connection status (isConnecting, error)                      │
└─────────────────────────────────────────────────────────────────┘
          ▲
          │
┌─────────────────────────────────────────────────────────────────┐
│                   MachineConnection (Interface)                  │
│  - connect(): Promise<void>                                     │
│  - disconnect(): void                                           │
│  - subscribe(callback): unsubscribe                             │
│  - getState(): MachineState                                     │
└─────────────────────────────────────────────────────────────────┘
                              ▲
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ CncjsAdapter    │ │ LinuxCncAdapter │ │ MockAdapter     │
│ (WebSocket)     │ │ (future)        │ │ (for testing)   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Memory Model

The DRO uses two types of memory:

### Volatile Memory
Runtime state that is lost on refresh. Split across two contexts:

**MachineStateContext:**
- Machine position from external adapter
- Probe state
- Connection state and errors
- Adapter lifecycle

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

### MachineState (`src/types/machineState.ts`)

Types for machine data from external adapters:

```typescript
interface MachinePosition {
  x: number;
  y: number;
  z: number;
}

interface ProbeState {
  pinState: string;    // Raw: '', 'P', 'XP', 'XYZPD'
  triggered: boolean;  // Derived: pinState.includes('P')
}

type ControllerType = 'cncjs' | 'linuxcnc' | 'mock' | 'manual';

interface MachineState {
  position: MachinePosition;
  workPosition?: MachinePosition;
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

Types for DRO runtime state:

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
  // Machine state (from MachineStateContext)
  machinePosition: MachinePosition;
  workPosition?: MachinePosition;
  probe: ProbeState;
  connected: boolean;
  controllerType: ControllerType;

  // DRO memory (internal)
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

### MachineConnection Interface (`src/adapters/MachineConnection.ts`)

All adapters implement this interface:

```typescript
interface MachineConnection {
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(listener: MachineStateListener): () => void;
  getState(): MachineState;
  readonly controllerType: ControllerType;
}
```

### CncjsAdapter (`src/adapters/CncjsAdapter.ts`)

Connects to CNCjs via Socket.IO and normalizes data from multiple controllers:

| Controller | Position Source | Probe State |
|------------|----------------|-------------|
| GRBL | `status.mpos[]` array | `status.pn` contains 'P' |
| GrblHAL | `status.mpos[]` array | `status.substate.probe > 0` |
| TinyG | `sr.posx/posy/posz` | `sr.prb === 1` |
| Smoothie | `status.pos{}` object | Not available |
| Marlin | `status.pos{}` object | Not available |

### MockAdapter (`src/adapters/MockAdapter.ts`)

Simulates machine movement for testing and development. Useful for:
- Unit tests
- Storybook stories
- Development without hardware

## Hooks

### useVolatileMemory (`src/hooks/useVolatileMemory.ts`)

Convenience hook that returns the full volatile memory context:

```typescript
const vm = useVolatileMemory();

// Returns VolatileMemory & VolatileMemoryActions:
{
  machinePosition,
  probe,
  connected,
  controllerType,
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

### MachineStateContext (`src/context/MachineStateContext.tsx`)

Manages adapter lifecycle and machine state from external data sources:

```typescript
interface MachineStateContextValue {
  machineState: MachineState;
  adapter: MachineConnection | null;
  isConnecting: boolean;
  error: Error | null;
  setAdapter: (adapter: MachineConnection | null) => void;
}
```

Responsibilities:
- Adapter connect/disconnect lifecycle
- Subscribe to adapter state updates
- Track connection status and errors

### VolatileMemoryContext (`src/context/VolatileMemoryContext.tsx`)

Provides DRO memory to the component tree. Consumes machine state from MachineStateContext:

```typescript
interface VolatileMemoryContextValue extends VolatileMemory, VolatileMemoryActions {
  adapter: MachineConnection | null;
  isConnecting: boolean;
  error: Error | null;
  setAdapter: (adapter: MachineConnection | null) => void;
}
```

Responsibilities:
- DRO memory (ABS/INC mode, work offsets, incremental values)
- Active axis selection
- Boot sequence state machine
- Calculate display values from machine position and offsets

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
2. MachineStateProvider - receives adapter, manages connection
3. VolatileMemoryProvider (inner) - consumes both MachineState and NonVolatileMemory

```tsx
<NonVolatileMemoryProvider>
  <MachineStateProvider initialAdapter={adapter}>
    <VolatileMemoryProvider>
      {children}
    </VolatileMemoryProvider>
  </MachineStateProvider>
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

The CncjsAdapter subscribes to these Socket.IO events:

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
src/adapters/__tests__/MockAdapter.test.ts
src/adapters/__tests__/CncjsAdapter.test.ts
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
src/stories/MachineState.stories.tsx
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
