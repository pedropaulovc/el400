# US-036: Settings Persistence

**Priority:** P1
**Category:** Integration
**Source:** Data Interface Architecture

## User Story

**As a** machinist
**I want** my DRO settings to be remembered between sessions
**So that** I don't have to reconfigure my preferences every time I use the DRO

## Acceptance Criteria

- [ ] AC36.1: Unit preference (inch/mm) persists across browser sessions
- [ ] AC36.2: Beep setting persists across browser sessions
- [ ] AC36.3: Display precision persists across browser sessions
- [ ] AC36.4: Settings load correctly when embedded as a CNCjs widget
- [ ] AC36.5: "Reset to defaults" restores all settings to factory values
- [ ] AC36.6: Settings changes take effect immediately without page reload

## Background

The DRO simulator may run as a standalone page or embedded in a CNCjs widget iframe. Settings must persist in both contexts using browser localStorage, providing a seamless experience similar to traditional DRO units that store settings in non-volatile memory.

## E2E Test Scenarios

```typescript
describe('US-036: Settings Persistence', () => {
  test('unit preference persists across sessions', async ({ page }) => {
    await page.goto('/');

    // Change to mm
    await page.getByTestId('led-mm').click();

    // Reload page
    await page.reload();

    // mm should still be selected
    await expect(page.getByTestId('led-mm')).toHaveAttribute('aria-checked', 'true');
  });

  test('settings load on first visit with defaults', async ({ page, context }) => {
    // Clear storage
    await context.clearStorageState();

    await page.goto('/');

    // Default is inch
    await expect(page.getByTestId('led-inch')).toHaveAttribute('aria-checked', 'true');
  });

  test('reset to defaults restores factory settings', async ({ page }) => {
    await page.goto('/');

    // Change a setting
    await page.getByTestId('led-mm').click();

    // Reset (via settings menu)
    // ... navigate to settings and reset ...

    // Should be back to inch (default)
    await expect(page.getByTestId('led-inch')).toHaveAttribute('aria-checked', 'true');
  });
});
```

## Default Settings

| Setting | Default Value |
|---------|---------------|
| Unit | inch |
| Beep | ON |
| Precision | 4 decimal places |

## Implementation Notes

- **Storage key**: `el400-dro-settings`
- **Storage location**: Browser localStorage
- **Context support**: Works in both standalone and iframe (CNCjs widget) contexts
- **Write debouncing**: Settings changes are debounced (300ms) before writing to localStorage

## Related Stories

- US-025: Keypad Beep (beep setting is persisted)
- US-027: Save Changes (infrastructure for persistence)
- US-028: Restore Factory Defaults (reset functionality)
- US-035: External Machine Connection (widget context)
