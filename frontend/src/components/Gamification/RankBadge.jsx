import React from 'react';

export default function RankBadge({ xp }) {
  const getRank = (points) => {
    if (points >= 800) return { name: "Detection Engineer", color: "text-red-400 border-red-500/30 bg-red-500/10", tag: "SR-DE" };
    if (points >= 600) return { name: "Threat Hunter", color: "text-orange-400 border-orange-500/30 bg-orange-500/10", tag: "TH" };
    if (points >= 400) return { name: "Senior Analyst", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10", tag: "SR-SOC" };
    if (points >= 200) return { name: "SOC Analyst", color: "text-secondary border-secondary/30 bg-secondary/10", tag: "SOC" };
    return { name: "Junior Analyst", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", tag: "JR-SOC" };
  };

  const rank = getRank(xp);

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-4 font-mono text-xs flex items-center space-x-3.5">
      <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold text-sm tracking-tighter ${rank.color}`}>
        {rank.tag}
      </div>
      <div>
        <span className="text-[10px] text-textMuted uppercase font-bold block">Current Role Rank</span>
        <span className="text-textPrimary font-semibold text-sm tracking-wide block mt-0.5">{rank.name}</span>
      </div>
    </div>
  );
}
