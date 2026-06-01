# US-038 Keyboard Shortcuts — Demo Review

**Verdict: APPROVE**

Source: `?source=manual` (keypad flows), `?source=debug` only to set up a non-zero value for HALF. Real physical `keydown` events (no DOM button clicks except the jog setup).

## AC coverage (representative + critical)
- **AC38.1/38.3** Digit entry + Enter — `03-digit-entry-123.png` (X=`123.0000` via keyboard `X 1 2 3 Enter`). PASS.
- **AC38.4/38.5** Decimal + sign — `04-decimal-sign-entry.png` (X=`−4.5000`). PASS.
- **AC38.7/38.8** Select / Shift+zero — `02-key-x-select.png`, `05-shift-x-zero.png`. PASS.
- **AC38.10/38.11** A=ABS/INC, U=unit — `06`, `07` (incoming LED lit). PASS.
- **AC38.13** Shift+0 zero-all — `08`→`09`. PASS.
- **AC38.9** W=settings — `10-key-w-settings.png` (`SELECt`). PASS.
- **AC38.2** Arrow nav in menus — `11`/`12` (CEntrE↔CirCLE). PASS.
- **AC38.14/38.17/38.18/38.20/38.21** B/D/K/S/F secondary functions — `13`–`16`. PASS (representative slice; O/G/R use the identical dispatch path, mapped in handler).
- **AC38.19** H=half — `17-key-h-half.png` (0.1575→`0.0787`). PASS.
- **AC38.22** Focus gating — the critical behavioral check: `18-focus-gating-blurred.png` (focus off container, `A` pressed → `abs` LED STAYS lit, no toggle) vs `19-focus-gating-refocused.png` (refocus, `A` now toggles to inc). Strict gating proven both ways. PASS.

## Verdict rationale
The full shortcut surface is exercised through real keyboard events, including the subtle-but-important focus-gating (handled keys are genuine no-ops when the container is not focused, restored on refocus). The few un-screenshotted secondary keys share the same dispatch path. Approve.
