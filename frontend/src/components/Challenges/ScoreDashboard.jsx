import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ScoreDashboard({ scoreResult }) {
  if (!scoreResult) {
    return (
      <div className="bg-surface border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center min-h-[200px] font-mono text-xs">
        <span className="text-textMuted uppercase tracking-wider">NO SCORING METRICS</span>
        <p className="text-[11px] text-textMuted mt-1 text-center max-w-[200px]">Submit your Sigma rule to calculate challenge scoring metrics.</p>
      </div>
    );
  }

  const data = [
    { name: 'Precision', value: Math.round((scoreResult.precision || 0) * 100) },
    { name: 'Recall', value: Math.round((scoreResult.recall || 0) * 100) },
    { name: 'FP Rate', value: Math.round((scoreResult.fp_rate || 0) * 100) },
  ];

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-4 flex flex-col h-full font-mono text-xs">
      <span className="text-textMuted uppercase tracking-wider block mb-3 font-bold text-[10px]">SCORING PERFORMANCE REPORT</span>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-background border border-gray-800 rounded p-3 text-center">
          <span className="text-[10px] text-textMuted uppercase block">Challenge Score</span>
          <span className={`text-2xl font-bold font-mono block mt-1 ${scoreResult.score >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>
            {scoreResult.score || 0} / 100
          </span>
          <span className="text-[9px] text-textMuted font-mono">
            {(scoreResult.score || 0) >= 70 ? 'PASS (Threshold: 70)' : 'FAILED (Threshold: 70)'}
          </span>
        </div>

        <div className="bg-background border border-gray-800 rounded p-3 text-center">
          <span className="text-[10px] text-textMuted uppercase block">XP Earned</span>
          <span className="text-2xl font-bold font-mono text-secondary block mt-1">
            +{scoreResult.xp_earned || 0} XP
          </span>
          <span className="text-[9px] text-textMuted font-mono">Awarded to Profile</span>
        </div>
      </div>

      <div className="h-[150px] w-full bg-background/30 rounded border border-gray-800/80 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" stroke="#637381" fontSize={9} />
            <YAxis stroke="#637381" fontSize={9} domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#13171b', borderColor: '#374151', color: '#f3f4f6', fontFamily: 'monospace', fontSize: 10 }} />
            <Bar dataKey="value" fill="#00ff6a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
