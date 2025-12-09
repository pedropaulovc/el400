import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/helpers/render-utils';
import userEvent from '@testing-library/user-event';
import LEDIndicator from './LEDIndicator';

describe('LEDIndicator', () => {
  describe('Display and Styling', () => {
    it('renders the label text', () => {
      render(<LEDIndicator label="ABS" isOn={false} />);
      expect(screen.getByText('ABS')).toBeInTheDocument();
    });

    it('applies active styling when isOn is true', () => {
      render(<LEDIndicator label="ABS" isOn={true} />);
      const label = screen.getByText('ABS');

      expect(label).toHaveClass('text-red-400');
      expect(label).not.toHaveClass('text-red-900/60');
    });

    it('applies inactive styling when isOn is false', () => {
      render(<LEDIndicator label="INC" isOn={false} />);
      const label = screen.getByText('INC');

      expect(label).toHaveClass('text-red-900/60');
      expect(label).not.toHaveClass('text-red-400');
    });

    it('applies text shadow when LED is on', () => {
      render(<LEDIndicator label="ABS" isOn={true} />);
      const label = screen.getByText('ABS');

      expect(label).toHaveStyle({
        textShadow: expect.stringContaining('0 0 8px'),
      });
    });

    it('does not apply text shadow when LED is off', () => {
      render(<LEDIndicator label="ABS" isOn={false} />);
      const label = screen.getByText('ABS');

      // When isOn is false, the style prop should be undefined (no inline style)
      const style = label.getAttribute('style');
      expect(style).toBeNull();
    });
  });

  describe('Non-interactive Mode', () => {
    it('renders as a div with status role by default', () => {
      render(<LEDIndicator label="ABS" isOn={true} />);
      const container = screen.getByRole('status');

      expect(container).toBeInTheDocument();
      expect(container.tagName).toBe('DIV');
    });

    it('includes aria-label describing the state', () => {
      render(<LEDIndicator label="ABS" isOn={true} />);

      expect(screen.getByLabelText('ABS: active')).toBeInTheDocument();
    });

    it('shows inactive state in aria-label when off', () => {
      render(<LEDIndicator label="INC" isOn={false} />);

      expect(screen.getByLabelText('INC: inactive')).toBeInTheDocument();
    });
  });

  describe('Interactive Mode', () => {
    it('renders as a button when isInteractive is true', () => {
      const onClick = vi.fn();
      render(<LEDIndicator label="ABS" isOn={true} isInteractive onClick={onClick} />);

      const button = screen.getByRole('radio');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('calls onClick when clicked in interactive mode', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<LEDIndicator label="ABS" isOn={false} isInteractive onClick={onClick} />);

      const button = screen.getByRole('radio');
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('sets aria-checked to match isOn state', () => {
      render(<LEDIndicator label="ABS" isOn={true} isInteractive onClick={vi.fn()} />);

      const button = screen.getByRole('radio');
      expect(button).toHaveAttribute('aria-checked', 'true');
    });

    it('includes group label in aria-label when provided', () => {
      render(
        <LEDIndicator
          label="ABS"
          isOn={true}
          isInteractive
          onClick={vi.fn()}
          groupLabel="Mode"
        />
      );

      expect(screen.getByLabelText('ABS (Mode)')).toBeInTheDocument();
    });

    it('applies hover styles in interactive mode', () => {
      render(<LEDIndicator label="ABS" isOn={false} isInteractive onClick={vi.fn()} />);

      const button = screen.getByRole('radio');
      expect(button).toHaveClass('hover:bg-white/10');
    });

    it('supports keyboard navigation in interactive mode', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<LEDIndicator label="ABS" isOn={false} isInteractive onClick={onClick} />);

      const button = screen.getByRole('radio');
      button.focus();

      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(1);

      await user.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<LEDIndicator label="ABS" isOn={false} className="custom-class" />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      render(<LEDIndicator label="ABS" isOn={false} className="custom-class" />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-col');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles for non-interactive mode', () => {
      render(<LEDIndicator label="ABS" isOn={true} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has proper ARIA roles for interactive mode', () => {
      render(<LEDIndicator label="ABS" isOn={true} isInteractive onClick={vi.fn()} />);

      expect(screen.getByRole('radio')).toBeInTheDocument();
    });

    it('provides clear state information to screen readers', () => {
      const { rerender } = render(<LEDIndicator label="MODE" isOn={true} />);
      expect(screen.getByLabelText('MODE: active')).toBeInTheDocument();

      rerender(<LEDIndicator label="MODE" isOn={false} />);
      expect(screen.getByLabelText('MODE: inactive')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty label gracefully', () => {
      render(<LEDIndicator label="" isOn={false} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('handles very long labels', () => {
      const longLabel = 'VERY_LONG_LABEL_TEXT';
      render(<LEDIndicator label={longLabel} isOn={false} />);

      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it('does not crash when onClick is undefined in non-interactive mode', () => {
      expect(() => {
        render(<LEDIndicator label="ABS" isOn={false} />);
      }).not.toThrow();
    });
  });
});
