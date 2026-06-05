# CALib setup-menu placeholder — design

**Date:** 2026-06-04

## Goal

Add a `CALib` (calibration) option to the setup menu, between the `LEFt`
(counting-direction) row and `EnF oFF` (encoder-fail). It is a **non-functional
placeholder** added for completeness — it shows `CALib` when highlighted and does
nothing on ENT or left/right.

## Why this placement

The EL400 operation manual §6.2 "table 2" canonical navigable order is:

```
LinEAr, SC, dP, rAd, LEFt, (CALiB), EnF, … 
```

CALiB sits immediately after `LEFt` and before `EnF`. The registry header comment
and the `setup.integration.test.tsx` source-of-truth comment already reserve this
slot as a parenthesized "not yet implemented" row. The user's request — "between
rad/dia and EnF oFF" — spans `rAd → LEFt → EnF`; the manual pins the precise spot
(after `LEFt`). Label rendering: the abbreviation table shows `CAL ib`; the
codebase strips the OCR's spurious pre-`i` space (cf. `diA` for `d iA`, `riGht`
for `r iGht`), so the label is `CALib`.

## Approach

Treat CALib as a **terminal (choiceless) row**, like `End` / `SAU ChG` — but with
no ENT handler, so the reducer's existing fall-through `return null` makes ENT and
left/right no-ops automatically. No reducer, state-machine, or nvMem changes.

## Changes

1. `src/stores/dro/features/setup-parameters.ts`
   - Add `export const CALIBRATION_ID = 'calibration';`
   - Insert a `SetupParameter` between the `DIRECTION` (`LEFt`) and `ENF`
     (`EnF oFF`) entries: `{ id: CALIBRATION_ID, label: 'CALib', scope: 'global',
     choices: [], readValue: () => '' }`.
   - Un-parenthesize CALiB in the ordering-source header comment.
2. `src/stores/dro/features/setup-parameters.test.ts`
   - Add `CALIBRATION_ID` to the order-list test between `DIRECTION_ID` and `ENF_ID`.
   - Add `CALIBRATION_ID` to the `terminalIds` set in the "non-terminal parameters
     have at least two choices" test (it is choiceless).
   - Add a focused test: CALib row exists, `label === 'CALib'`, no choices.
3. `src/stores/dro/features/setup.integration.test.tsx`
   - Add `'CALib'` to `EXPECTED_SETUP_MENU_ORDER` between `'LEFt'` and `'EnF oFF'`.
   - Un-parenthesize CALiB in the source-of-truth comment.

## Testing

`npm run test:all` (lint + coverage + e2e + storybook). The two order tests are the
behavioral spec for this change; they fail before the registry edit and pass after.
No new feature flows, so no new E2E beyond the existing traversal coverage.
