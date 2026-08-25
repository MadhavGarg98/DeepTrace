import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { RiskChain } from '../api/types';
import { TopBar } from '../components/layout/TopBar';
import { formatPercentage, formatCurrency } from '../utils/format';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { CascadeTimeline } from '../components/risks/CascadeTimeline';
import { Tooltip } from '../components/common/Tooltip';

export const RiskDetail: React.FC = () => {
  const { chainId } = useParams();
  const [risk, setRisk] = useState<RiskChain | null>(null);
  const [totalRev, setTotalRev] = useState(0);

  useEffect(() => {
    if (!chainId) return;
    api.getRisks().then(res => {
      const r = res.risks.find(x => x.id === chainId);
      if (r) setRisk(r);
    }).catch(console.error);
    
    api.getAnalyticsSummary().then(s => setTotalRev(s.total_revenue_at_risk)).catch(console.error);
  }, [chainId]);

  if (!risk) return <div className="p-8">Loading risk details...</div>;
  console.log("Rendering RiskDetail for risk:", risk.id, "Score:", risk.score);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <TopBar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="inline-flex items-center text-sm text-[var(--color-text-secondary)] hover:text-black mb-6 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-[var(--color-border)]">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-0.5 rounded bg-[var(--color-risk-bg)] text-[var(--color-risk)] text-xs font-semibold uppercase tracking-wider">
                  Convergence Risk
                </span>
                <span className="text-sm text-[var(--color-text-secondary)] font-mono">ID: {risk.id}</span>
              </div>
              <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] tracking-tight">
                Bottleneck at {risk.bottleneck_node_id}
              </h1>
            </div>
            <div className="flex flex-col items-end text-right">
              <div className="text-4xl font-light text-[var(--color-risk)]">{risk.score ?? '-'}</div>
              <div className="text-sm text-[var(--color-text-secondary)] uppercase tracking-wider font-medium mt-1">
                <Tooltip content="Your risk level right now, before any disruption. Simulating a disruption shows how much this number would increase.">
                  Baseline Risk Score
                </Tooltip>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 border border-[var(--color-border)] rounded-lg p-5">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">Affected T1 Suppliers</div>
              <div className="text-2xl font-medium text-[var(--color-text-primary)]">{risk.affected_tier1_suppliers.length}</div>
            </div>
            <div className="bg-gray-50 border border-[var(--color-border)] rounded-lg p-5">
              <Tooltip content="The weakest link in the inferred chain. Tier 1 data is 100% confident; deeper tiers are inferred from public signals.">
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">Path Confidence</div>
              </Tooltip>
              <div className="text-2xl font-medium text-[var(--color-text-primary)]">{formatPercentage(risk.min_confidence_along_path)}</div>
            </div>
            <div className="bg-gray-50 border border-[var(--color-border)] rounded-lg p-5">
              <Tooltip content="The share of total supplier revenue tied to companies that would stop shipping if this bottleneck failed.">
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">Revenue at Risk (est)</div>
              </Tooltip>
              <div className="text-2xl font-medium text-[var(--color-risk)]">{formatCurrency(totalRev * (risk.score/100) * 0.8)}</div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Convergence Chain</h3>
            <div className="bg-white border border-[var(--color-border)] rounded-lg p-5 flex items-center flex-wrap gap-4">
              {risk.chain_nodes.map((node, i) => (
                <React.Fragment key={node.id}>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-[var(--color-border)] flex items-center justify-center font-bold text-gray-500 mb-2">
                      T{node.tier}
                    </div>
                    <span className="text-sm font-medium text-center max-w-[100px] leading-tight">{node.name}</span>
                    <span className="text-xs text-gray-500 mt-1">{node.country}</span>
                  </div>
                  {i < risk.chain_nodes.length - 1 && <ChevronRight size={20} className="text-gray-300" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Supporting Evidence</h3>
                <ul className="space-y-3">
                  {risk.evidence.map((ev, i) => (
                    <li key={i} className="text-sm text-[var(--color-text-secondary)] flex items-start">
                      <span className="mr-2 text-[var(--color-tier1)]">•</span>
                      {ev}
                    </li>
                  ))}
                </ul>
              </div>
              
              {(risk.explanation || risk.recommendation) && (
                <div className="bg-[var(--color-tier1)]/5 border border-[var(--color-tier1)]/20 rounded-lg p-6">
                  <h3 className="text-sm font-medium text-[var(--color-tier1)] uppercase tracking-wider mb-4">AI Analysis</h3>
                  {risk.explanation && <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-4">{risk.explanation}</p>}
                  {risk.recommendation && (
                    <div className="p-3 bg-white border border-[var(--color-tier1)]/20 rounded text-sm text-[var(--color-text-primary)] font-medium">
                      Recommendation: {risk.recommendation}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <CascadeTimeline risk={risk} totalRevenue={totalRev} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
