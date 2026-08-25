import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { RiskChain, AnalyticsSummary } from '../../api/types';

export const RiskHeadline: React.FC = () => {
  const [topRisk, setTopRisk] = useState<RiskChain | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    Promise.all([
      api.getRisks(),
      api.getAnalyticsSummary()
    ]).then(([risksData, summaryData]) => {
      if (risksData.risks.length > 0) {
        setTopRisk(risksData.risks[0]);
      }
      setSummary(summaryData);
    }).catch(console.error);
    
    const handleSimulated = () => {
      api.getRisks().then(res => {
        if (res.risks.length > 0) {
          setTopRisk(res.risks[0]);
        }
      });
    };
    window.addEventListener('disruption-simulated', handleSimulated);
    return () => window.removeEventListener('disruption-simulated', handleSimulated);
  }, []);

  if (!topRisk || !summary) return null;

  const affectedCount = topRisk.affected_tier1_suppliers.length;
  const totalTier1 = summary.total_tier1_suppliers;
  const supplierNames = topRisk.affected_tier1_suppliers.map(id => {
    // Basic mapping for display, ideally we'd fetch the actual nodes or use the chain_nodes
    // Actually, T1 nodes are NOT in chain_nodes, because chain_nodes goes up to bottleneck.
    // Wait, let's see if we can just format the IDs nicely.
    // "boschco-india" -> "Boschco India"
    return id.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  });
  
  let formattedNames = '';
  if (supplierNames.length === 1) formattedNames = supplierNames[0];
  else if (supplierNames.length === 2) formattedNames = `${supplierNames[0]} and ${supplierNames[1]}`;
  else if (supplierNames.length > 2) {
    formattedNames = supplierNames.slice(0, -1).join(', ') + ', and ' + supplierNames[supplierNames.length - 1];
  }

  const bottleneckNode = topRisk.chain_nodes[topRisk.chain_nodes.length - 1];
  const bottleneckCountry = bottleneckNode?.country || 'unknown country';
  const suppliesWhat = bottleneckNode?.supplies_what || 'critical material';

  return (
    <div className="w-full bg-[var(--color-risk-bg)] border-b border-[var(--color-risk)]/20 p-4 flex items-center justify-center text-center shadow-sm z-10 relative">
      <p className="text-[var(--color-text-primary)] text-sm font-medium max-w-4xl leading-relaxed">
        <strong>{affectedCount} of your {totalTier1} direct suppliers</strong> — {formattedNames} — all secretly depend on a single <span className="font-semibold text-[var(--color-risk)]">{suppliesWhat}</span> source in {bottleneckCountry}. If that source is disrupted, all {affectedCount} stop shipping to you at once.
      </p>
    </div>
  );
};
