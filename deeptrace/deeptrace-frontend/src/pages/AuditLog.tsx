import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AgentLogEntry, AgentName } from '../api/types';
import { TopBar } from '../components/layout/TopBar';
import { ScrollText, Search, Bot, User } from 'lucide-react';

const AGENT_LABELS: Record<AgentName, string> = {
  discovery: 'Discovery agent',
  risk_mapper: 'Risk mapper agent',
  prioritizer: 'Prioritizer agent',
  advisor: 'Advisor agent',
  system: 'Human / system',
};

const AGENT_COLORS: Record<AgentName, string> = {
  discovery: 'bg-blue-100 text-blue-700',
  risk_mapper: 'bg-orange-100 text-orange-700',
  prioritizer: 'bg-purple-100 text-purple-700',
  advisor: 'bg-teal-100 text-teal-700',
  system: 'bg-gray-200 text-gray-700',
};

export const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (idx: number) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setExpandedRows(newSet);
  };

  const fetchLogs = () => {
    api.getAuditLog()
      .then(res => {
        setLogs(res.logs);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchLogs();
    // Refresh whenever a disruption is simulated elsewhere in the app, so
    // this page doesn't need its own polling loop for the demo.
    window.addEventListener('disruption-simulated', fetchLogs);
    return () => window.removeEventListener('disruption-simulated', fetchLogs);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopBar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[var(--color-tier1)]/10 text-[var(--color-tier1)] rounded-lg">
              <ScrollText size={24} />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">Audit Log</h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-8">
            Every agent step and every human decision, in order. Use this to trace exactly why a risk was
            flagged, scored, and recommended - and who approved what.
          </p>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center text-[var(--color-text-secondary)] py-12">Loading audit trail...</div>
            ) : logs.length === 0 ? (
              <div className="text-center p-12 bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] flex flex-col items-center gap-2">
                <Search size={20} className="text-gray-300" />
                No log entries yet. Load the dashboard to trigger the agent pipeline.
              </div>
            ) : (
              logs.map((entry, idx) => (
                <div
                  key={`${entry.timestamp}-${idx}`}
                  className="bg-white border border-[var(--color-border)] rounded-lg p-4 flex items-start gap-4 shadow-sm"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    entry.agent_name === 'system' ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-[var(--color-tier1)]'
                  }`}>
                    {entry.agent_name === 'system' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${AGENT_COLORS[entry.agent_name]}`}>
                        {AGENT_LABELS[entry.agent_name]}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)] font-mono">{entry.action}</span>
                      {entry.risk_id && (
                        <span className="text-xs text-[var(--color-text-muted)] font-mono">&middot; {entry.risk_id}</span>
                      )}
                      {entry.trigger_source === 'live_sensed' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 ml-1">
                          LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{entry.detail}</p>
                    
                    {entry.evidence && entry.evidence.length > 0 && (
                      <div className="mt-2 mb-1">
                        <button 
                           onClick={() => toggleRow(idx)}
                           className="text-xs text-blue-600 hover:underline focus:outline-none"
                        >
                           {expandedRows.has(idx) ? 'Hide Evidence' : 'Show Evidence'}
                        </button>
                        {expandedRows.has(idx) && (
                          <ul className="space-y-2 mt-2 p-3 bg-gray-50 border border-gray-100 rounded">
                            {entry.evidence.map((ev, i) => (
                              <li key={i} className="text-xs text-[var(--color-text-secondary)] flex items-start">
                                <span className="mr-2 text-[var(--color-tier1)] shrink-0">•</span>
                                <span className="break-all">{ev}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};