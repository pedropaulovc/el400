/**
 * Render Profiler Utilities
 *
 * Provides instrumentation for measuring React render performance in tests.
 * Uses React's Profiler API to track:
 * - Time spent rendering
 * - Number of re-renders per component
 * - Which components are re-rendering
 */
import React, { Profiler, ProfilerOnRenderCallback, ReactNode } from 'react';

export interface RenderMetrics {
  componentId: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

export interface ComponentStats {
  renderCount: number;
  mountCount: number;
  updateCount: number;
  nestedUpdateCount: number;
  totalActualDuration: number;
  totalBaseDuration: number;
  renders: RenderMetrics[];
}

export interface TestRenderReport {
  testName: string;
  testType: 'unit' | 'integration';
  totalRenderCount: number;
  totalRenderTime: number;
  components: Map<string, ComponentStats>;
  timestamp: number;
  duration: number;
}

// Global state for collecting metrics
let currentTestName = '';
let currentTestType: 'unit' | 'integration' = 'unit';
let testStartTime = 0;
let componentMetrics: Map<string, ComponentStats> = new Map();
let allReports: TestRenderReport[] = [];
let isEnabled = false;

/**
 * Enable/disable profiling
 */
export function enableProfiling(enabled: boolean = true): void {
  isEnabled = enabled;
}

/**
 * Start profiling for a new test
 */
export function startTestProfiling(testName: string, testType: 'unit' | 'integration'): void {
  currentTestName = testName;
  currentTestType = testType;
  testStartTime = performance.now();
  componentMetrics = new Map();
}

/**
 * End profiling for current test and generate report
 */
export function endTestProfiling(): TestRenderReport {
  const report: TestRenderReport = {
    testName: currentTestName,
    testType: currentTestType,
    totalRenderCount: 0,
    totalRenderTime: 0,
    components: new Map(componentMetrics),
    timestamp: Date.now(),
    duration: performance.now() - testStartTime,
  };

  // Calculate totals
  componentMetrics.forEach((stats) => {
    report.totalRenderCount += stats.renderCount;
    report.totalRenderTime += stats.totalActualDuration;
  });

  allReports.push(report);
  return report;
}

/**
 * Get all collected reports
 */
export function getAllReports(): TestRenderReport[] {
  return [...allReports];
}

/**
 * Clear all collected reports
 */
export function clearReports(): void {
  allReports = [];
}

/**
 * Get summary statistics comparing unit vs integration tests
 */
export function getSummaryStats(): {
  unit: { count: number; avgRenders: number; avgTime: number; totalTime: number };
  integration: { count: number; avgRenders: number; avgTime: number; totalTime: number };
  comparison: { renderRatio: number; timeRatio: number };
} {
  const unitReports = allReports.filter((r) => r.testType === 'unit');
  const integrationReports = allReports.filter((r) => r.testType === 'integration');

  const calcStats = (reports: TestRenderReport[]) => {
    if (reports.length === 0) {
      return { count: 0, avgRenders: 0, avgTime: 0, totalTime: 0 };
    }
    const totalRenders = reports.reduce((sum, r) => sum + r.totalRenderCount, 0);
    const totalTime = reports.reduce((sum, r) => sum + r.totalRenderTime, 0);
    return {
      count: reports.length,
      avgRenders: totalRenders / reports.length,
      avgTime: totalTime / reports.length,
      totalTime,
    };
  };

  const unitStats = calcStats(unitReports);
  const integrationStats = calcStats(integrationReports);

  return {
    unit: unitStats,
    integration: integrationStats,
    comparison: {
      renderRatio: unitStats.avgRenders > 0 ? integrationStats.avgRenders / unitStats.avgRenders : 0,
      timeRatio: unitStats.avgTime > 0 ? integrationStats.avgTime / unitStats.avgTime : 0,
    },
  };
}

/**
 * Get component-level statistics across all tests
 */
export function getComponentStats(): Map<string, {
  totalRenders: number;
  totalTime: number;
  avgRenderTime: number;
  tests: string[];
  unnecessaryRenders: number;
}> {
  const stats = new Map<string, {
    totalRenders: number;
    totalTime: number;
    avgRenderTime: number;
    tests: string[];
    unnecessaryRenders: number;
  }>();

  allReports.forEach((report) => {
    report.components.forEach((componentStats, componentId) => {
      const existing = stats.get(componentId) || {
        totalRenders: 0,
        totalTime: 0,
        avgRenderTime: 0,
        tests: [],
        unnecessaryRenders: 0,
      };

      existing.totalRenders += componentStats.renderCount;
      existing.totalTime += componentStats.totalActualDuration;
      existing.tests.push(report.testName);

      // Count updates where actualDuration is very low (likely unnecessary)
      const unnecessaryThreshold = 0.5; // ms
      existing.unnecessaryRenders += componentStats.renders.filter(
        (r) => r.phase !== 'mount' && r.actualDuration < unnecessaryThreshold
      ).length;

      existing.avgRenderTime = existing.totalTime / existing.totalRenders;
      stats.set(componentId, existing);
    });
  });

  return stats;
}

/**
 * Print a formatted report to console
 */
export function printReport(): void {
  const summary = getSummaryStats();
  const componentStats = getComponentStats();

  console.log('\n' + '='.repeat(80));
  console.log('RENDER PERFORMANCE REPORT');
  console.log('='.repeat(80));

  console.log('\n📊 SUMMARY');
  console.log('-'.repeat(40));
  console.log(`Unit Tests:        ${summary.unit.count} tests`);
  console.log(`  Avg Renders:     ${summary.unit.avgRenders.toFixed(1)}`);
  console.log(`  Avg Time:        ${summary.unit.avgTime.toFixed(2)}ms`);
  console.log(`  Total Time:      ${summary.unit.totalTime.toFixed(2)}ms`);

  console.log(`\nIntegration Tests: ${summary.integration.count} tests`);
  console.log(`  Avg Renders:     ${summary.integration.avgRenders.toFixed(1)}`);
  console.log(`  Avg Time:        ${summary.integration.avgTime.toFixed(2)}ms`);
  console.log(`  Total Time:      ${summary.integration.totalTime.toFixed(2)}ms`);

  console.log(`\n📈 COMPARISON (Integration / Unit)`);
  console.log('-'.repeat(40));
  console.log(`  Render Ratio:    ${summary.comparison.renderRatio.toFixed(2)}x`);
  console.log(`  Time Ratio:      ${summary.comparison.timeRatio.toFixed(2)}x`);

  console.log(`\n🔍 TOP 10 MOST RENDERED COMPONENTS`);
  console.log('-'.repeat(40));

  const sortedComponents = Array.from(componentStats.entries())
    .sort((a, b) => b[1].totalRenders - a[1].totalRenders)
    .slice(0, 10);

  sortedComponents.forEach(([id, stats], index) => {
    console.log(`${index + 1}. ${id}`);
    console.log(`   Renders: ${stats.totalRenders} (${stats.unnecessaryRenders} potentially unnecessary)`);
    console.log(`   Total Time: ${stats.totalTime.toFixed(2)}ms, Avg: ${stats.avgRenderTime.toFixed(2)}ms`);
  });

  console.log('\n' + '='.repeat(80));
}

/**
 * Export report as JSON for analysis
 */
export function exportReportAsJSON(): string {
  const summary = getSummaryStats();
  const componentStats = Object.fromEntries(getComponentStats());
  const reports = allReports.map((r) => ({
    ...r,
    components: Object.fromEntries(r.components),
  }));

  return JSON.stringify({
    summary,
    componentStats,
    reports,
  }, null, 2);
}

/**
 * Profiler callback for recording render metrics
 */
const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  if (!isEnabled) return;

  const metrics: RenderMetrics = {
    componentId: id,
    phase: phase as 'mount' | 'update' | 'nested-update',
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  };

  const existing = componentMetrics.get(id) || {
    renderCount: 0,
    mountCount: 0,
    updateCount: 0,
    nestedUpdateCount: 0,
    totalActualDuration: 0,
    totalBaseDuration: 0,
    renders: [],
  };

  existing.renderCount++;
  existing.totalActualDuration += actualDuration;
  existing.totalBaseDuration += baseDuration;
  existing.renders.push(metrics);

  if (phase === 'mount') {
    existing.mountCount++;
  } else if (phase === 'update') {
    existing.updateCount++;
  } else {
    existing.nestedUpdateCount++;
  }

  componentMetrics.set(id, existing);
};

/**
 * HOC to wrap a component with profiling
 */
export function withProfiling<P extends object>(
  Component: React.ComponentType<P>,
  id?: string
): React.FC<P> {
  const displayName = id || Component.displayName || Component.name || 'Unknown';

  const WrappedComponent: React.FC<P> = (props) => (
    <Profiler id={displayName} onRender={onRenderCallback}>
      <Component {...props} />
    </Profiler>
  );

  WrappedComponent.displayName = `Profiled(${displayName})`;
  return WrappedComponent;
}

/**
 * ProfilerWrapper component for wrapping children with profiling
 */
interface ProfilerWrapperProps {
  id: string;
  children: ReactNode;
}

export const ProfilerWrapper: React.FC<ProfilerWrapperProps> = ({ id, children }) => (
  <Profiler id={id} onRender={onRenderCallback}>
    {children}
  </Profiler>
);

/**
 * Deep profiler that wraps the entire tree
 */
interface DeepProfilerProps {
  children: ReactNode;
}

export const DeepProfiler: React.FC<DeepProfilerProps> = ({ children }) => (
  <Profiler id="Root" onRender={onRenderCallback}>
    {children}
  </Profiler>
);
