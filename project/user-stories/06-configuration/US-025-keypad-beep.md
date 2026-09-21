# US-025: Setup Menu - Keypad Beep

**Priority:** P5  
**Category:** Configuration

## Source

- **Video:** EL400 overview §1.14, `[09:32–09:53]`: `bEEP on/oF` controls the audible confirmation for button presses.
- **Primary interaction constraint:** EL400 Operation Manual §8.3, p. 42 requires automatic near-zero warnings; the keypad preference cannot suppress those warnings.

## User Story

**As a** machine operator  
**I want** to turn keypad click feedback on or off  
**So that** I can choose audible confirmation without muting machine-position warnings

## Acceptance Criteria

- [ ] **AC25.1:** The global `bEEP` setup row offers `on` (factory default) and `oF`.
- [ ] **AC25.2:** With `bEEP on`, each accepted physical or keyboard front-panel key action emits one short keypad click.
- [ ] **AC25.3:** With `bEEP oF`, keypad clicks are silent.
- [ ] **AC25.4:** Configurable and primary automatic zero-approach warnings are independent of the keypad setting and remain audible when required by US-024.
- [ ] **AC25.5:** No generic “error conditions always beep” behavior is promised; an error is audible only when a separately documented feature requires it.
- [ ] **AC25.6:** The setting is part of the setup draft and persists only after `SAU CHG`.

## Human Verification

Instrument Web Audio before loading the page. With `bEEP on`, press numeric, Clear, axis-select, axis-zero, setup, ABS/INC, units, and function keys and confirm one buffer-source start per accepted press. Save `bEEP oF`, repeat, and confirm no keypad buffer starts. Independently trigger a zero-approach warning and confirm its oscillator bursts still occur. Audio-device/renderer errors are environmental unless these API-level events are absent.

## Automated Coverage

- [`e2e/06-configuration/US-025-keypad-beep.spec.ts`](../../../e2e/06-configuration/US-025-keypad-beep.spec.ts)
- Warning independence: [`e2e/06-configuration/US-024-zero-approach.spec.ts`](../../../e2e/06-configuration/US-024-zero-approach.spec.ts)

## Baseline Audit (before the current implementation work)

The headed audit passed the default, toggle, one buffer-source click for the tested keys, silence when off, and independent oscillator warnings. Earlier “no beep” observations were false positives caused by counting only oscillators instead of keypad buffer sources. A generic error-beep path was not found or proven, so the unsupported promise has been removed. Shared all-setting save/discard behavior still requires integrated verification.
