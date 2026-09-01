import React, { useState } from 'react';
import { api } from '../../api/client';
import { useStore } from '../../state/store';
import { Activity, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';

export const SenseButton: React.FC = () => {
  const setLastSenseMatches = useStore(state => state.setLastSenseMatches);
  const [isSensing, setIsSensing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<React.ReactNode | null>(null);

  const handleSense = async () => {
    setIsSensing(true);
    setError(null);
    setStatusMsg(null);
    
    try {
      const response = await api.senseDisruptions();
      if (response.source === 'unavailable') {
        setError("Live check unavailable right now");
        setLastSenseMatches(null);
        return;
      }
      
      setLastSenseMatches(response.matches);

      if (response.matches_found === 0) {
        setStatusMsg("No new disruption events found in the last check");
      } else {
        setStatusMsg(
          response.source === 'cached'
            ? `Showing results from last successful check at ${new Date(response.cached_at!).toLocaleTimeString()}`
            : `Sensed ${response.matches_found} live events`
        );
        window.dispatchEvent(new Event('disruption-simulated'));
      }
      
      setTimeout(() => setStatusMsg(null), 6000);
    } catch (err: any) {
      setError("Live check unavailable right now");
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsSensing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {error && (
        <span className="flex items-center gap-1.5 text-xs text-[var(--color-danger)] font-medium bg-red-50 px-2.5 py-1.5 rounded border border-red-100">
          <AlertCircle size={12} />
          {error}
        </span>
      )}
      {statusMsg && (
        <span className="text-xs text-gray-600 font-medium bg-gray-100 px-2.5 py-1.5 rounded border border-gray-200">
          {statusMsg}
        </span>
      )}
      <Button 
        variant="secondary" 
        onClick={handleSense} 
        disabled={isSensing}
        className="text-xs py-1.5 px-3 flex items-center"
      >
        {isSensing ? (
          <Loader2 size={14} className="mr-1.5 animate-spin" />
        ) : (
          <Activity size={14} className="mr-1.5 text-[var(--color-risk)]" />
        )}
        {isSensing ? 'Checking live news...' : 'Sense'}
      </Button>
    </div>
  );
};
