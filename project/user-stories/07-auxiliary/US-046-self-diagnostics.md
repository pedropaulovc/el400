# US-046: Self-Diagnostics Mode

**Manual reference:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf), §11.1, p. 83
**Priority:** P5
**Category:** Auxiliary

## User Story

**As a** technician troubleshooting a DRO  
**I want** the simulator to reproduce the EL400 diagnostic sequence  
**So that** I can inspect memory, display, keyboard, and encoder-input behavior

## Target Acceptance Criteria

- [x] **AC 46.1:** Pressing `▲` (the `8` key) during the startup/version screen enters diagnostics.
- [x] **AC 46.2:** Memory diagnostics display the seven-segment rendering `rAmPASS` when memory passes; OCR variants such as `RAñPASS` do not define a different literal.
- [x] **AC 46.3:** A real front-panel key advances to the all-segment display test (`88888888`); adapter position ticks do not skip this or any operator-driven stage.
- [x] **AC 46.4:** A real front-panel key advances to keyboard diagnostics (`PrESS`), where each pressed key is echoed.
- [x] **AC 46.5:** Pressing ENTER from `PrESS` advances to `EnCodEr`; movement on X, Y, and Z identifies the corresponding encoder input.
- [x] **AC 46.6:** The first `C` exits the current diagnostic step to the memory stage and arms exit.
- [x] **AC 46.7:** A second `C` exits diagnostics to the normal numeric screen; intervening adapter ticks do not break the gesture.

These criteria verify simulator stages and logical adapter inputs. They do not diagnose physical RAM, displays, keypad wiring, scales, or encoder electronics.

## Verification notes

The headed `?source=debug` session followed reload → `8` → `rAmPASS` → key → `88888888` → key → `PrESS` → key echo → ENTER → `EnCodEr`. Normal 100 ms adapter polling did not advance operator-driven stages or break the double-`C` exit. Visible X, Y, and Z debug jogs identified all three logical encoder inputs. This verifies the simulator stages and debug adapter only, not physical RAM, display segments, keypad wiring, scales, encoder electronics, or cables.

## Verification Procedure

Run the real boot/front-panel/debug sequence above. Hold each diagnostic screen through multiple 100 ms adapter ticks, echo at least one keyboard key, jog every axis during `EnCodEr`, then verify the two-step `C` exit. Permanent coverage is in [`e2e/07-auxiliary/US-046-self-diagnostics.spec.ts`](../../../e2e/07-auxiliary/US-046-self-diagnostics.spec.ts). See the [verification evidence and full-suite results](../README.md#verification).

## Related Stories

- US-001: First Use and Power-Up Display
- US-042: Encoder Fail Warning

## References

- [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf), §11.1, p. 83
