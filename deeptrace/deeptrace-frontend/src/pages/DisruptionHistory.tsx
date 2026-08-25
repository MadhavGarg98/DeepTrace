import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { DisruptionHistoryEntry } from '../api/types';
import { TopBar } from '../components/layout/TopBar';
import { formatCurrency } from '../utils/format';
import { Activity } from 'lucide-react';

export const DisruptionHistory: React.FC = () => {
  const [history, setHistory] = useState<DisruptionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = () => {
    api.getDisruptionHistory()
      .then(res => {
        setHistory(res.history);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchHistory();
    window.addEventListener('disruption-simulated', fetchHistory);
    return () => window.removeEventListener('disruption-simulated', fetchHistory);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopBar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[var(--color-danger)]/10 text-[var(--color-danger)] rounded-lg">
              <Activity size={24} />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">Disruption Log</h1>
          </div>
          
          <div className="space-y-6">
            {loading ? (
              <div className="text-center text-[var(--color-text-secondary)]">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="text-center p-12 bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)]">
                No disruptions have been simulated yet. Use the "Simulate Outage" button in the TopBar.
              </div>
            ) : (
              history.map((entry, idx) => (
                <div key={idx} className="bg-white border border-[var(--color-border)] rounded-lg p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start border-b border-[var(--color-border)] pb-4">
                    <div>
                      <div className="text-xs text-[var(--color-text-secondary)] mb-1">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                      <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                        Outage at {entry.disrupted_node}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-[var(--color-danger)]">
                        {formatCurrency(entry.revenue_impact)} at risk
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                        {entry.affected_suppliers.length} Tier 1 suppliers impacted
                      </div>
                    </div>
                  </div>
                  
                  {Object.keys(entry.score_deltas).length > 0 ? (
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Narrative</h4>
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-[var(--color-text-primary)]">
                          Disrupting <strong>{entry.disrupted_node}</strong> would immediately affect {entry.affected_suppliers.length} suppliers and put {formatCurrency(entry.revenue_impact)} in revenue at risk.
                        </p>
                        {Object.entries(entry.score_deltas).map(([chainId, delta]) => (
                          <p key={chainId} className="text-sm text-[var(--color-text-secondary)]">
                            This represents an increase in risk for <strong>{chainId}</strong> from the current baseline score of {delta.before} to <span className="font-semibold text-[var(--color-danger)]">{delta.after}</span>.
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--color-text-secondary)] italic">
                      No convergence risks were affected by this outage.
                    </div>
                  )}
                </div>
              )).reverse() // Show newest first
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
