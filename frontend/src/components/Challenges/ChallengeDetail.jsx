import React from 'react';

const OBJECTIVE_BY_ID = {
  ch_001: "PWNDORA's SOC has flagged unusual authentication activity across the environment. Not every unusual logon is an attack — some of what you'll see is legitimate legacy infrastructure. Your rule needs to isolate the real technique without flagging the noise.",
  ch_002: "A persistence foothold was planted using the Windows Task Scheduler. Task creation happens constantly for legitimate reasons — your job is to separate the malicious task from routine maintenance automation.",
  ch_003: "Something on this host is reading memory it shouldn't be able to read. Security tooling reads that same memory space too, for legitimate reasons — your rule needs to catch only the unauthorized access.",
  ch_004: "A PowerShell process executed with its payload deliberately obscured from casual review. PowerShell is used constantly for legitimate administration — the obfuscation itself is the signal you're after.",
  ch_005: "Web traffic includes attempts to manipulate a backend database through crafted input. Real user traffic and attack traffic both hit the same endpoints — the payload shape is what separates them.",
};

export default function ChallengeDetail({ challenge, onBack, onUnlockHint, activeHintsCount, userXp }) {
  if (!challenge) return null;

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-4 flex flex-col h-full font-mono text-xs glow-border">
      <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
        <div className="flex items-center space-x-2">
          <button onClick={onBack} className="text-primary hover:underline font-bold mr-1">&lt; BACK</button>
          <span className="font-bold text-textPrimary text-sm uppercase tracking-wider">{challenge.title}</span>
        </div>
        <span className="text-[10px] text-textMuted bg-background px-2 py-0.5 rounded">
          {challenge.attack_type}
        </span>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[350px]">
        <div>
          <span className="text-textMuted uppercase block mb-1 font-bold text-[10px]">Scenario</span>
          <p className="text-textSecondary leading-relaxed text-[11px]">
            {OBJECTIVE_BY_ID[challenge.id] || `Compose a Sigma rule targeting technique ${challenge.attack_type} inside the ${challenge.dataset} dataset. Aim for high precision and recall while minimizing false positives.`}
          </p>
        </div>

        <div>
          <span className="text-textMuted uppercase block mb-1 font-bold text-[10px]">Dataset</span>
          <div className="bg-background/50 border border-gray-800/80 rounded p-2 text-textSecondary text-[11px] leading-relaxed">
            Search the <span className="text-secondary">{challenge.dataset}</span> log dataset. Use the Sandbox to run your rule against it before submitting — precision and recall are calculated live from your actual matches.
          </div>
        </div>

        <div className="border-t border-gray-800 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-textMuted uppercase font-bold text-[10px]">Hints System (-5 XP per hint)</span>
            <span className="text-[10px] text-textMuted">Unlocked: {activeHintsCount} / {challenge.hints.length}</span>
          </div>

          <div className="space-y-2">
            {challenge.hints.map((hint, idx) => {
              const isUnlocked = idx < activeHintsCount;
              return (
                <div key={idx} className="bg-background/40 border border-gray-800 rounded p-2.5">
                  {isUnlocked ? (
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold block mb-1">HINT #{idx + 1}</span>
                      <p className="text-textSecondary text-[11px] leading-relaxed">{hint}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-textMuted font-mono text-[11px]">Hint #{idx + 1} is locked</span>
                      <button 
                        onClick={() => onUnlockHint(idx)}
                        disabled={userXp < 5}
                        className="bg-secondary text-black font-bold text-[9px] px-2 py-1 rounded hover:shadow-[0_0_8px_rgba(0,240,255,0.4)] disabled:opacity-50 transition-all duration-300"
                      >
                        UNLOCK
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
