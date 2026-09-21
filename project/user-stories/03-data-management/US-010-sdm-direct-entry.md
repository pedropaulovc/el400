# US-010: SDM Program Mode

**Authority:** EL400 Operation Manual §§8.2 and 8.2.1.  
**Priority:** Medium

## User Story
**As a** machine operator  
**I want** to enter persistent XYZ sub-datums from a drawing  
**So that** Run mode can guide me through the programmed sequence

## Target Acceptance Criteria
- [ ] **AC 10.1:** SDM opens `ProGrAn` by default, followed in arrow order by `rUn` and `LEArn`; `ent` on `ProGrAn` enters Program.
- [ ] **AC 10.2:** The prompt is exactly `StEPno` and defaults to step 1. `Y`, digits and `ent` jump to any step 1–1000; 0/1001 are not valid slots.
- [ ] **AC 10.3:** X, Y and Z each accept signed coordinates for the selected step, confirmed with `ent`, without changing physical machine position.
- [ ] **AC 10.4:** `6►` commits the complete step and advances; `4◄`/`6►` navigate previous/next steps at the step prompt.
- [ ] **AC 10.5:** Program, Learn and Run use one 1000-step source of truth, and committed XYZ values persist across reload/power-up.
- [ ] **AC 10.6:** `C` exits and restores normal live counting without discarding earlier committed steps.

## Baseline Audit (headed debug source)
- **Passed:** signed XYZ programming, step advance, sparse jump and exit.
- **Confirmed gaps:** an extra generic SDM activation preceded the mode menu, the prompt rendered `StEP` rather than `StEPno`, and programmed slots were lost on reload.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualData.json` (`US-010`)
- E2E: [`e2e/03-data-management/US-010-sdm-program.spec.ts`](../../../e2e/03-data-management/US-010-sdm-program.spec.ts)
- Integrated target E2E: `e2e/03-data-management/manual-fidelity.spec.ts` (pending Main verification)

Post-audit menu, label and persistence changes remain pending Main's integrated verification.
