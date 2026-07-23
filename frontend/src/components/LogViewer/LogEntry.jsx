import React, { useState } from 'react';

export default function LogEntry({ index, entry, matchedFields }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-800 rounded bg-background/50 overflow-hidden font-mono text-xs">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-background/80 transition-colors"
      >
        <div className="flex items-center space-x-2.5">
          <span className="text-[10px] text-textMuted bg-gray-900 px-1.5 py-0.5 rounded">INDEX #{index}</span>
          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${entry.malicious ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'}`}>
            {entry.malicious ? 'MALICIOUS' : 'BENIGN'}
          </span>
          <span className="text-textSecondary truncate max-w-[200px] sm:max-w-[400px]">
            {entry.description || JSON.stringify(entry)}
          </span>
        </div>
        <span className="text-textMuted">{isOpen ? '▼' : '▲'}</span>
      </div>

      {isOpen && (
        <div className="border-t border-gray-800 p-3 bg-black/30 overflow-x-auto custom-scrollbar">
          <pre className="text-emerald-300/80 leading-relaxed text-[11px]">
            {JSON.stringify(entry, null, 2)}
          </pre>
          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-900">
            <span className="text-[10px] text-textMuted self-center mr-1">Matched Fields:</span>
            {matchedFields && matchedFields.map((field) => (
              <span key={field} className="text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded">
                {field}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
