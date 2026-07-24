import React from 'react';

export default function EditorToolbar({ onRun, onTranspile, targets, selectedTarget, onTargetChange, isRunning, isConvertDisabled, isRunDisabled }) {
  return (
    <div className="flex flex-wrap items-center justify-between bg-surface border border-gray-800 rounded-lg p-3 gap-3 glow-border">
      <div className="flex items-center space-x-2">
        <button
          onClick={onRun}
          disabled={isRunning || isRunDisabled}
          className="bg-primary text-black hover:bg-primary-hover font-bold text-xs px-4 py-1.5 rounded hover:shadow-cyber transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
          disabled={isConvertDisabled}
          title={isConvertDisabled ? "Submit a rule attempt first to unlock conversion" : "Convert to SIEM Query"}
          className="bg-transparent hover:bg-secondary/10 text-secondary border border-secondary/50 hover:border-secondary hover:shadow-[0_0_15px_rgba(0,240,255,0.25)] text-xs font-semibold px-3 py-1.5 rounded transition-all duration-300 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-secondary/50 disabled:cursor-not-allowed"
        >
          CONVERT
        </button>
      </div>
    </div>
  );
}
