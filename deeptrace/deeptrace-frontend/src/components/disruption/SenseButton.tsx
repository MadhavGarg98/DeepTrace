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
      if (response.status === 'unavailable') {
        setError("Couldn't reach any live data source right now — try again shortly.");
        setLastSenseMatches(null);
        return;
      }
      
      setLastSenseMatches(response.matches);

      if (response.status === 'cached') {
        setStatusMsg(
          <span className="flex items-start gap-1.5 text-amber-700">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>Showing last known check from {new Date(response.fetched_at).toLocaleTimeString()} — live sources are unreachable right now.</span>
          </span>
        );
      } else {
        // status === 'ok'
        if (response.matches_found === 0) {
          setStatusMsg("No live disruptions currently affecting your supply chain.");
        } else {
          setStatusMsg(`Sensed ${response.matches_found} live events ${response.provider_used ? `via ${response.provider_used}` : ''}`);
          window.dispatchEvent(new Event('disruption-simulated'));
        }
      }
      
      setTimeout(() => setStatusMsg(null), 8000);
    } catch (err: any) {
      setError("Couldn't reach any live data source right now — try again shortly.");
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsSensing(false);
    }
  };

  return (
    <div className="flex items-center relative">
      {error && (
        <span 
          title={error}
          className="absolute top-full mt-3 right-0 flex items-center gap-1.5 text-xs text-[var(--color-danger)] font-medium bg-red-50 px-3 py-2 rounded border border-red-100 max-w-[300px] shadow-sm z-50"
        >
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </span>
      )}
      {statusMsg && (
        <span 
          title={typeof statusMsg === 'string' ? statusMsg : undefined}
          className="absolute top-full mt-3 right-0 flex items-center text-xs text-gray-700 font-medium bg-gray-50 px-3 py-2 rounded border border-gray-200 max-w-[300px] shadow-sm z-50 whitespace-normal"
        >
          <span>{statusMsg}</span>
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
        {isSensing ? 'Checking live news...' : 'Scan Live News'}
      </Button>
    </div>
  );
};
