import React, { useEffect, useState } from 'react';
import type { SimulateResponse } from '../../api/types';
import { AlertTriangle, X } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export const AlertBanner: React.FC = () => {
  const [report, setReport] = useState<SimulateResponse | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleShow = (e: Event) => {
      const customEvent = e as CustomEvent<SimulateResponse>;
      setReport(customEvent.detail);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 10000); // Give them time to read deltas

      return () => clearTimeout(timer);
    };

    window.addEventListener('show-alert-banner', handleShow);
    return () => window.removeEventListener('show-alert-banner', handleShow);
  }, []);

  if (!visible || !report) return null;

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl mt-4 slide-down">
      <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-lg p-4 shadow-lg flex items-start gap-4">
        <div className="mt-0.5">
          <AlertTriangle className="text-[var(--color-danger)]" size={20} />
        </div>
        <div className="flex-grow">
          <h4 className="text-[var(--color-danger)] font-medium text-sm mb-1">
            Active Disruption Simulated
          </h4>
          <p className="text-sm text-[var(--color-text-primary)] mb-2">
            Disrupting <strong>{report.report.disrupted_node}</strong> would immediately affect {report.report.affected_tier1_suppliers.length} suppliers and put {formatCurrency(report.report.total_revenue_at_risk)} in revenue at risk.
          </p>
          {Object.keys(report.deltas).length > 0 && (
            <div className="mt-3 text-xs">
              <ul className="space-y-1 text-[var(--color-text-secondary)]">
                {Object.entries(report.deltas).map(([chain, delta]) => (
                  <li key={chain}>
                    This represents an increase in risk for <strong>{chain}</strong> from the current baseline score of {delta.before} to <span className="font-semibold text-[var(--color-danger)]">{delta.after}</span>.
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button onClick={() => setVisible(false)} className="text-[var(--color-danger)]/70 hover:text-[var(--color-danger)]">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
