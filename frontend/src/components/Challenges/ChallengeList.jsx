import React from 'react';

export default function ChallengeList({ challenges, onSelectChallenge, completedChallenges }) {
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
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-primary glow-text">
          DETECTION CHALLENGES (T-05 SODE)
        </h2>
        <span className="font-mono text-xs text-textSecondary">
          CHALLENGES PLAYABLE: {challenges.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {challenges.map((c) => {
          const isDone = completedChallenges.includes(c.id);
          return (
            <div 
              key={c.id}
              onClick={() => onSelectChallenge(c)}
              className="bg-surface border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-primary hover:shadow-cyber transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getDiffColor(c.difficulty)}`}>
                    {c.difficulty}
                  </span>
                  <span className="text-[10px] font-mono text-textMuted bg-background px-1.5 py-0.5 rounded">
                    {c.attack_type}
                  </span>
                </div>
                <h3 className="font-sans font-semibold text-sm text-textPrimary mb-1 hover:text-primary transition-colors">
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
                {isDone ? (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    COMPLETE
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-textSecondary bg-background border border-gray-800 px-2 py-0.5 rounded hover:bg-primary hover:text-black transition-colors duration-300">
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
