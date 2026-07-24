import React, { useState } from 'react';

export default function ChallengeQuiz({ challenge, onContinue }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!challenge) return null;
  const quiz = challenge.quiz || [];

  const handleSelect = (qIdx, optIdx) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmit = () => setSubmitted(true);

  const correctCount = quiz.reduce(
    (acc, q, idx) => acc + (answers[idx] === q.correct_index ? 1 : 0),
    0
  );

  return (
    <div className="bg-surface border border-gray-800 rounded-lg p-5 flex flex-col h-full font-mono text-xs glow-border max-w-2xl mx-auto">
      <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-secondary text-lg">❓</span>
          <span className="font-bold text-textPrimary text-sm uppercase tracking-wider">Knowledge Check</span>
        </div>
        {submitted && (
          <span className="text-[10px] text-textMuted bg-background px-2 py-0.5 rounded">
            {correctCount} / {quiz.length} correct
          </span>
        )}
      </div>

      <div className="space-y-5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {quiz.map((q, qIdx) => (
          <div key={qIdx} className="space-y-2">
            <p className="text-textPrimary text-[12px] leading-relaxed font-semibold">
              {qIdx + 1}. {q.question}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt, optIdx) => {
                const isSelected = answers[qIdx] === optIdx;
                const isCorrectOpt = optIdx === q.correct_index;

                let stateClasses = 'border-gray-800 hover:border-gray-600';
                if (submitted) {
                  if (isCorrectOpt) {
                    stateClasses = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400';
                  } else if (isSelected && !isCorrectOpt) {
                    stateClasses = 'border-red-500/60 bg-red-500/10 text-red-400';
                  }
                } else if (isSelected) {
                  stateClasses = 'border-primary bg-primary/10 text-primary';
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelect(qIdx, optIdx)}
                    disabled={submitted}
                    className={`w-full text-left px-3 py-2 rounded border text-[11px] leading-relaxed transition-all duration-200 text-textSecondary ${stateClasses} ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end pt-4 mt-4 border-t border-gray-800">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            className="bg-secondary text-black font-bold text-xs px-6 py-2 rounded hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all duration-300 active:scale-95"
          >
            SUBMIT QUIZ
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="bg-primary text-black font-bold text-xs px-6 py-2 rounded hover:shadow-cyber transition-all duration-300 active:scale-95 border border-primary"
          >
            CONTINUE TO LAB
          </button>
        )}
      </div>
    </div>
  );
}
