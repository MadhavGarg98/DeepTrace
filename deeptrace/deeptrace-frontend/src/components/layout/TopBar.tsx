import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { SummaryStrip } from '../analytics/SummaryStrip';
import { SimulateButton } from '../disruption/SimulateButton';
import { Info } from 'lucide-react';
import { api } from '../../api/client';
import type { AnalyticsSummary } from '../../api/types';

export const TopBar: React.FC = () => {
  const [showDemoInfo, setShowDemoInfo] = useState(false);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    api.getAnalyticsSummary().then(setSummary).catch(console.error);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-[var(--color-border)] px-6 flex items-center justify-between shrink-0 z-30 relative">
      <div className="flex items-center gap-8 h-full">
        <div className="font-semibold text-[var(--color-text-primary)] text-lg tracking-tight">
          DeepTrace<span className="text-[var(--color-risk)]">.</span>
        </div>
        
        <nav className="flex items-center gap-4 text-sm font-medium h-full">
          <NavLink to="/" className={({isActive}) => `flex items-center h-full px-2 border-b-2 ${isActive ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>Dashboard</NavLink>
          <NavLink to="/suppliers" className={({isActive}) => `flex items-center h-full px-2 border-b-2 ${isActive ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>Suppliers</NavLink>
          <NavLink to="/history" className={({isActive}) => `flex items-center h-full px-2 border-b-2 ${isActive ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>History</NavLink>
          <NavLink to="/audit" className={({isActive}) => `flex items-center h-full px-2 border-b-2 ${isActive ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>Audit Log</NavLink>
        </nav>

        <SummaryStrip />
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] bg-gray-50 border border-[var(--color-border)] px-2 py-1 rounded-[var(--radius-control)] hover:bg-gray-100"
            onClick={() => setShowDemoInfo(!showDemoInfo)}
          >
            <Info size={14} />
            Demo data &middot; seeded
          </button>
          
          {showDemoInfo && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-lg p-3 z-50">
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-2">
                <strong>Current Graph:</strong> {summary ? `${summary.total_tier1_suppliers} Tier 1 suppliers, ${summary.total_nodes} total nodes.` : 'Loading...'}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                <strong>Data Context:</strong> Tier 2+ relationships are demo data illustrating the detection pipeline; Tier 1 reflects direct ERP-style input. The scoring engine and detection algorithms are fully real.
              </p>
            </div>
          )}
        </div>
        <SimulateButton />
      </div>
    </header>
  );
};