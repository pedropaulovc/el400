# US-033: Six Output and Serial Communication

**Manual reference:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf), §6.2, §10.2, and §10.3, pp. 20–21 and 77–82
**Priority:** P5
**Category:** Auxiliary

## User Story

**As a** machine operator or system integrator  
**I want** faithful six-output and serial simulations  
**So that** I can practise EL400 programming and inspect the data that physical optional interfaces would produce

## Target Acceptance Criteria

### Six-output function

- [x] **AC 33.1 — Entry and programming:** The Function menu provides `6oP`, initially showing `rUn` as in the primary manual; Right selects `ProGrAn`, ENTER selects a count from 1 through 6, then the operator records an axis and numeric threshold for each slot. Returning to `rUn` executes the program.
- [x] **AC 33.2 — Signal mode:** Setup selects one global six-output mode, `PULSE` or `Cont`. There is no invented per-output mode or operator-configurable pulse duration.
- [x] **AC 33.3 — Continuous semantics:** In `Cont`, each output compares its axis coordinate with its threshold. It is high above the threshold and low at equality or below, without latching. Linear axes use displayed-position coordinates; angular axes use the unwrapped degree convention below.
- [x] **AC 33.4 — Pulse semantics:** In `PULSE`, crossing a programmed threshold in either direction, including arrival at exact equality, emits a logical pulse. The simulator keeps the visible pulse high for 1000 ms so it can be inspected. This is a simulator timing policy, not a manual requirement, configurable duration, or physical hardware timing claim.
- [x] **AC 33.5 — Run indication and exit:** `rUn` evaluates all six programmed outputs, shows the terminal decimal-point indication described in §10.2, and `C` exits.
- [x] **AC 33.6 — Persistence:** The programmed axis/threshold pairs and output count persist as operator data, separately from the non-volatile setup store that holds the global signal mode. All survive reload, and selected-axis `rSt oEm` preserves the operator program, count, and global mode.
- [x] **AC 33.7 — Simulator boundary:** `AuxiliaryIOPanel` exposes `output-1` through `output-6` as visible high/low logical states. They simulate the six optically isolated outputs; they do not claim voltage, isolation, DB15 wiring, or physical hardware verification.

Angular thresholds use unwrapped degree coordinates, not repeating angles modulo
360. A threshold at 350° therefore fires when crossing that coordinate, not again
at 710° or 1070°. IN/MM and stored diameter settings do not scale angular
thresholds. The manual does not specify rotary comparator behavior; this is the
simulator's convention, preserving revolution count rather than inventing cyclic
outputs.

### Serial communication

- [x] **AC 33.8 — Modes:** Setup selects `SEr iAL` (on request) or `SEr Con` (continuous); `AUH Fn` → `SErIAL` → ENTER starts the selected mode. Continuous mode samples every 250 ms so serial output is observable. The cadence is simulator policy, not a manual mandate, operator setting, or hardware timing claim.
- [x] **AC 33.9 — Fixed transport contract:** The simulated physical-link contract is exactly 9600 baud, 8 data bits, no parity, 1 stop bit, and no flow control (9600 8N1), as specified in §10.3. No baud/parity/stop-bit menu is provided.
- [x] **AC 33.10 — Payload:** The virtual terminal receives current displayed counts in the documented field/status form, for example `0010.005 ARMX 0086.980 ARMY 0000.000 ARMZ`. Status symbols retain the documented meanings: A/I, R/D, M/N, and X/Y/Z.
- [x] **AC 33.11 — Request and continuous behavior:** In `SEr iAL`, pressing the real ENTER key sends one current payload. In `SEr Con`, current displayed counts stream continuously.
- [x] **AC 33.12 — Failure and exit:** A failed PC transfer displays `Pc fail`; `C` exits the function. Angular readouts also fail explicitly without transmitting: §10.3 defines only MM/Inch flags and does not establish an angular wire encoding. This preserves the existing behavior rather than inventing a protocol extension.
- [x] **AC 33.13 — Simulator boundary:** The visible `serial-terminal` is the acceptance surface for payload/status behavior; `virtual-serial-connect`, `serial-disconnect`, and `serial-failure` exercise connection and failure states. Browser simulation of logical serial output is distinct from optional Web Serial or a physical COM1/COM2 transport, neither of which is required or claimed here.

## Verification notes

The headed `?source=debug` session programmed all six slots as X10, Y20, Z30, X40, Y50, and Z60. Continuous mode followed each slot's programmed axis, treated equality as low, and changed with movement without latching. Pulse checks covered equality, crossings in both directions, expiry, and stationary/same-side negative controls. The six pairs, count, and global mode survived reload; a separate selected-axis restore session preserved four programmed slots, count 4, `Cont`, and the same comparator behavior.

The visible virtual terminal matched the manual sample and negative/status variants. On-request mode sent only on ENTER; continuous mode produced four records in 1054 ms at the simulator's 250 ms cadence. Virtual failure and disconnected states displayed `Pc fail`. These checks did not use physical output pins, loads, voltage or isolation measurements, a browser serial permission, a COM port, RS-232 levels, a cable, or physical 9600 8N1 transport.

A headed angular recheck under INCH and a stored diameter setting programmed
90°, observed low at 45° and a pulse at 90°, and confirmed that a virtual serial
request displayed `Pc fail` without adding a terminal record.

## Verification Procedure

Use the front panel with `?source=debug`, the visible `AuxiliaryIOPanel`, and its virtual terminal:

1. Enter `6oP`, move from initial `rUn` to `ProGrAn` with Right, program all six thresholds, return to `rUn`, and cross each threshold in both directions.
2. Inspect `output-1` through `output-6`; verify comparator behavior in `Cont`, the fixed visible event per crossing in `PULSE`, the terminal decimal, `C` exit, and persistence after reload.
3. Connect through `virtual-serial-connect`; verify `SEr iAL` sends exactly one correctly formatted payload only when ENTER is pressed.
4. Verify `SEr Con` produces successive current payloads in `serial-terminal`; exercise disconnect and `serial-failure`, and observe `Pc fail`.

Permanent real-UI coverage is in [`e2e/07-auxiliary/US-033-six-output-serial.spec.ts`](../../../e2e/07-auxiliary/US-033-six-output-serial.spec.ts). See the [verification evidence and full-suite results](../README.md#verification).

## References

- [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf), §10.2–§10.3, pp. 77–82
- US-027: Save Changes
