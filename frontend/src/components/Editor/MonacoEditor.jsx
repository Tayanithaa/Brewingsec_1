import React from 'react';

export default function MonacoEditor({ rule, onChange, errors }) {
  return (
    <div className="flex flex-col h-full bg-[#0a1410e6] rounded-lg border border-emerald-400/25 p-4 focus-within:shadow-cyber transition-all duration-300">
      <div className="flex items-center justify-between pb-2 border-b border-gray-800 mb-2">
        <span className="font-mono text-xs text-emerald-400 font-semibold tracking-wider">SIGMA_RULE.YAML</span>
        <div className="flex space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
        </div>
      </div>
      <div className="flex-1 relative font-mono text-sm">
        <textarea
          value={rule}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full bg-transparent text-emerald-300 outline-none resize-none font-mono custom-scrollbar p-2"
          placeholder="title: Suspicious Scheduled Task Creation
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4698
  condition: selection"
        />
        {errors && errors.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-950/90 border border-red-500/30 rounded p-2 text-xs text-red-400 font-mono">
            {errors.map((err, i) => (
              <div key={i}>Line {err.line}: {err.message}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
