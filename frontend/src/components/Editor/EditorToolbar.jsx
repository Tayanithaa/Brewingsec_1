import React from 'react';

export default function EditorToolbar({ onRun, onValidate, onTranspile, targets, selectedTarget, onTargetChange, isRunning }) {
  return (
    <div className="flex flex-wrap items-center justify-between bg-surface border border-gray-800 rounded-lg p-3 gap-3">
      <div className="flex items-center space-x-2">
        <button
          onClick={onValidate}
          className="bg-transparent hover:bg-emerald-500/10 text-primary border border-primary hover:shadow-cyber text-xs font-semibold px-3 py-1.5 rounded transition-all duration-300"
        >
          VALIDATE
        </button>
        <button
          onClick={onRun}
          disabled={isRunning}
          className="bg-primary text-black hover:bg-primary-hover font-bold text-xs px-4 py-1.5 rounded hover:shadow-cyber transition-all duration-300 active:scale-95 disabled:opacity-50"
        >
          {isRunning ? "RUNNING..." : "RUN RULE"}
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <select
          value={selectedTarget}
          onChange={(e) => onTargetChange(e.target.value)}
          className="bg-background border border-gray-700 text-xs font-mono text-textSecondary px-2.5 py-1.5 rounded outline-none focus:border-primary transition-all duration-300"
        >
          {targets.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          onClick={onTranspile}
          className="bg-transparent hover:bg-secondary/10 text-secondary border border-secondary text-xs font-semibold px-3 py-1.5 rounded transition-all duration-300"
        >
          CONVERT
        </button>
      </div>
    </div>
  );
}
