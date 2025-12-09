# US-031: Error Compensation

**Manual Reference:** Section 6.3 Error Compensation
**Priority:** P5
**Category:** Configuration

## User Story
**As a** machine installer or technician
**I want** to compensate for mechanical inaccuracies (Linear or Non-Linear)
**So that** the displayed position is accurate to the standard

## Acceptance Criteria
- [ ] **AC 31.1:** Navigate to `CALib` menu in setup.
- [ ] **AC 31.2:** **Linear Error Compensation (LEC)**:
    - Measure a known reference length (e.g., slip gauge)
    - Input the reference length
    - System calculates correction factor
    - Factor applied uniformly across axis travel
- [ ] **AC 31.3:** **Segmented Linear Error Compensation (SLEC)**:
    - Divide axis travel into segments (up to 99 segments)
    - Store individual correction for each segment
    - More accurate for non-linear errors
- [ ] **AC 31.4:** **Angular Error Compensation**:
    - For rotary axes
    - 360° rotation method or PPR (Pulses Per Revolution) method
- [ ] **AC 31.5:** Compensation can be enabled/disabled per axis.
- [ ] **AC 31.6:** Compensation values persist after power cycle.
- [ ] **AC 31.7:** Press `C` to exit calibration mode.

## E2E Test Scenarios
```typescript
describe('US-031: Error Compensation', () => {
  test('Linear Error Compensation (LEC)', async () => {
    // Enter setup/calibration menu
    await dro.pressKey('Setup');
    await dro.selectMenuOption('CALib');
    await dro.pressKey('ENT');

    // Select axis
    await dro.pressKey('X');

    // Select LEC mode
    await dro.selectMenuOption('LEC');
    await dro.pressKey('ENT');

    // Measure known distance (e.g., 100mm slip gauge)
    // Display shows measured: 100.05mm
    await dro.simulateEncoderMove('X', 100.05);

    // Enter reference value
    await dro.enterNumber(100.00);
    await dro.pressKey('ENT');

    // System calculates and stores correction factor
    // Factor = 100.00 / 100.05 = 0.9995
    await await expect(dro.display.xAxis).toHaveText('Stored');
  });

  test('Segmented Linear Error Compensation (SLEC)', async () => {
    await dro.pressKey('Setup');
    await dro.selectMenuOption('CALib');
    await dro.pressKey('ENT');
    await dro.pressKey('X');

    // Select SLEC mode
    await dro.selectMenuOption('SLEC');
    await dro.pressKey('ENT');

    // Enter number of segments (e.g., 10 segments across 1000mm)
    await dro.enterNumber(10);
    await dro.pressKey('ENT');

    // For each segment, enter correction value
    // Segment 1 at 0-100mm
    await dro.enterNumber(0.01); // +0.01mm correction
    await dro.pressKey('ENT');

    // Continue for each segment...
    // Segment 2 at 100-200mm
    await dro.enterNumber(-0.02); // -0.02mm correction
    await dro.pressKey('ENT');

    // etc.
  });

  test('Enable/Disable compensation per axis', async () => {
    await dro.pressKey('Setup');
    await dro.selectMenuOption('CALib');
    await dro.pressKey('ENT');

    // Select axis
    await dro.pressKey('X');

    // Toggle compensation ON/OFF
    await dro.selectMenuOption('Enable');
    await dro.pressKey('ENT');

    await await expect(dro.display.xAxis).toHaveText('ON');
  });
});
```

## Implementation Notes
- **Linear Error Compensation (LEC)**: Single correction factor for entire axis
  - Best for uniform errors (e.g., scale factor error)
  - Simple to configure
  - Formula: Corrected = Measured × Factor

- **Segmented Linear Error Compensation (SLEC)**: Different correction per segment
  - Best for non-linear errors (e.g., lead screw pitch errors)
  - More complex to configure
  - Requires calibration at multiple points

- **Angular Error Compensation**: For rotary axes
  - Compensates for encoder indexing errors
  - Can use full 360° rotation or PPR method

- **Implementation considerations**:
  - Store compensation tables in non-volatile memory
  - Apply compensation in real-time to encoder counts
  - Provide calibration wizard UI
  - Support import/export of compensation tables

- **Typical use cases**:
  - New machine calibration
  - Periodic recalibration for wear compensation
  - High-precision machining requirements
  - Compliance with ISO/ANSI standards

## Related Stories
- US-021: Setup Menu - Scale Resolution
- US-022: Setup Menu - Display Resolution
- US-027: Setup Menu - Save Changes (persistence)
- US-028: Setup Menu - Restore Factory Defaults

## Notes
- New story from G-026 (Gemini-only)
- Assigned ID US-031 to continue Claude numbering sequence
- Priority P5 (advanced configuration) matches other setup stories
- Typically performed by technician, not end-user operator
- Critical for high-precision applications
