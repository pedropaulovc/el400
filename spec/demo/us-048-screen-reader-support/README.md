# Demo: US-048 Screen Reader Support

Manual, real-user demonstration of the EL400 DRO simulator's screen-reader /
assistive-technology (AT) experience. Driven through a real Chromium browser
(Playwright in manual mode) — **no test suites, no mocking, no forced state.**
Every state change below was produced by clicking the actual on-screen controls
or pressing keys, and **every assertion is evidenced by a captured snapshot of
the live accessibility tree / ARIA attributes** — i.e. the exact surface a
screen reader consumes.

> **Evidence note (why no seven-segment screenshots):** AC 48.8 deliberately
> marks the visual seven-segment panel `aria-hidden="true"` — it is *absent* from
> the AT surface. A photo of that panel therefore proves nothing about what a
> screen reader hears. So for the three dynamic criteria (48.3, 48.5, 48.6) the
> evidence here is **AT-tree / DOM-attribute dumps captured after each real
> action**, saved as their own `accessibility-tree-after-*.txt` files — read
> those, not a panel image. The lone `03-full-app.png` is included only for
> sighted orientation and is explicitly **not** AC evidence.

- **App:** `npm run dev` → Vite (run on port 8090 here to avoid the test suite on the default port). `?source=mock` used only so positions are deterministic; all changes still come from real keypad/Zero/toggle clicks.
- **Branch:** `feat/us-048-screen-reader-accessibility`
- **Spec:** `project/user-stories/08-accessibility/US-048-screen-reader-support.md`

## Artifacts

| File | Evidence for | What it shows |
|------|--------------|---------------|
| [`accessibility-tree.txt`](accessibility-tree.txt) | AC 48.1, 48.2, 48.4, 48.7, 48.8 | Full idle AT tree: names, directional keypad hints, fieldset groups, headings, brand logo present + decorative chrome absent. |
| [`accessibility-tree-after-select-x.txt`](accessibility-tree-after-select-x.txt) | **AC 48.6** | After clicking *Select X axis*: `button "Select X axis" [pressed]`; aria-pressed readback X=true, Y=false, Z=false; momentary `btn-abs-inc` / `btn-toggle-unit` stay false. |
| [`accessibility-tree-after-preset-5.txt`](accessibility-tree-after-preset-5.txt) | **AC 48.3** | After keypad `5`+Enter: the *Axis positions* table cell reads `row "X 5.0000"`; X cell DOM has `aria-live="polite"`, `aria-atomic="true"`. |
| [`accessibility-tree-after-zero-x.txt`](accessibility-tree-after-zero-x.txt) | **AC 48.3** | After *Zero X axis*: the same live cell reads `row "X 0.0000"` — the value actually changed (5.0000 → 0.0000). |
| [`accessibility-tree-after-absinc.txt`](accessibility-tree-after-absinc.txt) | **AC 48.5** | Before/after *Abs/Inc*: `[checked]` moves from `radio "abs"` to `radio "inc"`; the momentary button stays `aria-pressed=false`. |
| `03-full-app.png` | (orientation only) | The visual panel, for sighted context. **Not AC evidence.** |

---

## Step 1 — Static AT tree at idle (AC 48.1, 48.2, 48.4, 48.7, 48.8)

After boot (`data-dro-state="idle"`), the full ARIA tree was captured from the
live DOM via `body.ariaSnapshot()` — see [`accessibility-tree.txt`](accessibility-tree.txt).
Excerpt:

```
- main:
  - heading "Electronica EL400 Digital Readout Simulator" [level=1]
  - img "Electronica Logo"
  - heading "Axis display" [level=2]
  - table "Axis positions":
      - row "X 0.0000" / "Y 0.0000" / "Z 0.0000"
  - group "Positioning mode":  radio "abs" [checked] [disabled] / radio "inc" [disabled]
  - group "Measurement units": radio "inch" [checked] [disabled] / radio "mm" [disabled]
  - group "Status":            radio "fn"/"sdm"/"prb"/"slp" [disabled]
  - heading "Axis selection" [level=2]
  - button "Select X axis" / "Zero X axis" / "Select Y axis" / ...
  - heading "Numeric keypad" [level=2]
  - button "1" / "2 (Down)" / "3" / "4 (Left)" / "5" / "6 (Right)" /
           "7" / "8 (Up)" / "9" / "0" / "Toggle sign" / "." / "Clear" / "Enter"
  - heading "Primary functions" [level=2]   ...buttons "Settings"/"Abs/Inc"/...
  - heading "Secondary functions" [level=2] ...buttons "Bolt hole"/"Calculator"/...
```

| AC | Proof in the tree |
|----|-------------------|
| **48.1** | Every control has a descriptive accessible NAME, not an icon glyph. |
| **48.2** | Directional keypad keys announce direction: `"2 (Down)"`, `"4 (Left)"`, `"6 (Right)"`, `"8 (Up)"`; plain digits announce the bare digit. |
| **48.4** | Three `group`s: `"Positioning mode"`, `"Measurement units"`, `"Status"`. |
| **48.7** | Five `[level=2]` headings. |
| **48.8** | `img "Electronica Logo"` announced; PowerLED / HousingEdge / seven-segment chrome absent (negative check below). |

---

## Step 2 — AC 48.6: axis selection flips `aria-pressed`
**Evidence:** [`accessibility-tree-after-select-x.txt`](accessibility-tree-after-select-x.txt)

Real action: `getByRole('button', { name: 'Select X axis' }).click()`. Captured AT tree + attribute readback:

```
- group "Axis selection and zeroing":
  - button "Select X axis" [pressed]
  - button "Zero X axis"
  - button "Select Y axis"
  ...

  Select X axis    testid=axis-select-x    aria-pressed=true
  Select Y axis    testid=axis-select-y    aria-pressed=false
  Select Z axis    testid=axis-select-z    aria-pressed=false
  Abs/Inc          testid=btn-abs-inc      aria-pressed=false
  Toggle units     testid=btn-toggle-unit  aria-pressed=false
```

The selected axis reports `[pressed]` / `aria-pressed="true"`; the other selects
stay `false`. The momentary `Abs/Inc` and `Toggle units` buttons correctly stay
`aria-pressed="false"` — the spec carve-out (their state is conveyed by the LED
radio group, not a pressed toggle). A screen reader announces "Select X axis, pressed".

---

## Step 3 — AC 48.3: the live region value actually changes
**Evidence:** [`accessibility-tree-after-preset-5.txt`](accessibility-tree-after-preset-5.txt) and [`accessibility-tree-after-zero-x.txt`](accessibility-tree-after-zero-x.txt)

With X selected, I typed **5** on the keypad and pressed **Enter** (real button
clicks). Captured from the *Axis positions* table — the AT surface, not the panel:

```
- table "Axis positions":
    - row "X 5.0000":  rowheader "X" / cell "5.0000"
    - row "Y 0.0000"
    - row "Z 0.0000"

  X value cell (testid=axis-value-x): <td> text='5.0000'
  aria-live=polite   aria-atomic=true
```

Then I clicked **Zero X axis**. The same cell re-announces back to zero:

```
- table "Axis positions":
    - row "X 0.0000":  rowheader "X" / cell "0.0000"

  X value cell (testid=axis-value-x): <td> text='0.0000'
  aria-live=polite   aria-atomic=true
```

Two independent real-UI actions each moved the `aria-live="polite"
aria-atomic="true"` cell (0.0000 → 5.0000 → 0.0000), proving the live region
re-announces position changes to assistive tech.

---

## Step 4 — AC 48.5: the checked radio MOVES on mode toggle
**Evidence:** [`accessibility-tree-after-absinc.txt`](accessibility-tree-after-absinc.txt)

Real action: click the momentary **Abs/Inc** button. Captured *Positioning mode*
group before and after:

```
BEFORE:
- group "Positioning mode":
    - radio "abs" [checked] [disabled]
    - radio "inc" [disabled]
  radio .checked DOM: abs=True  inc=False

AFTER:
- group "Positioning mode":
    - radio "abs" [disabled]
    - radio "inc" [checked] [disabled]
  radio .checked DOM: abs=False  inc=True
  'Abs/Inc' button aria-pressed: false
```

The `[checked]` state **moved** abs → inc, so AT reports the newly-active
positioning mode within the group. The momentary `Abs/Inc` button stays
`aria-pressed="false"` (spec carve-out).

---

## Step 5 — AC 48.8 negative check: decorative chrome absent, brand logo announced

Verified against the live DOM and the rendered tree:

| Element | In DOM? | Inside `aria-hidden`? | In the a11y tree? |
|---------|---------|----------------------|-------------------|
| PowerLED glow (`radial-gradient` lamp) | yes | **yes** | **no** |
| HousingEdge bezels | yes | **yes** | **no** |
| Seven-segment display X/Y/Z (`axis-display-*`) | yes | **yes** | **no** (would duplicate the live value) |
| **BrandLogo** `img alt="Electronica Logo"` | yes | **no** | **yes — announced** |

Definitive grep of the captured idle tree for any decorative leak:

```
$ grep -iE "power|bezel|housing|glow|lamp|seven|segment" accessibility-tree.txt
NONE — decorative chrome is correctly hidden
```

So a screen-reader user hears the brand ("Electronica Logo") but never the
decorative lamp, bezels, or the visual seven-segment glyphs (which would
double-announce the position already provided by the live region).

---

## Result — all 8 ACs evidenced from the AT surface

| AC | Evidence file | Verdict |
|----|---------------|---------|
| 48.1 names | accessibility-tree.txt | PASS |
| 48.2 directional keypad hints | accessibility-tree.txt | PASS |
| **48.3 live-region updates** | accessibility-tree-after-preset-5.txt + after-zero-x.txt | PASS |
| 48.4 fieldset/legend groups | accessibility-tree.txt | PASS |
| **48.5 checked radio moves** | accessibility-tree-after-absinc.txt | PASS |
| **48.6 aria-pressed flips** | accessibility-tree-after-select-x.txt | PASS |
| 48.7 section headings | accessibility-tree.txt | PASS |
| 48.8 decorative hidden / brand kept | accessibility-tree.txt + DOM negative check | PASS |

Focus-visibility (visible focus ring) is **not** part of US-048's acceptance
criteria — it belongs to US-037 (Keyboard Navigation) — so it is intentionally
omitted from this demo's claims.

No "no user-reachable trigger" gaps: every state change was reachable through
ordinary on-screen controls.
