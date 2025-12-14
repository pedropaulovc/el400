import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/helpers/render-utils';
import SecondaryFunctionSection from './SecondaryFunctionSection';

describe('SecondaryFunctionSection', () => {
  describe('Accessibility', () => {
    it('has sr-only heading', () => {
      render(<SecondaryFunctionSection />);

      const heading = screen.getByRole('heading', { name: 'Secondary functions' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('sr-only');
    });

    it('has sr-only text for all buttons', () => {
      render(<SecondaryFunctionSection />);

      expect(screen.getByTestId('btn-bolt-circle').querySelector('.sr-only')).toHaveTextContent('Bolt hole');
      expect(screen.getByTestId('btn-arc-contour').querySelector('.sr-only')).toHaveTextContent('Arc contour');
      expect(screen.getByTestId('btn-angle-hole').querySelector('.sr-only')).toHaveTextContent('Angle hole');
      expect(screen.getByTestId('btn-grid-hole').querySelector('.sr-only')).toHaveTextContent('Grid hole');
      expect(screen.getByTestId('btn-calculator').querySelector('.sr-only')).toHaveTextContent('Calculator');
      expect(screen.getByTestId('btn-half').querySelector('.sr-only')).toHaveTextContent('Half');
      expect(screen.getByTestId('btn-sdm').querySelector('.sr-only')).toHaveTextContent('SDM');
      expect(screen.getByTestId('btn-function').querySelector('.sr-only')).toHaveTextContent('Function');
    });
  });
});
