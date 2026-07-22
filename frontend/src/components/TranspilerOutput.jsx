import React from 'react';

export default function TranspilerOutput({ query, targetName }) {
  if (!query) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(query);
    // Silent feedback or inline toast is better, we will render a simple alert for now
    alert(`${targetName} query copied to clipboard!`);
  };

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-4 flex flex-col font-mono text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-gray-800 mb-2">
        <span className="text-secondary font-bold uppercase tracking-wider text-[10px]">
          TRANSPILER OUTPUT ({targetName})
        </span>
        <button 
          onClick={copyToClipboard}
          className="text-textSecondary hover:text-primary transition-colors text-[10px] font-bold"
        >
          [COPY]
        </button>
      </div>
      <div className="bg-background border border-gray-900 rounded p-3 overflow-x-auto custom-scrollbar">
        <pre className="text-emerald-300 text-[11px] whitespace-pre-wrap">{query}</pre>
      </div>
    </div>
  );
}
