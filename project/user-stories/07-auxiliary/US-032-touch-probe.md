# US-032: Touch Probe

**Manual Reference:** Section 10.1 Touch Probe Functions
**Priority:** P4
**Category:** Auxiliary

## User Story
**As a** machine operator
**I want** to use a touch probe to set datums
**So that** I can accurately locate workpiece edges and centers

## Acceptance Criteria
- [ ] **AC 32.1:** Configure probe mode: `dro T` (Transmit) or `dro F` (Freeze).
- [ ] **AC 32.2:** **Transmit mode (`dro T`)**: DRO continues counting, probe signal sets datum.
- [ ] **AC 32.3:** **Freeze mode (`dro F`)**: DRO freezes display on probe contact.
- [ ] **AC 32.4:** **Probe Edge function (`ProbE Ed`)**: Find workpiece edge.
- [ ] **AC 32.5:** **Probe Midpoint function (`ProbE nd`)**: Find midpoint between two edges.
- [ ] **AC 32.6:** **Inside/Outside functions**: `inSidE` (internal dimension), `oUtSidE` (external dimension).
- [ ] **AC 32.7:** On trigger, system freezes display or sets datum based on configuration.
- [ ] **AC 32.8:** Visual/audible indication when probe is triggered.
- [ ] **AC 32.9:** Probe input detected via dedicated input pin.
- [ ] **AC 32.10:** Press `C` to exit probe function.

## E2E Test Scenarios
```typescript
describe('US-032: Touch Probe', () => {
  test('Configure probe in Freeze mode', async () => {
    await dro.pressKey('Setup');
    await dro.selectMenuOption('Probe');
    await dro.pressKey('ENT');

    // Select Freeze mode
    await dro.selectMenuOption('dro F');
    await dro.pressKey('ENT');

    await await expect(dro.display.xAxis).toHaveText('Freeze');
  });

  test('Probe Edge function', async () => {
    // Configure probe in Transmit mode
    await dro.pressKey('Fn');
    await dro.selectMenuOption('ProbE');
    await dro.pressKey('ENT');

    // Select Edge function
    await dro.selectMenuOption('Ed');
    await dro.pressKey('ENT');

    // Select axis
    await dro.pressKey('X');

    // Simulate probe movement
    await dro.simulateEncoderMove('X', 50.0);

    // Simulate probe contact
    await dro.simulateProbeContact();

    // X axis should be set to zero (or current position stored)
    await expect(dro.display.xAxis).toHaveValue(0.000);
  });

  test('Probe Midpoint function', async () => {
    await dro.pressKey('Fn');
    await dro.selectMenuOption('ProbE');
    await dro.pressKey('ENT');

    // Select Midpoint function
    await dro.selectMenuOption('nd');
    await dro.pressKey('ENT');

    // Select axis
    await dro.pressKey('X');

    // Touch first edge
    await dro.simulateEncoderMove('X', 10.0);
    await dro.simulateProbeContact();

    // Touch second edge
    await dro.simulateEncoderMove('X', 50.0);
    await dro.simulateProbeContact();

    // Midpoint = (10 + 50) / 2 = 30
    // Display should show distance to midpoint
    await expect(dro.display.xAxis).toHaveValue(30.000);
  });

  test('Inside diameter measurement', async () => {
    await dro.pressKey('Fn');
    await dro.selectMenuOption('ProbE');
    await dro.pressKey('ENT');

    // Select Inside function
    await dro.selectMenuOption('inSidE');
    await dro.pressKey('ENT');

    // Enter probe tip diameter
    await dro.enterNumber(6.0); // 6mm probe
    await dro.pressKey('ENT');

    // Touch first inside wall
    await dro.simulateEncoderMove('X', 10.0);
    await dro.simulateProbeContact();

    // Touch opposite inside wall
    await dro.simulateEncoderMove('X', 60.0);
    await dro.simulateProbeContact();

    // Inside diameter = (60 - 10) + 6 = 56mm
    await await expect(dro.display.xAxis).toHaveText('56.000');
  });

  test('Outside diameter measurement', async () => {
    await dro.pressKey('Fn');
    await dro.selectMenuOption('ProbE');
    await dro.pressKey('ENT');

    // Select Outside function
    await dro.selectMenuOption('oUtSidE');
    await dro.pressKey('ENT');

    // Enter probe tip diameter
    await dro.enterNumber(6.0);
    await dro.pressKey('ENT');

    // Touch first outside surface
    await dro.simulateEncoderMove('X', 0.0);
    await dro.simulateProbeContact();

    // Touch opposite outside surface
    await dro.simulateEncoderMove('X', 50.0);
    await dro.simulateProbeContact();

    // Outside diameter = (50 - 0) - 6 = 44mm
    await await expect(dro.display.xAxis).toHaveText('44.000');
  });

  test('Freeze mode halts display on contact', async () => {
    // Configure Freeze mode
    await dro.configureProbeMode('Freeze');

    await dro.simulateEncoderMove('X', 25.0);
    await dro.simulateProbeContact();

    // Display should freeze at contact point
    await expect(dro.display.xAxis).toHaveValue(25.000);

    // Continue moving (display should not update)
    await dro.simulateEncoderMove('X', 30.0);
    await expect(dro.display.xAxis).toHaveValue(25.000);
  });
});
```

## Implementation Notes
- **Probe input**: Typically connected to dedicated input pin
- **Signal types**:
  - Normally Open (NO) or Normally Closed (NC)
  - Configurable in setup

- **Probe tip diameter compensation**:
  - For inside measurements: Add probe diameter
  - For outside measurements: Subtract probe diameter

- **Typical workflow**:
  1. Select probe function
  2. Select axis
  3. Approach workpiece slowly
  4. Probe makes contact
  5. DRO sets datum or freezes display
  6. Retract probe
  7. Repeat for other edges if needed

- **Safety considerations**:
  - Slow approach speed to avoid damage
  - Visual/audible feedback on contact
  - Override to cancel operation

- **Use cases**:
  - Finding workpiece edges
  - Centering on holes or bosses
  - Measuring diameters
  - Setting work coordinate systems

## Related Stories
- US-007: Center Finding (Manual Method)
- US-015: Center of Circle (Macro)
- US-005: Zeroing Individual Axes
- US-006: Half Function

## Notes
- New story from G-027 (Gemini-only)
- Assigned ID US-032 to continue Claude numbering sequence
- Priority P4 (important auxiliary feature)
- Requires hardware support (probe input)
- Critical for precision work
