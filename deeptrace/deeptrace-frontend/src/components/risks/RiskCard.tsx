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
  const [showConfirm, setShowConfirm] = useState<'execute' | 'reject' | null>(null);

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
      
      const reasoning = updated.approval_reasoning || `Rerouting to ${updated.suggested_reroute_node_name} is recommended.`;
      const nextSteps = updated.approval_next_steps?.length 
          ? updated.approval_next_steps.map((s: string) => `- ${s}`).join('\n')
          : `- Confirm capacity with the new supplier before executing.`;
          
      const chatMsg = `**Impact Assessment:**\n${reasoning}\n\n**Next Steps:**\n${nextSteps}`;
      
      window.dispatchEvent(new CustomEvent('advisor-reply', {
        detail: chatMsg
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
    } finally {
      setIsSubmitting(false);
      setShowConfirm(null);
    }
  };

  const handleExecute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await api.executeReroute(risk.id);
      onStatusChange?.(updated);
      window.dispatchEvent(new Event('disruption-simulated'));
      window.dispatchEvent(new CustomEvent('send-chat', {
        detail: `I have executed the reroute for the bottleneck at ${risk.bottleneck_node_id}.`
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to execute reroute');
    } finally {
      setIsSubmitting(false);
      setShowConfirm(null);
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
      setShowConfirm(null);
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

          <div className="mt-4 bg-gray-50 rounded-md p-3 border border-gray-100">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Suggested Reroute</h4>
            {!risk.suggested_reroute_node_id ? (
              <p className="text-sm text-gray-500">No safe alternate supplier found.</p>
            ) : (
              <div>
                <p className="text-sm text-gray-800 mb-3">
                  Reroute through <span className="font-medium">{risk.suggested_reroute_node_name}</span> instead of {risk.bottleneck_node_id}.
                </p>

                {error && (
                  <p className="text-xs text-[var(--color-danger)] mb-2">{error}</p>
                )}

                {risk.reroute_executed ? (
                  <div className="flex flex-col gap-1 mt-4">
                    <div className="flex items-center text-sm text-green-700 font-medium">
                      <Check size={16} className="mr-1.5" />
                      Rerouted to {risk.suggested_reroute_node_name}
                    </div>
                    <Link to={`/risks/${risk.id}`} className="text-xs text-blue-600 hover:underline">View audit trail &rarr;</Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mt-4">
                    {risk.approval_status === 'approved' && (
                      <div className="mb-3 bg-white p-3 rounded border border-[var(--color-border)] shadow-sm">
                        <div className="flex items-center text-sm text-green-700 font-medium mb-1">
                          <Check size={16} className="mr-1.5" />
                          Reroute approved — ready to execute
                        </div>
                        <div className="text-xs text-gray-600 pl-5">
                          Target: <span className="font-semibold text-gray-800">{risk.suggested_reroute_node_name}</span>
                        </div>
                      </div>
                    )}
                    
                    {showConfirm ? (
                      <div className="bg-white border border-[var(--color-border)] p-3 rounded shadow-sm text-sm" onClick={e => e.stopPropagation()}>
                        <p className="mb-3 text-gray-700 font-medium">
                          Are you sure you want to {showConfirm === 'execute' ? 'execute' : (showConfirm === 'approve' ? 'approve' : 'reject')} this reroute?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant={showConfirm === 'execute' ? 'primary' : (showConfirm === 'approve' ? 'primary' : 'danger')}
                            isLoading={isSubmitting}
                            className="flex-1 text-xs py-1.5"
                            onClick={showConfirm === 'execute' ? handleExecute : (showConfirm === 'approve' ? handleApprove : handleReject)}
                          >
                            Confirm {showConfirm === 'execute' ? 'Execute' : (showConfirm === 'approve' ? 'Approve' : 'Reject')}
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={isSubmitting}
                            className="text-xs py-1.5 px-3"
                            onClick={() => setShowConfirm(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      risk.approval_status === 'pending' && isTopRisk ? (
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            className="flex-1 text-xs py-1.5"
                            onClick={(e) => { e.stopPropagation(); setShowConfirm('approve'); }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs py-1.5 px-3 hover:bg-red-50 hover:text-red-700"
                            onClick={(e) => { e.stopPropagation(); setShowConfirm('reject'); }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        risk.approval_status === 'approved' && isTopRisk && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="primary"
                              className="w-full text-xs py-2 uppercase tracking-wider font-bold"
                              onClick={(e) => { e.stopPropagation(); setShowConfirm('execute'); }}
                            >
                              Execute Reroute
                            </Button>
                          </div>
                        )
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};