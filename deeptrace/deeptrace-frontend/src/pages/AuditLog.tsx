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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  const getRelativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) !== 1 ? 's' : ''} ago`;
  };

  const isSignificantEvent = (entry: AgentLogEntry) => {
    const sig = ['human_approval', 'human_rejection', 'reroute_executed', 'disruption_detected', 'live_sensed'];
    return sig.includes(entry.action) || entry.agent_name === 'system';
  };

  const toggleRow = (idx: string) => {
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
    // Refresh whenever a disruption is simulated elsewhere in the app
    window.addEventListener('disruption-simulated', fetchLogs);
    return () => window.removeEventListener('disruption-simulated', fetchLogs);
  }, []);

  const filteredLogs = logs.filter(entry => 
    activeFilter === 'all' ? true : entry.agent_name === activeFilter
  );

  // Group by chain (or 'system' if no chain) -> then by Day
  const groupedLogs: Record<string, Record<string, AgentLogEntry[]>> = {};
  filteredLogs.forEach(entry => {
    const chainGroup = entry.risk_id || 'System & Global Events';
    const dayGroup = new Date(entry.timestamp).toLocaleDateString();
    
    if (!groupedLogs[chainGroup]) groupedLogs[chainGroup] = {};
    if (!groupedLogs[chainGroup][dayGroup]) groupedLogs[chainGroup][dayGroup] = [];
    groupedLogs[chainGroup][dayGroup].push(entry);
  });

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

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              All Agents
            </button>
            {Object.keys(AGENT_LABELS).map(agent => (
              <button 
                key={agent}
                onClick={() => setActiveFilter(agent)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeFilter === agent ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                {AGENT_LABELS[agent as AgentName]}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="text-center text-[var(--color-text-secondary)] py-12">Loading audit trail...</div>
            ) : logs.length === 0 ? (
              <div className="text-center p-12 bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] flex flex-col items-center gap-2">
                <Search size={20} className="text-gray-300" />
                No log entries yet. Load the dashboard to trigger the agent pipeline.
              </div>
            ) : (
              Object.keys(groupedLogs).map((chainGroup, cIdx) => (
                <div key={chainGroup} className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden shadow-sm">
                  <div className="bg-gray-50/80 px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:bg-gray-100/80 transition-colors">
                    <h2 className="font-semibold text-gray-800 text-sm tracking-wide">
                      {chainGroup.startsWith('chain_') ? 'Chain: ' : ''}{chainGroup}
                    </h2>
                  </div>
                  
                  <div className="p-4 space-y-6">
                    {Object.keys(groupedLogs[chainGroup]).map(dayGroup => (
                      <div key={dayGroup}>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4 ml-2">
                          {dayGroup}
                        </h3>
                        
                        <div className="relative pl-6 border-l-2 border-gray-100 space-y-4 ml-4">
                          {groupedLogs[chainGroup][dayGroup].map((entry, idx) => {
                            const isSig = isSignificantEvent(entry);
                            const id = `${entry.timestamp}-${idx}`;
                            return (
                              <div key={id} className="relative">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[29px] top-1 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center
                                  ${isSig ? 'bg-blue-500 w-6 h-6 -left-[31px] -top-0.5' : 'bg-gray-300'}
                                `}>
                                  {isSig && entry.agent_name === 'system' && <User size={10} className="text-white" />}
                                  {isSig && entry.agent_name !== 'system' && <Bot size={10} className="text-white" />}
                                </div>
                                
                                <div className={`flex flex-col ${isSig ? 'bg-blue-50/30 -mt-2 p-3 rounded-md border border-blue-100/50' : ''}`}>
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${AGENT_COLORS[entry.agent_name]}`}>
                                      {AGENT_LABELS[entry.agent_name]}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{entry.action}</span>
                                    {entry.trigger_source === 'live_sensed' && (
                                      <span className="flex items-center gap-1 ml-1">
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                          LIVE
                                        </span>
                                        {entry.provider_used && (
                                          <span className="text-[10px] uppercase font-medium tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                            via {entry.provider_used}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-gray-400 ml-auto" title={new Date(entry.timestamp).toLocaleString()}>
                                      {getRelativeTime(entry.timestamp)}
                                    </span>
                                  </div>
                                  
                                  <p className={`leading-relaxed mt-1 ${isSig ? 'text-sm font-medium text-gray-900' : 'text-xs text-gray-600'}`}>
                                    {entry.detail}
                                  </p>
                                  
                                  {entry.evidence && entry.evidence.length > 0 && (
                                    <div className="mt-2 mb-1">
                                      <button 
                                         onClick={() => toggleRow(id)}
                                         className="text-[10px] uppercase tracking-wider font-semibold text-blue-600 hover:underline focus:outline-none"
                                      >
                                         {expandedRows.has(id) ? 'Hide Evidence' : 'Show Evidence'}
                                      </button>
                                      {expandedRows.has(id) && (
                                        <ul className="space-y-1.5 mt-2 p-3 bg-gray-50 border border-gray-100 rounded">
                                          {entry.evidence.map((ev, i) => (
                                            <li key={i} className="text-xs text-gray-600 flex items-start">
                                              <span className="mr-2 text-gray-400 shrink-0">•</span>
                                              <span className="break-all">{ev}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
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