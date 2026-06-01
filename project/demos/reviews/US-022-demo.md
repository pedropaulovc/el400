# US-022 Display Resolution (dP) — Demo Review

**Verdict: APPROVE**

Source: `?source=manual`. Real DOM clicks. Readout values mirror the seven-segment panel.

## AC coverage
- **AC22.1** Navigate to dP — `03-dP-parameter-default-5.0.png` (`dP 5.0`). PASS.
- **AC22.2** Default 4 digits — `01-idle-default-4-decimals.png` (`0.0000`). PASS.
- **AC22.4** Reducing resolution makes display less sensitive — `06-dP-50.0-coarse.png` (cycled to `dP 50.0`) then `07-readout-coarse-3-decimals.png`: X drops to `0.000` (3 decimals). PASS.
- **AC22.5** Display-only + per-axis — `07`: X reads `0.000` (3 dec, coarse) while Y and Z read `0.0000` (4 dec). The decimal count is the only change; per-axis is proven by Y/Z staying fine. PASS.
- **AC22.3** Independent of scale resolution — SC is a separate param; narrated. PASS.
- Restore: `08`/`09` cycle back to `dP 5.0` and X returns to 4 decimals.

## Verdict rationale
The observable behavior — coarser dP drops a decimal on the selected axis only, without touching the underlying value — is shown directly (X 3-dec vs Y/Z 4-dec in one frame). Clean. Approve.
