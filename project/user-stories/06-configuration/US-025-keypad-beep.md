# US-025: Setup Menu - Keypad Beep

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary interaction constraint:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §8.3, p. 42 requires automatic near-zero warnings; the keypad preference cannot suppress those warnings.
- **Video:** [DROPROS EL400 overview](https://www.youtube.com/watch?v=7W47KPCu7jE) §1.14, `[09:32–09:53]`: `bEEP on/oF` controls the audible confirmation for button presses.

## User Story

**As a** machine operator  
**I want** to turn keypad click feedback on or off  
**So that** I can choose audible confirmation without muting machine-position warnings

## Acceptance Criteria

- [x] **AC25.1:** The global `bEEP` setup row offers `on` (factory default) and `oF`.
- [x] **AC25.2:** With `bEEP on`, each accepted physical or keyboard front-panel key action emits one short keypad click.
- [x] **AC25.3:** With `bEEP oF`, keypad clicks are silent.
- [x] **AC25.4:** Configurable and primary automatic zero-approach warnings are independent of the keypad setting and remain audible when required by US-024.
- [x] **AC25.5:** No generic "error conditions always beep" behavior is promised; an error is audible only when a separately documented feature requires it.
- [x] **AC25.6:** The setting is part of the setup draft and persists only after `SAU CHG`.

## Human Verification

Instrument Web Audio before loading the page. With `bEEP on`, press numeric, Clear, axis-select, axis-zero, setup, ABS/INC, units, and function keys and confirm one buffer-source start per accepted press. Save `bEEP oF`, repeat, and confirm no keypad buffer starts. Independently trigger a zero-approach warning and confirm its oscillator bursts still occur. Audio-device/renderer errors are environmental unless these API-level events are absent.

## Automated Coverage

- [`e2e/06-configuration/US-025-keypad-beep.spec.ts`](../../../e2e/06-configuration/US-025-keypad-beep.spec.ts)
- Warning independence: [`e2e/06-configuration/US-024-zero-approach.spec.ts`](../../../e2e/06-configuration/US-024-zero-approach.spec.ts)

## Verification

[Portable evidence and full-suite results](../README.md#verification)

With beep enabled, each sampled accepted panel action and focused keyboard shortcut started one 0.05-second keypad buffer. Saving beep off silenced the same control groups before and after reload, while configurable and mandatory zero-approach warnings still started their separate oscillator bursts. Unsaved beep changes were discarded.

The oracle was the browser's Web Audio API. It does not establish audibility through EL400 speaker hardware or the host audio device.
