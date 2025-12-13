import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/helpers/render-utils';
import NumericKeypad from './NumericKeypad';

describe('NumericKeypad', () => {
  const defaultProps = {
    onNumber: vi.fn(),
    onClear: vi.fn(),
    onEnter: vi.fn(),
    onSign: vi.fn(),
    onDecimal: vi.fn(),
  };

  describe('Accessibility', () => {
    it('has sr-only heading', () => {
      render(<NumericKeypad {...defaultProps} />);

      const heading = screen.getByRole('heading', { name: 'Numeric keypad' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('sr-only');
    });

    it('has sr-only text for number buttons', () => {
      render(<NumericKeypad {...defaultProps} />);

      const expectedLabels: Record<number, string> = {
        0: '0',
        1: '1',
        2: '2 (Down)',
        3: '3',
        4: '4 (Left)',
        5: '5',
        6: '6 (Right)',
        7: '7',
        8: '8 (Up)',
        9: '9',
      };

      for (let i = 0; i <= 9; i++) {
        const button = screen.getByTestId(`key-${i}`);
        expect(button.querySelector('.sr-only')).toHaveTextContent(expectedLabels[i]);
      }
    });

    it('has sr-only text for function buttons', () => {
      render(<NumericKeypad {...defaultProps} />);

      expect(screen.getByTestId('key-sign').querySelector('.sr-only')).toHaveTextContent('Toggle sign');
      expect(screen.getByTestId('key-decimal').querySelector('.sr-only')).toHaveTextContent('.');
      expect(screen.getByTestId('key-clear').querySelector('.sr-only')).toHaveTextContent('Clear');
      expect(screen.getByTestId('key-enter').querySelector('.sr-only')).toHaveTextContent('Enter');
    });

    it('has buttons in natural numeric order for tab navigation', () => {
      render(<NumericKeypad {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const expectedOrder = [
        'key-1', 'key-2', 'key-3',
        'key-4', 'key-5', 'key-6',
        'key-7', 'key-8', 'key-9',
        'key-0', 'key-sign', 'key-decimal',
        'key-clear', 'key-enter'
      ];

      expect(buttons).toHaveLength(expectedOrder.length);
      buttons.forEach((button, index) => {
        expect(button).toHaveAttribute('data-testid', expectedOrder[index]);
      });
    });
  });
});
