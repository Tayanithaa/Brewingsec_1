import React from 'react';

export default function ChallengeConcept({ challenge, onContinue, onSkip }) {
  if (!challenge) return null;

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-5 flex flex-col h-full font-mono text-xs glow-border max-w-2xl mx-auto">
      <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-primary text-lg">📖</span>
          <span className="font-bold text-textPrimary text-sm uppercase tracking-wider">{challenge.title}</span>
        </div>
        <span className="text-[10px] text-textMuted bg-background px-2 py-0.5 rounded">
          {challenge.attack_type}
        </span>
      </div>

      <div className="space-y-3 flex-1">
        <span className="text-textMuted uppercase block font-bold text-[10px]">Concept Briefing</span>
        <p className="text-textSecondary leading-relaxed text-[12px]">
          {challenge.lesson}
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-800">
        <button
          onClick={onSkip}
          className="text-textMuted hover:text-textSecondary text-[10px] underline transition-colors"
        >
          Skip intro
        </button>
        <button
          onClick={onContinue}
          className="bg-primary text-black font-bold text-xs px-6 py-2 rounded hover:shadow-cyber transition-all duration-300 active:scale-95 border border-primary"
        >
          CONTINUE TO QUIZ
        </button>
      </div>
    </div>
  );
}
