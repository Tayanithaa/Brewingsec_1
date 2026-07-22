import React from 'react';
import LogEntry from './LogEntry.jsx';

export default function LogPanel({ matchedEntries, totalEntries, isRunning }) {
  if (isRunning) {
    return (
      <div className="bg-surface border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-3"></div>
        <span className="font-mono text-xs text-textSecondary uppercase tracking-widest">Querying matching logs...</span>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-4 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-textSecondary">
          MATCHED RECORDS: {matchedEntries ? matchedEntries.length : 0} / {totalEntries}
        </span>
        <span className="text-[10px] font-mono text-textMuted bg-background px-2 py-0.5 rounded">
          LIVE LOG CONSOLE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] custom-scrollbar pr-1">
        {matchedEntries && matchedEntries.length > 0 ? (
          matchedEntries.map((m, idx) => (
            <LogEntry key={idx} index={m.index} entry={m.entry} matchedFields={m.matched_fields} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="font-mono text-xs text-textMuted uppercase tracking-widest">Console Empty</span>
            <p className="text-[11px] text-textMuted mt-1 max-w-[250px] font-mono">No matching records found. Refine your detection query parameters and run again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
