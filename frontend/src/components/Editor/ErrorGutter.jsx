import React from 'react';

export default function ErrorGutter({ errors }) {
  if (!errors || errors.length === 0) {
    return (
      <div className="bg-surface border border-gray-800 rounded-lg p-4 h-full flex flex-col items-center justify-center glow-border">
        <span className="text-emerald-400/90 text-sm font-semibold tracking-wider font-mono glow-text">STATUS: VALID</span>
        <p className="text-xs text-textSecondary mt-1 text-center font-mono">No syntactic or structural rules errors detected.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-red-500/20 rounded-lg p-4 h-full flex flex-col glow-border hover:border-red-500/40">
      <span className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5 [text-shadow:0_0_8px_rgba(239,68,68,0.4)]">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
        VALIDATION REPORT: {errors.length} ERROR(S)
      </span>
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[150px] custom-scrollbar pr-1">
        {errors.map((err, idx) => (
          <div key={idx} className="bg-red-950/20 border border-red-500/10 rounded p-2.5 font-mono text-xs text-red-300 animate-flicker">
            <span className="text-red-400 font-semibold block mb-0.5">LINE {err.line}</span>
            <p className="text-[11px] leading-relaxed">{err.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
