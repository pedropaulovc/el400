# US-012: Home, Set Machine Reference and Recall

**Authority:** EL400 Operation Manual §§7.7, 7.7.1, 7.7.2.1 and 7.7.2.2.  
**Priority:** High

## User Story
**As a** machine operator  
**I want** to home an axis, save a machine reference and recall it after power loss  
**So that** I can recover the same work-coordinate system

## Target Acceptance Criteria
- [ ] **AC 12.1:** Reference works only in ABS; invoking it from INC first forces ABS. Its arrow menu contains all three manual operations: `honE`, `nC rEF` (recall) and `SEt nC` (Set MC).
- [ ] **AC 12.2 — Home:** `honE` → `ent` shows `SELECt`; choosing X/Y/Z shows blinking/waiting zero. Crossing an actual simulated encoder reference mark establishes that mark as the axis datum and resumes counting from zero.
- [ ] **AC 12.3 — Set MC:** after Home, move to the required fixed machine-reference position, choose `SEt nC` → `ent`, and select an axis. The DRO stores that axis's offset from the reference mark persistently and shows zero at the selected position.
- [ ] **AC 12.4 — Recall MC:** choose `nC rEF` → `ent`, select an axis, then cross the same encoder reference mark. The display resumes counting from the persisted Set MC offset, restoring the saved machine-reference coordinate system.
- [ ] **AC 12.5:** Each X/Y/Z axis is learned and recalled independently; only a real reference-mark crossing completes Home/Recall. Ordinary jogs that do not cross the mark leave the waiting indication active.
- [ ] **AC 12.6:** `C` cancels a waiting operation and restores the prior live ABS display without changing a saved reference.

## Baseline Audit (headed debug source)
- **Passed:** INC forced ABS; Home and recall selection/wait states; real debug crossing of the +10 mm reference mark; cancellation/re-entry.
- **Passed only against a placeholder:** recall jumped to built-in `25.4000` at the mark and then counted correctly.
- **Confirmed gap:** the menu contained only Home and MC REF. `SEt nC` was absent, so an operator could not create or persistence-test the value being recalled.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualData.json` (`US-012`)
- Screenshot: `/tmp/el400-audit/data/reference-mc-ref-menu.png`
- E2E: [`e2e/03-data-management/US-012-datum-recall.spec.ts`](../../../e2e/03-data-management/US-012-datum-recall.spec.ts)
- Integrated target E2E: `e2e/03-data-management/manual-fidelity.spec.ts` (pending Main verification)

The complete Home → Set MC → Recall persistence workflow remains pending Main's integrated verification.
