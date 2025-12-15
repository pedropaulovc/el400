import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/helpers/render-utils';
import MultiAxisSection from './MultiAxisSection';

describe('MultiAxisSection', () => {
  const defaultProps = {
    axisValues: { X: 0, Y: 0, Z: 0 },
  };

  describe('Accessibility', () => {
    it('has sr-only heading', () => {
      render(<MultiAxisSection {...defaultProps} />);

      const heading = screen.getByRole('heading', { name: 'Axis display' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('sr-only');
    });

    it('has sr-only table with axis values', () => {
      render(<MultiAxisSection {...defaultProps} />);

      const table = screen.getByRole('table', { name: 'Axis positions' });
      expect(table).toBeInTheDocument();
      expect(table).toHaveClass('sr-only');
    });

    it('has text in LED indicators', () => {
      render(<MultiAxisSection {...defaultProps} />);

      expect(screen.getByTestId('led-abs')).toHaveTextContent('abs');
      expect(screen.getByTestId('led-inc')).toHaveTextContent('inc');
      expect(screen.getByTestId('led-inch')).toHaveTextContent('inch');
      expect(screen.getByTestId('led-mm')).toHaveTextContent('mm');
    });
  });
});
