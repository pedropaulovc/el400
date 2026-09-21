# US-042: Setup Menu - Encoder Fail Warning

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §6.2, pp. 20–21: global `EnF oFF / EnF on`; a disconnected or damaged encoder shows `no SIG` on the corresponding axis.
- **Video:** [DROPROS EL400 overview](https://www.youtube.com/watch?v=7W47KPCu7jE) §1.10, `[07:14–07:44]`: off by default, on is recommended, and the setting applies to all axes.

## User Story

**As a** machine operator  
**I want** a visible warning when an encoder signal is lost  
**So that** I do not machine against a stale reading

## Acceptance Criteria

- [x] **AC42.1:** Global `EnF` offers `oFF` (factory setting) and `on`.
- [x] **AC42.2:** With `EnF on`, loss of one encoder signal replaces only that axis's readout with `no SIG`; unaffected axes continue updating.
- [x] **AC42.3:** Restoring valid signal clears `no SIG` immediately and resumes the numeric coordinate.
- [x] **AC42.4:** With `EnF oFF`, signal loss does not show `no SIG`.
- [x] **AC42.5:** The draft setting persists only after `SAU CHG`.

## Human Verification

Enable and save ENF, use the visible debug signal control to drop X, jog Y, then restore X. Confirm only X shows and clears `no SIG` while Y stays live. Disable and save ENF, repeat X loss, and confirm the numeric display remains. Reload after each saved state and include an unsaved toggle control.

## Automated Coverage

- [`e2e/06-configuration/US-042-encoder-fail.spec.ts`](../../../e2e/06-configuration/US-042-encoder-fail.spec.ts)

## Verification

[Portable evidence and full-suite results](../README.md#verification)

With saved `EnF on`, dropping X through the visible signal control changed only X to `no SIG`; Y continued updating, and restoring X returned its numeric value immediately. Saved `EnF off` survived reload and suppressed the warning. Both saved states were reloaded, and an unsaved opposite draft reverted to the saved value.

The signal control simulates encoder validity. No physical cable was disconnected, so this does not establish electrical fault-detection latency on EL400 hardware.
