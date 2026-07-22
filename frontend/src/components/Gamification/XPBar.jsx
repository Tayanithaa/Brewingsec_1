import React from 'react';

export default function XPBar({ xp, nextMilestone }) {
  const progressPercent = Math.min(100, Math.round((xp / nextMilestone) * 100));

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-4 font-mono text-xs glow-border">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-textSecondary uppercase font-bold text-[10px]">XP PROGRESS TRACKER</span>
        <span className="text-secondary font-bold font-mono">{xp} / {nextMilestone} XP</span>
      </div>
      <div className="w-full bg-background border border-gray-800 rounded-full h-3 overflow-hidden p-0.5">
        <div 
          className="bg-secondary rounded-full h-full shadow-[0_0_8px_rgba(0,240,255,0.5)] transition-all duration-500 ease-out" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-[9px] text-textMuted mt-1">
        <span>LVL {Math.floor(xp / 200) + 1}</span>
        <span>{nextMilestone - xp} XP to Level Up</span>
      </div>
    </div>
  );
}
