import React from 'react';

export default function Leaderboard({ currentUserXp }) {
  const competitors = [
    { rank: 1, name: "blackperl_DFIR", xp: 950, badge: "Threat Hunter" },
    { rank: 2, name: "cyber_sentinel", xp: 850, badge: "Detection Eng" },
    { rank: 3, name: "shadow_hunter", xp: 750, badge: "Threat Hunter" },
    { rank: 4, name: "rule_smith", xp: 600, badge: "Senior Analyst" },
    { rank: 5, name: "user_you", xp: currentUserXp, badge: "You", isSelf: true },
    { rank: 6, name: "blue_team_ninja", xp: 350, badge: "SOC Analyst" },
    { rank: 7, name: "packet_sniffer", xp: 200, badge: "Junior Analyst" },
    { rank: 8, name: "threat_intel_dev", xp: 150, badge: "Junior Analyst" },
    { rank: 9, name: "log_reader", xp: 100, badge: "Junior Analyst" },
    { rank: 10, name: "sigma_noob", xp: 50, badge: "Junior Analyst" }
  ];

  // Re-sort competitors based on user XP updates
  const sortedCompetitors = [...competitors].sort((a, b) => b.xp - a.xp);

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-4 font-mono text-xs flex flex-col h-full glow-border">
      <span className="text-textSecondary uppercase font-bold text-[10px] block mb-3 pb-2 border-b border-gray-800">
        WEEKLY LEADERBOARD (XP SHARDS)
      </span>

      <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[250px] custom-scrollbar pr-1">
        {sortedCompetitors.map((c, idx) => (
          <div 
            key={idx}
            className={`flex items-center justify-between p-2 rounded transition-colors ${c.isSelf ? 'bg-primary/10 border border-primary/30 text-primary shadow-[0_0_8px_rgba(0,255,106,0.15)] glow-text' : 'bg-background/40 hover:bg-background/80 border border-transparent'}`}
          >
            <div className="flex items-center space-x-3">
              <span className={`w-5 text-center font-bold font-mono ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-textMuted'}`}>
                #{idx + 1}
              </span>
              <span className="font-semibold">{c.name}</span>
              <span className="text-[9px] text-textMuted font-mono">({c.badge})</span>
            </div>
            <span className="font-bold text-secondary font-mono">{c.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}
