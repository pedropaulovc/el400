# US-002: Sign Convention and Axis Direction — Implementation Plan

Spec: `project/user-stories/01-foundation/US-002-sign-convention.md` (AC 2.1–2.6).
Scope is FIXED by the user: full per-axis Direction support (absorbs most of US-023) + a Z depth-positive preference (AC 2.4), wired end-to-end through the setup menu so toggling actually flips the displayed sign.

---

## 1. Architecture findings (evidence)

### 1.1 The transform must live in `displayComputation.ts`, applied display-only
- Every feature that shows normal position calls `computeNormalDisplay(vMem, context)` → `computeDisplayPosition` → `computeAxisPositionMm` then `fromMmToAnyUnit` (`src/stores/dro/utils/displayComputation.ts:71-97`). idle, axis-operations, inch-mm, distance-to-go, setup-exit, bolt-hole (its Z) all funnel through here.
- `computeAxisPositionMm` already subtracts the datum offset (`workOffsets[axis]` when connected, or `manualAbsoluteValues`/`incrementalValues`). That is the DATUM transform and must stay distinct from the DIRECTION transform (spec Implementation Note).
- Decision: introduce a pure `applyDirection(valueMm, axis, nvMem)` step. The sign is `rawDelta × directionSign(axis)`. Direction is applied to the position value AFTER datum subtraction, in display computation only. The stored machine position (`millState.position`) and stored offsets are NEVER mutated by Direction. This keeps "raw scale delta × Direction" and "datum offset" as separate transforms and means macro math (which reads stored mm) is unaffected.

### 1.2 Settings change → re-render path (confirmed)
- `useDROStore.dispatch` reads `nvMem` fresh from `useSettingsStore.getState()` on EVERY dispatch (`src/stores/droStore.ts:53-77`). There is NO subscription that re-dispatches when nvMem changes externally (grep of `subscribe` shows only `millStore` adapter subscription).
- The working precedent (`inch-mm.ts`, `distance-to-go.ts`) is: the reducer that changes nvMem ALSO calls `useSettingsStore.getState().updateNvMem(...)` and recomputes `display` in the SAME dispatch using an `updatedContext` carrying the new nvMem. The `MILL_STATE_CHANGED` path (idle.ts:22, distance-to-go.ts:372) recomputes display whenever the mill emits, so any later position update also reflects the new Direction.
- Implication for the commit-path decision (see 1.3): for the sign to flip immediately on toggle, the Direction commit must happen in a reducer that returns a freshly-computed `display` using the new value — exactly the inch-mm pattern.

### 1.3 The setup-menu commit gap — DECISION
- `setup.ts` keeps changes in `draftValues` and DISCARDS them on `End`/`CLEAR` exit (`setup.ts:16-19, 186-197`). Generic commit (SAU CHG) is US-027 and is out of scope.
- Other settings (`inch-mm.ts:24`, `distance-to-go.ts:48`) commit directly via `useSettingsStore.getState().updateNvMem(...)`.
- DECISION: make the Direction parameter commit-on-change, NOT via the draft buffer. When the highlighted parameter is the Direction parameter and the user cycles it with KEY_4_LEFT/KEY_6_RIGHT, the setup reducer (a) computes the next choice, (b) calls `updateNvMem({ axisDirection: { ...current, [axis]: next } })`, and (c) builds an `updatedContext` with the new nvMem so `computeParameterDisplay` still reflects the choice. Because nvMem is now persisted, the next time the user exits setup, `exitToIdle` → `computeNormalDisplay` reads the committed Direction and the sign is already flipped. For immediate feedback while still in setup, the parameter screen shows the label (LEFT/riGht), which is correct.
  - Justification:
    - (a) Genuinely flips the sign end-to-end: nvMem is persisted on the keypress, so exit→idle display (and every subsequent MILL_STATE_CHANGED) applies the new Direction. AC 2.2 holds with only real user actions.
    - (b) Consistent with existing patterns: identical mechanism to inch-mm / distance-to-go (`updateNvMem` + recompute with updatedContext). The setup shell already threads `context` into `reduceParameter`.
    - (c) Does NOT implement US-027: only the Direction parameter is commit-on-change; all other params keep using `draftValues` and are still discarded on exit. We add a small per-parameter `commit?` hook to the registry (see Task 3) so this stays surgical and does not become a generic save engine.
- ALTERNATIVE REJECTED: implementing generic SAU CHG commit-on-exit (US-027). Too large; out of scope; would touch every parameter's semantics.

### 1.4 Macro canonical convention (AC 2.5) — where the transform must / must NOT be applied
- Macros compute in STORED mm against the standard convention:
  - `bolt-hole.ts:133-155` computes hole `{x,y}` from stored `centerX/centerY` (already mm) + `radius·cos/sin`. `computeBoltHoleNavigateDisplay` (`:161-184`) computes `holePos − currentPos` in mm then `fromMmToAnyUnit`.
  - `sdm.ts`, `grid.ts`, `angle-hole.ts`, `arc-contour.ts`, `polar.ts` follow the same stored-mm pattern.
- RULE: the Direction transform is applied ONLY in the display-position path used for the NORMAL position readout (`computeNormalDisplay`/`computeDisplayPosition`). It must NOT be applied to:
  - stored `millState.position`, `workOffsets`, `manualAbsoluteValues`, `incrementalValues`;
  - macro coordinate math (`calculateHolePosition` etc.);
  - macro distance-to-go displays (`computeBoltHoleNavigateDisplay`, distance-to-go's `computeDistanceToGoDisplay`).
- This guarantees generated hole coordinates land where Figure 1 shows them regardless of the operator's Direction preference. (If a future story decides macro distance-to-go should also honor Direction, that is a separate explicit decision; AC 2.5 requires it does NOT here.)

### 1.5 Negative rendering (AC 2.6) — ALREADY IMPLEMENTED (evidence)
- `Axis.tsx:20-46 formatNumberValue` pushes a leading `'-'` glyph when `num < 0`, else a leading space; the digits run through `SevenSegmentDigit`, which has a `'-'` glyph (`SevenSegmentDigit.tsx:33`).
- Screen-reader value (`MultiAxisSection.tsx:23-35`) renders `value.toFixed(4)`, which yields `-3.2500` for negatives.
- CONCLUSION: AC 2.6 is already satisfied by existing rendering. No production change needed; we only add a regression test (Task 6) that a negative display value shows a leading minus in both the seven-segment row and the sr-only `axis-value-*` cell, and verify the unit/integration path that PRODUCES a negative (Direction flip on a positive move).

### 1.6 Real user-reachable test trigger — findings & gap
- E2E suite drives moves via the mock CNCjs server HTTP API: `DROPage.simulateEncoderAbsoluteMove` / `simulateEncoderRelativeMove` POST to `/api/encoder-move(-relative)` (`e2e/helpers/dro-page.ts:285-383`; server endpoints `e2e/mock-cncjs-server.ts:75-143`). Page loads with `source=cncjs` (`dro-page.goto:122-146`).
- The debug-panel jog buttons (`jog-x-positive` etc., `DebugControlPanel.tsx:155-257`) only render when `source=debug` (`Index.tsx:7,18`). So `source=cncjs` E2E pages do NOT have jog buttons; the established real-user move primitive for E2E is the mock-server encoder move, which flows through the SAME `MILL_STATE_CHANGED` → idle/feature display recompute as a real jog. This is a legitimate real-user trigger (it mirrors the encoder emitting a position), not a test backdoor like forcing `connected:true`.
- The spec's `dro.simulateTableMove`, `dro.setAxisDirection`, `dro.zeroAxis` are the intended page-object API. `zeroAxis` EXISTS (`dro-page.ts:223`). The other two MUST be added as helpers built on real user-facing controls:
  - `simulateTableMove(axis, direction, magnitudeMm)`: translate the manual "table-left/right" wording into an encoder delta and call `simulateEncoderRelativeMove`. Under the STANDARD convention, table-left ⇒ tool +X ⇒ displayed value increases; so for a default (LEFT) X axis, `'left'` maps to a POSITIVE machine delta that yields a positive display. Document the mapping precisely in the helper.
  - `setAxisDirection(axis, 'LEFT'|'riGht')`: drive the real setup menu via existing button helpers — `settingsButton.click()` → `selectAxis(axis)` → `key8`/`key2` to scroll to the Direction parameter → `key4`/`key6` to cycle to the target label → exit with `settingsButton`/`clearButton`. No window hooks. (Mirror `US-021-scale-resolution.spec.ts gotoSC`.)
- ASSERTION of sign: use `waitForAxisPureNumberValue` (signed numeric parse) for value+sign, and `getAxisRawText`/`waitForAxisPureTextValue` for the literal `-3.2500` leading-minus check. The sr-only `axis-value-*` cell already carries the sign (1.5).
- GAP / CALLOUT: no missing production control is required for E2E — setup menu (Direction param, Task 3) + mock-server move cover it. The two page-object helpers are the only additions (Task 7). For the in-app DEBUG demo gate (manual dogfooding via `source=debug`), the jog buttons already exist; the Direction toggle is reachable via the same setup menu. No new UI control is required. (Optional nicety, NOT required by any AC: a Direction indicator in the debug panel — explicitly out of scope.)

---

## 2. Data model additions

`src/types/nonVolatileMemory.ts`:
- `export type AxisDirection = 'normal' | 'reversed';` (stored value). Setup labels map `'normal'→'LEFT'`, `'reversed'→'riGht'` (manual §6.2 wording).
- `export interface AxisDirectionByAxis { X: AxisDirection; Y: AxisDirection; Z: AxisDirection; }`
- `NonVolatileMemory.axisDirection: AxisDirectionByAxis`.
- Z depth-positive preference (AC 2.4): `export type ZDepthSense = 'depth-negative' | 'depth-positive';` and `NonVolatileMemory.zDepthSense: ZDepthSense` (default `'depth-negative'`, i.e. standard). When `'depth-positive'`, Z display sign is inverted so increasing cutting depth increases the displayed value. Implemented as a Z-only extra factor inside `directionSign('Z', nvMem)` so it composes with the per-axis Direction. Documented as a user preference.
- Defaults: `DEFAULT_AXIS_DIRECTION = { X:'normal', Y:'normal', Z:'normal' }`; add `axisDirection` and `zDepthSense:'depth-negative'` to `DEFAULT_NON_VOLATILE_MEMORY`. The `settingsStore` merge (`settingsStore.ts:52-63`) already spreads DEFAULTS first, so existing persisted blobs gain the new fields safely.

`directionSign(axis, nvMem): 1 | -1`:
- base = `axisDirection[axis] === 'reversed' ? -1 : 1`.
- if `axis === 'Z' && zDepthSense === 'depth-positive'`, multiply by -1.
- returns the product.

---

## 3. Tasks (TDD; mostly independent; dependencies noted)

Test conventions: Vitest reducer/unit tests `*.test.ts`; integration `*.integration.test.tsx` (RTL, `data-testid`, helpers in `src/tests/helpers/`); E2E `e2e/**/*.spec.ts` (Playwright, `e2e/helpers/`). Reducer unit tests follow `inch-mm.test.ts` (reset `useSettingsStore.setState({nvMem})` in `beforeEach`, build explicit `context`).

### Task 1 — nvMem model: axisDirection + zDepthSense + directionSign helper
- Files: `src/types/nonVolatileMemory.ts`; (helper) co-locate `directionSign` in `src/stores/dro/utils/displayComputation.ts` (it needs nvMem only).
- Behavior: adds persisted per-axis Direction and Z depth-sense with safe defaults; pure sign function.
- Unit tests (`displayComputation.test.ts` new file, or a dedicated `direction.test.ts`): `directionSign` truth table — normal→+1, reversed→-1 per axis; Z depth-positive inverts; Z reversed + depth-positive = +1 (double inversion). Defaults are `normal`/`depth-negative`. `settingsStore` merge test: persisted blob lacking the new keys gets defaults (extend `settingsStore.test.ts`).
- ACs: enables 2.2, 2.4 (data layer). Covers none alone.
- Depends on: none. (Foundational — do first.)

### Task 2 — Apply Direction transform in displayComputation (display-only)
- Files: `src/stores/dro/utils/displayComputation.ts`.
- Behavior: `computeDisplayPosition` multiplies the post-datum mm value by `directionSign(axis, context.nvMem)` BEFORE `fromMmToAnyUnit`. `computeAxisPositionMm` stays datum-only (unchanged). Add a new `displayComputation.test.ts`.
- Unit tests: with `manualAbsoluteValues.X = 10` (mm) and `axisDirection.X='normal'` → display +10; `'reversed'` → -10. Datum interaction: connected, `position.x=10, workOffsets.X=0`, reversed → -10; with `workOffsets.X=4`, reversed → -(10-4)=-6 (proves datum applied first, then sign). Z depth-positive: `position.z=5` → display -5 (depth-positive inverts) and reversed+depth-positive → +5. Inch units: reversed still flips after conversion. `computeNormalDisplay` reflects all three axes.
- ACs: 2.1 (tool's-eye +X increases under normal), 2.2 (sign flips with Direction), 2.4 (Z depth-positive), and structurally supports 2.3 (datum kept separate so datum still affects sign independently).
- Depends on: Task 1.

### Task 3 — Setup menu: Direction parameter, commit-on-change
- Files: `src/stores/dro/features/setup-parameters.ts` (registry entry + optional `commit?` hook on `SetupParameter`), `src/stores/dro/features/setup.ts` (call `commit` on choice cycle).
- Behavior:
  - Add a per-axis `direction` parameter to `SETUP_PARAMETERS` (before `End`): `id:'direction'`, `scope:'per-axis'`, `label:'dir LEF'` (or device wording), choices `[{value:'normal',label:'dir LEF'},{value:'reversed',label:'dir rgt'}]` (final labels per §6.2 / 7-seg glyph support — verify against `SevenSegmentDigit` glyph set: L,E,F,r,g,t,d,i all exist). `readValue(ctx)` seeds from `ctx.nvMem.axisDirection[ctx.axis ?? 'X']`.
  - Add optional `commit?(ctx, value): void` to `SetupParameter`. For `direction`: `useSettingsStore.getState().updateNvMem({ axisDirection: { ...nvMem.axisDirection, [axis]: value } })`.
  - In `setup.ts reduceParameter`, when cycling choices: if the param has `commit`, call it AND build `updatedContext` (new nvMem) so `computeParameterDisplay` is consistent; still write to `draftValues` for label rendering. Params WITHOUT `commit` behave exactly as today (draft-only, discarded on exit). This is the surgical commit path (decision 1.3); generic US-027 stays unimplemented.
  - (Optional, only if Z depth preference must be operator-toggleable via menu for AC 2.4: add a global `z-depth` parameter with the same `commit` mechanism. AC 2.4 only requires it be "a documented user preference" — a persisted default + setting suffices. Recommend adding the menu entry for parity but keep it a separate sub-task; the documented preference + nvMem field already satisfies 2.4.)
- Unit tests (`setup.test.ts`, `setup-parameters.test.ts`): registry contains `direction` per-axis with two choices; `readValue` reflects committed `axisDirection`. Cycling KEY_6_RIGHT on the direction param while axis=X calls `updateNvMem` and `useSettingsStore.getState().nvMem.axisDirection.X` becomes `'reversed'`; label updates to riGht. Cycling on a non-commit param (e.g. counting-mode) does NOT touch nvMem (regression). Exiting via End after a direction change leaves nvMem committed (not discarded), unlike draft params.
- ACs: 2.2 (operator can change Direction through real menu and it persists).
- Depends on: Task 1. (Independent of Task 2 at code level; integration verified in Task 5.)

### Task 4 — Macro canonical-convention guard (AC 2.5)
- Files: tests only — `src/stores/dro/features/bolt-hole.test.ts` (and a representative second macro, e.g. `sdm.test.ts` or `grid.test.ts`). No production change expected (display-only transform already excludes macro math).
- Behavior: prove macro hole coordinates and macro distance-to-go are INVARIANT to `axisDirection`/`zDepthSense`.
- Unit tests: set `nvMem.axisDirection = {X:'reversed',Y:'reversed',Z:'reversed'}`; run a bolt-hole circle (centerX/Y, radius, holes) and assert `computeBoltHoleNavigateDisplay` distances equal the values computed with `normal` directions (i.e. the reducer path ignores Direction). Same for one other macro. Add an assertion/comment documenting the rule from 1.4.
- ACs: 2.5.
- Depends on: Task 2 (so the codebase has the transform whose NON-application here is being asserted).

### Task 5 — Integration: setup toggle flips the live readout
- Files: new `src/stores/dro/features/direction.integration.test.tsx` (RTL), using `src/tests/helpers/` render utils and `data-testid` (`axis-display-x`, `axis-value-x`).
- Behavior: render the simulator (manual/non-connected or mocked mill), establish a known positive X (e.g. preset/zero then a manual value), open setup via `btn-settings`, select X, scroll to Direction, cycle to riGht, exit; assert the X readout sign flipped. Then verify a subsequent MILL_STATE_CHANGED keeps the flipped sign.
- Integration expectations: exercises the full `dispatch`→`droReducer`→`setupReducer`(commit)→`updateNvMem`→ exit `computeNormalDisplay` chain (decision 1.3) and confirms the granular display selectors re-render (`useDisplayX`).
- ACs: 2.2 (end-to-end via real reducer pipeline + components).
- Depends on: Tasks 2, 3.

### Task 6 — Negative rendering regression (AC 2.6)
- Files: `src/components/Axis.test.tsx` (or `.integration.test.tsx`) + assert sr-only cell in a MultiAxisSection integration test.
- Behavior: confirm leading `-` for negatives, no sign for positives, in BOTH the seven-segment digit row and the `axis-value-*` sr cell. Include a case where the negative arises from a Direction flip of a positive value (ties 2.6 to 2.2).
- Unit/integration: `formatNumberValue(-3.25)` first glyph is `'-'`; `formatNumberValue(3.25)` first glyph is `' '`; sr cell text is `-3.2500`.
- ACs: 2.6.
- Depends on: none for the pure render assertion; the Direction-derived negative case depends on Tasks 2–3.

### Task 7 — E2E: page-object helpers + US-002 spec
- Files: `e2e/helpers/dro-page.ts` (add `simulateTableMove`, `setAxisDirection`), new `e2e/01-foundation/US-002-sign-convention.spec.ts`.
- Behavior / helpers (real user controls only):
  - `simulateTableMove(axis, dir: 'left'|'right', magnitudeMm)`: map tool's-eye table motion to an encoder delta and call `simulateEncoderRelativeMove`. Document: under standard convention table-LEFT ⇒ +tool ⇒ +display; choose the delta sign so a default-LEFT axis shows positive for `'left'`. (Confirm sign empirically against Task 2 transform during implementation.)
  - `setAxisDirection(axis, 'LEFT'|'riGht')`: drive setup menu via existing locators (`settingsButton`, `selectAxis`, `key8/key2`, `key4/key6`, exit) exactly like `US-021 gotoSC`. No `window.*`, no forcing `connected`.
- E2E tests (mirror spec scenarios):
  1. tool's-eye +X is table-left under default direction: `zeroAxis('X')` → `simulateTableMove('X','left',10)` → `waitForAxisPureNumberValue('X', 10)`.
  2. Direction flips sign: `setAxisDirection('X','riGht')` → `zeroAxis('X')` → `simulateTableMove('X','left',10)` → `waitForAxisPureNumberValue('X', -10)`.
  3. negative shows leading minus: `zeroAxis('Y')` → produce -3.25 (relative move) → `getAxisRawText('Y')` contains leading `-` / `waitForAxisPureNumberValue('Y', -3.25)`.
- ACs: 2.1, 2.2, 2.6 (and demonstrates 2.3 datum-dependence if a datum-shift case is added — optional 4th test: zero at one position vs another flips the sign of a fixed machine point).
- Depends on: Tasks 2, 3 (production behavior must exist).

### Task 8 (optional) — AC 2.3 explicit coverage + AC 2.4 doc
- Files: `displayComputation.test.ts` (datum-vs-direction independence already partly in Task 2); a short note in the user story / a `docs` comment for the Z depth-positive preference.
- Behavior: dedicated test that a fixed machine point reads negative from one datum and positive from another (pure datum effect, Direction normal) AND that Direction multiplies on top of that — proving the two transforms are independent (Implementation Note).
- ACs: 2.3 (explicit), 2.4 (documented preference).
- Depends on: Task 2.

---

## 4. AC coverage matrix
- AC 2.1 (tool's-eye +X increases): Task 2 (unit), Task 7 (E2E test 1).
- AC 2.2 (Direction flips sign): Task 2 (unit), Task 3 (commit), Task 5 (integration), Task 7 (E2E test 2). Commit-path decision = commit-on-change for the Direction param only.
- AC 2.3 (datum changes sign independently): Task 2 (datum-vs-sign unit), Task 8 (explicit), optional Task 7 datum test.
- AC 2.4 (Z depth-positive preference): Task 1 (field), Task 2 (transform), Task 8 (doc); optional menu entry in Task 3.
- AC 2.5 (macros use standard convention): Task 4 (invariance tests); enforced by display-only placement in Task 2 + rule 1.4.
- AC 2.6 (leading minus): already implemented (1.5); Task 6 regression.

## 5. Ordering & dependencies
1. Task 1 (model + directionSign) — foundation.
2. Task 2 (transform) — needs 1.
3. Task 3 (setup param + commit) — needs 1; parallel with 2.
4. Task 4 (macro invariance) — needs 2.
5. Task 5 (integration) — needs 2 + 3.
6. Task 6 (negative render) — independent (pure part), Direction-derived part needs 2+3.
7. Task 7 (E2E + helpers) — needs 2 + 3.
8. Task 8 (AC 2.3/2.4 explicit) — needs 2.

Parallelizable after Task 1: {Task 2, Task 3}. After Task 2: {Task 4, Task 8}. After {2,3}: {Task 5, Task 6, Task 7}.

## 6. Key decisions recap
- Commit path: per-parameter commit-on-change for the Direction (and optional Z-depth) param via `updateNvMem`, mirroring `inch-mm.ts`. NOT generic US-027 SAU-CHG. Sign flips on exit→idle and on every later MILL_STATE_CHANGED because nvMem is persisted at the keypress.
- Transform placement: display-only, in `computeDisplayPosition`, after datum subtraction; never on stored state or macro math (AC 2.5 safe).
- Real test trigger: mock-CNCjs encoder move (existing real-encoder path) wrapped as `simulateTableMove`; Direction change via real setup-menu button sequence wrapped as `setAxisDirection`. No test backdoors. AC 2.6 minus already rendered.
