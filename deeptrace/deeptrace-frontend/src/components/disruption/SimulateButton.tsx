import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Play } from 'lucide-react';
import { api } from '../../api/client';
import { useStore } from '../../state/store';

export const SimulateButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setDisruptedNodeId, activeRiskId } = useStore();
  const [bottleneckId, setBottleneckId] = useState<string>('hsinchu-raw');

  useEffect(() => {
    if (activeRiskId) {
      api.getRisks().then(res => {
        const activeRisk = res.risks.find(r => r.id === activeRiskId);
        if (activeRisk) {
          setBottleneckId(activeRisk.bottleneck_node_id);
        }
      }).catch(console.error);
    }
  }, [activeRiskId]);

  const handleSimulate = async () => {
    setIsLoading(true);
    setIsOpen(false);
    setError(null);
    
    console.log(`[Simulate] Sending POST request to disrupt node: ${bottleneckId}`);
    try {
      const report = await api.simulateDisruption(bottleneckId);
      console.log(`[Simulate] Received response:`, report);
      
      setDisruptedNodeId(bottleneckId);
      
      console.log(`[Simulate] Dispatching show-alert-banner event`);
      window.dispatchEvent(new CustomEvent('show-alert-banner', { detail: report }));
      
      console.log(`[Simulate] Dispatching disruption-simulated event to trigger refetches`);
      window.dispatchEvent(new Event('disruption-simulated'));
      
    } catch (e: any) {
      console.error(`[Simulate] Error:`, e);
      setError(e.message || 'Failed to simulate disruption');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="secondary" 
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
        isLoading={isLoading}
      >
        <Play size={16} className="text-[var(--color-danger)] fill-[var(--color-danger)]" />
        Simulate disruption
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[var(--color-border)] rounded-md shadow-lg p-3 z-50">
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            Trigger a simulated outage at <strong>{bottleneckId}</strong> to observe downstream impact.
          </p>
          <Button variant="primary" className="w-full" onClick={handleSimulate}>
            Confirm simulation
          </Button>
        </div>
      )}
      
      {error && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--color-danger-bg)] border border-[var(--color-danger)] rounded-md shadow-lg p-3 z-50">
          <p className="text-sm text-[var(--color-danger)] font-medium">Error</p>
          <p className="text-xs text-[var(--color-danger)]">{error}</p>
          <button onClick={() => setError(null)} className="text-xs underline mt-2">Dismiss</button>
        </div>
      )}
    </div>
  );
};
