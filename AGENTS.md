# Project Overview

This is a faithful, touch-friendly web-based simulator of the Electronica EL400 (a.k.a. MagXact MX-100M) digital readout (DRO) system for CNC milling machines.

## Tech Stack

- **Build Tool:** Vite
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React hooks (useState, useCallback) - no external state library
- **Data Fetching:** @tanstack/react-query
- **Routing:** react-router-dom
- **Comprehensive testing**: Unit tests (Vitest), E2E tests (Playwright), component docs (Storybook)

## Development Commands

```bash
npm run dev
npm run build
npm run build:dev
npm preview
npm run lint
npm run storybook
npm run build-storybook
npm run test-storybook
npm run test:ui # TODO Unit tests
npm run test:e2e` # TODO Playwright
```

## Architecture

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

### Component Structure
*   **Path:** `src/components`
*   **Pattern:** Functional components using React Hooks (`useState`, `useCallback`).
*   **Styling:** Utility-first CSS using Tailwind classes directly in JSX.
*   **Isolation:** Complex UI elements like the DRO display (`EL400Simulator.tsx`) are composed of smaller sub-components (e.g., `DisplayPanel`, `KeypadSection`).