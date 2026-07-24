import React from 'react';

export default function ChallengeList({ challenges, onSelectChallenge, completedChallenges, onReviewBasics }) {
  const getDiffColor = (diff) => {
    switch (diff) {
      case 'Bronze': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'Silver': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'Gold': return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
      default: return 'text-textSecondary border-gray-700 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-800 flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-primary glow-text">
            DETECTION CHALLENGES (T-05 SODE)
          </h2>
          {onReviewBasics && (
            <button
              onClick={onReviewBasics}
              className="text-[11px] font-mono text-secondary hover:text-white bg-secondary/10 hover:bg-secondary/20 border border-secondary/40 px-2.5 py-1 rounded transition-all duration-200 flex items-center space-x-1"
            >
              <span>📖</span>
              <span>Review Sigma Basics</span>
            </button>
          )}
        </div>
        <span className="font-mono text-xs text-textSecondary">
          CHALLENGES PLAYABLE: {challenges.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {challenges.map((c, idx) => {
          const isDone = completedChallenges.includes(c.id);
          // A challenge is locked if it's not the first one, and the previous one hasn't been completed.
          const isLocked = idx > 0 && !completedChallenges.includes(challenges[idx - 1].id);
          
          return (
            <div 
              key={c.id}
              onClick={() => { if (!isLocked) onSelectChallenge(c); }}
              className={`bg-surface border border-gray-800 rounded-lg p-4 flex flex-col justify-between transition-all duration-300 animate-float ${
                isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:scale-[1.02] glow-border'
              }`}
              style={{ animationDelay: `${idx * 0.4}s` }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getDiffColor(c.difficulty)}`}>
                    {c.difficulty}
                  </span>
                  <span className="text-[10px] font-mono text-textMuted bg-background px-1.5 py-0.5 rounded border border-gray-850">
                    {c.attack_type}
                  </span>
                </div>
                <h3 className="font-sans font-bold text-sm text-textPrimary mb-1 hover:text-primary transition-colors uppercase tracking-wider glow-text-blue">
                  {c.title}
                </h3>
                <p className="text-xs text-textSecondary line-clamp-2 mb-4 font-mono leading-relaxed">
                  Analyze {c.dataset} logs and write a rule to detect this technique with high precision and recall.
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-gray-900 pt-3 mt-auto">
                <span className="text-xs text-textMuted font-mono">
                  XP Reward: <span className="text-secondary font-bold font-mono">{c.xp_reward} XP</span>
                </span>
                {isLocked ? (
                  <span className="text-[10px] font-mono text-gray-500 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded flex items-center space-x-1">
                    <span>🔒 LOCKED</span>
                  </span>
                ) : isDone ? (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    COMPLETE
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-textSecondary bg-background border border-gray-800 px-2 py-0.5 rounded hover:bg-primary hover:text-black hover:shadow-cyber transition-all duration-300">
                    START LAB
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
