import React from 'react';

const OBJECTIVE_BY_ID = {
  ch_001: "PWNDORA's SOC has flagged unusual authentication activity across the environment. Not every unusual logon is an attack — some of what you'll see is legitimate legacy infrastructure. Your rule needs to isolate the real technique without flagging the noise.",
  ch_002: "A persistence foothold was planted using the Windows Task Scheduler. Task creation happens constantly for legitimate reasons — your job is to separate the malicious task from routine maintenance automation.",
  ch_003: "Something on this host is reading memory it shouldn't be able to read. Security tooling reads that same memory space too, for legitimate reasons — your rule needs to catch only the unauthorized access.",
  ch_004: "A PowerShell process executed with its payload deliberately obscured from casual review. PowerShell is used constantly for legitimate administration — the obfuscation itself is the signal you're after.",
  ch_005: "Web traffic includes attempts to manipulate a backend database through crafted input. Real user traffic and attack traffic both hit the same endpoints — the payload shape is what separates them.",
  ch_006: "A new Windows service was installed with a binary path in user-writeable directories or invoking encoded PowerShell. Software updates and diagnostic services also create new services — your rule must isolate malicious persistence while ignoring benign automation.",
  ch_007: "An interactive desktop logon was detected for a service account. Service accounts routinely authenticate for background tasks and service logons, but interactive logons indicate credential abuse unless tied to emergency breakglass or staging console procedures.",
};

const getDiffColor = (diff) => {
  switch (diff) {
    case 'Bronze': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    case 'Silver': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    case 'Gold': return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    default: return 'text-textSecondary border-gray-700 bg-gray-500/10';
  }
};

export default function ChallengePreview({ challenge, onStart, onBack }) {
  if (!challenge) return null;

  const description = OBJECTIVE_BY_ID[challenge.id] || `Analyze ${challenge.dataset} logs and write a rule to detect ${challenge.attack_type} with high precision and recall.`;

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-6 flex flex-col h-full font-mono text-xs glow-border max-w-2xl mx-auto my-auto shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-5">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack} 
            className="text-primary hover:underline font-bold text-xs flex items-center space-x-1"
          >
            <span>&lt;</span>
            <span>BACK</span>
          </button>
          <span className="font-sans font-bold text-textPrimary text-base uppercase tracking-wider glow-text-blue">
            {challenge.title}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getDiffColor(challenge.difficulty)}`}>
            {challenge.difficulty}
          </span>
          <span className="text-[10px] text-textMuted bg-background px-2 py-0.5 rounded border border-gray-800">
            {challenge.attack_type}
          </span>
        </div>
      </div>

      <div className="space-y-6 flex-1 pr-1 custom-scrollbar">
        <div>
          <span className="text-textMuted uppercase block mb-1.5 font-bold text-[10px] tracking-wider">CHALLENGE OVERVIEW</span>
          <p className="text-textSecondary leading-relaxed text-xs bg-background/40 p-4 rounded border border-gray-800 font-mono">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background/40 border border-gray-800 rounded p-3">
            <span className="text-textMuted uppercase block mb-1 font-bold text-[9px]">TARGET DATASET</span>
            <span className="text-secondary font-bold text-xs font-mono">{challenge.dataset}</span>
          </div>
          <div className="bg-background/40 border border-gray-800 rounded p-3">
            <span className="text-textMuted uppercase block mb-1 font-bold text-[9px]">XP REWARD</span>
            <span className="text-emerald-400 font-bold text-xs font-mono">+{challenge.xp_reward} XP</span>
          </div>
        </div>

        <div className="bg-surface/80 border border-emerald-500/20 rounded p-4 text-[11px] text-textSecondary leading-relaxed">
          <span className="text-primary font-bold block mb-1">📋 CHALLENGE PATHWAY:</span>
          <span>1. Concept Lesson &rarr; 2. Knowledge Check Quiz &rarr; 3. Timed Lab & Verification</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-5 mt-6 border-t border-gray-800">
        <button
          onClick={onBack}
          className="text-textMuted hover:text-textSecondary text-xs transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onStart}
          className="bg-primary text-black font-bold text-xs px-8 py-3 rounded hover:shadow-cyber transition-all duration-300 active:scale-95 border border-primary flex items-center space-x-2"
        >
          <span>START CHALLENGE</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
}
