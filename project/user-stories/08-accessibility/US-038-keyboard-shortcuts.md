# US-038: Keyboard Shortcuts

**Manual Reference:** Accessibility / Power User Features
**Priority:** P2

## User Story
**As a** power user or CNC operator
**I want** to operate the DRO using keyboard shortcuts
**So that** I can work more efficiently without reaching for the mouse

## Acceptance Criteria

### Keypad & Navigation
- [x] **AC 38.1:** Numpad digits 0-9 enter corresponding digits when axis selected
- [x] **AC 38.2:** Arrow keys navigate in function menus (Up=8, Down=2, Left=4, Right=6)
- [x] **AC 38.3:** Enter and NumpadEnter confirm value entry
- [x] **AC 38.4:** Period and NumpadDecimal enter decimal point
- [x] **AC 38.5:** Minus and NumpadSubtract toggle sign
- [x] **AC 38.6:** Escape and Backspace clear current input

### Axis Control
- [x] **AC 38.7:** X, Y, Z keys select corresponding axis
- [x] **AC 38.8:** Shift+X, Shift+Y, Shift+Z zero corresponding axis

### Primary Functions
- [x] **AC 38.9:** W key opens settings menu
- [x] **AC 38.10:** A key toggles ABS/INC mode
- [x] **AC 38.11:** U key toggles unit (inch/mm)
- [x] **AC 38.12:** R key activates reference function
- [x] **AC 38.13:** Shift+0 zeros all axes

### Secondary Functions
- [x] **AC 38.14:** B key opens bolt circle function
- [x] **AC 38.15:** O key opens arc contour function
- [x] **AC 38.16:** G key opens angle hole function
- [x] **AC 38.17:** D key opens grid hole function
- [x] **AC 38.18:** K key opens calculator
- [x] **AC 38.19:** H key halves the selected axis value
- [x] **AC 38.20:** S key opens SDM function
- [x] **AC 38.21:** F key opens function menu

### General Behavior
- [x] **AC 38.22:** Keyboard shortcuts only activate when simulator has focus
- [x] **AC 38.23:** Audio feedback plays for keyboard shortcuts
- [x] **AC 38.24:** Browser defaults (backspace navigation) prevented for handled keys

## Key Mappings

### Keypad & Navigation
| Key | Action |
|-----|--------|
| `Numpad0-9`, `Digit0-9` | Enter digit |
| `ArrowUp/Down/Left/Right` | Navigation (maps to 8/2/4/6) |
| `Enter`, `NumpadEnter` | Confirm (ENT) |
| `.`, `NumpadDecimal` | Decimal point |
| `-`, `NumpadSubtract` | Sign toggle |
| `Escape`, `Backspace` | Clear (C) |

### Axis Control
| Key | Action |
|-----|--------|
| `X`, `Y`, `Z` | Select axis |
| `Shift+X/Y/Z` | Zero axis |

### Primary Functions
| Key | Action |
|-----|--------|
| `W` | Settings (wrench) |
| `A` | Toggle ABS/INC |
| `U` | Toggle Unit (inch/mm) |
| `R` | Reference |
| `Shift+0` | Zero All |

### Secondary Functions
| Key | Action |
|-----|--------|
| `B` | Bolt Circle/Hole |
| `O` | Arc Contour |
| `G` | Angle Hole |
| `D` | Grid Hole |
| `K` | Calculator |
| `H` | Half |
| `S` | SDM |
| `F` | Function menu |

## E2E Test Scenarios
```typescript
describe('US-038: Keyboard Shortcuts', () => {
  test('can enter value using numpad keys directly', async ({ page }) => {
    await page.goto('/');
    await page.locator('[tabindex="0"]').first().focus();

    await page.keyboard.press('x');
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('axis-value-x')).toContainText('123');
  });

  test('can toggle ABS/INC mode with A key', async ({ page }) => {
    await page.goto('/');
    await page.locator('[tabindex="0"]').first().focus();

    const absLed = page.getByTestId('led-abs');
    await expect(absLed.locator('input')).toBeChecked();

    await page.keyboard.press('a');

    const incLed = page.getByTestId('led-inc');
    await expect(incLed.locator('input')).toBeChecked();
  });

  test('can zero axis with Shift+X/Y/Z', async ({ page }) => {
    await page.goto('/');
    await page.locator('[tabindex="0"]').first().focus();

    await page.keyboard.press('x');
    await page.keyboard.press('5');
    await page.keyboard.press('0');
    await page.keyboard.press('Enter');

    await page.keyboard.press('Shift+x');

    await expect(page.getByTestId('axis-value-x')).toContainText('0.0000');
  });
});
```

## Implementation Notes

### Architecture
- `useKeyboardShortcuts` hook in `src/hooks/useKeyboardShortcuts.ts`
- Hook uses existing contexts: `VolatileMemoryContext`, `InputBufferContext`, `DROStateContext`, `NonVolatileMemoryContext`
- Audio feedback via shared `playClickSound()` utility in `src/utils/audio.ts`

### Focus Management
- Simulator container has `tabIndex={0}` to receive keyboard focus
- Shortcuts only activate when simulator or its children have focus
- Focus ring visible when container is focused (blue ring)

### Key Event Handling
- Uses `event.code` (e.g., `KeyX`) for consistent cross-browser behavior
- Modifier keys (Ctrl, Alt, Meta) are ignored to avoid conflicts with browser shortcuts
- `event.preventDefault()` called for handled keys to prevent browser defaults

## Related Stories
- US-037: Keyboard Navigation (Tab-based focus traversal)
- US-034: Forced Colors Mode (visual accessibility)

## Technical Notes
- Keyboard shortcuts complement but don't replace Tab navigation
- Power users can use direct shortcuts while accessibility users can use Tab+Enter
- InputBufferContext created to share input state between KeypadSection and keyboard shortcuts
