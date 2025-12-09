# US-033: Six Output & Serial Communication

**Manual Reference:** Section 10.2 & 10.3
**Priority:** P5
**Category:** Auxiliary

## User Story
**As a** machine operator or system integrator
**I want** to utilize auxiliary outputs and serial communication
**So that** I can automate processes or log data

## Acceptance Criteria

### Six Output Function (6oP)
- [ ] **AC 33.1:** Access `6oP` function from menu.
- [ ] **AC 33.2:** Program up to 6 position-based outputs.
- [ ] **AC 33.3:** For each output, configure:
    - Target position
    - Output mode: `Pulse` (momentary) or `Continuous` (latched)
    - Pulse duration (if Pulse mode)
- [ ] **AC 33.4:** Output activates when axis reaches programmed position.
- [ ] **AC 33.5:** In Pulse mode, output deactivates after duration.
- [ ] **AC 33.6:** In Continuous mode, output stays active until manually reset.
- [ ] **AC 33.7:** Visual indicator shows which outputs are active.
- [ ] **AC 33.8:** Outputs can be enabled/disabled individually.

### Serial Communication
- [ ] **AC 33.9:** Configure serial port parameters (baud rate, parity, stop bits).
- [ ] **AC 33.10:** **Request mode (`SEr iAL`)**: Transmit data on request.
- [ ] **AC 33.11:** **Continuous mode (`SEr Con`)**: Transmit data continuously at set interval.
- [ ] **AC 33.12:** Data format includes axis positions, mode indicators, and status.
- [ ] **AC 33.13:** Support standard baud rates (2400, 4800, 9600, 19200, etc.).
- [ ] **AC 33.14:** Data can be received by PC or external device.
- [ ] **AC 33.15:** Error handling for communication failures.

## E2E Test Scenarios
```typescript
describe('US-033: Six Output & Serial Communication', () => {
  describe('Six Output Function', () => {
    test('Program output at specific position', async () => {
      await dro.pressKey('Fn');
      await dro.selectMenuOption('6oP');
      await dro.pressKey('ENT');

      // Select output number (1-6)
      await dro.enterNumber(1);
      await dro.pressKey('ENT');

      // Select axis
      await dro.pressKey('X');

      // Enter target position
      await dro.enterNumber(100.0);
      await dro.pressKey('ENT');

      // Select mode: Pulse
      await dro.selectMenuOption('Pulse');
      await dro.pressKey('ENT');

      // Enter pulse duration (ms)
      await dro.enterNumber(500);
      await dro.pressKey('ENT');

      await await expect(dro.display.xAxis).toHaveText('Stored');
    });

    test('Output activates at programmed position', async () => {
      // Program output 1 at X=100, Pulse mode, 500ms
      await dro.programOutput(1, 'X', 100.0, 'Pulse', 500);

      // Move to position
      await dro.simulateEncoderMove('X', 100.0);

      // Output should activate
      await expect(dro.output1).toBeActive();

      // Wait for pulse duration
      await dro.wait(500);

      // Output should deactivate
      await expect(dro.output1).toBeInactive();
    });

    test('Continuous mode output', async () => {
      // Program output 2 at Y=50, Continuous mode
      await dro.programOutput(2, 'Y', 50.0, 'Continuous');

      // Move to position
      await dro.simulateEncoderMove('Y', 50.0);

      // Output activates and stays on
      await expect(dro.output2).toBeActive();

      // Move away
      await dro.simulateEncoderMove('Y', 60.0);

      // Output still active (continuous mode)
      await expect(dro.output2).toBeActive();

      // Manual reset required
      await dro.resetOutput(2);
      await expect(dro.output2).toBeInactive();
    });
  });

  describe('Serial Communication', () => {
    test('Configure serial port', async () => {
      await dro.pressKey('Setup');
      await dro.selectMenuOption('Serial');
      await dro.pressKey('ENT');

      // Set baud rate
      await dro.selectMenuOption('Baud');
      await dro.pressKey('ENT');
      await dro.selectMenuOption('9600');
      await dro.pressKey('ENT');

      // Set parity
      await dro.selectMenuOption('Parity');
      await dro.pressKey('ENT');
      await dro.selectMenuOption('None');
      await dro.pressKey('ENT');

      await await expect(dro.display.xAxis).toHaveText('Saved');
    });

    test('Request mode - transmit on demand', async () => {
      // Configure Request mode
      await dro.configureSerialMode('SEr iAL');

      // Connect serial listener
      const serialData = [];
      dro.onSerialData((data) => serialData.push(data));

      // Request transmission
      await dro.pressKey('Send'); // Or specific key combo

      // Should receive current position data
      await dro.wait(100);
      expect(serialData.length).toBeGreaterThan(0);
      expect(serialData[0]).toMatch(/X:[\d\.-]+,Y:[\d\.-]+,Z:[\d\.-]+/);
    });

    test('Continuous mode - automatic transmission', async () => {
      // Configure Continuous mode with 1-second interval
      await dro.configureSerialMode('SEr Con', 1000);

      const serialData = [];
      dro.onSerialData((data) => serialData.push(data));

      // Wait for multiple transmissions
      await dro.wait(3500);

      // Should have received ~3 transmissions
      expect(serialData.length).toBeGreaterThanOrEqual(3);
    });

    test('Data format includes all axis positions', async () => {
      await dro.simulateEncoderMove('X', 123.456);
      await dro.simulateEncoderMove('Y', 78.910);
      await dro.simulateEncoderMove('Z', -45.678);

      await dro.configureSerialMode('SEr iAL');

      const data = await dro.requestSerialData();

      expect(data).toContain('123.456');
      expect(data).toContain('78.910');
      expect(data).toContain('-45.678');
    });
  });
});
```

## Implementation Notes

### Six Output Function
- **Hardware requirements**: 6 digital output pins
- **Output types**: Relay, solid-state, or TTL level
- **Use cases**:
  - Activate coolant at specific Z depth
  - Trigger tool change at position
  - Stop spindle at drilling depth
  - Activate part ejector
  - Control external equipment

- **Implementation**:
  - Store output configurations in non-volatile memory
  - Monitor axis positions in real-time
  - Trigger outputs when position criteria met
  - Handle hysteresis to prevent output flutter

### Serial Communication
- **Protocol**: RS-232 or RS-485
- **Data format**: ASCII or binary
- **Typical format**: `X:123.4567,Y:78.9012,Z:-45.6789,ABS,MM`
- **Baud rates**: 2400, 4800, 9600, 19200, 38400, 57600, 115200
- **Use cases**:
  - Data logging to PC
  - Integration with SPC software
  - Remote monitoring
  - CNC program generation
  - Quality control documentation

- **Implementation**:
  - Use Web Serial API for browser implementation
  - Format data with axis values, mode, units
  - Include timestamp if needed
  - Handle buffer overflow
  - Provide error recovery

## Related Stories
- US-032: Touch Probe (uses similar position-based triggering)
- US-011: SDM Run Mode (could trigger outputs at each step)
- US-016-020: Pattern generation (could use outputs for each hole)
- US-027: Setup Menu - Save Changes (persist configurations)

## Notes
- New story from G-028 (Gemini-only)
- Assigned ID US-033 to continue Claude numbering sequence
- Priority P5 (advanced/specialized feature)
- Requires hardware support (output pins, serial port)
- More relevant for production/automation scenarios
- Six Output and Serial are related but distinct features, combined in one story per G-028
