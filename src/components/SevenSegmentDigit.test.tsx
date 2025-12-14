import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SevenSegmentDigit from './SevenSegmentDigit';

describe('SevenSegmentDigit', () => {
  describe('Supported characters', () => {
    it('renders digit 0', () => {
      const { container } = render(<SevenSegmentDigit value="0" />);
      expect(container.querySelector('.seven-segment-digit')).toBeInTheDocument();
    });

    it('renders digit 9', () => {
      const { container } = render(<SevenSegmentDigit value="9" />);
      expect(container.querySelector('.seven-segment-digit')).toBeInTheDocument();
    });

    it('renders minus sign', () => {
      const { container } = render(<SevenSegmentDigit value="-" />);
      expect(container.querySelector('.seven-segment-digit')).toBeInTheDocument();
    });

    it('renders space', () => {
      const { container } = render(<SevenSegmentDigit value=" " />);
      expect(container.querySelector('.seven-segment-digit')).toBeInTheDocument();
    });

    it('renders uppercase letter A', () => {
      const { container } = render(<SevenSegmentDigit value="A" />);
      expect(container.querySelector('.seven-segment-digit')).toBeInTheDocument();
    });

    it('renders lowercase letter b', () => {
      const { container } = render(<SevenSegmentDigit value="b" />);
      expect(container.querySelector('.seven-segment-digit')).toBeInTheDocument();
    });

    it('renders letter E', () => {
      const { container } = render(<SevenSegmentDigit value="E" />);
      expect(container.querySelector('.seven-segment-digit')).toBeInTheDocument();
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

      expect(upperC.querySelector('.seven-segment-digit')).toBeInTheDocument();
      expect(lowerC.querySelector('.seven-segment-digit')).toBeInTheDocument();

      // They should render different segments (just verify both render without error)
      expect(upperC.innerHTML).not.toBe(lowerC.innerHTML);
    });
  });

  describe('Decimal point', () => {
    it('shows decimal point when showDecimal is true', () => {
      const { container } = render(<SevenSegmentDigit value="5" showDecimal={true} />);
      const decimalOn = container.querySelector('.seg-dp.seg-on');
      expect(decimalOn).toBeInTheDocument();
    });

    it('does not show decimal point by default', () => {
      const { container } = render(<SevenSegmentDigit value="5" />);
      const decimalOff = container.querySelector('.seg-dp.seg-off');
      expect(decimalOff).toBeInTheDocument();
    });
  });

  describe('Segment states', () => {
    it('renders correct segments for digit 1 (segments b, c on)', () => {
      const { container } = render(<SevenSegmentDigit value="1" />);
      expect(container.querySelector('.seg-a.seg-off')).toBeInTheDocument();
      expect(container.querySelector('.seg-b.seg-on')).toBeInTheDocument();
      expect(container.querySelector('.seg-c.seg-on')).toBeInTheDocument();
      expect(container.querySelector('.seg-d.seg-off')).toBeInTheDocument();
      expect(container.querySelector('.seg-e.seg-off')).toBeInTheDocument();
      expect(container.querySelector('.seg-f.seg-off')).toBeInTheDocument();
      expect(container.querySelector('.seg-g.seg-off')).toBeInTheDocument();
    });

    it('renders correct segments for digit 8 (all segments on)', () => {
      const { container } = render(<SevenSegmentDigit value="8" />);
      expect(container.querySelector('.seg-a.seg-on')).toBeInTheDocument();
      expect(container.querySelector('.seg-b.seg-on')).toBeInTheDocument();
      expect(container.querySelector('.seg-c.seg-on')).toBeInTheDocument();
      expect(container.querySelector('.seg-d.seg-on')).toBeInTheDocument();
      expect(container.querySelector('.seg-e.seg-on')).toBeInTheDocument();
      expect(container.querySelector('.seg-f.seg-on')).toBeInTheDocument();
      expect(container.querySelector('.seg-g.seg-on')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has aria-hidden attribute for decorative content', () => {
      const { container } = render(<SevenSegmentDigit value="0" />);
      expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
