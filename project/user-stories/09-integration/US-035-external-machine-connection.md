# US-035: External Machine Connection

**Priority:** P1
**Category:** Integration
**Source:** Data Interface Architecture

## User Story

**As a** machinist using CNCjs or another G-code sender
**I want** the DRO to display live position data from my CNC controller
**So that** I can use the DRO's advanced functions while machining with real-time position feedback

## Acceptance Criteria

- [ ] AC35.1: When connected to CNCjs, the DRO displays live X, Y, Z positions from the machine
- [ ] AC35.2: Position updates appear within 100ms of actual machine movement
- [ ] AC35.3: A visual indicator shows connection status (connected/disconnected)
- [ ] AC35.4: When disconnected, the DRO continues to function in manual mode
- [ ] AC35.5: Connection parameters can be specified via URL (host, port)
- [ ] AC35.6: The DRO works as a CNCjs widget embedded in an iframe

## Background

Traditional DRO units require dedicated hardware encoders. This integration allows the simulator to receive position data from CNC controllers through their native interfaces, enabling use with any machine that has a supported G-code sender.

## Supported Controllers

| Controller | Position Data | Probe State |
|------------|--------------|-------------|
| GRBL       | Yes          | Yes         |
| GrblHAL    | Yes          | Yes         |
| TinyG      | Yes          | Yes         |
| Smoothie   | Yes          | No          |
| Marlin     | Yes          | No          |

## E2E Test Scenarios

```typescript
describe('US-035: External Machine Connection', () => {
  test('displays position from mock adapter', async ({ page }) => {
    // Navigate with mock data source
    await page.goto('/?source=mock');

    // Mock adapter simulates movement
    // Verify position displays update
    await expect(page.getByTestId('x-display')).toContainText('1.234');
  });

  test('shows connection status indicator', async ({ page }) => {
    await page.goto('/?source=mock');

    // Connected state
    await expect(page.getByTestId('connection-indicator')).toHaveAttribute('data-connected', 'true');
  });

  test('continues working when disconnected', async ({ page }) => {
    await page.goto('/'); // No source = manual mode

    // Should still be able to enter values manually
    await page.click('[data-testid="axis-select-x"]');
    await page.click('[data-testid="key-1"]');
    await page.click('[data-testid="key-enter"]');

    await expect(page.getByTestId('x-display')).toContainText('1');
  });

  test('parses URL parameters for connection', async ({ page }) => {
    // URL params configure data source
    await page.goto('/?source=cncjs&host=192.168.1.100&port=8000');

    // Verify adapter was created with correct config
    // (Implementation-specific verification)
  });
});
```

## Implementation Notes

- **Data flow**: Controller -> CNCjs WebSocket -> Adapter -> MachineStateContext -> UI
- **URL params**: `?source=cncjs&host=localhost&port=8000`
- **Fallback**: Manual mode when no source specified or connection fails
- **Iframe context**: Works within CNCjs widget system (same-origin localStorage)

## Related Stories

- US-003: ABS/INC Mode (uses position data for display)
- US-032: Touch Probe (probe state integration)
- US-036: Settings Persistence (stores preferences)
