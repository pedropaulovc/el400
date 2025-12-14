import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/helpers/render-utils';
import userEvent from '@testing-library/user-event';
import AxisSelectionSection from './AxisSelectionSection';

describe('AxisSelectionSection', () => {
  describe('Rendering', () => {
    it('renders all three axes (X, Y, Z)', () => {
      render(<AxisSelectionSection />);

      expect(screen.getByRole('button', { name: 'Select X axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select Y axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select Z axis' })).toBeInTheDocument();
    });

    it('renders zero buttons for all axes', () => {
      render(<AxisSelectionSection />);

      expect(screen.getByRole('button', { name: 'Zero X axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zero Y axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zero Z axis' })).toBeInTheDocument();
    });

    it('renders axis labels with subscript zero for zero buttons', () => {
      render(<AxisSelectionSection />);

      // Check that subscript elements exist
      const subscripts = screen.getAllByText('0');
      expect(subscripts).toHaveLength(3);
      subscripts.forEach((sub) => {
        expect(sub.tagName).toBe('SUB');
      });
    });

    it('renders without React key warnings', () => {
      // If there are key prop issues, React will throw warnings during render
      // This test ensures the component renders cleanly
      const consoleSpy = vi.spyOn(console, 'error');

      render(<AxisSelectionSection />);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Axis Selection', () => {
    it('selects X axis when X axis button is clicked', async () => {
      const user = userEvent.setup();
      render(<AxisSelectionSection />);

      await user.click(screen.getByRole('button', { name: 'Select X axis' }));
      expect(screen.getByRole('button', { name: 'Select X axis' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('selects Y axis when Y axis button is clicked', async () => {
      const user = userEvent.setup();
      render(<AxisSelectionSection />);

      await user.click(screen.getByRole('button', { name: 'Select Y axis' }));
      expect(screen.getByRole('button', { name: 'Select Y axis' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('selects Z axis when Z axis button is clicked', async () => {
      const user = userEvent.setup();
      render(<AxisSelectionSection />);

      await user.click(screen.getByRole('button', { name: 'Select Z axis' }));
      expect(screen.getByRole('button', { name: 'Select Z axis' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Active State', () => {
    it('starts with no axis as active', () => {
      render(<AxisSelectionSection />);

      const xButton = screen.getByRole('button', { name: 'Select X axis' });
      const yButton = screen.getByRole('button', { name: 'Select Y axis' });
      const zButton = screen.getByRole('button', { name: 'Select Z axis' });

      expect(xButton).toHaveAttribute('aria-pressed', 'false');
      expect(yButton).toHaveAttribute('aria-pressed', 'false');
      expect(zButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('changes active axis when selecting different axes', async () => {
      const user = userEvent.setup();
      render(<AxisSelectionSection />);

      await user.click(screen.getByRole('button', { name: 'Select X axis' }));
      expect(screen.getByRole('button', { name: 'Select X axis' })).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByRole('button', { name: 'Select Y axis' }));
      expect(screen.getByRole('button', { name: 'Select X axis' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: 'Select Y axis' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Accessibility', () => {
    it('has sr-only heading', () => {
      render(<AxisSelectionSection />);

      const heading = screen.getByRole('heading', { name: 'Axis selection' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('sr-only');
    });

    it('has sr-only text in axis selection buttons', () => {
      render(<AxisSelectionSection />);

      const xButton = screen.getByTestId('axis-select-x');
      const yButton = screen.getByTestId('axis-select-y');
      const zButton = screen.getByTestId('axis-select-z');

      expect(xButton.querySelector('.sr-only')).toHaveTextContent('Select X axis');
      expect(yButton.querySelector('.sr-only')).toHaveTextContent('Select Y axis');
      expect(zButton.querySelector('.sr-only')).toHaveTextContent('Select Z axis');
    });

    it('has sr-only text in zero buttons', () => {
      render(<AxisSelectionSection />);

      const xZero = screen.getByTestId('axis-zero-x');
      const yZero = screen.getByTestId('axis-zero-y');
      const zZero = screen.getByTestId('axis-zero-z');

      expect(xZero.querySelector('.sr-only')).toHaveTextContent('Zero X axis');
      expect(yZero.querySelector('.sr-only')).toHaveTextContent('Zero Y axis');
      expect(zZero.querySelector('.sr-only')).toHaveTextContent('Zero Z axis');
    });

    it('has proper group role and label', () => {
      render(<AxisSelectionSection />);

      const group = screen.getByRole('group', { name: 'Axis selection and zeroing' });
      expect(group).toBeInTheDocument();
    });

    it('provides aria-labels for all buttons', () => {
      render(<AxisSelectionSection />);

      // Check all aria-labels are present
      expect(screen.getByRole('button', { name: 'Select X axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select Y axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select Z axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zero X axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zero Y axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zero Z axis' })).toBeInTheDocument();
    });

    it('uses aria-pressed for axis selection buttons', () => {
      render(<AxisSelectionSection />);

      const xButton = screen.getByRole('button', { name: 'Select X axis' });
      expect(xButton).toHaveAttribute('aria-pressed');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AxisSelectionSection />);

      const xButton = screen.getByRole('button', { name: 'Select X axis' });
      xButton.focus();

      await user.keyboard('{Enter}');
      expect(xButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
