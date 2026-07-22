import React from 'react';

export default function ChallengeDetail({ challenge, onBack, onUnlockHint, activeHintsCount, userXp }) {
  if (!challenge) return null;

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-4 flex flex-col h-full font-mono text-xs">
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
          <span className="text-textMuted uppercase block mb-1 font-bold text-[10px]">Objective</span>
          <p className="text-textSecondary leading-relaxed text-[11px]">
            Compose a Sigma detection rule mapping events inside the <span className="text-secondary">{challenge.dataset}</span> database logs. The rule should target behaviors of technique <span className="text-secondary">{challenge.attack_type}</span> with high precision and recall while minimizing false positive alerts.
          </p>
        </div>

        <div>
          <span className="text-textMuted uppercase block mb-1 font-bold text-[10px]">Target Specifications</span>
          <div className="bg-background/50 border border-gray-800/80 rounded p-2 text-textSecondary text-[11px] leading-relaxed">
            {challenge.id === "ch_001" && "Find EventID 4624 network logins using NTLM NtLmSsp authentication package details."}
            {challenge.id === "ch_002" && "Find EventID 4698 scheduled tasks running Powershell/Cmd from Temp locations or via base64 encoded scripts."}
            {challenge.id === "ch_003" && "Find Sysmon EventID 10 target access to lsass.exe containing GrantedAccess code 0x1010."}
            {challenge.id === "ch_004" && "Find Sysmon EventID 1 processes executing powershell.exe containing -enc base64 parameters."}
            {challenge.id === "ch_005" && "Find web log query parameters pointing to SQL Injection (UNION SELECT, OR 1=1, SQL comment --)."}
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
