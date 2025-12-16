# Testing Strategy

This document explains the testing approach for the EL400 DRO Simulator, with particular focus on accessibility testing including forced-colors mode (Windows High Contrast).

## Test Types

### 1. Unit Tests (Vitest)
Located in `src/` alongside component files (e.g., `Component.test.tsx`).

**Run:** `npm run test`

**Purpose:** Test individual components and hooks in isolation.

**Coverage:**
- Component rendering
- Props handling
- State management
- Hook behavior

### 2. Storybook Tests (Vitest + Playwright Browser)
Located in `src/` as story files (e.g., `Component.stories.tsx`).

**Run:** `npm run test:storybook`

**Purpose:** Visual component testing with automated interaction tests.

**Coverage:**
- Component variants and states
- Visual regression prevention
- Accessibility features (keyboard, screen readers)
- **Forced-colors mode emulation** (see below)
- User interactions (clicks, keyboard navigation)

### 3. E2E Tests (Playwright)
Located in `e2e/` directory.

**Run:** `npm run test:e2e`

**Purpose:** Full application integration testing.

**Coverage:**
- User workflows
- Multi-component interactions
- Real browser forced-colors mode
- Full application state management

## Forced-Colors Mode Testing

The application supports Windows High Contrast mode (forced-colors media query). We test this at two levels:

### Component-Level Testing (Storybook)

**Approach:** CSS-based emulation using Storybook decorators

**Location:** `src/components/*.stories.tsx`

**How it works:**
1. Stories set `parameters.forcedColors: 'active'`
2. Storybook decorator applies forced-colors CSS styles
3. Automated tests verify styling and contrast ratios

**Example stories:**
- `SevenSegmentDigit.stories.tsx`: `ForcedColorsEight`, `ForcedColorsDisplay`
- `DROButton.stories.tsx`: `ForcedColorsButtons`, `ForcedColorsButtonContrast`
- `LEDIndicator.stories.tsx`: `ForcedColorsLEDs`

**Benefits:**
- ✅ Fast iteration during development
- ✅ Easy to visualize in Storybook UI
- ✅ Automated test validation
- ✅ Visual regression prevention
- ⚠️ CSS emulation (not true browser forced-colors)

**Testing:**
```typescript
// Example from DROButton.stories.tsx
export const ForcedColorsButtons: Story = {
  parameters: {
    forcedColors: 'active',
    backgrounds: { default: 'forced-colors' },
  },
  play: async ({ canvasElement }) => {
    const buttons = canvasElement.querySelectorAll("button");
    for (const button of Array.from(buttons)) {
      const style = window.getComputedStyle(button);
      await expect(style.borderStyle).not.toBe('none');
      await expect(style.borderWidth).not.toBe('0px');
    }
  },
};
```

### Integration Testing (E2E)

**Approach:** Real browser forced-colors emulation via Playwright

**Location:** `e2e/08-accessibility/US-034-forced-colors-mode.spec.ts`

**How it works:**
1. Playwright creates browser context with `forcedColors: 'active'`
2. Browser applies true forced-colors mode
3. Tests measure actual computed styles and contrast ratios

**Example:**
```typescript
test('buttons have 17:1 contrast ratio in forced-colors mode', async ({ browser }) => {
  const context = await browser.newContext({
    forcedColors: 'active', // Real browser emulation
  });
  const page = await context.newPage();
  await page.goto('/');
  
  // Test actual forced-colors behavior
  const colors = await button.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
  
  const contrastRatio = getContrastRatio(fgRgb, bgRgb);
  expect(contrastRatio).toBeGreaterThanOrEqual(17);
});
```

**Benefits:**
- ✅ Tests real browser behavior
- ✅ Validates actual forced-colors media query
- ✅ Catches browser-specific issues
- ⚠️ Slower execution
- ⚠️ Harder to debug visually

## When to Use Each Approach

### Use Storybook Tests When:
- Developing new components
- Testing component variants
- Visual regression testing
- Rapid iteration needed
- Testing isolated component behavior

### Use E2E Tests When:
- Testing multi-component workflows
- Validating full application behavior
- Testing real browser forced-colors mode
- Testing complex state management
- Integration testing across pages

### Use Unit Tests When:
- Testing pure functions
- Testing hook logic
- Testing utilities
- Fast TDD cycles

## Coverage Requirements

| Test Type | Minimum Coverage |
|-----------|-----------------|
| Unit Tests | 80% |
| Storybook Tests | All component variants |
| E2E Tests | Critical user paths |

## Accessibility Testing Checklist

When adding or modifying components:

- [ ] Add Storybook stories for all visual states
- [ ] Add forced-colors mode story variant
- [ ] Verify keyboard navigation in Storybook
- [ ] Test screen reader compatibility (manual)
- [ ] Add contrast ratio checks for forced-colors
- [ ] Verify in actual Windows High Contrast mode (manual)
- [ ] Add E2E test if part of critical workflow

## Running All Tests

```bash
# Run everything
npm run test:all

# Individual test suites
npm run test              # Unit tests
npm run test:storybook    # Storybook tests
npm run test:e2e          # E2E tests

# With UI/debugging
npm run test:ui           # Unit tests with UI
npm run test:e2e:ui       # E2E tests with UI
npm run storybook         # View stories in browser
```

## Continuous Integration

All three test types run in CI:
1. Unit tests (fastest)
2. Storybook tests
3. E2E tests (slowest)

Failed tests block merging to main branch.

## Related Documentation

- [ACCESSIBILITY.md](./ACCESSIBILITY.md) - Accessibility features and compliance
- [src/tests/README.md](./src/tests/README.md) - Unit test organization
- [Playwright Docs](https://playwright.dev/) - E2E testing framework
- [Storybook Docs](https://storybook.js.org/) - Component development environment
- [Vitest Docs](https://vitest.dev/) - Unit test framework
