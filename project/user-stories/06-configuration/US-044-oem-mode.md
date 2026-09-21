# US-044: Setup Menu - OEM Mode

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** EL400 Operation Manual §6.2, pp. 20–21: `oEm mod` is password-protected and distinct from direct `rSt oEm`.
- **Video:** EL400 overview §1.18, `[11:04–11:39]`: OEM mode defines the custom defaults that `rSt oEm` restores, such as making `EnF on` the restored default.

## User Story

**As a** machine setup technician  
**I want** to capture a protected OEM configuration baseline  
**So that** operators can restore a selected axis's known shop settings without changing operator job data

## Acceptance Criteria

- [ ] **AC44.1:** `oEm mod` is a separate setup row after `rSt oEm`; Enter opens masked `PASS` entry.
- [ ] **AC44.2:** A wrong password shows `Err`, changes nothing, and does not enter OEM mode.
- [ ] **AC44.3:** The configured simulator OEM code enters `oEm`; a second Enter captures the currently **saved** configuration and shows `StorEd`.
- [ ] **AC44.4:** Unsaved setup drafts are not silently incorporated into the OEM baseline. The operator must commit intended settings with `SAU CHG` before capturing.
- [ ] **AC44.5:** The OEM snapshot contains setup configuration only. It excludes SDMs, machine/reference data, tool/work offsets, six-output programs, and other operator job data.
- [ ] **AC44.6:** The OEM baseline persists across reload and becomes the preferred per-axis source for `rSt oEm`; immutable factory defaults remain the per-axis fallback when no OEM baseline exists.
- [ ] **AC44.7:** The EL400 OEM flow never enters the conflicting MagXact `3 AXIS / MILL / OPT OFF / rSt dEF` machine-mode chain.

## Human Verification

Save a distinctive X/Y/global setup configuration, create representative operator/job data, enter the masked OEM code, and store the baseline. Change and save X plus the job data, reload, then invoke US-028 restore with X selected. Confirm the captured X configuration returns while Y, globals, and current job data remain unchanged, and the machine-mode chain never appears. Repeat with a wrong password and with an unsaved setup draft as negative controls.

## Automated Coverage

- [`e2e/06-configuration/US-044-oem-mode.spec.ts`](../../../e2e/06-configuration/US-044-oem-mode.spec.ts)
- Restore consumer: [`e2e/06-configuration/US-028-restore-defaults.spec.ts`](../../../e2e/06-configuration/US-028-restore-defaults.spec.ts)

## Baseline Audit (before the current implementation work)

The headed audit passed the masked password flow, wrong-code rejection, `StorEd`, custom ENF baseline capture, and reload persistence. Its old global restore returned the captured baseline, but that did not prove the corrected selected-axis isolation. It also did not prove that capture excludes unsaved drafts and operator/job data; those target boundaries remain to be verified after integration.
