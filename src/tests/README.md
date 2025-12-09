# Unit Tests for EL400 DRO Simulator

This directory contains unit and component test utilities for the EL400 DRO simulator.

## Test Organization

Unit tests are co-located with the components they test:

```
src/
├── components/
│   ├── EL400Simulator.tsx
│   ├── EL400Simulator.test.tsx      # Component unit tests
│   ├── DisplayPanel.tsx
│   └── DisplayPanel.test.tsx
├── hooks/
│   ├── useDROState.ts
│   └── useDROState.test.ts          # Hook tests
└── tests/
    ├── setup.ts                      # Test configuration
    ├── README.md                     # This file
    └── helpers/
        ├── render-utils.tsx          # Custom render functions
        └── test-utils.ts             # Test utilities

```

## Running Tests

```bash
# Run all unit tests
npm run test:ui

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- DisplayPanel.test.tsx

# Run tests matching a pattern
npm run test -- -t "ABS/INC"
```

## Writing Tests

### Component Tests

Use `@testing-library/react` for component testing:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisplayPanel } from './DisplayPanel';

describe('DisplayPanel', () => {
  it('displays axis values correctly', () => {
    render(<DisplayPanel x={10.5} y={20.3} z={0} mode="abs" units="inch" />);
    expect(screen.getByTestId('x-display')).toHaveTextContent('10.5000');
  });

  it('toggles mode when ABS/INC button is clicked', async () => {
    const user = userEvent.setup();
    render(<DisplayPanel />);

    const absIncButton = screen.getByRole('button', { name: /ABS\/INC/i });
    await user.click(absIncButton);

    expect(screen.getByTestId('inc-led')).toBeVisible();
  });
});
```

### Hook Tests

Use `@testing-library/react` for hook testing:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDROState } from './useDROState';

describe('useDROState', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useDROState());

    expect(result.current.mode).toBe('abs');
    expect(result.current.units).toBe('inch');
  });

  it('toggles mode', () => {
    const { result } = renderHook(() => useDROState());

    act(() => {
      result.current.toggleMode();
    });

    expect(result.current.mode).toBe('inc');
  });
});
```

## Test Utilities

### Custom Render

Located in `helpers/render-utils.tsx`, provides a custom render function with common providers:

```typescript
import { renderWithProviders } from '@/tests/helpers/render-utils';

const { container } = renderWithProviders(<MyComponent />);
```

### Mocks and Stubs

Common mocks are provided in `helpers/test-utils.ts`.

## Coverage Requirements

- **Components:** 80% minimum
- **Hooks:** 90% minimum
- **Utilities:** 95% minimum

## Best Practices

1. **Test behavior, not implementation** - Focus on what the user sees and does
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Test user interactions** - Use `@testing-library/user-event` for realistic interactions
4. **Keep tests focused** - One assertion per test when possible
5. **Use descriptive names** - Test names should explain what is being tested

## Related Documentation

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [User Stories](../../project/claude-merged-user-stories/README.md)
