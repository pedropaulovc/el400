/**
 * Profiled version of EL400Simulator for performance testing.
 *
 * Wraps each major section with React Profiler to measure individual
 * component render times and identify optimization opportunities.
 */
import { Profiler, ProfilerOnRenderCallback } from 'react';
import HousingEdge from '../../components/HousingEdge';
import BrandLogo from '../../components/BrandLogo';
import MultiAxisSection from '../../components/MultiAxisSection';
import AxisSelectionSection from '../../components/AxisSelectionSection';
import KeypadSection from '../../components/KeypadSection';
import PrimaryFunctionSection from '../../components/PrimaryFunctionSection';
import SecondaryFunctionSection from '../../components/SecondaryFunctionSection';

// Storage for component-level metrics
interface ComponentRenderMetric {
  componentId: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

interface ComponentAggregatedMetrics {
  componentId: string;
  renderCount: number;
  mountCount: number;
  updateCount: number;
  totalActualDuration: number;
  totalBaseDuration: number;
  avgActualDuration: number;
  renders: ComponentRenderMetric[];
}

let componentMetricsMap = new Map<string, ComponentAggregatedMetrics>();
let isProfilingEnabled = false;

export function enableComponentProfiling(enabled: boolean): void {
  isProfilingEnabled = enabled;
}

export function clearComponentMetrics(): void {
  componentMetricsMap = new Map();
}

export function getComponentMetrics(): Map<string, ComponentAggregatedMetrics> {
  return new Map(componentMetricsMap);
}

export function printComponentMetrics(): void {
  console.log('\n📊 COMPONENT-LEVEL RENDER METRICS');
  console.log('='.repeat(60));

  const sorted = Array.from(componentMetricsMap.entries())
    .sort((a, b) => b[1].totalActualDuration - a[1].totalActualDuration);

  sorted.forEach(([id, metrics]) => {
    console.log(`\n${id}:`);
    console.log(`  Total Renders: ${String(metrics.renderCount)} (${String(metrics.mountCount)} mounts, ${String(metrics.updateCount)} updates)`);
    console.log(`  Total Time: ${metrics.totalActualDuration.toFixed(2)}ms`);
    console.log(`  Avg Time: ${metrics.avgActualDuration.toFixed(2)}ms`);
    console.log(`  Base Duration: ${metrics.totalBaseDuration.toFixed(2)}ms (ideal without memoization loss)`);

    // Identify potential issues
    if (metrics.updateCount > 5) {
      console.log(`  ⚠️  High update count - consider memoization`);
    }
    if (metrics.avgActualDuration > 10) {
      console.log(`  ⚠️  Slow average render - consider optimization`);
    }
    if (metrics.totalBaseDuration < metrics.totalActualDuration * 0.5) {
      console.log(`  ⚠️  Significant overhead - check for expensive operations`);
    }
  });

  // Summary
  const totalRenders = Array.from(componentMetricsMap.values())
    .reduce((sum, m) => sum + m.renderCount, 0);
  const totalTime = Array.from(componentMetricsMap.values())
    .reduce((sum, m) => sum + m.totalActualDuration, 0);

  console.log('\n' + '='.repeat(60));
  console.log(`TOTAL: ${String(totalRenders)} renders, ${totalTime.toFixed(2)}ms`);
  console.log('='.repeat(60) + '\n');
}

const createProfilerCallback = (componentId: string): ProfilerOnRenderCallback => {
  return (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    if (!isProfilingEnabled) return;

    const metric: ComponentRenderMetric = {
      componentId: id,
      phase: phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    };

    const existing = componentMetricsMap.get(componentId) ?? {
      componentId,
      renderCount: 0,
      mountCount: 0,
      updateCount: 0,
      totalActualDuration: 0,
      totalBaseDuration: 0,
      avgActualDuration: 0,
      renders: [],
    };

    existing.renderCount++;
    existing.totalActualDuration += actualDuration;
    existing.totalBaseDuration += baseDuration;
    existing.avgActualDuration = existing.totalActualDuration / existing.renderCount;
    existing.renders.push(metric);

    if (phase === 'mount') {
      existing.mountCount++;
    } else if (phase === 'update') {
      existing.updateCount++;
    }

    componentMetricsMap.set(componentId, existing);
  };
};

const ProfiledEL400Simulator = () => {
  return (
    <Profiler id="EL400Simulator" onRender={createProfilerCallback('EL400Simulator')}>
      <div
        className="relative rounded-2xl select-none overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #5a5a5a 0%, #404040 20%, #353535 50%, #2a2a2a 80%, #1a1a1a 100%)',
          border: '2px solid transparent',
          boxShadow: `
            0 25px 80px rgba(0,0,0,0.6),
            0 8px 32px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.15),
            inset 0 -1px 0 rgba(0,0,0,0.4)
          `,
          minWidth: '780px',
        }}
      >
        {/* Top raised edge */}
        <Profiler id="HousingEdge-top" onRender={createProfilerCallback('HousingEdge-top')}>
          <HousingEdge position="top">
            <Profiler id="BrandLogo" onRender={createProfilerCallback('BrandLogo')}>
              <BrandLogo />
            </Profiler>
          </HousingEdge>
        </Profiler>

        {/* Main content area */}
        <div className="px-14 pb-2 pt-4">
          <div className="flex gap-5 items-stretch">
            <Profiler id="MultiAxisSection" onRender={createProfilerCallback('MultiAxisSection')}>
              <MultiAxisSection />
            </Profiler>
            <Profiler id="AxisSelectionSection" onRender={createProfilerCallback('AxisSelectionSection')}>
              <AxisSelectionSection />
            </Profiler>
            <Profiler id="KeypadSection" onRender={createProfilerCallback('KeypadSection')}>
              <KeypadSection />
            </Profiler>
          </div>

          {/* Bottom section */}
          <div className="mt-5 flex items-end justify-between">
            <Profiler id="PrimaryFunctionSection" onRender={createProfilerCallback('PrimaryFunctionSection')}>
              <PrimaryFunctionSection />
            </Profiler>
            <Profiler id="SecondaryFunctionSection" onRender={createProfilerCallback('SecondaryFunctionSection')}>
              <SecondaryFunctionSection />
            </Profiler>
          </div>
        </div>

        {/* Bottom raised edge */}
        <Profiler id="HousingEdge-bottom" onRender={createProfilerCallback('HousingEdge-bottom')}>
          <HousingEdge position="bottom" />
        </Profiler>
      </div>
    </Profiler>
  );
};

export default ProfiledEL400Simulator;
