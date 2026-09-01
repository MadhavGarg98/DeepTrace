import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { RiskChain, AnalyticsSummary } from '../../api/types';
import { RiskCard } from './RiskCard';
import { useStore } from '../../state/store';
import { Tooltip } from '../common/Tooltip';
import { Radio } from 'lucide-react';

export const RiskPanel: React.FC = () => {
  const [risks, setRisks] = useState<RiskChain[]>([]);
  const [resolvedRisks, setResolvedRisks] = useState<RiskChain[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const { setActiveRiskId, activeRiskId, lastSenseMatches } = useStore();

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

  const handleStatusChange = (updated: RiskChain) => {
    if (updated.reroute_executed) {
      setResolvedRisks(prev => {
        if (!prev.find(r => r.id === updated.id)) {
          return [...prev, updated];
        }
        return prev.map(r => (r.id === updated.id ? updated : r));
      });
      setRisks(prev => prev.filter(r => r.id !== updated.id));
    } else {
      setRisks(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--color-border)] bg-gray-50/50">
        <h2 className="text-xs font-medium uppercase tracking-panel-header text-[var(--color-text-secondary)]">Detected Risks</h2>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {lastSenseMatches && lastSenseMatches.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider">Live Alerts</h3>
            </div>
            {lastSenseMatches.map((match, idx) => (
              <div key={idx} className="border rounded p-3 text-sm flex gap-3 bg-red-50 border-red-100">
                <Radio size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium mb-1 text-red-900">
                    <a href={match.article_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {match.article_title}
                    </a>
                  </div>
                  <div className="text-xs flex gap-2 text-red-700">
                    <span className="font-semibold px-1.5 rounded bg-red-100">{match.node_id}</span>
                    <span className="opacity-75">{match.article_domain}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {risks.length === 0 ? (
          <div className="text-sm text-[var(--color-text-secondary)]">No convergence risks detected.</div>
        ) : (
          risks.map((risk, index) => (
            <RiskCard 
              key={risk.id} 
              risk={risk} 
              isTopRisk={index === 0} 
              totalRevenue={summary?.total_revenue_at_risk || 5000000000} // Fallback if missing
              onStatusChange={handleStatusChange}
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

        {resolvedRisks.length > 0 && (
          <div className="mt-8 pt-4 border-t border-[var(--color-border)]">
            <button 
              className="flex items-center justify-between w-full text-xs font-medium uppercase tracking-panel-header text-[var(--color-text-secondary)] mb-4"
              onClick={() => setShowResolved(!showResolved)}
            >
              Resolved Chains ({resolvedRisks.length})
              <span className="text-[10px]">{showResolved ? 'Hide' : 'Show'}</span>
            </button>
            
            {showResolved && (
              <div className="space-y-4">
                {resolvedRisks.map((risk) => (
                  <RiskCard 
                    key={risk.id} 
                    risk={risk} 
                    isTopRisk={false} 
                    totalRevenue={summary?.total_revenue_at_risk || 5000000000} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};