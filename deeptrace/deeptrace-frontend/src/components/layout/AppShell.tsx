import React from 'react';
import { TopBar } from './TopBar';
import { SupplyGraph } from '../graph/SupplyGraph';
import { NodeDetailPanel } from '../graph/NodeDetailPanel';
import { AlertBanner } from '../disruption/AlertBanner';
import { ChatPanel } from '../chat/ChatPanel';
import { RiskPanel } from '../risks/RiskPanel';
import { RiskHeadline } from '../analytics/RiskHeadline';

export const AppShell: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-bg)]">
      <TopBar />
      <RiskHeadline />
      <AlertBanner />
      
      <main className="flex-grow flex relative overflow-hidden">
        {/* Left Column: Chat */}
        <div className="w-[320px] shrink-0 border-r border-[var(--color-border)] bg-white flex flex-col z-10">
          <ChatPanel />
        </div>

        {/* Center Column: Graph */}
        <div className="flex-grow relative z-0">
          <SupplyGraph />
          <NodeDetailPanel />
        </div>

        {/* Right Column: Risks */}
        <div className="w-[360px] shrink-0 border-l border-[var(--color-border)] bg-white flex flex-col z-10">
          <RiskPanel />
        </div>
      </main>
    </div>
  );
};
