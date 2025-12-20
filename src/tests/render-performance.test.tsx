/**
 * Render Performance Profiling Tests
 *
 * This file runs targeted tests with profiling enabled to measure:
 * - Time spent rendering in unit tests vs integration tests
 * - Number of re-renders per test
 * - Components that may have unnecessary re-renders
 *
 * These tests include regression assertions to catch performance degradation.
 * If a test fails, it means a change has increased render counts beyond acceptable limits.
 *
 * Run with: npm run test -- src/tests/render-performance.test.tsx
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  enterValue,
  getAxisDisplayPureNumberValue,
  startTestProfiling,
  endTestProfiling,
  enableProfiling,
  printReport,
  exportReportAsJSON,
  clearReports,
  enableComponentProfiling,
  clearComponentMetrics,
  printComponentMetrics,
  getComponentMetrics,
} from './helpers/integration-test-utils';
import { render } from './helpers/render-utils';
import LEDIndicator from '../components/LEDIndicator';
import DROButton from '../components/DROButton';

// Enable profiling for all tests in this file
beforeAll(() => {
  enableProfiling(true);
  enableComponentProfiling(true);
  clearReports();
  clearComponentMetrics();
});

afterAll(() => {
  // Print comprehensive report at the end
  console.log('\n\n');
  printReport();

  // Print component-level metrics
  printComponentMetrics();

  // Also export JSON for detailed analysis
  const jsonReport = exportReportAsJSON();
  console.log('\nJSON Report (for detailed analysis):');
  console.log(jsonReport);
});

describe('Unit Test Render Performance', () => {
  describe('LEDIndicator', () => {
    beforeEach(() => {
      startTestProfiling('LEDIndicator - basic render', 'unit');
    });

    it('renders with profiling', () => {
      render(<LEDIndicator label="Test LED" isOn={true} />, { profile: true });
      expect(screen.getByText('Test LED')).toBeInTheDocument();
      const report = endTestProfiling();
      expect(report.totalRenderCount).toBeGreaterThan(0);
    });
  });

  describe('DROButton', () => {
    beforeEach(() => {
      startTestProfiling('DROButton - basic render', 'unit');
    });

    it('renders with profiling', () => {
      render(<DROButton title="Test Button">Test</DROButton>, { profile: true });
      expect(screen.getByText('Test')).toBeInTheDocument();
      const report = endTestProfiling();
      expect(report.totalRenderCount).toBeGreaterThan(0);
    });
  });

  describe('DROButton with variants', () => {
    beforeEach(() => {
      startTestProfiling('DROButton - variants render', 'unit');
    });

    it('renders multiple variants with profiling', () => {
      render(
        <>
          <DROButton title="Default" variant="default">Default</DROButton>
          <DROButton title="Dark" variant="dark">Dark</DROButton>
          <DROButton title="Yellow" variant="yellow">Yellow</DROButton>
        </>,
        { profile: true }
      );
      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('Yellow')).toBeInTheDocument();
      const report = endTestProfiling();
      expect(report.totalRenderCount).toBeGreaterThan(0);
    });
  });

  describe('Multiple Component Renders', () => {
    it('measures re-renders on state changes', async () => {
      startTestProfiling('DROButton - with clicks', 'unit');
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <DROButton title="Test" onClick={handleClick} data-testid="test-btn">
          Click Me
        </DROButton>,
        { profile: true }
      );

      // Click multiple times to trigger potential re-renders
      await user.click(screen.getByTestId('test-btn'));
      await user.click(screen.getByTestId('test-btn'));
      await user.click(screen.getByTestId('test-btn'));

      const report = endTestProfiling();
      console.log(`DROButton clicks - renders: ${report.totalRenderCount}, time: ${report.totalRenderTime.toFixed(2)}ms`);
      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });
});

describe('Integration Test Render Performance', () => {
  describe('Basic Simulator Render', () => {
    it('measures initial render', () => {
      startTestProfiling('Simulator - initial render', 'integration');
      renderSimulator({ profile: true });

      // Verify simulator rendered
      expect(screen.getByTestId('axis-select-x')).toBeInTheDocument();

      const report = endTestProfiling();
      console.log(`Initial render - renders: ${report.totalRenderCount}, time: ${report.totalRenderTime.toFixed(2)}ms`);
    });
  });

  describe('Axis Selection', () => {
    it('measures renders when selecting axes', async () => {
      startTestProfiling('Simulator - axis selection', 'integration');
      const user = userEvent.setup();
      renderSimulator({ profile: true });

      // Select each axis
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-z'));

      const report = endTestProfiling();
      console.log(`Axis selection - renders: ${report.totalRenderCount}, time: ${report.totalRenderTime.toFixed(2)}ms`);
    });
  });

  describe('Numeric Entry', () => {
    it('measures renders during numeric entry', async () => {
      startTestProfiling('Simulator - numeric entry', 'integration');
      const user = userEvent.setup();
      renderSimulator({ profile: true });

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '12.345');

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(12.345, 3);

      const report = endTestProfiling();
      console.log(`Numeric entry - renders: ${report.totalRenderCount}, time: ${report.totalRenderTime.toFixed(2)}ms`);
    });

    it('measures renders during longer numeric entry', async () => {
      startTestProfiling('Simulator - long numeric entry', 'integration');
      const user = userEvent.setup();
      renderSimulator({ profile: true });

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '123.4567');

      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '-987.654');

      const report = endTestProfiling();
      console.log(`Long numeric entry - renders: ${report.totalRenderCount}, time: ${report.totalRenderTime.toFixed(2)}ms`);
    });
  });

  describe('Calculator Operations', () => {
    it('measures renders during calculator usage', async () => {
      startTestProfiling('Simulator - calculator', 'integration');
      const user = userEvent.setup();
      renderSimulator({ profile: true });

      // Enter calculator mode
      await user.click(screen.getByTestId('btn-calculator'));

      // Enter first value
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      // Select operation
      await user.click(screen.getByTestId('axis-select-y'));

      // Enter second value
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-enter'));

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(15, 0);

      const report = endTestProfiling();
      console.log(`Calculator - renders: ${report.totalRenderCount}, time: ${report.totalRenderTime.toFixed(2)}ms`);
    });
  });

  describe('Zero Operations', () => {
    it('measures renders when zeroing axes', async () => {
      startTestProfiling('Simulator - zero axes', 'integration');
      const user = userEvent.setup();
      renderSimulator({ profile: true });

      // Set values first
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '50');

      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '60');

      // Zero axes
      await user.click(screen.getByTestId('axis-zero-x'));
      await user.click(screen.getByTestId('axis-zero-y'));

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);

      const report = endTestProfiling();
      console.log(`Zero axes - renders: ${report.totalRenderCount}, time: ${report.totalRenderTime.toFixed(2)}ms`);
    });
  });

  describe('Complex Workflow', () => {
    it('measures renders during a complex user workflow', async () => {
      startTestProfiling('Simulator - complex workflow', 'integration');
      const user = userEvent.setup();
      renderSimulator({ profile: true });

      // Simulate a typical machinist workflow
      // 1. Set X position
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '100.5');

      // 2. Set Y position
      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '50.25');

      // 3. Set Z position
      await user.click(screen.getByTestId('axis-select-z'));
      await enterValue(user, '-10.125');

      // 4. Zero X
      await user.click(screen.getByTestId('axis-zero-x'));

      // 5. Enter new X value
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '25.0');

      // 6. Use calculator to add to Y
      await user.click(screen.getByTestId('btn-calculator'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      const report = endTestProfiling();
      console.log(`Complex workflow - renders: ${report.totalRenderCount}, time: ${report.totalRenderTime.toFixed(2)}ms, duration: ${report.duration.toFixed(2)}ms`);
    });
  });
});

describe('Component-Level Profiling', () => {
  describe('Detailed Component Metrics', () => {
    it('measures individual component renders during axis selection', async () => {
      startTestProfiling('Component - axis selection', 'integration');
      const user = userEvent.setup();
      renderSimulator({ componentProfiling: true });

      // Select each axis to trigger renders
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-z'));

      const report = endTestProfiling();
      console.log(`Component axis selection - renders: ${report.totalRenderCount}`);
    });

    it('measures individual component renders during numeric entry', async () => {
      startTestProfiling('Component - numeric entry', 'integration');
      const user = userEvent.setup();
      renderSimulator({ componentProfiling: true });

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '12.345');

      const report = endTestProfiling();
      console.log(`Component numeric entry - renders: ${report.totalRenderCount}`);
    });

    it('measures individual component renders during complex workflow', async () => {
      startTestProfiling('Component - complex workflow', 'integration');
      const user = userEvent.setup();
      renderSimulator({ componentProfiling: true });

      // Full workflow to see all components
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '100');

      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '200');

      await user.click(screen.getByTestId('axis-zero-x'));

      await user.click(screen.getByTestId('btn-calculator'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-enter'));

      const report = endTestProfiling();
      console.log(`Component complex workflow - renders: ${report.totalRenderCount}`);
    });
  });
});

/**
 * Regression Tests
 *
 * These tests enforce performance budgets. If they fail, it means a code change
 * has degraded render performance beyond acceptable limits.
 */
describe('Performance Regression Tests', () => {
  describe('Component Update Budgets', () => {
    it('stateless components should not update after mount', async () => {
      clearComponentMetrics();
      const user = userEvent.setup();
      renderSimulator({ componentProfiling: true });

      // Perform various interactions
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '123.45');
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('btn-calculator'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-enter'));

      const metrics = getComponentMetrics();

      // These components should have 0 updates (only mount)
      const statelessComponents = [
        'KeypadSection',
        'PrimaryFunctionSection',
        'SecondaryFunctionSection',
        'HousingEdge-top',
        'HousingEdge-bottom',
        'BrandLogo',
      ];

      for (const name of statelessComponents) {
        const componentMetrics = metrics.get(name);
        if (componentMetrics) {
          expect(
            componentMetrics.updateCount,
            `${name} should have 0 updates but had ${componentMetrics.updateCount}`
          ).toBe(0);
        }
      }
    });

    it('MultiAxisSection should have limited updates', async () => {
      clearComponentMetrics();
      const user = userEvent.setup();
      renderSimulator({ componentProfiling: true });

      // Select axes and enter values
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '100');
      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '200');

      const metrics = getComponentMetrics();
      const multiAxis = metrics.get('MultiAxisSection');

      // MultiAxisSection updates for: boot sequence, state changes, mode changes
      // Budget: max 10 updates for this workflow
      expect(
        multiAxis?.updateCount ?? 0,
        `MultiAxisSection had ${multiAxis?.updateCount} updates, expected <= 10`
      ).toBeLessThanOrEqual(10);
    });
  });

  describe('Render Count Budgets', () => {
    it('axis selection should have limited total renders', async () => {
      startTestProfiling('Regression - axis selection', 'integration');
      const user = userEvent.setup();
      renderSimulator({ profile: true });

      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-z'));

      const report = endTestProfiling();

      // Budget: max 6 total renders for 3 axis selections (1 mount + 1 per selection + buffer)
      expect(
        report.totalRenderCount,
        `Axis selection had ${report.totalRenderCount} renders, expected <= 6`
      ).toBeLessThanOrEqual(6);
    });

    it('numeric entry should have limited total renders', async () => {
      startTestProfiling('Regression - numeric entry', 'integration');
      const user = userEvent.setup();
      renderSimulator({ profile: true });

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '12.345');

      const report = endTestProfiling();

      // Budget: max 5 renders for selecting axis + entering 6 chars
      expect(
        report.totalRenderCount,
        `Numeric entry had ${report.totalRenderCount} renders, expected <= 5`
      ).toBeLessThanOrEqual(5);
    });

    it('complex workflow should have bounded render count', async () => {
      startTestProfiling('Regression - complex workflow', 'integration');
      const user = userEvent.setup();
      renderSimulator({ profile: true });

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '100');
      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '200');
      await user.click(screen.getByTestId('axis-zero-x'));
      await user.click(screen.getByTestId('btn-calculator'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-enter'));

      const report = endTestProfiling();

      // Budget: max 15 renders for this complex workflow
      expect(
        report.totalRenderCount,
        `Complex workflow had ${report.totalRenderCount} renders, expected <= 15`
      ).toBeLessThanOrEqual(15);
    });
  });
});
