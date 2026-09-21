# US-044: Setup Menu - OEM Mode

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §6.2, pp. 20–21: `oEm mod` is password-protected and distinct from direct `rSt oEm`.
- **Video:** [DROPROS EL400 overview](https://www.youtube.com/watch?v=7W47KPCu7jE) §1.18, `[11:04–11:39]`: OEM mode defines the custom defaults that `rSt oEm` restores, such as making `EnF on` the restored default.

## User Story

**As a** machine setup technician  
**I want** to capture a protected OEM configuration baseline  
**So that** operators can restore a selected axis's known shop settings without changing operator job data

## Acceptance Criteria

- [x] **AC44.1:** `oEm mod` is a separate setup row after `rSt oEm`; Enter opens masked `PASS` entry.
- [x] **AC44.2:** A wrong password shows `Err`, changes nothing, and does not enter OEM mode. Returning preserves the selected setup axis, current row, and pending drafts.
- [x] **AC44.3:** The configured simulator OEM code enters `oEm`; a second Enter captures the currently **saved** configuration and shows `StorEd`.
- [x] **AC44.4:** Unsaved setup drafts are not silently incorporated into the OEM baseline. The operator must commit intended settings with `SAU CHG` before capturing. Successful OEM capture returns to the same setup transaction, retaining its axis and drafts for a later explicit save or discard.
- [x] **AC44.5:** The OEM snapshot contains setup configuration only. It excludes SDMs, machine/reference data, tool/work offsets, six-output programs, and other operator job data.
- [x] **AC44.6:** The OEM baseline persists across reload and becomes the preferred per-axis source for `rSt oEm`; immutable factory defaults remain the per-axis fallback when no OEM baseline exists.
- [x] **AC44.7:** The EL400 OEM flow never enters the conflicting MagXact `3 AXIS / MILL / OPT OFF / rSt dEF` machine-mode chain.

## Human Verification

Save a distinctive X/Y/global setup configuration, create representative operator/job data, enter the masked OEM code, and store the baseline. Change and save X plus the job data, reload, then invoke US-028 restore with X selected. Confirm the captured X configuration returns while Y, globals, and current job data remain unchanged, and the machine-mode chain never appears. Repeat with a wrong password and with an unsaved setup draft as negative controls.

## Automated Coverage

- [`e2e/06-configuration/US-044-oem-mode.spec.ts`](../../../e2e/06-configuration/US-044-oem-mode.spec.ts)
- Restore consumer: [`e2e/06-configuration/US-028-restore-defaults.spec.ts`](../../../e2e/06-configuration/US-028-restore-defaults.spec.ts)

## Verification

[Portable evidence and full-suite results](../README.md#verification)

Headed checks covered the masked password, wrong-code rejection, `oEm` authorization, `StorEd`, and the EL400 flow without the conflicting machine-mode chain. Capture used the saved configuration and excluded an unsaved `dP 50.0` draft. After reload, selected-X restore chose the captured `dP 20.0 / diA / riGht` slice over factory defaults while preserving Y, globals, newer datums and SDMs. Further restore checks preserved programmed outputs and count, output mode and behavior, and probe geometry.

Those preservation checks used simulator job data and logical I/O/probe surfaces. No physical output or probe hardware was exercised.
