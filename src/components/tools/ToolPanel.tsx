'use client';

import React from 'react';

// ✅ Updated interface with title and children
interface ToolPanelProps {
  title: string;                    // ✅ Add title prop
  children?: React.ReactNode;       // ✅ Add children prop
  onClose?: () => void;
  className?: string;
}

export default function ToolPanel({ 
  title, 
  children, 
  onClose, 
  className = "" 
}: ToolPanelProps) {
  return (
    <div className={`bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
          🛠️ {title}
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-blue-200/70 hover:text-white text-2xl font-bold transition-colors duration-200 hover:bg-white/10 rounded-lg w-8 h-8 flex items-center justify-center"
            aria-label="Close tool"
          >
            ×
          </button>
        )}
      </div>
      
      {/* Content Area - Render Children */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}