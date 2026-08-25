import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  icon?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, icon = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Simple position adjustment if it goes off screen
  useEffect(() => {
    if (isVisible && tooltipRef.current && containerRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        tooltipRef.current.style.left = 'auto';
        tooltipRef.current.style.right = '0';
        tooltipRef.current.style.transform = 'none';
      }
    }
  }, [isVisible]);

  return (
    <div 
      className="relative inline-flex items-center justify-center cursor-help"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      ref={containerRef}
    >
      {children ? (
        <span className="border-b border-dotted border-gray-400">
          {children}
        </span>
      ) : icon ? (
        <HelpCircle size={14} className="text-gray-400 hover:text-gray-600 inline-block ml-1" />
      ) : null}

      {isVisible && (
        <div 
          ref={tooltipRef}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-gray-900 text-white text-xs rounded shadow-lg font-normal text-left leading-relaxed"
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};
