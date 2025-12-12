import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EL400Simulator from './EL400Simulator';

describe('EL400Simulator input buffer limit', () => {
  it('limits numeric input to 7 digits', async () => {
    const user = userEvent.setup();
    render(<EL400Simulator />);

    // Select Y axis
    const yButton = screen.getByRole('button', { name: /Y/i });
    await user.click(yButton);

    // Try to enter 8 digits: 55555555
    const digit5 = screen.getByRole('button', { name: /^5$/i });
    for (let i = 0; i < 8; i++) {
      await user.click(digit5);
    }

    // Press enter
    const enterButton = screen.getByRole('button', { name: /ent/i });
    await user.click(enterButton);

    // Value should be limited to 7 digits: 5555555 (not 55555555)
    // The display will clamp this to 999.9999 visually, but the actual value
    // stored should be 5555555 (7 digits max from input)
    expect(screen.getByText(/Y axis: 5555555\.0000/)).toBeInTheDocument();
  });

  it('allows decimal point without counting toward digit limit', async () => {
    const user = userEvent.setup();
    render(<EL400Simulator />);

    // Select X axis
    const xButton = screen.getByRole('button', { name: /X/i });
    await user.click(xButton);

    // Enter 123.4567 (7 digits + 1 decimal point = should be allowed)
    await user.click(screen.getByRole('button', { name: /^1$/i }));
    await user.click(screen.getByRole('button', { name: /^2$/i }));
    await user.click(screen.getByRole('button', { name: /^3$/i }));
    await user.click(screen.getByRole('button', { name: /^\.$/ }));
    await user.click(screen.getByRole('button', { name: /^4$/i }));
    await user.click(screen.getByRole('button', { name: /^5$/i }));
    await user.click(screen.getByRole('button', { name: /^6$/i }));
    await user.click(screen.getByRole('button', { name: /^7$/i }));

    // Press enter
    await user.click(screen.getByRole('button', { name: /ent/i }));

    // Value should be 123.4567
    expect(screen.getByText(/X axis: 123\.4567/)).toBeInTheDocument();
  });

  it('allows sign change without counting toward digit limit', async () => {
    const user = userEvent.setup();
    render(<EL400Simulator />);

    // Select Z axis
    const zButton = screen.getByRole('button', { name: /Z/i });
    await user.click(zButton);

    // Enter 7 digits then toggle sign
    const digit9 = screen.getByRole('button', { name: /^9$/i });
    for (let i = 0; i < 7; i++) {
      await user.click(digit9);
    }

    // Toggle sign
    await user.click(screen.getByRole('button', { name: /\+\/-/i }));

    // Press enter
    await user.click(screen.getByRole('button', { name: /ent/i }));

    // Value should be negative (sign doesn't count toward limit)
    expect(screen.getByText(/Z axis: -9999999\.0000/)).toBeInTheDocument();
  });
});
