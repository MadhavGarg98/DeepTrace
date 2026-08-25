import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { api } from '../../api/client';
import { Spinner } from '../common/Button';

export const ChatPanel: React.FC = () => {
  const { chatHistory, addChatMessage, setActiveRiskId } = useStore();
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const initialized = useRef(false);

  // Initialize with greeting if empty
  useEffect(() => {
    if (chatHistory.length === 0 && !initialized.current) {
      initialized.current = true;
      addChatMessage({
        id: 'initial',
        sender: 'agent',
        text: "Hi Priya. I'm actively monitoring your supply chain graph. What would you like to know?"
      });
    }
  }, [chatHistory.length, addChatMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isTyping]);

  const handleSend = async (text: string) => {
    addChatMessage({
      id: Date.now().toString(),
      sender: 'user',
      text
    });
    
    setIsTyping(true);
    
    try {
      const response = await api.chat({ message: text });
      
      addChatMessage({
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: response.answer
      });
      
      if (response.top_risk) {
        setActiveRiskId(response.top_risk.id);
      }
      
    } catch (e) {
      console.error(e);
      addChatMessage({
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: "Sorry, I encountered an error while analyzing the graph.",
        isError: true
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-[var(--color-border)] bg-gray-50/50 shrink-0">
        <h2 className="text-xs font-medium uppercase tracking-panel-header text-[var(--color-text-secondary)]">Risk Advisor</h2>
      </div>
      
      <div className="flex-grow p-4 overflow-y-auto" ref={scrollRef}>
        {chatHistory.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <div className="flex gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-[var(--color-text-secondary)]">
              <Spinner className="w-4 h-4" />
            </div>
            <div className="bg-gray-50 border border-[var(--color-border)] rounded-[var(--radius-card)] p-3 text-sm text-[var(--color-text-secondary)] flex items-center">
              Analyzing graph...
            </div>
          </div>
        )}
      </div>

      <ChatInput onSend={handleSend} disabled={isTyping} />
    </div>
  );
};
