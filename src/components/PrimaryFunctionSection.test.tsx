import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/helpers/render-utils';
import PrimaryFunctionSection from './PrimaryFunctionSection';

describe('PrimaryFunctionSection', () => {
  const defaultProps = {
    isInch: true,
    isAbs: true,
    onToggleUnit: vi.fn(),
    onSettings: vi.fn(),
    onToggleAbs: vi.fn(),
    onCenter: vi.fn(),
    onZeroAll: vi.fn(),
  };

  describe('Accessibility', () => {
    it('has sr-only heading', () => {
      render(<PrimaryFunctionSection {...defaultProps} />);

      const heading = screen.getByRole('heading', { name: 'Primary functions' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('sr-only');
    });

    it('has sr-only text for all buttons', () => {
      render(<PrimaryFunctionSection {...defaultProps} />);

      expect(screen.getByTestId('btn-settings').querySelector('.sr-only')).toHaveTextContent('Settings');
      expect(screen.getByTestId('btn-abs-inc').querySelector('.sr-only')).toHaveTextContent('Abs/Inc');
      expect(screen.getByTestId('btn-toggle-unit').querySelector('.sr-only')).toHaveTextContent('Toggle units');
      expect(screen.getByTestId('btn-center').querySelector('.sr-only')).toHaveTextContent('Reference');
      expect(screen.getByTestId('btn-zero-all').querySelector('.sr-only')).toHaveTextContent('Zero all axes');
    });
  });
});
