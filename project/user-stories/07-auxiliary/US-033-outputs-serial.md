# US-033: Six Output and Serial Communication

**Manual Reference:** EL400 Operation Manual §6.2, §10.2, and §10.3, pp. 20–21 and 77–82
**Priority:** P5
**Category:** Auxiliary

## User Story

**As a** machine operator or system integrator  
**I want** faithful six-output and serial simulations  
**So that** I can practise EL400 programming and inspect the data that physical optional interfaces would produce

## Target Acceptance Criteria

### Six-output function

- [ ] **AC 33.1 — Entry and programming:** The Function menu provides `6oP`, initially showing `rUn` as in the primary manual; Right selects `ProGrAn`, ENTER selects a count from 1 through 6, then the operator records an axis and numeric threshold for each slot. Returning to `rUn` executes the program.
- [ ] **AC 33.2 — Signal mode:** Setup selects one global six-output mode, `PULSE` or `Cont`. There is no invented per-output mode or operator-configurable pulse duration.
- [ ] **AC 33.3 — Continuous semantics:** In `Cont`, each output is high while the current selected-axis tool position is greater than its programmed threshold and low while it is less. It is a level comparator, not a latch requiring manual reset.
- [ ] **AC 33.4 — Pulse semantics:** In `PULSE`, crossing a programmed threshold in either direction emits a logical pulse. The simulator keeps the visible pulse high for 1000 ms so it can be inspected; this fixed visualization is not a configurable duration or a claim about physical hardware timing.
- [ ] **AC 33.5 — Run indication and exit:** `rUn` evaluates all six programmed outputs, shows the terminal decimal-point indication described in §10.2, and `C` exits.
- [ ] **AC 33.6 — Persistence:** The six thresholds and signal mode survive reload through the simulator's non-volatile settings store.
- [ ] **AC 33.7 — Simulator boundary:** `AuxiliaryIOPanel` exposes `output-1` through `output-6` as visible high/low logical states. They simulate the six optically isolated outputs; they do not claim voltage, isolation, DB15 wiring, or physical hardware verification.

### Serial communication

- [ ] **AC 33.8 — Modes:** Setup selects `SEr iAL` (on request) or `SEr Con` (continuous); `AUH Fn` → `SErIAL` → ENTER starts the selected mode. Continuous mode's simulator sampling cadence is fixed at 250 ms so it is observable, not an operator-configurable interval or a hardware timing claim.
- [ ] **AC 33.9 — Fixed transport contract:** The simulated physical-link contract is exactly 9600 baud, 8 data bits, no parity, 1 stop bit, and no flow control (9600 8N1), as specified in §10.3. No baud/parity/stop-bit menu is provided.
- [ ] **AC 33.10 — Payload:** The virtual terminal receives current displayed counts in the documented field/status form, for example `0010.005 ARMX 0086.980 ARMY 0000.000 ARMZ`. Status symbols retain the documented meanings: A/I, R/D, M/N, and X/Y/Z.
- [ ] **AC 33.11 — Request and continuous behavior:** In `SEr iAL`, pressing the real ENTER key sends one current payload. In `SEr Con`, current displayed counts stream continuously.
- [ ] **AC 33.12 — Failure and exit:** A failed PC transfer displays `Pc fail`; `C` exits the function.
- [ ] **AC 33.13 — Simulator boundary:** The visible `serial-terminal` is the acceptance surface for payload/status behavior; `virtual-serial-connect`, `serial-disconnect`, and `serial-failure` exercise connection and failure states. Browser simulation of logical serial output is distinct from optional Web Serial or a physical COM1/COM2 transport, neither of which is required or claimed here.

## Baseline Audit (before this correction/implementation pass)

The completed headed audit found the function carousel without six-output or serial entries. `AUH Fn` displayed `no Conn`; the debug panel exposed no output or terminal controls. Thus every target behavior above was a confirmed gap. The former story contradicted the manual by specifying per-output duration, latch-until-reset behavior, configurable serial parameters, and multiple baud rates; those requirements have been removed.

## Verification Procedure

Use the front panel with `?source=debug`, the visible `AuxiliaryIOPanel`, and its virtual terminal:

1. Enter `6oP`, move from initial `rUn` to `ProGrAn` with Right, program all six thresholds, return to `rUn`, and cross each threshold in both directions.
2. Inspect `output-1` through `output-6`; verify comparator behavior in `Cont`, the fixed visible event per crossing in `PULSE`, the terminal decimal, `C` exit, and persistence after reload.
3. Connect through `virtual-serial-connect`; verify `SEr iAL` sends exactly one correctly formatted payload only when ENTER is pressed.
4. Verify `SEr Con` produces successive current payloads in `serial-terminal`; exercise disconnect and `serial-failure`, and observe `Pc fail`.

Permanent real-UI coverage belongs in [`e2e/07-auxiliary/US-033-six-output-serial.spec.ts`](../../../e2e/07-auxiliary/US-033-six-output-serial.spec.ts). Newly implemented behavior must remain unchecked until the integrated run; no physical output or RS-232 proof is implied.

## References

- EL400 Operation Manual §10.2–§10.3, source at `/home/pedro/src/harmonic-analyzer/references/el400-operation-manual/ocr/markdown.md`, lines 1815–1931
- US-027: Save Changes
