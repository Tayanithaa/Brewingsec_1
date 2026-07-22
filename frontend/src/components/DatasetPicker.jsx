import React from 'react';

export default function DatasetPicker({ datasets, selectedDataset, onDatasetChange }) {
  return (
    <div className="flex flex-col bg-surface border border-gray-800 rounded-lg p-4 font-mono text-xs">
      <span className="text-textSecondary uppercase font-bold text-[10px] block mb-2">TARGET LOG DATASET</span>
      <select
        value={selectedDataset}
        onChange={(e) => onDatasetChange(e.target.value)}
        className="w-full bg-background border border-gray-700 text-xs font-semibold text-textPrimary px-3 py-2 rounded outline-none focus:border-primary focus:shadow-cyber transition-all duration-300"
      >
        {datasets && datasets.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.entry_count} logs)
          </option>
        ))}
      </select>
      {selectedDataset && datasets && (
        <p className="text-[10px] text-textMuted mt-2 leading-relaxed">
          {datasets.find((d) => d.id === selectedDataset)?.description}
        </p>
      )}
    </div>
  );
}
