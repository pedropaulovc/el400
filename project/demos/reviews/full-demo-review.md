# Full End-to-End Demo — Review

**Verdict: APPROVE (as an integrated product walkthrough).** The previously-carried US-046 REJECT is now RESOLVED by fix #247 (US-046 re-demo flipped to APPROVE); 3 remaining disclosed issues noted below.

Driven entirely through the real UI (DOM clicks + keyboard), no injected state, on final `main` with all 16 stories merged. 85 screenshots. Sources: `?source=manual` for pure menu/DRO flows, `?source=debug` for motion/probe.

## What the demo proves (spot-verified)
- **Boot → idle** — `01-boot-message.png` (X=`EL400`, Y=`vEr 1.0.0`) → idle readout. PASS.
- **Core DRO ops with live motion** — jog, select, zero, HALF, zero-all, ABS/INC, inch/mm (`03`–`11`). PASS.
- **Full §6.2 setup walk** — every parameter renders its faithful 7-seg label (`12`–`31`), choice cycling (`32`/`33`). PASS.
- **SAV-CHG persistence across a real reload** — `35` draft `SC 20.0` → `37` `StorEd` → `38-sc-after-reload.png` `SC 20.0` persisted. PASS.
- **OEM define→diverge→restore chain (the finale)** — `40` EnF on → `41` oEm mod → `42-oem-password-prompt.png` `PASS` (digits not echoed) → `43` oEm → `44` StorEd → `45` diverge to EnF oFF → `46` rSt oEm (separate non-password row) → `47-restore-in-progress.png` `In ProG` → `49-restore-verified-enf-on.png` **EnF on restored to baseline** (not factory). End-to-end, screenshot-backed. PASS.
- **SDM program + run** — `52`–`56` (DTG X10/Y20/Z5 matches programmed point). PASS.
- **Calculator 12+8=20** — `59-calc-result.png` (`20.0000`, using the working operand order). PASS.
- **Center finding** — `60`–`65` (midpoint DTG −0.1575, math correct). PASS.
- **Patterns** — bolt-hole `66`/`67`, grid `68`/`69`. PASS (intro + entry).
- **Keypad lock** — `77`–`80` (locked zero no-op, readout live, wrench reachable). PASS.
- **Touch probe edge** — `81`–`85` (prb LED lights only inside the active probe function). PASS.

## Disclosed issues (presenter's Observations — all honest and correct)
1. **US-046 self-diagnostics skip — RESOLVED by fix #247 (was a REJECT).** When this full demo was captured it only showed `rAmPASS`/`88888888` (`70`/`71`) via `?source=manual`; in `?source=debug` those steps fast-forwarded past. Fix #247 (main @ fc40f5d) gated the memory/display/keyboard steps + exit latch on front-panel keys, and the US-046 re-demo verified all three symptoms fixed under live ticks — see US-046-demo.md (now APPROVE). The full-demo screenshots predate the fix, but the underlying feature is no longer defective.
2. **Calculator operand-order trap** — works only as `operand ENT op operand ENT`; the manual's operation-first order silently drops the first operand. Matches team-lead context note #2. The demo uses the working order (hence `20.0000` is genuine), but the trap is real for operators. Not in the 16-story scope; flagged for backlog.
3. **No dedicated ZERO-ALL control** — the demo zeroes X/Y/Z individually; there is no `axis-zero-all` button. If the real EL400 has a ZERO-ALL key, the simulator doesn't expose one. Worth confirming against the manual.
4. **Cosmetic: debug panel overlaps the simulator below ~1600px** — fixed 320px panel covers the secondary-function buttons (SDM/calc/probe), intercepting clicks. Responsive-layout fix recommended (collapsible drawer).

## Verdict rationale
As a consolidated product walkthrough, the demo convincingly shows the EL400 simulator working coherently end-to-end through genuine user actions — including the riskiest newest chain (OEM define→restore) proven to land on the custom baseline. It is also commendably honest: the Observations surface the exact defects rather than hiding them. I APPROVE the full demo as a showcase. The one feature it had to dodge (US-046) is now fixed (#247) and its re-demo approved; remaining issues 2–4 are logged for follow-up.
