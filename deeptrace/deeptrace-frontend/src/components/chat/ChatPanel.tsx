import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { api } from '../../api/client';

import { Bot, Sparkles } from 'lucide-react';

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

  useEffect(() => {
    const handleCustomChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail === 'string') {
        handleSend(customEvent.detail);
      }
    };
    const handleAdvisorReply = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail === 'string') {
        addChatMessage({
          id: Date.now().toString(),
          sender: 'agent',
          text: customEvent.detail
        });
      }
    };
    window.addEventListener('send-chat', handleCustomChat);
    window.addEventListener('advisor-reply', handleAdvisorReply);
    return () => {
      window.removeEventListener('send-chat', handleCustomChat);
      window.removeEventListener('advisor-reply', handleAdvisorReply);
    };
  }, []);

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
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)] bg-gradient-to-r from-white to-gray-50/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[var(--color-tier1-bg)] flex items-center justify-center">
            <Sparkles size={12} className="text-[var(--color-tier1)]" />
          </div>
          <h2 className="text-xs font-medium uppercase tracking-panel-header text-[var(--color-text-secondary)]">
            Risk Advisor
          </h2>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Online
          </span>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-grow p-4 overflow-y-auto scroll-smooth" ref={scrollRef}>
        {chatHistory.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3 mb-5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-gray-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm ring-1 ring-[var(--color-border)]">
              <Bot size={15} className="text-[var(--color-text-secondary)]" />
            </div>
            <div className="bg-white border border-[var(--color-border)] rounded-xl p-3.5 shadow-sm flex items-center gap-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[var(--color-tier1)] rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-[var(--color-tier1)] rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-[var(--color-tier1)] rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">Analyzing graph...</span>
            </div>
          </div>
        )}
      </div>

      <ChatInput onSend={handleSend} disabled={isTyping} />
    </div>
  );
};
