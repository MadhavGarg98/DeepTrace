import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AnalyticsSummary } from '../../api/types';
import { formatCurrency } from '../../utils/format';

export const SummaryStrip: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    api.getAnalyticsSummary().then(setSummary).catch(console.error);
  }, []);

  if (!summary) return <div className="animate-pulse h-10 w-64 bg-gray-100 rounded" />;

  return (
    <div className="flex items-center gap-8 border-l border-[var(--color-border)] pl-8 h-full py-1">
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-panel-header text-[var(--color-text-secondary)] leading-tight">Tier 1 Suppliers</span>
        <span className="text-lg font-medium text-[var(--color-text-primary)] leading-tight">{summary.total_tier1_suppliers}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-panel-header text-[var(--color-text-secondary)] leading-tight">Hidden Risks</span>
        <span className="text-lg font-medium text-[var(--color-risk)] leading-tight">{summary.total_convergence_risks}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-panel-header text-[var(--color-text-secondary)] leading-tight">Revenue at Risk</span>
        <span className="text-lg font-medium text-[var(--color-text-primary)] leading-tight">{formatCurrency(summary.total_revenue_at_risk)}</span>
      </div>
    </div>
  );
};
