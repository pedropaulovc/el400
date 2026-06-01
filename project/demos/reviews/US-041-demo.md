# US-041 Radius/Diameter — Demo Review

**Verdict: APPROVE**

Source: `?source=debug` (needed for live jog). All steps are real DOM clicks (keypad/axis/wrench + debug jog).

## AC coverage
- **AC41.1** `rAd`/`diA` param available for linear axis — `03-setup-x-rAd-default.png` shows `rAd` in the X message cell after wrench→X→scroll. PASS.
- **AC41.2** `◄`/`►` toggle rAd↔diA — `04-setup-x-diA.png` shows `diA` after pressing ► (6). PASS.
- **AC41.3** rAd = 1:1 mill default — `02-radius-default-1to1.png`: both X and Y read `1.0000` for a 1mm jog; debug panel confirms true machine X=1.000, Y=1.000. PASS.
- **AC41.4** diA doubles displayed value (1.000→2.000) — `06-live-diA-X-doubled-Y-radial.png`: X reads **2.0000** while the debug panel shows true machine X=1.000mm. Reconfirmed in `07` (machine X=2.000 → display 4.0000). Clean, unambiguous. PASS.
- **AC41.5** Per-axis — `06`: same screenshot shows X (diA) = 2.0000 and Y (rAd) = 1.0000 for identical 1mm travel on both axes. This is the strongest possible proof: one transformed axis next to an untransformed one. PASS.
- **AC41.7** Meaningful only in LinEAr — both axes linear here; consistent with spec. PASS (by construction; not separately stressed, acceptable).

## Notes / minor gap
- **AC41.6 (persist via SAV CHG)** is only asserted in narration. The demo committed the mode via End/ENT exit, not an explicit `SAU CHG` + page reload. Persistence is proven generically by US-027 (which does reload), so I do not block on this — but a stricter reading would want a reload screenshot showing `diA` surviving. Non-blocking.

## Verdict rationale
The core, hardest-to-fake behavior — per-axis display-only ×2 with a radial control axis shown side-by-side — is demonstrated convincingly through real UI actions, with the debug panel independently corroborating that the underlying machine position is untouched. Approve.
