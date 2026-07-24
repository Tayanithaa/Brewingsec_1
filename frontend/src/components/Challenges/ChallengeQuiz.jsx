import React, { useState } from 'react';

export default function ChallengeQuiz({ challenge, onContinue, onContinueText }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [scores, setScores] = useState({});

  if (!challenge) return null;
  const quiz = challenge.quiz || [];
  const currentQ = quiz[currentIdx];

  if (!currentQ) {
    return null;
  }

  const handleSelect = (optIdx) => {
    if (isChecked) return;
    setSelectedOpt(optIdx);
  };

  const handleCheckAnswer = () => {
    if (selectedOpt === null || isChecked) return;
    setIsChecked(true);
    const isCorrect = selectedOpt === currentQ.correct_index;
    setScores(prev => ({ ...prev, [currentIdx]: isCorrect }));
  };

  const handleNext = () => {
    if (currentIdx < quiz.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOpt(null);
      setIsChecked(false);
    } else {
      onContinue();
    }
  };

  const isCorrect = selectedOpt === currentQ.correct_index;

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-6 flex flex-col font-mono text-xs glow-border max-w-2xl mx-auto shadow-2xl my-auto">
      <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-5">
        <div className="flex items-center space-x-2">
          <span className="text-secondary text-lg">❓</span>
          <span className="font-bold text-textPrimary text-sm uppercase tracking-wider">
            Knowledge Check — Question {currentIdx + 1} of {quiz.length}
          </span>
        </div>
        <div className="flex space-x-1.5">
          {quiz.map((_, idx) => {
            let badgeBg = 'bg-gray-800 text-gray-500';
            if (scores[idx] === true) badgeBg = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
            else if (scores[idx] === false) badgeBg = 'bg-red-500/20 text-red-400 border border-red-500/40';
            else if (idx === currentIdx) badgeBg = 'bg-primary/20 text-primary border border-primary/40';

            return (
              <span key={idx} className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${badgeBg}`}>
                {idx + 1}
              </span>
            );
          })}
        </div>
      </div>

      <div className="space-y-5 flex-1 pr-1 custom-scrollbar">
        <p className="text-textPrimary text-sm leading-relaxed font-semibold">
          {currentQ.question}
        </p>

        <div className="space-y-2">
          {currentQ.options.map((opt, optIdx) => {
            const isSelected = selectedOpt === optIdx;
            const isCorrectOpt = optIdx === currentQ.correct_index;

            let stateClasses = 'border-gray-800 hover:border-gray-600 bg-background/40 text-textSecondary';
            if (isChecked) {
              if (isCorrectOpt) {
                stateClasses = 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.2)]';
              } else if (isSelected && !isCorrectOpt) {
                stateClasses = 'border-red-500 bg-red-500/15 text-red-300 font-semibold';
              } else {
                stateClasses = 'border-gray-850 opacity-50 bg-background/20 text-textMuted';
              }
            } else if (isSelected) {
              stateClasses = 'border-primary bg-primary/10 text-primary font-semibold shadow-[0_0_10px_rgba(0,255,106,0.15)]';
            }

            return (
              <button
                key={optIdx}
                onClick={() => handleSelect(optIdx)}
                disabled={isChecked}
                className={`w-full text-left px-4 py-3 rounded-lg border text-xs leading-relaxed transition-all duration-200 ${stateClasses} ${isChecked ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-start space-x-3">
                  <span className="font-mono font-bold text-[10px] opacity-70 mt-0.5">
                    {String.fromCharCode(65 + optIdx)}.
                  </span>
                  <span className="flex-1">{opt}</span>
                  {isChecked && isCorrectOpt && (
                    <span className="text-emerald-400 font-bold text-xs">✓ Correct</span>
                  )}
                  {isChecked && isSelected && !isCorrectOpt && (
                    <span className="text-red-400 font-bold text-xs">✗ Selected</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {isChecked && (
          <div className={`p-4 rounded-lg border leading-relaxed text-xs space-y-2 animate-fadeIn ${
            isCorrect ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-red-950/40 border-red-500/40 text-red-200'
          }`}>
            <div className="flex items-center space-x-2 font-bold text-sm">
              <span>{isCorrect ? '✅ Correct!' : '❌ Incorrect'}</span>
            </div>
            {!isCorrect && (
              <p className="font-mono text-[11px] text-textSecondary">
                Correct Answer: <span className="text-emerald-400 font-bold">{currentQ.options[currentQ.correct_index]}</span>
              </p>
            )}
            <div className="pt-2 border-t border-gray-800 text-[11px] text-textSecondary space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] block text-textMuted">TECHNICAL EXPLANATION:</span>
              <p>{currentQ.explanation}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-5 mt-6 border-t border-gray-800">
        <span className="text-[10px] text-textMuted font-mono">
          Question {currentIdx + 1} of {quiz.length}
        </span>

        {!isChecked ? (
          <button
            onClick={handleCheckAnswer}
            disabled={selectedOpt === null}
            className="bg-secondary text-black font-bold text-xs px-6 py-2.5 rounded hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all duration-300 disabled:opacity-40 disabled:hover:shadow-none active:scale-95"
          >
            CHECK ANSWER
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="bg-primary text-black font-bold text-xs px-6 py-2.5 rounded hover:shadow-cyber transition-all duration-300 active:scale-95 border border-primary flex items-center space-x-2"
          >
            <span>{currentIdx < quiz.length - 1 ? 'NEXT QUESTION' : (onContinueText || 'CONTINUE TO LAB')}</span>
            <span>&rarr;</span>
          </button>
        )}
      </div>
    </div>
  );
}
