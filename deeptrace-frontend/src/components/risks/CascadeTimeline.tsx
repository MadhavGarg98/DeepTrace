import React from 'react';
import type { RiskChain } from '../../api/types';
import { formatCurrency } from '../../utils/format';

interface CascadeTimelineProps {
  risk: RiskChain;
  totalRevenue: number;
}

export const CascadeTimeline: React.FC<CascadeTimelineProps> = ({ risk, totalRevenue }) => {
  if (!risk.chain_nodes || risk.chain_nodes.length === 0) return null;

  // The bottleneck is the deepest node, so chain_nodes is ordered from Bottleneck (highest tier) down to Tier 1s (lowest tier) ?
  // Wait, let's check convergence.py: "nodes_in_chain.sort(key=lambda x: x.tier)".
  // So chain_nodes[0] is Tier 1 (lowest tier number) and chain_nodes[-1] is Bottleneck (highest tier number).
  // Actually, convergence.py:
  // "nodes_in_chain.sort(key=lambda x: x.tier)" -> Tier 1 is index 0, bottleneck is index n-1.
  // We want the cascade from bottleneck downwards to Tier 1s.
  // So we reverse the chain nodes to go from highest tier (Bottleneck) to lowest tier (T1s).
  
  const nodes = [...risk.chain_nodes].reverse();
  const steps = [];
  
  let stepNumber = 1;

  for (let i = 0; i < nodes.length - 1; i++) {
    const fromNode = nodes[i];
    const toNode = nodes[i+1];
    
    // We try to use supplies_what to infer what is flowing
    const supplies = fromNode.supplies_what || 'critical components';
    
    steps.push(
      <div key={`step-${i}`} className="flex relative pb-8">
        <div className="mr-4 flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-[var(--color-risk)] text-white flex items-center justify-center text-xs font-bold z-10 shadow-sm">
            {stepNumber++}
          </div>
          <div className="w-[2px] h-full bg-[var(--color-border)] absolute top-6 bottom-0 left-3 -ml-[1px]"></div>
        </div>
        <div className="pt-0.5">
          <p className="font-semibold text-sm text-[var(--color-text-primary)]">
            {fromNode.name} ({fromNode.country}) is disrupted
          </p>
          <div className="mt-2 text-sm text-[var(--color-text-secondary)] flex items-start">
            <span className="text-gray-400 mr-2 mt-0.5">→</span>
            <span><span className="font-medium text-gray-700">{supplies}</span> to {toNode.name} stops</span>
          </div>
        </div>
      </div>
    );
  }

  // Final step: T1s to Buyer
  const affectedCount = risk.affected_tier1_suppliers.length;
  const revImpact = totalRevenue * (risk.score / 100) * 0.8; // same mock logic as RiskDetail
  
  steps.push(
    <div key="step-final" className="flex relative">
      <div className="mr-4 flex flex-col items-center">
        <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold z-10 shadow-sm">
          {stepNumber}
        </div>
      </div>
      <div className="pt-0.5">
        <p className="font-semibold text-sm text-[var(--color-text-primary)]">
          {affectedCount} of your direct Tier 1 suppliers can no longer deliver
        </p>
        <div className="mt-2 text-sm flex items-start text-[var(--color-danger)] font-medium">
          <span className="mr-2 mt-0.5 text-[var(--color-danger)]/70">→</span>
          <span>Estimated {formatCurrency(revImpact)} in dependent revenue is at risk</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 border border-[var(--color-border)] rounded-lg p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-6">
        Failure Cascade Mechanism
      </h3>
      <div className="pl-2">
        {steps}
      </div>
    </div>
  );
};
