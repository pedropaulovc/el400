# US-043 — Setup Menu: Keypad Lock (LoC) — Demo Walkthrough

**Source:** `?source=debug` · **Driver:** Playwright (real UI) · **Port:** 8201

Debug mode is used so we can **jog a real axis** and prove the readout keeps tracking while
locked, and that a locked axis-zero is a true no-op. The debug control panel overlays the
keypad, so panel input here uses the app's **real keyboard shortcuts** (`useKeyboardShortcuts`
— same dispatch path as the on-panel buttons: `W`=wrench, `X`=select X, `Shift+X`=zero X,
arrows=nav, `Enter`=ENT). All assertions passed.

| Step | Screenshot | What it shows | AC |
|------|-----------|---------------|-----|
| 1 | `01-idle-debug.png` | Debug mode idle, control panel on the right | — |
| 2 | `02-x-jogged-nonzero.png` | Jogged X to a non-zero **datum** (`0.1969`) | — |
| 3 | `03-loc-default-off.png` | Setup → X → `LoC oFF` (**default**) | AC43.1 |
| 4 | `04-loc-on.png` | ▶ → `LoC on`; `nvMem.keypadLock=on` | AC43.1, AC43.6 |
| 5 | `05-locked-idle.png` | Exited setup; **locked** idle, datum `0.1969` preserved | — |
| 6 | `06-locked-display-updates-on-jog.png` | Real jog while locked: readout moves `0.1969 → 0.2362` | **AC43.5** |
| 7 | `07-locked-zero-is-noop.png` | **Zero X (Shift+X) while locked = no-op**; X stays `0.2362` | **AC43.3, AC43.7** |
| 8 | `08-locked-wrench-enters-setup.png` | Wrench **still** enters setup (`SELECt`) while locked | **AC43.4** |
| 9 | `09-loc-off-again.png` | Setup → X → ◀ → `LoC oFF`; `nvMem.keypadLock=off` | **AC43.2** |
| 10 | `10-unlocked-zero-works.png` | Keys restored: Zero X now zeros X (`0.2362 → 0.0000`) | AC43.2 |

## Verified facts
- **AC43.1** `LoC` offers `LoC oFF` (default) / `LoC on`.
- **AC43.2** saving `LoC on` disables front-panel keys; cycling back to `LoC oFF` restores them.
- **AC43.3/43.7** a locked `Zero X` is dropped — the datum (`0.2362`) is protected, NOT reset.
- **AC43.4** the wrench/setup key stays live while locked (the unlock path).
- **AC43.5** the position readout keeps updating on a real jog while locked (input gated, readout live).
- **AC43.6** the lock commits to `nvMem.keypadLock` (localStorage-backed) on cycle, so it survives a power cycle.

## Honesty note
The lock/unlock are real setup-menu cycles; the gated/ungated zero, the live jog, and the
wrench-enters-setup are all real key/jog events through the reducer. No injected state.
