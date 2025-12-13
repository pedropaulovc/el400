import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/helpers/render-utils';
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

  describe('Radio Input', () => {
    it('renders as a disabled radio input', () => {
      render(<LEDIndicator label="ABS" isOn={true} />);
      const radio = screen.getByRole('radio');

      expect(radio).toBeInTheDocument();
      expect(radio.tagName).toBe('INPUT');
      expect(radio).toBeDisabled();
    });

    it('is checked when on', () => {
      render(<LEDIndicator label="ABS" isOn={true} />);

      expect(screen.getByRole('radio')).toBeChecked();
    });

    it('is not checked when off', () => {
      render(<LEDIndicator label="INC" isOn={false} />);

      expect(screen.getByRole('radio')).not.toBeChecked();
    });

    it('provides clear state via checked attribute', () => {
      const { rerender } = render(<LEDIndicator label="MODE" isOn={true} />);
      expect(screen.getByRole('radio')).toBeChecked();

      rerender(<LEDIndicator label="MODE" isOn={false} />);
      expect(screen.getByRole('radio')).not.toBeChecked();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className to label', () => {
      render(<LEDIndicator label="ABS" isOn={false} className="custom-class" data-testid="led" />);

      const container = screen.getByTestId('led');
      expect(container).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      render(<LEDIndicator label="ABS" isOn={false} className="custom-class" data-testid="led" />);

      const container = screen.getByTestId('led');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-col');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty label gracefully', () => {
      render(<LEDIndicator label="" isOn={false} />);

      expect(screen.getByRole('radio')).toBeInTheDocument();
    });

    it('handles very long labels', () => {
      const longLabel = 'VERY_LONG_LABEL_TEXT';
      render(<LEDIndicator label={longLabel} isOn={false} />);

      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });
  });
});
