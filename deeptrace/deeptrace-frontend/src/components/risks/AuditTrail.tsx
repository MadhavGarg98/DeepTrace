import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AgentLogEntry } from '../../api/types';

interface AuditTrailProps {
  chainId: string;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ chainId }) => {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getAuditLog().then(res => {
      if (mounted) {
        // Filter for this specific chain, sort oldest to newest
        const chainLogs = res.logs
          .filter(log => log.risk_id === chainId)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setLogs(chainLogs);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (mounted) setIsLoading(false);
    });

    return () => { mounted = false; };
  }, [chainId]);

  if (isLoading) {
    return <div className="text-sm text-[var(--color-text-secondary)]">Loading audit trail...</div>;
  }

  if (logs.length === 0) {
    return <div className="text-sm text-[var(--color-text-secondary)]">No audit logs found for this risk chain.</div>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider">System Audit Trail</h3>
      </div>
      <div className="p-0">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-gray-100">
            {logs.map((log, idx) => {
              const date = new Date(log.timestamp);
              return (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="py-3 px-5 w-48 text-[var(--color-text-secondary)] font-mono text-xs align-top whitespace-nowrap">
                    {date.toISOString().replace('T', ' ').substring(0, 19)}
                  </td>
                  <td className="py-3 px-5 align-top">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      <span className="font-medium text-gray-700 capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {log.detail && (
                      <div className="text-gray-500 pl-4">
                        {log.detail}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
