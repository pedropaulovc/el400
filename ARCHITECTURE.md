# EL400 DRO Architecture

Technical documentation for developers working on the EL400 DRO simulator.

## Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     EL400Simulator                              │
│  (consumes MachineState via useMachineState hook)               │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    MachineStateContext                          │
│  - Provides current MachineState                                │
│  - Manages active adapter                                       │
│  - Handles connection lifecycle                                 │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    MachineAdapter (Interface)                   │
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

## Core Types

### MachineState (`src/types/machine.ts`)

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

interface MachineState {
  position: MachinePosition;       // Absolute machine coordinates
  workPosition?: MachinePosition;  // Work coordinates (if available)
  probe: ProbeState;
  connected: boolean;
  controllerType: ControllerType;
}

type ControllerType = 'cncjs' | 'linuxcnc' | 'mock' | 'manual';
```

### DROSettings (`src/types/settings.ts`)

```typescript
interface DROSettings {
  beepEnabled: boolean;        // Audio feedback on button press
  defaultUnit: 'inch' | 'mm';  // Default unit on startup
  precision: number;           // Decimal places (e.g., 4 for 0.0001)
}
```

## Adapters

### MachineAdapter Interface (`src/adapters/MachineAdapter.ts`)

All adapters implement this interface:

```typescript
interface MachineAdapter {
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

### useDROMemory (`src/hooks/useDROMemory.ts`)

Manages separate ABS and INC value storage with automatic offset calculation:

```typescript
const droMemory = useDROMemory(machineState);

// Returns:
{
  displayValues: AxisValues;  // Current values based on mode
  absolute: AxisValues;       // ABS values
  incremental: AxisValues;    // INC values
  mode: 'abs' | 'inc';
  toggleMode: () => void;
  setMode: (mode: DROMode) => void;
  zeroAxis: (axis: Axis) => void;
  zeroAll: () => void;
  setAxisValue: (axis: Axis, value: number) => void;
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

### useSettings (`src/hooks/useSettings.ts`)

Manages DRO settings with localStorage persistence:

```typescript
const { settings, updateSettings, resetSettings } = useSettings();
```

- Loads from `localStorage['el400-dro-settings']` on mount
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

### MachineStateContext (`src/context/MachineStateContext.tsx`)

Provides machine state to the component tree:

```typescript
interface MachineStateContextValue {
  state: MachineState;
  adapter: MachineAdapter | null;
  isConnecting: boolean;
  error: Error | null;
  setAdapter: (adapter: MachineAdapter | null) => void;
}
```

### SettingsContext (`src/context/SettingsContext.tsx`)

Provides settings to the component tree:

```typescript
interface SettingsContextValue {
  settings: DROSettings;
  updateSettings: (partial: Partial<DROSettings>) => void;
  resetSettings: () => void;
}
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
src/hooks/__tests__/useDROMemory.test.ts
src/hooks/__tests__/useMachineState.test.tsx
src/hooks/__tests__/useSettings.test.ts
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
