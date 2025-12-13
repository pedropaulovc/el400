# Project Overview

This is a faithful, touch-friendly web-based simulator of the Electronica EL400 (a.k.a. MagXact MX-100M) digital readout (DRO) system for CNC milling machines.

## Tech Stack

- **Build Tool:** Vite
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context + hooks (MachineStateContext, SettingsContext)
- **Data Fetching:** @tanstack/react-query
- **Routing:** react-router-dom
- **Real-time:** socket.io-client (CNCjs integration)
- **Unit Testing:** Vitest + @testing-library/react + jsdom
- **E2E Testing:** Playwright with Page Object Model
- **Component Testing:** Storybook

## Development Commands

```bash
# Development
npm run dev
npm run build
npm run build:dev
npm run preview
npm run lint

# Testing
npm run test
npm run test:ui
npm run test:watch
npm run test:coverage
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:debug
npm run test:all

# Storybook
npm run storybook
npm run build-storybook
npm run test-storybook
```

## Testing Strategy

- **Vitest** (`src/**/*.test.tsx`) - Component behavior, logic, interactions, accessibility. Primary test infrastructure.
- **Integration** (`*.integration.test.tsx`) - Use helpers from `src/tests/helpers/simulator-test-utils.tsx`. Use `data-testid`, not roles/labels.
- **Playwright** (`e2e/**/*.spec.ts`) - End-to-end user workflows and journeys.
- **Storybook** (`src/**/*.stories.tsx`) - Visual documentation only. Avoid duplicating behavioral tests.
- **Coverage:** Min 70% enforced. Run `npm run test:coverage`.

## Project Management

User stories with acceptance tests are preserved in `project/user-stories/*`

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed data flow and adapter implementation.

### Data Interface

- **Adapters** (`src/adapters/`): CNCjs, Mock, Manual - implement `MachineAdapter` interface
- **Contexts** (`src/context/`): `MachineStateContext` (positions), `SettingsContext` (persisted prefs)
- **Hooks** (`src/hooks/`): `useDROMemory` (ABS/INC switching), `useSettings`, `useMachineState`
- **URL config**: `?source=cncjs&host=localhost&port=8000` or `?source=mock`

### Component Structure

The application follows a hierarchical component structure with the main simulator at the root:

**Major Component Sections:**
- `src/pages/Index.tsx` - Renders the `EL400Simulator` with styling wrapper
- `EL400Simulator.tsx` - Root component
- `DisplayPanel` - Seven-segment displays for X/Y/Z axes plus mode indicators
- `AxisPanelSection` - Axis selection buttons (X, Y, Z) and zero buttons
- `KeypadSection` - Numeric keypad with navigation arrows
- `PrimaryFunctionSection` - Primary DRO functions (settings, calibrate, center, zero all)
- `SecondaryFunctionSection` - Advanced functions (tool offset, bolt circle, linear pattern, half, SDM)

## Key Implementation Details

### Accessibility

Components include:
- ARIA labels and roles
- Keyboard navigation support
- Focus ring indicators
- Screen reader support (sr-only class for hidden labels)
- High contrast support (forced-colors)

### Component Structure
*   **Path:** `src/components`
*   **Pattern:** Functional components using React Hooks (`useState`, `useCallback`).
*   **Styling:** Utility-first CSS using Tailwind classes directly in JSX.
*   **Isolation:** Complex UI elements like the DRO display (`EL400Simulator.tsx`) are composed of smaller sub-components (e.g., `DisplayPanel`, `KeypadSection`).
