import React from 'react';

const BADGE_BY_RANK = (rank) => {
  if (rank === 1) return 'Threat Hunter';
  if (rank <= 3) return 'Detection Eng';
  if (rank <= 6) return 'Senior Analyst';
  return 'SOC Analyst';
};

export default function Leaderboard({ entries, currentUserId }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="bg-surface border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center min-h-[200px] font-mono text-xs glow-border">
        <span className="text-textMuted uppercase tracking-wider">NO SUBMISSIONS YET</span>
        <p className="text-[11px] text-textMuted mt-1 text-center max-w-[220px]">
          Complete a challenge to appear on the leaderboard. Rankings update live from real submissions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-4 font-mono text-xs flex flex-col h-full glow-border">
      <span className="text-textSecondary uppercase font-bold text-[10px] block mb-3 pb-2 border-b border-gray-800">
        LIVE LEADERBOARD (REAL XP)
      </span>

      <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[250px] custom-scrollbar pr-1">
        {entries.map((e) => {
          const isSelf = e.user_id === currentUserId;
          return (
            <div
              key={e.user_id}
              className={`flex items-center justify-between p-2 rounded transition-colors ${isSelf ? 'bg-primary/10 border border-primary/30 text-primary shadow-[0_0_8px_rgba(0,255,106,0.15)] glow-text' : 'bg-background/40 hover:bg-background/80 border border-transparent'}`}
            >
              <div className="flex items-center space-x-3">
                <span className={`w-5 text-center font-bold font-mono ${e.rank === 1 ? 'text-yellow-400' : e.rank === 2 ? 'text-gray-300' : e.rank === 3 ? 'text-amber-600' : 'text-textMuted'}`}>
                  #{e.rank}
                </span>
                <span className="font-semibold">{isSelf ? `${e.user_id} (you)` : e.user_id}</span>
                <span className="text-[9px] text-textMuted font-mono">({BADGE_BY_RANK(e.rank)})</span>
              </div>
              <span className="font-bold text-secondary font-mono">{e.total_xp} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
