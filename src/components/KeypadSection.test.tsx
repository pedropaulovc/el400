import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/helpers/render-utils';
import KeypadSection from './KeypadSection';
import { VolatileMemoryProvider } from '../context/VolatileMemoryContext';
import { NonVolatileMemoryProvider } from '../context/NonVolatileMemoryContext';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NonVolatileMemoryProvider>
      <VolatileMemoryProvider>
        {ui}
      </VolatileMemoryProvider>
    </NonVolatileMemoryProvider>
  );
};

describe('KeypadSection', () => {
  describe('Accessibility', () => {
    it('has sr-only heading', () => {
      renderWithProviders(<KeypadSection />);

      const heading = screen.getByRole('heading', { name: 'Numeric keypad' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('sr-only');
    });

    it('has sr-only text for number buttons', () => {
      renderWithProviders(<KeypadSection />);

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
        const button = screen.getByTestId(`key-${String(i)}`);
        const expectedLabel = expectedLabels[i];
        expect(button.querySelector('.sr-only')!).toHaveTextContent(expectedLabel ?? '');
      }
    });

    it('has sr-only text for function buttons', () => {
      renderWithProviders(<KeypadSection />);

      expect(screen.getByTestId('key-sign').querySelector('.sr-only')).toHaveTextContent('Toggle sign');
      expect(screen.getByTestId('key-decimal').querySelector('.sr-only')).toHaveTextContent('.');
      expect(screen.getByTestId('key-clear').querySelector('.sr-only')).toHaveTextContent('Clear');
      expect(screen.getByTestId('key-enter').querySelector('.sr-only')).toHaveTextContent('Enter');
    });

    it('has buttons in natural numeric order for tab navigation', () => {
      renderWithProviders(<KeypadSection />);

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
