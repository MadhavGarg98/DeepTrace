import React, { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { api } from '../../api/client';
import type { GraphDataResponse, CompanyNode, SupplyEdge } from '../../api/types';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { formatCurrency } from '../../utils/format';
import { X } from 'lucide-react';

export const NodeDetailPanel: React.FC = () => {
  const { selectedNodeId, setSelectedNodeId } = useStore();
  const [graphData, setGraphData] = useState<GraphDataResponse | null>(null);

  useEffect(() => {
    api.getGraph().then(setGraphData).catch(console.error);
  }, []);

  if (!selectedNodeId || !graphData) return null;

  const node = graphData.nodes.find((n: CompanyNode) => n.id === selectedNodeId);
  if (!node) return null;

  // Find incoming edges to this node to show evidence
  const incomingEdges = graphData.edges.filter((e: SupplyEdge) => e.to_id === node.id);

  return (
    <div className="absolute top-0 right-0 h-full w-[280px] bg-white border-l border-[var(--color-border)] shadow-xl z-20 flex flex-col slide-in-right">
      <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-gray-50/50">
        <h3 className="font-medium text-[var(--color-text-primary)]">{node.name}</h3>
        <button onClick={() => setSelectedNodeId(null)} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
      
      <div className="p-4 flex-grow overflow-y-auto space-y-6">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Tier</span>
            <span className="font-medium">{node.tier === 0 ? 'Buyer' : `Tier ${node.tier}`}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Location</span>
            <span className="font-medium">{node.city}, {node.country}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Industry</span>
            <span className="font-medium">{node.industry}</span>
          </div>
          {node.revenue_usd !== undefined && node.revenue_usd !== null && (
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Revenue</span>
              <span className="font-medium">{formatCurrency(node.revenue_usd)}</span>
            </div>
          )}
        </div>

        {incomingEdges.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-panel-header text-[var(--color-text-secondary)] mb-3">Supply Sources</h4>
            <div className="space-y-4">
              {incomingEdges.map((edge: SupplyEdge) => {
                const sourceNode = graphData.nodes.find((n: CompanyNode) => n.id === edge.from_id);
                return (
                  <div key={edge.from_id} className="text-sm space-y-2 p-3 bg-gray-50 rounded-md border border-[var(--color-border)]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{sourceNode?.name || edge.from_id}</span>
                      <ConfidenceBadge confidence={edge.confidence} source={edge.source} />
                    </div>
                    <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed">
                      {edge.evidence}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
