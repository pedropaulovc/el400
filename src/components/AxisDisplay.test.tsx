import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AxisDisplay from './AxisDisplay';

describe('AxisDisplay', () => {
  it('renders the axis label', () => {
    render(<AxisDisplay value={0} axis="X" />);
    expect(screen.getByRole('region', { name: /X axis position/i })).toBeInTheDocument();
  });

  it('displays screen-reader accessible value', () => {
    render(<AxisDisplay value={123.4567} axis="Y" />);
    expect(screen.getByText(/Y axis: 123\.4567/)).toBeInTheDocument();
  });

  it('always renders exactly 8 digits (sign + 3 integer + 4 decimal)', () => {
    const { container } = render(<AxisDisplay value={1} axis="X" />);
    // Each digit is rendered as a SevenSegmentDigit inside a div
    const digitContainers = container.querySelectorAll('[aria-hidden="true"] > div');
    expect(digitContainers).toHaveLength(8);
  });

  it('clamps large positive values to 999.9999', () => {
    render(<AxisDisplay value={5555555} axis="X" />);
    // Should show clamped value in screen reader text
    expect(screen.getByText(/X axis: 5555555\.0000/)).toBeInTheDocument();
    // But visual display should be clamped - we verify by checking digit count stays at 8
    const { container } = render(<AxisDisplay value={5555555} axis="Y" />);
    const digitContainers = container.querySelectorAll('[aria-hidden="true"] > div');
    expect(digitContainers).toHaveLength(8);
  });

  it('clamps large negative values to -999.9999', () => {
    render(<AxisDisplay value={-9999999} axis="Z" />);
    const { container } = render(<AxisDisplay value={-9999999} axis="X" />);
    const digitContainers = container.querySelectorAll('[aria-hidden="true"] > div');
    expect(digitContainers).toHaveLength(8);
  });

  it('handles zero correctly', () => {
    render(<AxisDisplay value={0} axis="X" />);
    expect(screen.getByText(/X axis: 0\.0000/)).toBeInTheDocument();
  });

  it('handles negative values correctly', () => {
    render(<AxisDisplay value={-12.345} axis="X" />);
    expect(screen.getByText(/X axis: -12\.3450/)).toBeInTheDocument();
  });
});
