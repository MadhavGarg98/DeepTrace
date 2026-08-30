import React, { useState } from 'react';
import type { RiskChain } from '../../api/types';
import { useStore } from '../../state/store';
import { RevenueChart } from '../analytics/RevenueChart';
import { Button } from '../common/Button';
import { Check, ChevronRight, X } from 'lucide-react';
import { formatPercentage } from '../../utils/format';
import { Link } from 'react-router-dom';
import { Tooltip } from '../common/Tooltip';
import { api } from '../../api/client';

interface RiskCardProps {
  risk: RiskChain;
  isTopRisk: boolean;
  totalRevenue: number;
  onStatusChange?: (updated: RiskChain) => void;
}

export const RiskCard: React.FC<RiskCardProps> = ({ risk, isTopRisk, totalRevenue, onStatusChange }) => {
  const { activeRiskId, setActiveRiskId } = useStore();
  const isActive = activeRiskId === risk.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We need to estimate total revenue at risk for this card. 
  // For the demo, we assume the backend didn't provide this per-risk in the model, 
  // but we can pass it or just mock a ratio based on score.
  // Actually, we can just say "Score / 100 * totalRevenue" roughly for the visual chart,
  // or just use a fixed number if it's missing. Let's assume it's a large chunk.
  const revenueAtRisk = totalRevenue * (risk.score / 100) * 0.8;

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await api.approveRisk(risk.id);
      onStatusChange?.(updated);
      // Keep the chat panel in the loop, same UX as before, but now it
      // fires *after* a real, persisted approval instead of a fake local flag.
      window.dispatchEvent(new CustomEvent('send-chat', {
        detail: `I have approved the recommendation for the bottleneck at ${risk.bottleneck_node_id}. Please draft an action plan to mitigate this risk.`
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await api.rejectRisk(risk.id);
      onStatusChange?.(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to reject');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className={`border rounded-[var(--radius-card)] p-5 transition-all duration-300 cursor-pointer text-left
        ${isActive ? 'border-[var(--color-risk)] ring-1 ring-[var(--color-risk)] bg-white shadow-md' : 'border-[var(--color-border)] bg-white hover:border-gray-300'}
      `}
      onClick={() => setActiveRiskId(risk.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-[var(--color-text-primary)] pr-4">Hidden bottleneck: {risk.bottleneck_node_id}</h3>
        <Tooltip content="A 0-100 score combining supplier impact, revenue exposure, chain confidence, and location risk.">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-risk-bg)] text-[var(--color-risk)] font-medium shrink-0">
            {risk.score}
          </div>
        </Tooltip>
      </div>

      {risk.approval_status !== 'pending' && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-3 ${
          risk.approval_status === 'approved'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {risk.approval_status === 'approved' ? 'Approved' : 'Rejected'}
        </span>
      )}
      
      <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] mb-4 flex-wrap">
        {risk.chain_nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <span>{node.name}</span>
            {i < risk.chain_nodes.length - 1 && <ChevronRight size={12} className="text-gray-300" />}
          </React.Fragment>
        ))}
      </div>

      <div className="flex gap-4 text-sm text-[var(--color-text-secondary)] mb-4">
        <div>
          <span className="block font-medium text-[var(--color-text-primary)]">{risk.affected_tier1_suppliers.length}</span>
          <span className="text-xs">Tier 1 Suppliers</span>
        </div>
        <div>
          <span className="block font-medium text-[var(--color-text-primary)]">{formatPercentage(risk.min_confidence_along_path)}</span>
          <Tooltip content="The weakest link in the inferred chain. Tier 1 data is 100% confident; deeper tiers are inferred from public signals.">
            <span className="text-xs">Path Confidence</span>
          </Tooltip>
        </div>
      </div>

      {isTopRisk && (
        <RevenueChart totalRevenue={totalRevenue} revenueAtRisk={revenueAtRisk} />
      )}

      <div className="mt-4">
        <Link to={`/risks/${risk.id}`} className="text-xs text-blue-600 hover:underline block mb-3">View details &rarr;</Link>
      </div>

      {risk.explanation && (
        <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
          <p className="text-sm italic text-[var(--color-text-secondary)] mb-3 leading-relaxed">
            "{risk.explanation}"
          </p>

          {error && (
            <p className="text-xs text-[var(--color-danger)] mb-2">{error}</p>
          )}

          {risk.approval_status === 'pending' && isTopRisk && (
            <div className="flex gap-2">
              <Button
                variant="primary"
                isLoading={isSubmitting}
                className="flex-1 text-xs py-1.5"
                onClick={handleApprove}
              >
                Approve recommendation
              </Button>
              <Button
                variant="secondary"
                disabled={isSubmitting}
                className="text-xs py-1.5 px-3"
                onClick={handleReject}
              >
                <X size={14} />
              </Button>
            </div>
          )}

          {risk.approval_status === 'approved' && isTopRisk && (
            <Button variant="secondary" disabled className="w-full text-xs py-1.5">
              <Check size={14} className="mr-1.5" />
              Approved &middot; ready to act on
            </Button>
          )}
        </div>
      )}
    </div>
  );
};