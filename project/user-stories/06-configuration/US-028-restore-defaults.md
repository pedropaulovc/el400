# US-028: Setup Menu - Restore Factory Defaults

**Priority:** P5
**Category:** Configuration
**Manual Reference:** SPECIAL FUNCTIONS > RESTORE TO "AS-SHIPPED" (lines 441-447)

## User Story

**As a** machine operator
**I want** to restore DRO to factory default settings
**So that** I can recover from configuration errors

## Acceptance Criteria

- [ ] AC28.1: Press wrench key to enter setup
- [ ] AC28.2: Select axis
- [ ] AC28.3: Scroll to OEM MOD parameter
- [ ] AC28.4: Enter password: 3 5 7 2 6
- [ ] AC28.5: Confirm through prompts: 3 AXIS, MILL, OPT OFF
- [ ] AC28.6: Confirm SAV CHG
- [ ] AC28.7: Confirm RST DEF (reset defaults)
- [ ] AC28.8: Display shows "IN PROG"
- [ ] AC28.9: Wait 2 minutes for completion
- [ ] AC28.10: All settings return to factory defaults

## E2E Test Scenarios

```typescript
describe('US-028: Setup Menu - Restore Factory Defaults', () => {
  test('enter OEM mode with password', async ({ page }) => {
    await page.goto('/');

    // Enter setup
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Scroll to OEM MOD
    // ... press 2 key many times to reach end of menu ...

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('OEM MOD');

    // Should prompt for password
    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('PASS'); // or similar

    // Enter password: 3 5 7 2 6
    await page.click('[data-testid="3-key"]');
    await page.click('[data-testid="5-key"]');
    await page.click('[data-testid="7-key"]');
    await page.click('[data-testid="2-key"]');
    await page.click('[data-testid="6-key"]');
    await page.click('[data-testid="ent-button"]');

    // Password accepted
  });

  test('confirm 3-axis mill configuration', async ({ page }) => {
    await page.goto('/');

    // After entering OEM mode with password
    // ... setup ...

    // Confirm 3 AXIS
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('3 AXIS');
    await page.click('[data-testid="ent-button"]');

    // Confirm MILL
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('MILL');
    await page.click('[data-testid="ent-button"]');

    // Confirm OPT OFF
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('OPT OFF');
    await page.click('[data-testid="ent-button"]');
  });

  test('initiate reset to defaults', async ({ page }) => {
    await page.goto('/');

    // After confirming configuration
    // ... setup ...

    // SAV CHG prompt
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('SAV CHG');
    await page.click('[data-testid="ent-button"]');

    // RST DEF prompt
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('RST DEF');
    await page.click('[data-testid="ent-button"]');

    // Reset initiated
  });

  test('wait for completion progress', async ({ page }) => {
    await page.goto('/');

    // After initiating reset
    // ... setup ...

    // Should show IN PROG
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('IN PROG');

    // Wait 2 minutes (use shorter time for testing)
    await page.waitForTimeout(5000); // 5 seconds for testing

    // Process should complete
    await expect(page.locator('[data-testid="prompt-display"]')).not.toContainText('IN PROG');
  });

  test('verify all parameters at defaults', async ({ page }) => {
    await page.goto('/');

    // After reset completes
    // ... wait for completion ...

    // Enter setup
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Check each parameter:
    // SC = 5
    await expect(page.locator('[data-testid="value-display"]')).toContainText('5');

    // DP = 5
    // ... navigate to DP ...
    await expect(page.locator('[data-testid="value-display"]')).toContainText('5');

    // BEEP = ON
    // ... navigate to BEEP ...
    await expect(page.locator('[data-testid="value-display"]')).toContainText('ON');

    // SLEEP T = 000
    // ... navigate to SLEEP T ...
    await expect(page.locator('[data-testid="value-display"]')).toContainText('000');

    // All other parameters at defaults
  });

  test('verify data cleared (SDM, tool offsets)', async ({ page }) => {
    await page.goto('/');

    // Before reset, save some SDMs
    // ... program SDM 1, 2, 3 ...

    // Perform factory reset
    // ... reset procedure ...

    // Try to recall SDM 1
    await page.click('[data-testid="sdm-button"]');
    await page.click('[data-testid="6-key"]');
    await page.click('[data-testid="ent-button"]');
    await page.click('[data-testid="y-axis-button"]');
    await page.click('[data-testid="1-key"]');
    await page.click('[data-testid="ent-button"]');

    // SDM should be empty/default
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText(/ERROR|EMPTY/);
  });
});
```

## Implementation Notes

- **Purpose**: Factory reset when configuration is corrupted or unknown
- **Password protection**: Prevents accidental reset (password: 35726)
- **Confirmation prompts**: Multiple steps to confirm destructive action
- **What gets reset**:
  - All setup parameters to factory defaults
  - Scale resolution → 5 microns
  - Display resolution → 5 microns
  - Beep → ON
  - Sleep timer → 000 (disabled)
  - All other setup parameters
  - **User data cleared**: SDMs, tool offsets, machine references
- **Process duration**: Manual says "wait 2 minutes"
  - In simulation, can be instant or shorter
  - Show IN PROG indicator
- **Implementation**:
  ```typescript
  function restoreFactoryDefaults() {
    // Clear localStorage
    localStorage.clear();

    // Reset to default config
    config = getDefaultConfig();

    // Clear user data
    sdm = [];
    toolOffsets = [];

    // Save defaults
    localStorage.setItem('dro-config', JSON.stringify(config));
  }
  ```
- **Warning**: Irreversible! All user data lost.

## Related Stories

- US-027: Save Changes (opposite of reset - preserves settings)
- US-021 through US-026: All parameters that get reset
- US-009 through US-011: SDM data gets cleared

## Notes — Manual reconciliation (implementation)

The el400-operation-manual §6.2 setup table (the tie-breaker per AGENTS.md) lists
two **separate adjacent** rows:

| OCR | Meaning |
|-----|---------|
| `r5t oEñ` | Reset *6 — "Press to **Restore default** settings" (NOT password-protected) |
| `oEñ ñod` | OEM mode — "Password protected OEM mode" |

`OPT OFF` / `3 AXIS` / `MILL` appear only as standalone glossary glyphs (§12 text
list, ~line 2080-2097) — model-config indicators, not a restore confirm chain.
The manual's restore step is simply: scroll to `r5t oEñ` → ENT → `IN PROG` → done.

**Corroborated by the el400-dro-overview-video** (a second EL400-specific source):
§1.17 `[10:31]` — "`rSt oEñ` resets the display to the OEM defaults" (a simple
reset, narrated with no password / no `3 AXIS` chain / no confirm steps); §1.18
`[11:04]` — "`oEñ ñod` lets you create your own default settings that `rSt oEñ`
will restore to (e.g. make `EnF on` your default)." So the EL400's own manual AND
video both treat restore as the simple non-password row and OEM Mode as the
separate, password-protected baseline-definer. The password-routed chain
(3 AXIS / MILL / OPT OFF / RST DEF) exists only in the magxact-mx100m manual
(lines 877-890), which self-disclaims "may vary by firmware" and is overridden by
the EL400's own docs.

### Per-AC mapping (deviating ACs — evidence, not omission)

| Story AC | Disposition | Evidence |
|----------|-------------|----------|
| **28.4** "Enter password 3 5 7 2 6" | The privileged op the password guards is *defining* the OEM baseline (**US-044 `oEm mod`**); the **restore** itself is not password-gated. | §6.2 line 483 marks `oEñ ñod` "Password protected"; line 482 `r5t oEñ` carries **no** password marker. |
| **28.5** "Confirm 3 AXIS, MILL, OPT OFF" | **Not applicable** — these are model/options-config glyphs, not a restore confirm chain. | §12 glossary line 2097 `oPt oFF` = "Options off"; `3 AXIS`/`MILL` are model indicators, not menu steps. |
| **28.6** "Confirm SAV CHG" | **Not a separate step** — `rSt oEm` persists the restored config directly through the settings store on ENT. | §6.2: `r5t oEñ` is a single terminal row ("Press to Restore default settings"), no chained save. |
| **28.8/28.9** "IN PROG / wait 2 min" | Implemented as a brief test-controllable `In ProG` dwell, not a literal 2-min sleep. | Story Implementation Notes: "In simulation, can be instant or shorter". |
| 28.1/28.2/28.3/28.7/28.10 + "verify data cleared" | Implemented as written. | — |

The ACs 28.4-28.6 conflate the adjacent password-protected **`oEñ ñod`** (OEM
Mode) row with the restore row — an OCR-era reading. Implemented per the manual:

- **`rSt oEm`** is its own terminal-action setup row (mirrors SAV CHG / oEm mod).
  ENT runs the restore directly — **no password, no confirm chain.** The privileged
  op the password guards is *defining* the baseline (**US-044 `oEm mod`**), not
  *restoring* to it.
- `restoreDefaults()` restores to the captured **OEM baseline** if one exists
  (`nvMem.oemDefaults != null`, closing **US-044 AC44.4**), else the **factory**
  defaults (`DEFAULT_NON_VOLATILE_MEMORY`). User data (SDM points, tool/work
  offsets) is cleared.
- `In ProG` is shown for a brief, test-controllable dwell (`RESTORE_DURATION_MS`)
  instead of the manual's literal ~2-minute wait (AC28.8/28.9). The data work is
  durable synchronously on ENT, so the dwell is purely the on-screen indication.
  (The panel font has no uppercase 'N', so `IN` renders as `In`.)

The deviating ACs are documented here (not silently dropped); the behavior the
story intends — a multi-step, irreversible factory/OEM reset that clears user
data — is fully delivered, routed through the manual's actual control layout.
