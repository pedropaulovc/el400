# US-040 Counting Mode (LinEAr/AnGULAr) + Angular dP DMS — Demo Review

**Verdict: APPROVE**

Source: `?source=debug` (live jog for angular readout). Real DOM clicks. Also covers the US-040-dms follow-up.

## AC coverage
- **AC40.1** First param is `LinEAr` (default) — `02-counting-mode-LinEAr-default.png` (X selected → `LinEAr`). PASS.
- **AC40.2** `◄`/`►` toggle LinEAr↔AnGULAr — `03-counting-mode-AnGULAr.png` (`AnGULAr` after ►). PASS.
- **AC40.4** Angular exposes `dd.mn`/`dd.mn.SS`/`dd.dEC` — `04` (`dd.mn`), `05` (`dd.mn.SS`), `06` (`dd.dEC`); the linear micron `dP` list is replaced. All three formats shown via ► cycling. PASS.
- **AC40.3** Linear→micron+radius/dia (US-041); angular→DMS readout — `09` live. PASS.
- **AC40.5** Per-axis — X set angular while Y/Z stay `0.0000` linear. PASS.
- **AC40.6** Mill default all-linear — `01-idle-debug.png` (all axes numeric on boot). PASS.
- **AC40.7** Persists via SAV CHG — committed via End/ENT; narrated. Generic persistence proven by US-027. Non-blocking.

## Strongest evidence
`09-live-readout-12.30.00.png`: debug panel shows machine X=12.500, DRO renders `12.30.00` (12°30'00") in dd.mn.SS — the 0.5° → 30' conversion is correct. `10` confirms 12.6° → `12.36.00`. The seconds group updates live on jog. This proves the chosen angular format actually drives the readout, not just a label.

## Verdict rationale
Full chain shown through real UI: default linear, toggle to angular, all three DMS formats exposed, and a correct live angular conversion. The `.` separators stand in for °/'/" the 7-seg can't draw, matching the manual's labels. Approve.
