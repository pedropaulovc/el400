# AUX Fn setup-menu row + hardware-absent dwell — design

**Date:** 2026-06-04

## Goal

Add the missing `AUH Fn` ("AUX Fn") option to the setup menu, between `EnF oFF`
(encoder-fail) and `dro t` (probe DRO type). Per the EL400 manual §6.2 it is a
terminal-entry row whose setting column reads *"Press for Auxiliary Function
Menu"* (Section 10) — like `CALiB`'s "Press for error compensation". Unlike the
`CALib` placeholder (a silent no-op), pressing ENT on `AUH Fn` flashes a brief
**`no Conn`** dwell, then returns to the row.

## Why this behavior (not a no-op, not the full sub-menu)

The video manual §1.11 states: *"AUH Fn works in conjunction with an optional
DB15 connector on the back of the display (not present on current displays)."*
The auxiliary feature set behind it (six-output `6oP`, serial `SErIAL`/`SEr Con`,
probe delay) is the entirely-unimplemented US-033 (P5, "requires hardware
support"). So the faithful, in-scope behavior is to surface that the optional
hardware is absent rather than build US-033. `no Conn` (n,o,C,o,n,n — all
seven-segment-renderable) reads as "no connector/connection".

## Why this placement

Manual §6.2 "table 2" canonical navigable order:

```
LinEAr, SC, dP, rAd, LEFt, CALiB, EnF, AUH Fn, (SErIAL), dro, …
```

`AUH Fn` sits immediately after `EnF` and before `dro` (probe DRO type). The
registry header comment and `setup.integration.test.tsx` source-of-truth comment
already reserve this slot as a parenthesized "not yet implemented" row. Label
rendering: the §12 text list maps `AUH Fn → AUX Fn` ("Auxiliary function
settings"); the seven-segment panel has no 'X' glyph and approximates it as 'H',
so the faithful label is `AUH Fn`.

## Approach

A dwell state modelled exactly on the `setup-saved` / `StorEd` confirmation
(US-027). Because the new state name starts with `setup-`, `isSetupActive`
already routes it to `setupReducer` — **no `reducer.ts` change**.

- ENT on the `AUH Fn` row → enter `setup-aux-fn`, display `no Conn` on X (Y/Z
  blank), carrying `SetupData` through so the row stays highlighted on return.
- The dwell is dismissed by its timeout **or** any front-panel key
  (`isFrontPanelKey`), returning to `setup-parameter` with `AUH Fn` highlighted.
- It returns **`null` on everything else** — critically the ~100 ms
  `MILL_STATE_CHANGED` encoder tick must not wipe the screen (the known dwell
  footgun; same discipline as `reduceSaved` / `restore-in-progress`).
- Left/right do nothing on the row (choiceless, same as `CALib`).

## Changes

1. `src/stores/dro/droStateMachine.ts`
   - Add `'setup-aux-fn'` to `DROStateName` (grouped with the setup states).
   - Add `{ eventName: 'AUX_FN_TIMEOUT' }` to `DROEventPayload`.
2. `src/stores/dro/features/setup-parameters.ts`
   - Add `export const AUX_FN_ID = 'aux-fn';`
   - Insert a `SetupParameter` between the `ENF` (`EnF oFF`) and `PROBE_DRO_TYPE`
     (`dro t`) entries: `{ id: AUX_FN_ID, label: 'AUH Fn', scope: 'global',
     choices: [], readValue: () => '' }`.
   - Un-parenthesize `AUH Fn` in the ordering-source header comment.
3. `src/stores/dro/features/aux-fn.ts` (new, sibling of `save-changes.ts`)
   - `AUX_FN_NO_CONN_TEXT = 'no Conn'`, `AUX_FN_DURATION_MS = 1500`.
   - `enterAuxFnNoConn(data, vMem)` → builds the `setup-aux-fn` payload.
   - `useAuxFnNoConn(dispatch, droState)` timeout hook → dispatches
     `AUX_FN_TIMEOUT` after the duration (mirrors `useSetupSavedConfirmation`).
4. `src/stores/dro/features/setup.ts`
   - Import `AUX_FN_ID` + `enterAuxFnNoConn` + `AUX_FN_NO_CONN_TEXT`.
   - In `reduceParameter`'s `KEY_ENTER`: `if (param.id === AUX_FN_ID)` → enter the
     dwell.
   - Add `reduceAuxFn` (mirror `reduceSaved`) + a `state === 'setup-aux-fn'`
     branch in `setupReducer`.
5. `src/stores/dro/index.ts` + `src/components/MultiAxisSection.tsx`
   - Export and wire `useAuxFnNoConn(dispatch, droState)`.

## Testing

- `src/stores/dro/features/setup-parameters.test.ts`: add `AUX_FN_ID` to the
  order list (between `ENF_ID` and `PROBE_DRO_TYPE_ID`), to the `terminalIds` set
  (choiceless), an adjacency assertion (`AUX_FN` is `ENF + 1`), and a focused row
  test (`label === 'AUH Fn'`, no choices).
- `src/stores/dro/features/setup.integration.test.tsx`: insert `'AUH Fn'` into
  `EXPECTED_SETUP_MENU_ORDER` between `'EnF oFF'` and `'dro t'`; un-parenthesize
  in the source-of-truth comment.
- `src/stores/dro/features/aux-fn.test.ts` (new, unit): ENT on the row enters the
  dwell with `no Conn`; `AUX_FN_TIMEOUT` and a front-panel key each return to the
  menu with `AUH Fn` highlighted; `MILL_STATE_CHANGED` is ignored (no wipe).
- `e2e/`: 1 spec — scroll to `AUH Fn` → ENT → assert `no Conn` → returns to row.

`npm run test:all` (lint + coverage + e2e + storybook) before push.
