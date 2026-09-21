# US-028: Setup Menu - Restore OEM / Factory Defaults

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §6.2, pp. 20–21: `rSt oEm` is a direct "Restore default settings" row marked \*6; note \*6 makes the reset applicable only to the selected axis. Adjacent `oEm mod` is the separate password-protected OEM mode.
- **Video:** [DROPROS EL400 overview](https://www.youtube.com/watch?v=7W47KPCu7jE) §§1.17–1.18, `[10:31–11:39]`: `rSt oEm` restores the OEM defaults; `oEm mod` defines the custom baseline it will later restore.
- The lower-priority [MagXact setup guide](https://cdn.shopify.com/s/files/1/0576/0984/6859/files/MagXact-MX-100M-Mill-DRO-V1-9-1-2021.pdf?v=1740669616) password → `3 AXIS` → `MILL` → `OPT OFF` → `rSt dEF` chain conflicts with both EL400 sources and is not an EL400 requirement.

## User Story

**As a** machine operator  
**I want** one direct restore command for the selected axis, with an unambiguous default source  
**So that** I can recover that axis's known configuration without disturbing the rest of the job

## Acceptance Criteria

- [x] **AC28.1:** After selecting an axis in setup, `rSt oEm` is a separate row immediately before `oEm mod`.
- [x] **AC28.2:** Enter at `rSt oEm` starts restoration directly; it does not request a password, machine type, option mode, or a separate `SAU CHG`.
- [x] **AC28.3:** Source hierarchy is deterministic for the selected axis: restore its slice from the persisted OEM baseline captured by US-044 when one exists; otherwise restore that axis's immutable current factory defaults.
- [x] **AC28.4:** Restore changes only the selected axis's setup configuration. Other axes, every global setting, SDMs, ABS/INC and machine/reference datum data, tool/work offsets, saved output programs and counts, output mode, and probe geometry remain unchanged.
- [x] **AC28.5:** `In ProG` is displayed during the operation. The simulator may use a short deterministic dwell instead of hardware-scale timing, but the selected-axis restore is durable before normal operation resumes.
- [x] **AC28.6:** The restored selected-axis configuration and all preserved state survive reload.
- [x] **AC28.7:** Factory fallback for the selected axis includes its documented mill defaults such as linear counting, `SC 5.0`, `dP 5.0`, radial mode, `LEFt`, uncompensated calibration, and default per-axis warning values. It does not reset global ENF, lock, keypad beep, or sleep.
- [x] **AC28.8:** If restoring SC/calibration changes the selected axis's coordinate frame, its volatile SLEC reference activation is invalidated until the actual reference mark is crossed again. Persisted calibration settings and operator/reference data remain stored.

## Human Verification

Configure X and Y differently, change global settings, and create representative SDM/datum/output data. With no OEM baseline, invoke `rSt oEm` while X is selected, observe `In ProG`, reload, and confirm only X returned to factory configuration. Y, globals, and all job data must be unchanged. Then define an OEM baseline with a distinctive X setup, change away from it, restore X again, and confirm the OEM axis slice wins. If SC/calibration changed, confirm only X's volatile reference activation requires a new mark crossing. At no point should the MagXact machine-mode chain appear.

## Automated Coverage

- [`e2e/06-configuration/US-028-restore-defaults.spec.ts`](../../../e2e/06-configuration/US-028-restore-defaults.spec.ts)
- OEM producer side: [`e2e/06-configuration/US-044-oem-mode.spec.ts`](../../../e2e/06-configuration/US-044-oem-mode.spec.ts)

## Verification

[Portable evidence and full-suite results](../README.md#verification)

Direct factory and custom-OEM restores showed `In ProG`, required no password or separate save, and remained durable after reload. The factory arm restored X's linear, `SC 5.0`, `dP 5.0`, radial, `LEFt`, unity-calibration, and warning defaults. The selected-axis operation preserved Y, global settings, datums/reference data, SDMs, four programmed outputs and their count, continuous output mode and comparator behavior, and probe diameter/length behavior. The selected X reference activation was invalidated after its scale/calibration changed, while Y's active calibration continued without another crossing.

Output and probe preservation were checked through the simulator's visible logical panels and debug geometry. No physical relay load, probe, serial transport, or encoder hardware was exercised.
