# EL400 audit and story-stack continuation (2026-09-21)

Published as a draft-PR checkpoint at the user's request. The status below is the 2026-09-21 pause snapshot, not a live report. This PR preserves the handover text only: the bundle, uncommitted repair patch, unpublished branches, and local evidence described below remain in the local checkpoint. Public evidence links are already hosted on GitHub. Keep this PR draft; it does not resume or approve the implementation stack.

## What this work is

The user requested an audit of all 48 stories against the manuals, comprehensive parallel headed debug-mode testing, implementation of incorrect/missing behavior, E2Es and corrected stories. They then requested: **split the aggregate PR into a stack per story group**. Their latest instruction was **wrap up and save a handover for later continuation**. Work is now paused, not complete.

The audited aggregate is preserved in draft [PR308](https://github.com/pedropaulovc/el400/pull/308). Two replacement PRs are published. Layers03/04 are assembled locally; layers05–09 remain prepared commits on the original base. No PR was merged or closed. No `gh stack init`/`submit` has run yet.

## Durable checkpoint and locations

The local checkpoint directory is `/home/pedro/src/el400/.handover.local/2026-09-21`, ignored by `.gitignore`'s `*.local` rule. The paths in this section are relative to that directory, not this published Markdown file. Its supporting artifacts are not committed in this documentation PR.

- `branches.bundle`: verified complete-history bundle of the aggregate and all nine stack branches.
- `branches.json`: exact heads/parents, worktree statuses, untracked-file lists and `git log --oneline origin/main..HEAD` for every layer.
- `patches/01-foundation.patch`: **10,935 bytes of uncommitted, tested probe/reference repairs**. Other layer patches are empty. No untracked source files were found.
- `pull-requests.json`: one-time GitHub state snapshot at pause.
- `evidence/`: durable copies of 153 temporary evidence entries, including screenshots, reports, logs, review records, archives and the stack contract. Browser profiles, dependency trees and temporary Git worktree contents were excluded.
- `evidence/el400-story-stack/contract.json`: frozen ownership/order contract. Read this before touching the stack.
- Per-layer build/review records are under `evidence/el400-story-stack/`. Their original absolute `/tmp` paths remain in the JSON; map those to this durable copy if temporary files are gone.
- Additional agent handovers are copied alongside this document. This document supersedes stale next-step advice in them; Calculations has already been restacked onto `a0577d0`.

The live worktrees remain at `/tmp/el400-story-stack/<group>`. Do not rely on `/tmp` surviving reboot. The main repo and its shared Git database are durable at `/home/pedro/src/el400`.

## State right now

Main checkout: `feat/manual-fidelity-audit` at `4fe7a9cefa6c9accb6007c0101a751d3b8adc428`, clean. Original base and current main/origin/main checkpoint: `b374f49d6f01cfd5c0aac5ccde70ba8e98dd531d`.

| Order/group | Current local head | Parent | Publication / verification |
|---|---|---|---|
|01-foundation|`e66682cc7b0b1ea4cec8e10e8da2e95572f6ad75`|`8d79100662c0633aeaed18b61ee3b51f3f37d673` (same layer)|[PR309](https://github.com/pedropaulovc/el400/pull/309), ready, plus four uncommitted repair files|
|02-core-operations|`c2a9bdb9162293382bd973cd72d3ae971ddf64c9`|`e66682c`|[PR310](https://github.com/pedropaulovc/el400/pull/310), draft; clean; local review fixes NOT started|
|03-data-management|`a0577d0d2a991a1520fc850f7f7acfc1949008e4`|`c2a9bdb`|Clean, unpublished; final one-test gate repair not rerun|
|04-calculations|`c1cc9c0f4d9e7e076f767ec5f342ed70ef5c46ef`|`a0577d0`|Clean, unpublished, unvalidated|
|05-pattern-generation|`f40f65cb3c195cfebe1aaddc2af77c51db1286f7`|`b374f49`|Prepared only, not yet chained/gated|
|06-configuration|`0c4a02e797c587b31f12413035bb439ededf000d`|`b374f49`|Prepared only|
|07-auxiliary|`1befc3d2d8379f1f70193ce5803efa81e4c9ae35`|`b374f49`|Prepared only|
|09-integration|`5a87b1602ff18fdaf362e123b1f81f894ae247ec`|`b374f49`|Prepared only; intentionally BEFORE Accessibility|
|08-accessibility|`be9753c8ed289e30ef5160d90e9b16c17e6eb9da`|`b374f49`|Prepared only; final evidence/docs rollup belongs here|

Foundation history above base: `8d79100` (initial extraction) then `e66682c` (local-review repairs). Exact complete commit lists for every layer are in `branches.json` rather than guessed here.

### GitHub state at pause

All three PRs are OPEN, mergeStateStatus CLEAN, and reviewDecision is the empty string — **not approval**.

- PR308: draft, head4fe7a9c; eight successful checks, two skipped; historical backup only.
- PR309: ready, heade66682c; eight successful checks, two skipped. General Codex review completed with **one unresolved P2**. The working-tree fix is not published. Earlier automatic SECURITY-only review on8d79100 is stale and does not approve the current code.
- PR310: draft, headc2a9bdb, base `stack/el400-01-foundation`. GitHub snapshot contains only deploy success and deprovision skipped. **No unit/lint/E2E/Storybook CI results were present for this feature-base PR.** Inspect workflow triggers if full CI is expected; do not equate this with a full CI pass. Local full gate did pass.

All task-owned services were stopped for the pause: `el400-audit`, `el400-ui-proof`, and official watchers for308/309. Root called `unwatch_pr` for both; capabilities are revoked. The messenger loop exited. All writing/review/browser agents stopped; the last headed session closed. Re-establish required watchers with the `watch-pr` skill when resuming; do not reuse old monitor URLs.

## Actionable items

### 1. Finish Foundation's remote-review repair — reachable today on PR309

Codex thread `PRRT_kwDOQj_drM6kZqfR`, comment `4063399429`, review `5268203513`, reviewed e66682c. Full body: `evidence/el400-story-stack/watch-309/46655.log`.

The published probe/reference helpers still captured raw physical positions after the display began decoding installed encoder counts. At physical X10, SC10/installed5um, the display is20; edge/Home stored raw10 and left a10 readout instead of zero.

**Fix already exists, uncommitted**, in four Foundation files: probe.ts, probe.test.ts, reference.ts, reference.test.ts. `/tmp/el400-story-stack/01-foundation/src/stores/dro/features/probe.ts:81` now uses the canonical getter. `/tmp/el400-story-stack/01-foundation/src/stores/dro/features/reference.ts:96` retains physical crossing detection; its decoded datum helper starts at line108 and handles exact-mark overshoot separately. Do not replace physical detection with decoded coordinates.

Verification already completed on this exact working source: 46 focused tests; full `test:all` **1,739 unit/integration +155 E2E +44 Storybook**, all pass. Log: `evidence/el400-story-stack/01-foundation-remote-gate.log` (original raw artifact4093). Source repair/control recipe: `01-foundation-remote-repair.json`.

Pre-fix headed reproduction completed on public e66682c: both edge and Home read10 instead of0. Report/screenshots: `evidence/el400-foundation-remote-before.json` and matching directory. Optional two-edge headed span stopped after first capture: **no completed span result**. New automated span regression passes, but the pre-e666 automated control has NOT yet been run. No headed post-fix run yet.

Next: run the historical control if needed, verify the published-facing post-fix scenario, refresh Foundation's stale1736 count in its index/body/build metadata to1739, commit/push, reply to the thread and resolve only after evidence, then explicitly tag `@codex review` for the next general round. Current source already passed the full gate; rerun if code changes. Blast radius: all existing probe/reference datums; lower parent for the entire stack.

### 2. Fix Core's reviewed migration gaps — reachable today on draft PR310

`evidence/el400-story-stack/02-core-operations-local-review.json` is a COMPLETE opposite-family review of c2a9bdb. **No CORE-01..04 repair was started.** Core remains clean.

- **CORE-01 P1:** `/tmp/el400-story-stack/02-core-operations/src/stores/dro/features/probe.ts:118` and line150 still write `incrementalValues` for connected INC. Core's getter now reads `incrementalOffsets`, so connected INC probe edge/midpoint is a no-op. For connected machines, write machine-minus-target offsets into `incrementalOffsets`; retain disconnected `incrementalValues` and ABS behavior. Add observable connected INC edge/midpoint regressions. Keep physical compensation policy. Same file as Foundation's frame repair: inherit that repair first and preserve both changes. Do not import Auxiliary's whole probe redesign.
- **CORE-02:** `/tmp/el400-story-stack/02-core-operations/src/stores/dro/features/restore-defaults.ts:104` clears old INC values but omits new `incrementalOffsets`. Add the new field to this baseline full-clear behavior and cover it. Configuration later deliberately replaces this with per-axis OEM restore preserving operator datums; do not force the old semantics into06.
- **CORE-03:** `/tmp/el400-story-stack/02-core-operations/src/stores/dro/features/half.ts:23` returns state for unrelated events while selecting an axis, falsely claiming them and causing multi-handler errors (e.g. sleep timeout). Return null for events HALF does not own; prove actual root sleep behavior and no false duplicate-handler diagnostic. This is a deliberate small improvement over frozen4fe, not log suppression.
- **CORE-04 cleanup:** `/tmp/el400-story-stack/02-core-operations/src/stores/dro/features/menu.ts:38` uses ReturnType instead of the existing DisplayState convention. Switch to the named type when completing the repair; no new behavior test for a type-only cleanup.

Then restack Core onto the new Foundation head, preserving lower regressions. Full gate before pushing. Local repair review before another remote review. Blast radius: independent INC datum consumers and baseline restore; later Data/Calc parents must be rebased too.

### 3. Gate and publish Data; complete its partial review

Data a0577d0 includes the fix for its sole failed gate assertion: an obsolete test treated idle BTN_HALF as unhandled, contradicting Core. Only that obsolete assertion was removed; meaningful boot-unhandled and HALF-select tests remain. **No rerun after this amendment.** Prior failure log original artifact3943; build record explains it.

Review `03-data-management-local-review.json` is explicitly INCOMPLETE, against superseded ca4f686 (a057 differs by that test removal). No concrete behavioral regression found in inspected scope. Remaining review coverage: SDM/reference test bodies, selected shared/relative-Preset E2Es, page-helper argument arity, and render-level marker behavior.

Known doc drift: `/tmp/el400-story-stack/03-data-management/e2e/03-data-management/US-008-distance-to-go.spec.ts:41` and line69 still cite old AC numbers. Reconcile with rewritten US008. Preserve mandatory automatic zero-approach warnings for Preset/SDM; Configuration must not weaken them when adding per-axis settings.

### 4. Continue the chain, without losing mandatory lower migrations

Calculations c1cc9c0 is already on a0577d0, clean and unvalidated. Do not repeat its old ca4f686 restack. After lower repairs, restack03 then04 again, gate each, and publish drafts promptly.

For05 onward, rebase each prepared commit from b374f49 onto the previous completed layer. Use each `<group>-build.json` and the contract. Important seams:

- Core owns ALL center-circle source/math (US007 requires it); Calculations US015 adds only dedicated docs/E2E.
- Calculations has settings version1 reset for removed stored `TaperOnAxis='Zprime'`, tested through real `persist.rehydrate`. Keep the pre-Configuration taper registry row and bounded visible-tAPEr navigation.
- Patterns owns six feature reducers and their marker/menu/store hunks; preserve inherited consumer migrations.
- Configuration owns complete setup/calibration/OEM/warning/sleep/lock/beep behavior and compound-key sleep-first handling. Settings version2 resets the immediate-prior scalar-warning schema; preserve both version0→current taper and version1→current warning hydration regressions. Keep baseline AUH Fn behavior until Auxiliary.
- Auxiliary brings AUH Fn entry/implementation/registrations/tests atomically. Extend persistence Pick/equality guard/partialize with outputProgram/outputCount without dropping lower fields. Merge against Configuration's apply/commit API. Taper is five right steps after6oP enters the ring; bounded navigation avoids fragile slot assumptions.
- Integration precedes Accessibility because US048 needs ConnectionStatus. Preserve Foundation layout and Auxiliary panel when merging Index.
- Accessibility is legitimately mostly tests/docs. Preserve Foundation's removal of exact2px forced-colors assertions. Top README/story index must use actual final stack evidence, not premature aggregate claims.

At the tip, compare against4fe7a9c and account for deliberate differences: schema version2 rather than aggregate1, genuine new regression tests/caller fixes, HALF ownership fix, robust navigation, forced-colors assertion cleanup and honest documentation.

Only after every layer is independently gated: `gh stack init --base main` with branches in the table's order, then `gh stack submit --auto` (pushes ALL layers; do not invoke with unvalidated branches). It should adopt already published309/310. Ready completed PRs, local opposite-family reviews then one explicitly tagged remote bot, watch each lifecycle. No squash merges. Keep308 until replacement stack is published, then close it as superseded with links.

## Measured facts and evidence

- Aggregate4fe:1572 unit/integration,196 E2E,44 Storybook. Portable replay current495/0 vs initial e9d460/35; finite-guard control on63c5b92 gives35/1. Script and exact outputs are in `evidence/el400-aggregate-controls.zip` (not uploaded yet; archive was assembled before pause, inspect before publication).
- Foundation e666:1736/155/44,140 focused pass. Identical140 tests on8d give137pass/3fail. Disarmed hydration merge29pass/1fail; restored30/0. Headed before/after: angular20→10 then20; SC10 physical10→decoded20, selected-axis HALF15 before then10 after. Four PNGs and matching JSON under evidence.
- Foundation uncommitted probe/reference fix:1739/155/44 plus46 focused pass. This is NOT deployed or remotely approved.
- Core c2:1716/159/44 passes; `02-core-operations-gate.log`. Review gaps above remain despite green tests.
- Custom-OEM/SLEC aggregate check closed retained ledger index30: selected-X restore deactivates only X (120), Y stays80.6; crossing only X restores saved custom130, distinct from changed140/factory120. Ten screenshots/report archived publicly at https://github.com/user-attachments/files/32474028/el400-oem-slec-headed.zip and linked in https://github.com/pedropaulovc/el400/pull/308#issuecomment-5762479713. Initial HEAD504 was transient; anonymous curl HEAD returned200/2279724 bytes and full download matched local zip with cmp.
- Earlier public evidence links/provenance are in `evidence/el400-audit-attachments.json`, `el400-reviewed-headed-attachments.json`, and `el400-reviewed-evidence-index.json`. Aggregate evidence comments:308#issuecomment-5757300263 and308#issuecomment-5761904651.
- Followup disposition ledger now has13 records (12 original findings plus Core addendumF5), preserving ID mismatches/amendments. Retained33-item ledger has no pending OEM check. Do not confuse declined/withdrawn findings with accepted ones.

## Frozen decisions and authority

Authority: local EL400 primary manual > local video manual > MagXact. References live under `/home/pedro/src/harmonic-analyzer/references/`; do not refetch them unnecessarily.

User explicitly chose **angular serial remains Pc fail; no invented degree wire encoding**. Keep raw reference frames (no blanket mode-change rescaling/invalidation), calibration lengths inmm (LEC primary; SLEC documented policy), physical polar radius, physical probe compensation, valid one-hole zero-span ARC but invalid multi-hole zero-span, signed decimal angular function residuals and wrapped untargeted readouts, and unwrapped angular output thresholds. Do not reopen settled Axis Set echo claims without new primary evidence.

## Gotchas / wrong turns

- **Absolute worktree paths are mandatory for read/grep/LSP.** A bash cwd does not change other tool roots; default task cwd remains the aggregate repo. A literal `millState.position` search misses destructuring aliases. Trace semantic consumers, including still-baseline features, when activating a common coordinate frame.
- Actual canonical helper is `computeMachinePositionMm(axis, vMem, context)`. Some earlier task prose used incorrect shorthand signatures; trust current code, not that prose.
- Root `write xd://lsp` status confirmed typescript-language-server ready. Do not infer absence from there being no named `lsp` function; the device is accessed through write. Some agents reported it unavailable in their scope.
- Each worktree needs its own real node_modules. Run npm ci after reconstruction; symlinks break Storybook. Serialize full gates because browser servers use fixed ports.
- A test fixture's display unit is `nvMem.defaultUnit`, not a guessed `vMem.unit`. Angular magnitude regressions should not pin an incidental decimal string; Number(display.X) avoided that mistake.
- Baseline Foundation HALF is select-axis then HALF; Core intentionally changes it to HALF then select-axis. Preserve the decoded-SC regression by migrating its sequence.
- Baseline SAU ChG remains on the setup row after Enter; C exits. Front-panel labels have mixed case. A naive loop for exact SAU CHG missed SAU ChG.
- Attached headed browser tab.click with ARIA timed out on a visible CSS-zoomed button; raw Puppeteer page.click by title worked and was reported to harness QA. Puppeteer keyboard.press does not accept Playwright's Control+A syntax: down(Control), press(KeyA), up(Control). No store injection was used for headed proof.
- Watch-pr plugin2.1.1 emits legacy headers and +2 more checks; reconcile omitted details with root get_pr. Auto ready review is SECURITY-only; explicit @codex review was needed for general review. Foundation's unresolved general-review thread must not be mistaken for approval.
- This OMP hub has no progress:wake. The proven messenger helper is `evidence/el400-story-stack/watch-hub-relay.mjs`. Native logs are full retained windows, not deltas. Use byte cursors, recover truncated artifacts with bounded Eval read, and ignore unchanged cursors. For PTY stdout, visible LF drops raw CR bytes:309 needed lineEndings:'crlf'. Start future monitor processes with pty:false and use default'lf'. Keep exactly one official watcher per PR. The helper captures complete bodies in files and sends headers; Root must read relevant bodies before acting.
- Public watch309 also emitted deployment events for310. Do not treat another branch's deployment as proof for the watched head.

## User-only steps

None currently required. No credential/login blocker is known. Do not ask the user to run available CLI/API steps. Do not merge on the stale security thumbs-up or the empty GitHub reviewDecision.

## Parked and pickup order

1. Read this handover, contract and current branch/PR snapshots. Reopen required watch subscriptions/processes; old ones were deliberately canceled.
2. Finish Foundation's already-tested uncommitted fix, its remaining control/post-fix evidence, metadata and remote reply/re-review.
3. Repair Core CORE-01..04, restack on Foundation, gate/review/push; migrate the same-file probe changes carefully.
4. Restack Data and Calculations; rerun their gates and finish Data's partial review; publish groups03/04.
5. Assemble/gate/review/publish05,06,07,09,08, preserving the contracts above. Then register/submit the full gh stack.
6. Complete the top-level evidence rollup and upload the portable aggregate controls archive; retire308 only after the replacements exist. Follow all PRs to their authorized terminal state.

All four remaining global todos were paused by user request, not completed. No new source work should be started merely to make this handover look complete.

### Recovering after loss of /tmp

Branches and shared Git history normally remain in the main repo. The bundle is an additional verified backup. Use `git bundle list-heads branches.bundle` and fetch from it only if a ref is missing; never overwrite unrelated user changes. Prune only stale worktree registrations as appropriate, recreate each branch's worktree, then run npm ci in each. Apply `patches/01-foundation.patch` ONLY to Foundation at e66682c and only when those modifications are not already present (`git apply --check` first). No other source patch needs recovery. Preserve the existing live worktree if it is still present; do not reset it to reapply the patch.
