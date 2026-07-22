import React from 'react';

export default function StatsBar({ matchCount, totalEntries, fpRateEstimate, precision, recall }) {
  const percentage = (val) => `${Math.round((val || 0) * 100)}%`;

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-background/40 border border-gray-800/80 rounded p-3 text-center">
        <span className="block font-mono text-[10px] text-textMuted uppercase tracking-wider">Matches</span>
        <span className="block font-mono text-xl font-bold text-textPrimary mt-1">{matchCount || 0}</span>
      </div>
      <div className="bg-background/40 border border-gray-800/80 rounded p-3 text-center">
        <span className="block font-mono text-[10px] text-textMuted uppercase tracking-wider">FP Rate</span>
        <span className="block font-mono text-xl font-bold text-red-400 mt-1">{percentage(fpRateEstimate)}</span>
      </div>
      <div className="bg-background/40 border border-gray-800/80 rounded p-3 text-center">
        <span className="block font-mono text-[10px] text-textMuted uppercase tracking-wider">Precision</span>
        <span className="block font-mono text-xl font-bold text-emerald-400 mt-1">{precision !== undefined ? percentage(precision) : 'N/A'}</span>
      </div>
      <div className="bg-background/40 border border-gray-800/80 rounded p-3 text-center">
        <span className="block font-mono text-[10px] text-textMuted uppercase tracking-wider">Recall</span>
        <span className="block font-mono text-xl font-bold text-secondary mt-1">{recall !== undefined ? percentage(recall) : 'N/A'}</span>
      </div>
    </div>
  );
}
