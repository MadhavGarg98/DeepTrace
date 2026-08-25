import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { RiskChain, AnalyticsSummary } from '../../api/types';
import { RiskCard } from './RiskCard';
import { useStore } from '../../state/store';
import { Tooltip } from '../common/Tooltip';

export const RiskPanel: React.FC = () => {
  const [risks, setRisks] = useState<RiskChain[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const { setActiveRiskId, activeRiskId } = useStore();

  const fetchRisks = () => {
    Promise.all([
      api.getRisks(),
      api.getAnalyticsSummary()
    ]).then(([risksData, summaryData]) => {
      setRisks(risksData.risks);
      setSummary(summaryData);
      if (risksData.risks.length > 0 && !activeRiskId) {
        setActiveRiskId(risksData.risks[0].id);
      }
    }).catch(console.error);
  };

  useEffect(() => {
    fetchRisks();
    window.addEventListener('disruption-simulated', fetchRisks);
    return () => window.removeEventListener('disruption-simulated', fetchRisks);
  }, []); // Run on mount and when simulated

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--color-border)] bg-gray-50/50">
        <h2 className="text-xs font-medium uppercase tracking-panel-header text-[var(--color-text-secondary)]">Detected Risks</h2>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {risks.length === 0 ? (
          <div className="text-sm text-[var(--color-text-secondary)]">No convergence risks detected.</div>
        ) : (
          risks.map((risk, index) => (
            <RiskCard 
              key={risk.id} 
              risk={risk} 
              isTopRisk={index === 0} 
              totalRevenue={summary?.total_revenue_at_risk || 5000000000} // Fallback if missing
            />
          ))
        )}
        
        {risks.length > 0 && (
          <div className="pt-4 border-t border-[var(--color-border)] text-center">
            <Tooltip content="A 0-100 score combining how many suppliers are affected, how much revenue depends on them, how confident we are in the detected chain, and how risky the source location is.">
              <span className="text-xs text-blue-600 hover:underline cursor-pointer">
                How risk scoring works
              </span>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};
