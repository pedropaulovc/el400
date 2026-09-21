# US-018: Arc Contouring (Step Drilling)

**Priority:** P4  
**Category:** Pattern Generation  
**Manual reference:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §9.1.3, pp. 50–52; [MagXact manual](https://cdn.shopify.com/s/files/1/0576/0984/6859/files/MagXact-MX-100M-Mill-DRO-V1-9-1-2021.pdf?v=1740669616) arc-contour procedure and “BEFORE CUTTING METAL” warning (secondary where EL400 diagrams contain no extractable prose)

## User Story

**As a** machine operator  
**I want** evenly spaced tool-center targets along an arc  
**So that** I can step-drill or mill an inside, outside, or centerline contour

## Target Acceptance Criteria

- [x] **AC18.1:** Arc Contour starts only from ABS mode and visibly requests center X/Y, radius, start angle, end angle, and tool diameter.
- [x] **AC18.2:** Cut type initially shows `int CUt`. One 6 selects `EXt CUt`; a second selects `mid CUt`; a third wraps to `int CUt`. ENT confirms the displayed choice.
- [x] **AC18.3:** The effective tool-center radius is `R-toolDiameter/2` for INT, `R+toolDiameter/2` for EXT, and `R` for MID.
- [x] **AC18.4:** After cut type, enter positive `nAX CUt` (maximum center-to-center step). INT rejects a tool diameter that makes `R-toolDiameter/2` zero or negative.
- [x] **AC18.5:** For effective radius $r_e$ and arc span $s$ radians, the number of intervals is $ceil(|r_e s|/MAXCUT)$. The macro generates intervals+1 endpoint-inclusive targets, so every consecutive chord is no greater than MAX CUT.
- [x] **AC18.6:** Final ENT enters live X/Y distance-to-go to point 1. 6/4 navigate and wrap. 8 toggles a visible number view with X=`hoLES` and the 1-based point in Y. 2 opens the same visible label with a Y numeric buffer; all digits are data, and ENT accepts only a safe in-range integer.
- [x] **AC18.7:** Only numeric distance-to-go axes use the pattern function marker; prompts and current/jump views do not.
- [x] **AC18.8:** Operator guidance retains the reference warning to dry-run with a marker or scrap before cutting metal. This is safety guidance, not a claim that the simulator displays an extra warning dialog.

## Operator Procedure and Independent Oracles

Use center `(0,0)`, nominal radius `25`, start `0°`, end `90°`, tool diameter `5`, and MAX CUT `5`:

- **MID (two presses from default INT):** effective radius 25; 8 intervals/9 targets. First `(25,0)`, second `(24.5196,4.8773)`, last `(0,25)`; first chord ≈4.901 mm.
- **INT (accept default):** effective radius 22.5; 8 intervals/9 targets. First `(22.5,0)`, last `(0,22.5)`.
- **EXT (one press from default):** effective radius 27.5; 9 intervals/10 targets. First `(27.5,0)`, second `(27.0822,4.7753)`, last `(0,27.5)`.

These coordinate/count oracles are independent of reducer state and prevent a cut-type cycling test from passing with mislabeled modes.

## Verification

The headed pattern pass supersedes the baseline current-number, jump-prompt, and arrow-digit defects. It verified the ABS guard, parameter sequence, `int CUt` → `EXt CUt` → `mid CUt` cycle, independent effective radii, endpoint counts and chord bounds, invalid INT geometry rejection, live movement to zero, wrap, current-point view, and visible jump to point 4. The dry-run statement remains source-backed safety guidance. No real metal was cut, and no physical encoder or machine tool was exercised.

See the [verification evidence, source snapshots, and full-suite results](../README.md#verification).

## Automated coverage

[`e2e/05-pattern-generation/US-018-arc-contouring.spec.ts`](../../../e2e/05-pattern-generation/US-018-arc-contouring.spec.ts) checks all three geometry oracles through the visible UI.

## Related Stories

- US-016 / US-017: shared pattern navigation
- US-024: automatic milling-function near-zero warning
