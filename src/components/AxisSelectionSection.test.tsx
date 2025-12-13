import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/tests/helpers/render-utils';
import userEvent from '@testing-library/user-event';
import AxisSelectionSection from './AxisSelectionSection';

describe('AxisSelectionSection', () => {
  const mockAxisSelect = vi.fn();
  const mockAxisZero = vi.fn();

  beforeEach(() => {
    mockAxisSelect.mockClear();
    mockAxisZero.mockClear();
  });

  describe('Rendering', () => {
    it('renders all three axes (X, Y, Z)', () => {
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      expect(screen.getByRole('button', { name: 'Select X axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select Y axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select Z axis' })).toBeInTheDocument();
    });

    it('renders zero buttons for all axes', () => {
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      expect(screen.getByRole('button', { name: 'Zero X axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zero Y axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zero Z axis' })).toBeInTheDocument();
    });

    it('renders axis labels with subscript zero for zero buttons', () => {
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

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

      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Axis Selection', () => {
    it('calls onAxisSelect when X axis button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Select X axis' }));
      expect(mockAxisSelect).toHaveBeenCalledWith('X');
      expect(mockAxisSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onAxisSelect when Y axis button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Select Y axis' }));
      expect(mockAxisSelect).toHaveBeenCalledWith('Y');
      expect(mockAxisSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onAxisSelect when Z axis button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Select Z axis' }));
      expect(mockAxisSelect).toHaveBeenCalledWith('Z');
      expect(mockAxisSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Axis Zeroing', () => {
    it('calls onAxisZero when X zero button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Zero X axis' }));
      expect(mockAxisZero).toHaveBeenCalledWith('X');
      expect(mockAxisZero).toHaveBeenCalledTimes(1);
    });

    it('calls onAxisZero when Y zero button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Zero Y axis' }));
      expect(mockAxisZero).toHaveBeenCalledWith('Y');
      expect(mockAxisZero).toHaveBeenCalledTimes(1);
    });

    it('calls onAxisZero when Z zero button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Zero Z axis' }));
      expect(mockAxisZero).toHaveBeenCalledWith('Z');
      expect(mockAxisZero).toHaveBeenCalledTimes(1);
    });
  });

  describe('Active State', () => {
    it('shows X axis as active when activeAxis is X', () => {
      render(
        <AxisSelectionSection
          activeAxis="X"
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      const xButton = screen.getByRole('button', { name: 'Select X axis' });
      expect(xButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows Y axis as active when activeAxis is Y', () => {
      render(
        <AxisSelectionSection
          activeAxis="Y"
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      const yButton = screen.getByRole('button', { name: 'Select Y axis' });
      expect(yButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows Z axis as active when activeAxis is Z', () => {
      render(
        <AxisSelectionSection
          activeAxis="Z"
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      const zButton = screen.getByRole('button', { name: 'Select Z axis' });
      expect(zButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows no axis as active when activeAxis is null', () => {
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      const xButton = screen.getByRole('button', { name: 'Select X axis' });
      const yButton = screen.getByRole('button', { name: 'Select Y axis' });
      const zButton = screen.getByRole('button', { name: 'Select Z axis' });

      expect(xButton).toHaveAttribute('aria-pressed', 'false');
      expect(yButton).toHaveAttribute('aria-pressed', 'false');
      expect(zButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('updates active state when activeAxis changes', () => {
      const { rerender } = render(
        <AxisSelectionSection
          activeAxis="X"
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      expect(screen.getByRole('button', { name: 'Select X axis' })).toHaveAttribute('aria-pressed', 'true');

      rerender(
        <AxisSelectionSection
          activeAxis="Y"
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      expect(screen.getByRole('button', { name: 'Select X axis' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: 'Select Y axis' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Accessibility', () => {
    it('has sr-only heading', () => {
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      const heading = screen.getByRole('heading', { name: 'Axis selection' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('sr-only');
    });

    it('has sr-only text in axis selection buttons', () => {
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      const xButton = screen.getByTestId('axis-select-x');
      const yButton = screen.getByTestId('axis-select-y');
      const zButton = screen.getByTestId('axis-select-z');

      expect(xButton.querySelector('.sr-only')).toHaveTextContent('Select X axis');
      expect(yButton.querySelector('.sr-only')).toHaveTextContent('Select Y axis');
      expect(zButton.querySelector('.sr-only')).toHaveTextContent('Select Z axis');
    });

    it('has sr-only text in zero buttons', () => {
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      const xZero = screen.getByTestId('axis-zero-x');
      const yZero = screen.getByTestId('axis-zero-y');
      const zZero = screen.getByTestId('axis-zero-z');

      expect(xZero.querySelector('.sr-only')).toHaveTextContent('Zero X axis');
      expect(yZero.querySelector('.sr-only')).toHaveTextContent('Zero Y axis');
      expect(zZero.querySelector('.sr-only')).toHaveTextContent('Zero Z axis');
    });

    it('has proper group role and label', () => {
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      const group = screen.getByRole('group', { name: 'Axis selection and zeroing' });
      expect(group).toBeInTheDocument();
    });

    it('provides aria-labels for all buttons', () => {
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      // Check all aria-labels are present
      expect(screen.getByRole('button', { name: 'Select X axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select Y axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select Z axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zero X axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zero Y axis' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zero Z axis' })).toBeInTheDocument();
    });

    it('uses aria-pressed for axis selection buttons', () => {
      render(
        <AxisSelectionSection
          activeAxis="X"
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      const xButton = screen.getByRole('button', { name: 'Select X axis' });
      expect(xButton).toHaveAttribute('aria-pressed');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      const xButton = screen.getByRole('button', { name: 'Select X axis' });
      xButton.focus();

      await user.keyboard('{Enter}');
      expect(mockAxisSelect).toHaveBeenCalledWith('X');

      const xZeroButton = screen.getByRole('button', { name: 'Zero X axis' });
      xZeroButton.focus();

      await user.keyboard('{Enter}');
      expect(mockAxisZero).toHaveBeenCalledWith('X');
    });
  });

  describe('Multiple Interactions', () => {
    it('can select different axes in sequence', async () => {
      const user = userEvent.setup();
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Select X axis' }));
      expect(mockAxisSelect).toHaveBeenCalledWith('X');

      await user.click(screen.getByRole('button', { name: 'Select Y axis' }));
      expect(mockAxisSelect).toHaveBeenCalledWith('Y');

      await user.click(screen.getByRole('button', { name: 'Select Z axis' }));
      expect(mockAxisSelect).toHaveBeenCalledWith('Z');

      expect(mockAxisSelect).toHaveBeenCalledTimes(3);
    });

    it('can zero different axes in sequence', async () => {
      const user = userEvent.setup();
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Zero X axis' }));
      await user.click(screen.getByRole('button', { name: 'Zero Y axis' }));
      await user.click(screen.getByRole('button', { name: 'Zero Z axis' }));

      expect(mockAxisZero).toHaveBeenCalledTimes(3);
      expect(mockAxisZero).toHaveBeenCalledWith('X');
      expect(mockAxisZero).toHaveBeenCalledWith('Y');
      expect(mockAxisZero).toHaveBeenCalledWith('Z');
    });

    it('can select and zero the same axis', async () => {
      const user = userEvent.setup();
      render(
        <AxisSelectionSection
          activeAxis={null}
          onAxisSelect={mockAxisSelect}
          onAxisZero={mockAxisZero}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Select X axis' }));
      await user.click(screen.getByRole('button', { name: 'Zero X axis' }));

      expect(mockAxisSelect).toHaveBeenCalledWith('X');
      expect(mockAxisZero).toHaveBeenCalledWith('X');
    });
  });
});
