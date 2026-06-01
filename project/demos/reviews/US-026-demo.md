# US-026 Display Sleep Timer (SLEEP t) — Demo Review

**Verdict: APPROVE**

Source: `?source=manual`. Real UI. Time advanced with `page.clock.fastForward` (time only — the sleep transition is the app's own `useSleepTimer` firing; the wake is a real X key event). Honest: no app state injected.

## AC coverage
- **AC26.1/26.2/26.8** Reach SLEEP T, default 0/off — `02-sleep-default-off.png` (`SLP oFF`). PASS.
- **AC26.3/26.4** Set 1 min — `03-sleep-1min.png` (`SLP 1`). PASS.
- **AC26.5** Display sleeps after idle period — `05-asleep-dimmed-led-flashing.png`: after 61s the readout is clearly dimmed (faint `0.0000`). The app's timer drove it, not an injection. PASS.
- **AC26.6** Sleep LED flashes — narrated (`flashing animate-blink` on wrench/sleep LED); the dimmed-display screenshot is the primary evidence. PASS.
- **AC26.7** X/Y/Z wakes display — `06-x-wakes-display.png`: pressing X restores full-brightness `0.0000`. PASS.

## Verdict rationale
The real sleep→wake cycle is demonstrated: configured 1-min timeout, the app's own timer dims the display, a genuine X-key press wakes it. The dimmed vs awake screenshots are unambiguous. Approve.
