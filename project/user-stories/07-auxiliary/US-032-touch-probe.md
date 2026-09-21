# US-032: Touch Probe

**Manual Reference:** EL400 Operation Manual §6.2 and §10.1, pp. 20–21 and 72–77
**Priority:** P4
**Category:** Auxiliary

## User Story

**As a** machine operator  
**I want** the simulator's probe setup and probing workflows to match the EL400  
**So that** I can practise datum and workpiece-measurement procedures without implying that browser simulation proves physical probe hardware

## Target Acceptance Criteria

- [ ] **AC 32.1 — Probe configuration:** Setup provides `dro t`/`dro F` and probe delay from 1 through 60 seconds; the `ProbE` configuration workflow accepts probe diameter followed by probe length, and final ENTER commits both fields before the special functions are used. Saved setup values persist through the normal `SAU ChG` transaction.
- [ ] **AC 32.2 — Transmit mode:** In `dro t`, a trigger flashes the probe message while coordinates continue counting. Generic transmit mode does not itself establish a datum.
- [ ] **AC 32.3 — Freeze mode:** In `dro F`, a trigger freezes displayed coordinates at the contact position until the operator clears the condition.
- [ ] **AC 32.4 — Datum by edge:** `ProbE` → `Prob Ed` accepts the selected axis and edge 1/2 direction, waits for contact, then permits the operator to enter and confirm the desired datum coordinate as described in §10.1.2.
- [ ] **AC 32.5 — Datum by midpoint:** `ProbE` → `Prob nd` captures two distinct trigger edges, computes their midpoint, and permits entry of the desired midpoint coordinate. At the second edge the distance from that edge to the new midpoint datum is expected; the display is not required to show the absolute midpoint coordinate as a result.
- [ ] **AC 32.6 — Inside/outside measurement:** `inS dE` and `oUtS dE` use the configured probe diameter and length, capture two edges, and compensate width correctly. Results open on width (`LEnGth` in renderable glyphs); an arrow changes the selected-axis result to center (`CEntrE`).
- [ ] **AC 32.7 — Trigger lifecycle:** A held signal is one contact; release followed by a new rising edge is required for a second contact. `C` exits an active or completed probe workflow.
- [ ] **AC 32.8 — Simulator boundary:** `?source=debug` exposes a logical probe input and visible triggered state; `source=cncjs` consumes supported controller probe state. These are simulator/controller integration contracts, not claims that a browser owns or has verified a dedicated physical input pin.

The primary manual does not require an audible probe indication, so this story does not invent one. Normal keypad audio remains governed by US-025.

## Baseline Audit (before this correction/implementation pass)

The completed headed `?source=debug` audit confirmed persisted `dro t`/`dro F`, continued counting in transmit mode, freeze-at-contact, edge zeroing, midpoint capture, inside/outside compensated widths, visual PRB state, and `C` exit. It confirmed gaps in probe delay, probe length, transmit-message flashing, desired datum entry, and explicit center presentation. Midpoint contacts at 10 and 50 displayed 20 at the second edge, correctly representing 50 minus midpoint 30; the former story's expected immediate display of 30 was wrong. No physical probe was available or claimed.

## Verification Procedure

Use the actual front panel and visible debug controls through `DROPage.goto({ source: 'debug', skipBootMessage: true })`. Set exact physical coordinates with the `Set X position in millimetres`, `Set Y position in millimetres`, and `Set Z position in millimetres` spinbuttons; confirm them through `debug-position-x`, `debug-position-y`, and `debug-position-z`:

1. Save and reload each setup value through the operator setup flow.
2. For `dro t`, trigger at one coordinate and move while held; verify counting continues and the probe message is visible.
3. For `dro F`, trigger and move while held; verify the displayed contact coordinate remains frozen, then clear.
4. Exercise edge, midpoint, inside, and outside with debug machine positions and separate Trigger/Clear cycles; verify desired datum, center, and width results.
5. Press `C` from each active/result phase and verify normal counting resumes.

Permanent browser coverage belongs in [`e2e/07-auxiliary/US-032-touch-probe.spec.ts`](../../../e2e/07-auxiliary/US-032-touch-probe.spec.ts). Integrated verification of newly implemented criteria remains pending.

## References

- EL400 Operation Manual §10.1, source at `/home/pedro/src/harmonic-analyzer/references/el400-operation-manual/ocr/markdown.md`, lines 1672–1810
- US-007: Center Finding
- US-025: Keypad Beep
