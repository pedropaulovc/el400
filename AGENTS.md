# EL400 DRO Simulator

Web-based simulator of Electronica EL400 (MagXact MX-100M) digital readout for CNC mills.

## Quick Reference

| Category | Location |
|----------|----------|
| State Machine | `src/stores/dro/` (Zustand + reducer) |
| Feature Reducers | `src/stores/dro/features/` - boot, idle, keypad, calculator, etc. |
| Adapters | `src/adapters/` - CNCjs, Debug, Mock, NoOp |
| Types | `src/types/` - MillState, VolatileMemory, NonVolatileMemory |
| Components | `src/components/` - EL400Simulator root |
| User Stories | `project/user-stories/*` |
| Reference Manuals | `~/src/harmonic-analyzer/references/` (local git submodule of [harmonic-analyzer-references](https://github.com/pedropaulovc/harmonic-analyzer-references)) — OCR text under `el400-operation-manual/ocr/markdown.md`, `magxact-mx100m-mill-dro-manual/ocr/markdown.md`, and the video manual under `el400-dro-overview-video/MANUAL.md`. Read these locally instead of fetching from GitHub. |

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

### Git worktrees need their own `node_modules`

Each git worktree must have its **own** real `node_modules` — run `npm ci` once
after creating the worktree. A symlink won't do (Vite resolves it to the real
path). Unit tests and E2E tolerate a missing install (Node resolves up to the
main repo's `node_modules`), but **`test:storybook` does not**: Storybook runs
through Vitest browser mode, whose Vite server only serves files under the
worktree root, so deps resolving to a sibling `node_modules` fail. A
`pretest:storybook` guard (`scripts/check-worktree-deps.mjs`) catches this and
prints `Run: npm ci` instead of an opaque "Failed to fetch dynamically imported
module".

## Testing Exit Criteria

**All changes:** `npm run test:all` must pass
**New features:** 1-2 E2E tests + integration tests + unit tests

| Type | Pattern | Notes |
|------|---------|-------|
| Unit | `src/**/*.test.ts(x)` | Primary. Use Vitest + RTL |
| Integration | `*.integration.test.tsx` | Use `data-testid`, helpers in `src/tests/helpers/`. Test happy AND unhappy paths |
| E2E | `e2e/**/*.spec.ts` | Playwright. Critical flows only |
| Stories | `src/**/*.stories.tsx` | Visual docs only, no behavior tests |

### Debugging E2E test failures

If you are debugging Playwright E2E test errors, don't guess the root cause: fetch the `trace.zip` from the CI/CD build outputs or from the local tests output folder and run `npx playwright-trace-llm path/to/trace.zip -o ./trace-export` to export the trace into LLM-friendly Markdown and HTML. It contains all information available in the Playwright trace viewer.

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
CncjsMillAdapter | DebugMillAdapter | MockMillAdapter | NoOpMillAdapter
      ↑                    ↑
   Socket.IO          DebugServer (in-browser)
```

### Stores

```typescript
useDROStore: { stateName, stateData, vMem, display, dispatch }
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
- Internal: `BOOT_STARTED`, `BOOT_MESSAGE_TIMEOUT`, `ABS_INC_TOGGLE_COMPLETE`, `MILL_STATE_CHANGED`, `SET_INPUT_BUFFER`

### URL Config

```
/?source=cncjs&host=192.168.1.100&port=8000  # Remote CNCjs connection
/?source=mock                                  # Mock adapter (testing)
/?source=debug                                 # In-browser debug mode with control panel
/?source=manual                                # NoOp adapter (default)
```

**Debug Mode** (`?source=debug`):
- Uses DebugMillAdapter with in-browser DebugServer (no backend)
- Control panel: jog controls, probe toggle, event log
- Works on any static host (no backend required)

## DRO State Names

States are a **flat collection** (not nested). Each feature may define multiple states:

- Boot: `boot`, `boot-show-message`
- Idle: `idle`
- Mode Toggle: `abs-inc-mode`
- Calculator: `calculator-idle`, `calculator-add`, `calculator-sub`, `calculator-multi`, `calculator-div`
- Function Menu: `function-menu-center`, `function-menu-circle`, `function-menu-line`, `function-menu-linear`, `function-menu-polar`
- Center Finding: `function-menu-center-line-point-1/2`, `function-menu-center-line-result`, `function-menu-center-circle-point-1/2/3`, `function-menu-center-circle-result`
- Setup Menu: `setup-select` (SELECT prompt), `setup-parameter` (axis chosen, navigating params). Parameters live in a registry (`src/stores/dro/features/setup-parameters.ts`) — add a new setup option by appending one `SetupParameter` entry there; the navigation shell needs no changes. See the file header for the recipe.

## Core Types

```typescript
interface DROStatePayload {
  stateName: DROStateName;   // Flat enum - see section above
  stateData: DROStateData;   // Feature context (discriminated union)
  vMem: VolatileMemoryState;
  display: DisplayState;     // { X, Y, Z } - computed by reducers
}

interface MillState {
  position: { x: number; y: number; z: number };
  probe: { pinState: string; triggered: boolean };
  connected: boolean;
  controllerType: 'cncjs' | 'linuxcnc' | 'mock' | 'debug' | 'noop';
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
├── utils/              # displayComputation.ts - pure display utilities
└── features/           # boot, idle, keypad, calculator, abs-inc, inch-mm, etc.

src/adapters/
├── MillAdapter.ts         # Interface
├── CncjsMillAdapter.ts    # WebSocket to remote CNCjs server
├── DebugMillAdapter.ts    # In-browser debug mode (uses DebugServer)
├── MockMillAdapter.ts     # Test/dev simulation
└── NoOpMillAdapter.ts     # Manual mode fallback

src/debug/
├── DebugServer.ts         # In-browser debug server for demo mode
└── DebugServer.test.ts    # Debug server unit tests

src/components/debug/
├── DebugControlPanel.tsx  # Main debug panel (jog, probe, log)
├── DebugProbeControl.tsx  # Probe trigger/clear toggle
└── DebugEventLog.tsx      # Event log display
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
