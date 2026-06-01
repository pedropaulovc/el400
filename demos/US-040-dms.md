# US-040 follow-up demo — Angular display-resolution DMS formats

Completes AC 40.4 and the angular half of AC 40.3: an angular axis's display-resolution
(`dP`) parameter offers the DMS formats `dd.mn` / `dd.mn.SS` / `dd.dEC` (manual §6.2,
"Display resolution (Angular)"), and the chosen format drives the live readout.

## One-line recipe

Run `npm run dev`, open `/?source=debug`, then in the device:

1. Press the wrench (setup) -> select **X** -> the first item is `LinEAr`; press `►` once -> `AnGULAr`.
2. Press `▼` to the display-resolution item — it now reads `dd.mn` (the linear `dP n.0`
   micron list is replaced by the three angular formats). `►` cycles `dd.mn` -> `dd.mn.SS`
   -> `dd.dEC`. Pick `dd.mn.SS`, then `▼` to `End` + `ent`.
3. Jog X in the debug panel: 12.5° now reads **`12.30.00`** (12°30'00"); `dd.mn` would read
   `12.30`, `dd.dEC` would read `12.500`. The angle wraps at 360° (450° -> `90.00.00`).

The `.` separators stand in for the °/'/" the seven-segment panel cannot draw, exactly as
the manual writes the format labels. Linear axes are unchanged (still `dP 5.0` microns, 1:1
distance). The format is per-axis and display-only — stored machine position is untouched.
