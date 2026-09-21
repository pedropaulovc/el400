# US-012: Home, Set Machine Reference and Recall

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §§7.7, 7.7.1, 7.7.2.1 and 7.7.2.2.  
**Priority:** High

## User Story
**As a** machine operator  
**I want** to home an axis, save a machine reference and recall it after power loss  
**So that** I can recover the same work-coordinate system

## Target Acceptance Criteria
- [x] **AC 12.1:** Reference works only in ABS; invoking it from INC first forces ABS. Its arrow menu contains all three manual operations: `honE`, `nC rEF` (recall) and `SEt nC` (Set MC).
- [x] **AC 12.2 — Home:** `honE` → `ent` shows `SELECt`; choosing X/Y/Z shows blinking/waiting zero. Crossing the simulated physical encoder reference mark establishes the mark as the axis datum and resumes counting from the residual travel beyond it.
- [x] **AC 12.3 — Set MC:** after Home, move to the required fixed machine-reference position, choose `SEt nC` → `ent`, and select an axis. The DRO persistently stores that axis's physical displacement from the reference mark and shows zero at the selected position.
- [x] **AC 12.4 — Recall MC:** choose `nC rEF` → `ent`, select an axis, then cross the same physical reference mark. The display resumes counting from the persisted Set MC offset, restoring the saved machine-reference coordinate system.
- [x] **AC 12.5:** Each X/Y/Z axis is learned and recalled independently; only a physical reference-mark crossing completes Home/Recall. Ordinary jogs that do not cross the mark leave the waiting indication active. The mark is an encoder-space event, not a fixed displayed work coordinate.
- [x] **AC 12.6:** `C` cancels a waiting operation and restores the prior live ABS display without changing a saved reference.

## Verification
The headed run forced ABS, traversed all three reference operations and rejected Set MC on an unhomed axis. Noncrossing movement left Home and Recall waiting; forward and reverse overshoots across the debug source's simulated physical +10 mm reference mark completed them while preserving residual travel. Set MC stored an arbitrary 27.25 mm physical displacement, survived reload and selected-axis OEM restore, and returned to zero at the saved machine-reference position. The complete cycle was run on X; Y supplied the no-reference and axis-isolation checks, while independent full Y/Z cycles were not repeated. No physical encoder or reference wiring was exercised.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/03-data-management/US-012-datum-recall.spec.ts`](../../../e2e/03-data-management/US-012-datum-recall.spec.ts)

