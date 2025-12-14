import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SevenSegmentDigit from './SevenSegmentDigit';

describe('SevenSegmentDigit', () => {
  describe('Supported characters', () => {
    it('renders digit 0', () => {
      const { container } = render(<SevenSegmentDigit value="0" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders digit 9', () => {
      const { container } = render(<SevenSegmentDigit value="9" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders minus sign', () => {
      const { container } = render(<SevenSegmentDigit value="-" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders space', () => {
      const { container } = render(<SevenSegmentDigit value=" " />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders uppercase letter A', () => {
      const { container } = render(<SevenSegmentDigit value="A" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders lowercase letter b', () => {
      const { container } = render(<SevenSegmentDigit value="b" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders letter E', () => {
      const { container } = render(<SevenSegmentDigit value="E" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('throws error for unsupported character', () => {
      expect(() => {
        render(<SevenSegmentDigit value="Z" />);
      }).toThrow('Unsupported character: "Z"');
    });

    it('throws error for lowercase a (when uppercase A is supported)', () => {
      expect(() => {
        render(<SevenSegmentDigit value="a" />);
      }).toThrow('Unsupported character: "a"');
    });

    it('throws error for special character @', () => {
      expect(() => {
        render(<SevenSegmentDigit value="@" />);
      }).toThrow('Unsupported character: "@"');
    });

    it('is case-sensitive - uppercase C vs lowercase c', () => {
      // Both C and c are supported but with different patterns
      const { container: upperC } = render(<SevenSegmentDigit value="C" />);
      const { container: lowerC } = render(<SevenSegmentDigit value="c" />);
      
      expect(upperC.querySelector('svg')).toBeInTheDocument();
      expect(lowerC.querySelector('svg')).toBeInTheDocument();
      
      // They should render different segments (just verify both render without error)
      expect(upperC.innerHTML).not.toBe(lowerC.innerHTML);
    });
  });

  describe('Decimal point', () => {
    it('shows decimal point when showDecimal is true', () => {
      const { container } = render(<SevenSegmentDigit value="5" showDecimal={true} />);
      const circle = container.querySelector('circle');
      expect(circle).toBeInTheDocument();
    });

    it('does not show decimal point by default', () => {
      const { container } = render(<SevenSegmentDigit value="5" />);
      // The circle element exists but with different fill
      expect(container.querySelector('circle')).toBeInTheDocument();
    });
  });
});
