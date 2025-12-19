import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/helpers/render-utils';
import userEvent from '@testing-library/user-event';
import DROButton from './DROButton';

describe('DROButton', () => {
  describe('Title Attribute', () => {
    it('renders with title attribute', () => {
      render(<DROButton title="Test Button">Click Me</DROButton>);
      const button = screen.getByRole('button', { name: /click me/i });
      
      expect(button).toHaveAttribute('title', 'Test Button');
    });

    it('displays title on hover as tooltip', () => {
      render(<DROButton title="Helpful Tooltip">Button</DROButton>);
      const button = screen.getByRole('button', { name: /button/i });
      
      expect(button).toHaveAttribute('title', 'Helpful Tooltip');
    });

    it('accepts different title values for different buttons', () => {
      const { rerender } = render(<DROButton title="First Title">Button</DROButton>);
      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'First Title');

      rerender(<DROButton title="Second Title">Button</DROButton>);
      button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Second Title');
    });
  });

  describe('Styling', () => {
    it('does not have hover:brightness-110 class', () => {
      render(<DROButton title="Test">Button</DROButton>);
      const button = screen.getByRole('button');
      
      // Check that the className does not contain hover:brightness-110
      const className = button.className;
      expect(className).not.toContain('hover:brightness-110');
    });

    it('applies default variant classes', () => {
      render(<DROButton title="Default" variant="default">Button</DROButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('dro-button');
    });

    it('applies dark variant classes', () => {
      render(<DROButton title="Dark" variant="dark">Button</DROButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('dro-button');
    });

    it('applies yellow variant classes', () => {
      render(<DROButton title="Yellow" variant="yellow">Button</DROButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('dro-button');
    });

    it('applies active styling when isActive is true', () => {
      render(<DROButton title="Active" isActive={true}>Button</DROButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('brightness-110');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('does not apply active styling when isActive is false', () => {
      render(<DROButton title="Inactive" isActive={false}>Button</DROButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Click Interaction', () => {
    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(<DROButton title="Click Test" onClick={handleClick}>Click Me</DROButton>);
      const button = screen.getByRole('button');
      
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick if not provided', async () => {
      const user = userEvent.setup();
      
      render(<DROButton title="No Handler">Button</DROButton>);
      const button = screen.getByRole('button');
      
      // Should not throw error
      await user.click(button);
    });
  });

  describe('Sizes', () => {
    it('applies icon size classes', () => {
      render(<DROButton title="Icon" size="icon">Icon</DROButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('w-16', 'h-8');
    });

    it('applies square size classes', () => {
      render(<DROButton title="Square" size="square">Square</DROButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('w-10', 'h-10');
    });

    it('applies enter size classes', () => {
      render(<DROButton title="Enter" size="enter">Enter</DROButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('w-[92px]', 'h-10');
    });
  });

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(<DROButton title="Accessible">Button</DROButton>);
      const button = screen.getByRole('button');
      
      expect(button).toBeInTheDocument();
    });

    it('sets aria-pressed based on isActive', () => {
      const { rerender } = render(<DROButton title="Toggle" isActive={false}>Toggle</DROButton>);
      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');

      rerender(<DROButton title="Toggle" isActive={true}>Toggle</DROButton>);
      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('has focus ring on focus', () => {
      render(<DROButton title="Focus">Button</DROButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-white/50');
    });
  });

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      render(<DROButton title="Custom" className="custom-class">Button</DROButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('custom-class');
    });

    it('forwards data-testid attribute', () => {
      render(<DROButton title="Test ID" data-testid="my-button">Button</DROButton>);
      const button = screen.getByTestId('my-button');
      
      expect(button).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(
        <DROButton title="With Icon">
          <span>Icon</span>
          <span>Text</span>
        </DROButton>
      );
      
      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });
  });
});
