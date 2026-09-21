# US-042: Setup Menu - Encoder Fail Warning

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** EL400 Operation Manual §6.2, pp. 20–21: global `EnF oFF / EnF on`; a disconnected or damaged encoder shows `no SIG` on the corresponding axis.
- **Video:** EL400 overview §1.10, `[07:14–07:44]`: off by default, on is recommended, and the setting applies to all axes.

## User Story

**As a** machine operator  
**I want** a visible warning when an encoder signal is lost  
**So that** I do not machine against a stale reading

## Acceptance Criteria

- [ ] **AC42.1:** Global `EnF` offers `oFF` (factory setting) and `on`.
- [ ] **AC42.2:** With `EnF on`, loss of one encoder signal replaces only that axis's readout with `no SIG`; unaffected axes continue updating.
- [ ] **AC42.3:** Restoring valid signal clears `no SIG` immediately and resumes the numeric coordinate.
- [ ] **AC42.4:** With `EnF oFF`, signal loss does not show `no SIG`.
- [ ] **AC42.5:** The draft setting persists only after `SAU CHG`.

## Human Verification

Enable and save ENF, use the visible debug signal control to drop X, jog Y, then restore X. Confirm only X shows and clears `no SIG` while Y stays live. Disable and save ENF, repeat X loss, and confirm the numeric display remains. Reload after each saved state and include an unsaved toggle control.

## Automated Coverage

- [`e2e/06-configuration/US-042-encoder-fail.spec.ts`](../../../e2e/06-configuration/US-042-encoder-fail.spec.ts)

## Baseline Audit (before the current implementation work)

Default/toggle/global scope, affected-axis `no SIG`, unaffected-axis updates, recovery, off behavior, and positive persistence all passed. All-setting draft rollback was not established by that run and remains an integrated verification item.
