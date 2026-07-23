import React from 'react';

export default function AttackTechniqueBadge({ code }) {
  if (!code) return null;

  return (
    <a 
      href={`https://attack.mitre.org/techniques/${code.split('.')[0]}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center space-x-1 bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] px-2 py-0.5 rounded hover:bg-red-500/20 transition-all duration-300"
    >
      <span>🛡️ MITRE ATT&CK:</span>
      <span className="font-bold">{code}</span>
    </a>
  );
}
