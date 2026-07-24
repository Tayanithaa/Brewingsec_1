import React, { useState, useEffect, useCallback } from 'react';
import MonacoEditor from './components/Editor/MonacoEditor.jsx';
import EditorToolbar from './components/Editor/EditorToolbar.jsx';
import ErrorGutter from './components/Editor/ErrorGutter.jsx';
import LogPanel from './components/LogViewer/LogPanel.jsx';
import StatsBar from './components/LogViewer/StatsBar.jsx';
import ChallengeList from './components/Challenges/ChallengeList.jsx';
import ChallengePreview from './components/Challenges/ChallengePreview.jsx';
import ChallengeDetail from './components/Challenges/ChallengeDetail.jsx';
import ChallengeConcept from './components/Challenges/ChallengeConcept.jsx';
import ChallengeQuiz from './components/Challenges/ChallengeQuiz.jsx';
import ScoreDashboard from './components/Challenges/ScoreDashboard.jsx';
import XPBar from './components/Gamification/XPBar.jsx';
import RankBadge from './components/Gamification/RankBadge.jsx';
import Leaderboard from './components/Gamification/Leaderboard.jsx';
import DatasetPicker from './components/DatasetPicker.jsx';
import AttackTechniqueBadge from './components/AttackTechniqueBadge.jsx';
import TranspilerOutput from './components/TranspilerOutput.jsx';

import sigmaFundamentalsData from './data/sigma_fundamentals.json';

import {
  login,
  validateRule,
  runRule,
  getLogDatasets,
  getChallenges,
  submitChallenge,
  transpileRule,
  getUserProgress,
  getLeaderboard,
  unlockHint
} from './api/sigma.js';

const DEFAULT_SIGMA_RULE = `title: Suspicious Task Scheduler Activity
status: experimental
description: Detects scheduled task creations with suspicious parameters
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 4698
    condition: selection
level: medium`;

const LAB_DURATION_SECONDS = 900; // 15 minutes countdown

function getOrCreateUserId() {
  const STORAGE_KEY = 'pwndora_user_id';
  let userId = localStorage.getItem(STORAGE_KEY);
  if (!userId) {
    userId = `user_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(STORAGE_KEY, userId);
  }
  return userId;
}

function hasCompletedSigmaBasics() {
  return localStorage.getItem('pwndora_completed_sigma_basics') === 'true';
}

function markSigmaBasicsCompleted() {
  localStorage.setItem('pwndora_completed_sigma_basics', 'true');
}

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [authToken, setAuthToken] = useState(null);

  const [userXp, setUserXp] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  const [datasets, setDatasets] = useState([]);
  const [challenges, setChallenges] = useState([]);
  
  const [showSigmaFundamentals, setShowSigmaFundamentals] = useState(!hasCompletedSigmaBasics());
  const [fundamentalsStage, setFundamentalsStage] = useState('concept');

  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengeStage, setChallengeStage] = useState('preview'); // 'preview' | 'concept' | 'quiz' | 'pre-lab' | 'lab'
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(LAB_DURATION_SECONDS);
  const [isTimerExpired, setIsTimerExpired] = useState(false);
  const [hasSubmittedRule, setHasSubmittedRule] = useState(false);
  const [isHoverPanelOpen, setIsHoverPanelOpen] = useState(false);

  const [selectedDataset, setSelectedDataset] = useState('windows_security');
  const [ruleText, setRuleText] = useState(DEFAULT_SIGMA_RULE);
  const [validationErrors, setValidationErrors] = useState([]);
  const [runResults, setRunResults] = useState(null);
  const [scoreResult, setScoreResult] = useState(null);
  const [activeHintsCount, setActiveHintsCount] = useState(0);
  
  const [selectedTarget, setSelectedTarget] = useState('splunk_spl');
  const [transpiledQuery, setTranspiledQuery] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const loginFlow = useCallback(async () => {
    try {
      const stableUserId = getOrCreateUserId();
      const res = await login(stableUserId);
      setAuthToken(res.access_token);
      return res.access_token;
    } catch (err) {
      console.error("Login failed:", err);
      return null;
    }
  }, []);

  const refreshProgress = useCallback(async (token) => {
    try {
      const progress = await getUserProgress(token);
      setUserXp(progress.total_xp);
      setCompletedChallenges(Object.keys(progress.completed_challenges || {}));
    } catch (err) {
      console.error("Failed to fetch progress:", err);
    }
    try {
      const board = await getLeaderboard(token);
      setLeaderboard(board.leaderboard || []);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      let token = authToken;
      if (!token) {
        token = await loginFlow();
      }
      if (!token) return;

      try {
        const dsRes = await getLogDatasets(token);
        const chRes = await getChallenges(token);
        setDatasets(dsRes.datasets || []);
        setChallenges(chRes.challenges || []);
        await refreshProgress(token);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          loginFlow();
        }
      }
    };
    fetchData();
  }, [authToken, loginFlow, refreshProgress]);

  // Live validation debouncer
  useEffect(() => {
    if (!ruleText || !authToken) return;
    const timer = setTimeout(async () => {
      try {
        const res = await validateRule(ruleText, authToken);
        if (res.valid) {
          setValidationErrors([]);
        } else {
          setValidationErrors(res.errors || []);
        }
      } catch (err) {
        if (err.response && err.response.status === 401) {
          loginFlow();
        } else {
          setValidationErrors([{ line: 1, message: "Validation error" }]);
        }
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [ruleText, authToken, loginFlow]);

  // Stopwatch/Countdown timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimerActive(false);
            setIsTimerExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerSeconds]);

  // Browser navigation lock when timer is active
  useEffect(() => {
    if (!isTimerActive || isTimerExpired) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTimerActive, isTimerExpired]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenChallengesTab = () => {
    setActiveTab('challenges');
    setSelectedChallenge(null);
    if (!hasCompletedSigmaBasics()) {
      setShowSigmaFundamentals(true);
      setFundamentalsStage('concept');
    } else {
      setShowSigmaFundamentals(false);
    }
  };

  const handleSelectChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    setChallengeStage('preview');
    setSelectedDataset(challenge.dataset);
    setActiveHintsCount(0);
    setScoreResult(null);
    setRunResults(null);
    setTranspiledQuery('');
    setHasSubmittedRule(false);
    setIsTimerActive(false);
    setTimerSeconds(LAB_DURATION_SECONDS);
    setIsTimerExpired(false);
    setIsHoverPanelOpen(false);
    // Start every challenge with a blank editor (no pre-filled template)
    setRuleText('# Write your Sigma rule here\n\n');
    setActiveTab('sandbox');
  };

  const handleExitLab = () => {
    setIsTimerActive(false);
    setIsTimerExpired(false);
    setTimerSeconds(LAB_DURATION_SECONDS);
    setSelectedChallenge(null);
    setActiveTab('challenges');
  };

  const handleRunRule = async () => {
    if (!authToken || isTimerExpired) return;
    setIsRunning(true);
    try {
      const res = await runRule(ruleText, selectedDataset, authToken, selectedChallenge?.attack_type);
      setRunResults(res);
    } catch (e) {
      if (e.response && e.response.status === 401) {
        loginFlow();
      } else {
        alert("Error executing rule: " + e.message);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleTranspile = async () => {
    if (!authToken || isTimerExpired) return;
    try {
      const res = await transpileRule(ruleText, selectedTarget, authToken);
      if (selectedTarget === 'splunk_spl') {
        setTranspiledQuery(res.splunk_spl || '');
      } else {
        setTranspiledQuery(res.sentinel_kql || '');
      }
    } catch (e) {
      if (e.response && e.response.status === 401) {
        loginFlow();
      } else {
        alert("Transpilation failed: " + e.message);
      }
    }
  };

  const handleSubmitScored = async () => {
    if (!selectedChallenge || !authToken || isTimerExpired) return;
    setIsRunning(true);
    try {
      const res = await submitChallenge(selectedChallenge.id, ruleText, authToken);
      setScoreResult(res);
      setUserXp(res.total_xp);
      setHasSubmittedRule(true); // Unlock convert button
      setIsTimerActive(false); // Stop countdown timer on submission
      if (res.newly_completed && !completedChallenges.includes(selectedChallenge.id)) {
        setCompletedChallenges(prev => [...prev, selectedChallenge.id]);
      }
      await refreshProgress(authToken);
    } catch (e) {
      if (e.response && e.response.status === 401) {
        loginFlow();
      } else {
        alert("Submission error: " + e.message);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleUnlockHint = async (idx) => {
    if (!selectedChallenge || !authToken) return;
    try {
      const res = await unlockHint(selectedChallenge.id, idx, authToken);
      setUserXp(res.total_xp);
      setActiveHintsCount(idx + 1);
    } catch (e) {
      if (e.response && e.response.status === 402) {
        alert("Not enough XP to unlock this hint.");
      } else if (e.response && e.response.status === 401) {
        loginFlow();
      }
    }
  };
  
  const currentDataset = datasets.find(d => d.id === selectedDataset);
  const datasetFields = currentDataset?.fields || [];
  const isConvertDisabled = selectedChallenge ? (!hasSubmittedRule || isTimerExpired) : false;
  const isNavLocked = isTimerActive && !isTimerExpired;

  return (
    <div className="min-h-screen bg-background text-textPrimary font-sans flex flex-col relative overflow-hidden cyber-grid">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="fog-layer absolute inset-0 animate-[fogMove_18s_ease-in-out_infinite] opacity-20 bg-[radial-gradient(closest-side,rgba(0,255,106,0.08),transparent_70%)] blur-[24px]"></div>
        <div className="fog-layer absolute inset-0 animate-[fogMove_28s_ease-in-out_infinite] opacity-15 bg-[radial-gradient(closest-side,rgba(0,240,255,0.06),transparent_70%)] blur-[28px]" style={{ mixBlendMode: "screen" }}></div>
        <div className="absolute inset-0 scanlines opacity-30"></div>
      </div>

      <header className="bg-surface/90 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 border border-primary/40 rounded px-2.5 py-1 text-primary font-bold font-mono tracking-widest text-sm shadow-[0_0_10px_rgba(0,255,106,0.25)] glow-text">
            PWNDORA // SIGMA LAB
          </div>
          <div className="flex items-center space-x-1.5 bg-background border border-gray-800 rounded px-2.5 py-1">
            <span className={`w-2 h-2 rounded-full ${authToken ? 'bg-green-500 shadow-[0_0_8px_rgba(0,255,106,0.6)]' : 'bg-red-500 animate-pulse'}`}></span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-textSecondary">
              {authToken ? 'BACKEND CONNECTED' : 'CONNECTING...'}
            </span>
          </div>
        </div>

        <nav className="flex items-center space-x-1 text-xs font-mono">
          <button 
            onClick={() => {
              if (isNavLocked) {
                alert("A challenge lab is currently active. Use 'EXIT LAB' or submit your rule before navigating away.");
                return;
              }
              setActiveTab('landing'); 
              setSelectedChallenge(null); 
            }}
            disabled={isNavLocked}
            className={`px-3 py-1.5 rounded transition-all duration-300 ${isNavLocked ? 'opacity-40 cursor-not-allowed text-gray-500' : activeTab === 'landing' ? 'text-primary bg-primary/10 font-bold border border-primary/20 shadow-[0_0_10px_rgba(0,255,106,0.15)]' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            LANDING
          </button>
          <button 
            onClick={() => {
              if (isNavLocked) {
                alert("A challenge lab is currently active. Use 'EXIT LAB' or submit your rule before navigating away.");
                return;
              }
              handleOpenChallengesTab();
            }}
            disabled={isNavLocked}
            className={`px-3 py-1.5 rounded transition-all duration-300 ${isNavLocked ? 'opacity-40 cursor-not-allowed text-gray-500' : activeTab === 'challenges' ? 'text-primary bg-primary/10 font-bold border border-primary/20 shadow-[0_0_10px_rgba(0,255,106,0.15)]' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            CHALLENGES
          </button>
          <button 
            onClick={() => {
              if (isNavLocked) {
                alert("A challenge lab is currently active. Use 'EXIT LAB' or submit your rule before navigating away.");
                return;
              }
              setActiveTab('sandbox'); 
              setSelectedChallenge(null); 
              setRuleText(DEFAULT_SIGMA_RULE); 
            }}
            disabled={isNavLocked}
            className={`px-3 py-1.5 rounded transition-all duration-300 ${isNavLocked ? 'opacity-40 cursor-not-allowed text-gray-500' : activeTab === 'sandbox' && !selectedChallenge ? 'text-primary bg-primary/10 font-bold border border-primary/20 shadow-[0_0_10px_rgba(0,255,106,0.15)]' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            SANDBOX
          </button>
          <button 
            onClick={() => {
              if (isNavLocked) {
                alert("A challenge lab is currently active. Use 'EXIT LAB' or submit your rule before navigating away.");
                return;
              }
              setActiveTab('leaderboard'); 
              setSelectedChallenge(null); 
              if (authToken) refreshProgress(authToken); 
            }}
            disabled={isNavLocked}
            className={`px-3 py-1.5 rounded transition-all duration-300 ${isNavLocked ? 'opacity-40 cursor-not-allowed text-gray-500' : activeTab === 'leaderboard' ? 'text-primary bg-primary/10 font-bold border border-primary/20 shadow-[0_0_10px_rgba(0,255,106,0.15)]' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            LEADERBOARD
          </button>
        </nav>

        <div className="flex items-center space-x-3">
          <XPBar xp={userXp} nextMilestone={(Math.floor(userXp / 200) + 1) * 200} />
          <RankBadge xp={userXp} />
        </div>
      </header>

      <main className="flex-1 p-6 z-10 overflow-hidden flex flex-col relative">
        
        {activeTab === 'landing' && (
          <div className="max-w-4xl mx-auto space-y-12 py-10 relative overflow-y-auto custom-scrollbar">
            <div className="text-center space-y-4">
              <h1 className="font-sans font-black text-4xl md:text-5xl text-textPrimary tracking-widest uppercase glow-text mb-4">
                PWNDORA // <span className="text-primary animate-flicker">SIGMA ENGINE</span>
              </h1>
              <p className="text-sm text-textSecondary max-w-2xl mx-auto leading-relaxed font-mono">
                Welcome to the first detection engineering module on PWNDORA. Compose, test-run, and score vendor-neutral Sigma rules to identify cyber attacks inside logs.
              </p>
              <div className="pt-4 flex justify-center space-x-4">
                <button 
                  onClick={handleOpenChallengesTab}
                  className="bg-primary text-black font-bold text-xs px-8 py-3 rounded hover:shadow-cyber transition-all duration-300 active:scale-95 border border-primary"
                >
                  START CHALLENGES
                </button>
                <button 
                  onClick={() => { setActiveTab('sandbox'); setSelectedChallenge(null); setRuleText(DEFAULT_SIGMA_RULE); }}
                  className="border border-gray-700 hover:border-textSecondary text-textPrimary font-semibold text-xs px-8 py-3 rounded hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                >
                  OPEN SANDBOX
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="bg-surface border border-gray-800 rounded-lg p-6 space-y-3 glow-border hover:scale-[1.02] hover:border-primary transition-all duration-300">
                <span className="text-primary text-2xl animate-float block">📝</span>
                <h3 className="font-sans font-bold text-base text-textPrimary uppercase tracking-wider glow-text">Monaco Rule Editor</h3>
                <p className="text-xs text-textSecondary leading-relaxed font-mono">
                  Compose rules with YAML syntax autocompletion, real-time debounce linting and inline markers.
                </p>
              </div>
              <div className="bg-surface border border-gray-800 rounded-lg p-6 space-y-3 glow-border hover:scale-[1.02] hover:border-secondary transition-all duration-300">
                <span className="text-secondary text-2xl animate-float block" style={{ animationDelay: "1.5s" }}>🔍</span>
                <h3 className="font-sans font-bold text-base text-textPrimary uppercase tracking-wider glow-text-blue">Live Event Matching</h3>
                <p className="text-xs text-textSecondary leading-relaxed font-mono">
                  Run pySigma engine server-side to match against Windows, Sysmon, and Web access log datasets.
                </p>
              </div>
              <div className="bg-surface border border-gray-800 rounded-lg p-6 space-y-3 glow-border hover:scale-[1.02] hover:border-yellow-400 transition-all duration-300">
                <span className="text-yellow-400 text-2xl animate-float block" style={{ animationDelay: "3s" }}>🏆</span>
                <h3 className="font-sans font-bold text-base text-textPrimary uppercase tracking-wider [text-shadow:0_0_8px_rgba(250,204,21,0.3)]">Scored Challenges</h3>
                <p className="text-xs text-textSecondary leading-relaxed font-mono">
                  Attempt 5 challenges matching threat signatures, scored live on precision, recall, and false-positive rates.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="max-w-5xl mx-auto py-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 flex flex-col">
            {showSigmaFundamentals ? (
              fundamentalsStage === 'concept' ? (
                <div className="flex-1 min-h-0 py-4 flex items-center justify-center">
                  <ChallengeConcept
                    challenge={sigmaFundamentalsData}
                    onContinue={() => setFundamentalsStage('quiz')}
                    onSkip={() => {
                      markSigmaBasicsCompleted();
                      setShowSigmaFundamentals(false);
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-0 py-4 flex items-center justify-center">
                  <ChallengeQuiz
                    challenge={sigmaFundamentalsData}
                    onContinue={() => {
                      markSigmaBasicsCompleted();
                      setShowSigmaFundamentals(false);
                    }}
                    onContinueText="CONTINUE TO CHALLENGES"
                  />
                </div>
              )
            ) : (
              <ChallengeList 
                challenges={challenges} 
                onSelectChallenge={handleSelectChallenge} 
                completedChallenges={completedChallenges} 
                onReviewBasics={() => {
                  setShowSigmaFundamentals(true);
                  setFundamentalsStage('concept');
                }}
              />
            )}
          </div>
        )}

        {/* STAGE 1: PREVIEW CARD */}
        {activeTab === 'sandbox' && selectedChallenge && challengeStage === 'preview' && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-4 flex items-center justify-center">
            <ChallengePreview
              challenge={selectedChallenge}
              onStart={() => setChallengeStage('concept')}
              onBack={() => { setSelectedChallenge(null); setActiveTab('challenges'); }}
            />
          </div>
        )}

        {/* STAGE 2: CONCEPT BRIEFING */}
        {activeTab === 'sandbox' && selectedChallenge && challengeStage === 'concept' && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-4 flex items-center justify-center">
            <ChallengeConcept
              challenge={selectedChallenge}
              onContinue={() => setChallengeStage('quiz')}
              onSkip={() => setChallengeStage('pre-lab')}
            />
          </div>
        )}

        {/* STAGE 3: KNOWLEDGE QUIZ */}
        {activeTab === 'sandbox' && selectedChallenge && challengeStage === 'quiz' && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-4 flex items-center justify-center">
            <ChallengeQuiz
              challenge={selectedChallenge}
              onContinue={() => setChallengeStage('pre-lab')}
            />
          </div>
        )}

        {/* STAGE 4: PRE-LAB TIMER GATED START */}
        {activeTab === 'sandbox' && selectedChallenge && challengeStage === 'pre-lab' && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-4 flex items-center justify-center">
            <div className="bg-surface border border-gray-800 rounded-lg p-8 flex flex-col font-mono text-xs glow-border max-w-xl mx-auto text-center space-y-6 shadow-2xl">
              <div className="space-y-2">
                <span className="text-primary text-3xl block animate-bounce">⏱️</span>
                <h2 className="font-sans font-bold text-xl text-textPrimary uppercase tracking-wider glow-text">
                  LAB READY: {selectedChallenge.title}
                </h2>
                <p className="text-textSecondary text-xs leading-relaxed max-w-md mx-auto">
                  You are about to start the 15-minute timed detection engineering lab for <span className="text-secondary font-bold">{selectedChallenge.attack_type}</span>.
                </p>
              </div>

              <div className="bg-background/60 border border-gray-800 rounded p-4 text-left space-y-2 text-[11px] text-textSecondary">
                <div className="flex items-center space-x-2 text-primary font-bold">
                  <span>💡</span>
                  <span>LAB RULES & TIPS:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-textMuted">
                  <li>The editor starts completely empty — write your rule from scratch.</li>
                  <li>A 15:00 countdown timer begins once started and locks the lab at 0:00.</li>
                  <li>Scenario details & hints are accessible via the left hover drawer.</li>
                  <li>Submit your rule when ready to score precision and recall.</li>
                </ul>
              </div>

              <div className="pt-2 flex justify-center space-x-4">
                <button
                  onClick={handleExitLab}
                  className="border border-gray-700 hover:border-gray-500 text-textSecondary px-5 py-2.5 rounded text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsTimerActive(true);
                    setIsTimerExpired(false);
                    setTimerSeconds(LAB_DURATION_SECONDS);
                    setChallengeStage('lab');
                  }}
                  className="bg-primary text-black font-bold text-xs px-8 py-3 rounded hover:shadow-cyber transition-all duration-300 active:scale-95 border border-primary flex items-center space-x-2"
                >
                  <span>START TIMER & ENTER LAB</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 5: ACTIVE LAB / SANDBOX */}
        {activeTab === 'sandbox' && (!selectedChallenge || challengeStage === 'lab') && (
          <div className="flex flex-col h-full flex-1 min-h-0 relative">
            
            {/* TIMED LAB HEADER BAR (ONLY WHEN IN CHALLENGE MODE) */}
            {selectedChallenge && (
              <div className="flex-none bg-surface/90 border border-gray-800 rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between font-mono text-xs backdrop-blur-md glow-border">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-textPrimary uppercase tracking-wider text-xs">{selectedChallenge.title}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                    {selectedChallenge.attack_type}
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <div className={`flex items-center space-x-2 border px-3 py-1 rounded font-mono font-bold tracking-widest text-xs transition-all duration-300 ${
                    isTimerExpired 
                      ? 'bg-red-500/20 text-red-400 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                      : timerSeconds <= 60
                        ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                        : 'bg-background border-primary/40 text-primary shadow-[0_0_10px_rgba(0,255,106,0.15)]'
                  }`}>
                    <span className={isTimerActive && timerSeconds <= 60 ? 'animate-bounce' : ''}>
                      {isTimerExpired ? '⚠️' : '⏱️'}
                    </span>
                    <span>
                      {isTimerExpired ? "TIME'S UP (00:00)" : `REMAINING: ${formatTime(timerSeconds)}`}
                    </span>
                  </div>
                  <button
                    onClick={handleExitLab}
                    className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 font-bold text-[11px] px-3 py-1 rounded transition-all"
                  >
                    EXIT LAB
                  </button>
                </div>
              </div>
            )}

            {/* UNMISSABLE TIME'S UP BANNER OVERLAY */}
            {selectedChallenge && isTimerExpired && (
              <div className="bg-red-950/90 border border-red-500/60 rounded-lg p-4 mb-4 text-center font-mono animate-fadeIn flex flex-col md:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(239,68,68,0.3)] z-20">
                <div className="flex items-center space-x-3 text-left">
                  <span className="text-red-400 text-2xl font-bold animate-pulse">⚠️</span>
                  <div>
                    <h3 className="text-red-400 font-bold text-sm tracking-wider uppercase">TIME'S UP — LAB LOCKED</h3>
                    <p className="text-red-200/80 text-[11px] leading-relaxed">
                      The 15-minute countdown has expired. The Monaco editor and action buttons are now read-only.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleExitLab}
                  className="bg-red-500 text-black font-bold text-xs px-5 py-2 rounded hover:bg-red-400 transition-all whitespace-nowrap"
                >
                  EXIT LAB
                </button>
              </div>
            )}

            {/* LEFT HOVER TRIGGER STRIP & OVERLAY DRAWER FOR HINTS (ONLY IN CHALLENGE MODE) */}
            {selectedChallenge && (
              <>
                <div 
                  onMouseEnter={() => setIsHoverPanelOpen(true)}
                  className="absolute left-0 top-12 bottom-0 w-3 bg-primary/20 border-r border-primary/40 z-30 cursor-pointer flex items-center justify-center hover:w-6 hover:bg-primary/30 transition-all duration-200 group rounded-r"
                  title="Hover to view scenario & hints"
                >
                  <span className="text-primary text-[9px] font-mono font-bold transform -rotate-90 whitespace-nowrap tracking-widest group-hover:scale-105">
                    📋 HINTS &gt;
                  </span>
                </div>

                <div 
                  onMouseLeave={() => setIsHoverPanelOpen(false)}
                  className={`absolute left-0 top-12 bottom-0 z-50 w-[380px] bg-surface/95 backdrop-blur-md border-r border-primary/40 p-4 shadow-[12px_0_30px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-in-out transform ${isHoverPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                  <div className="flex justify-between items-center pb-2 mb-3 border-b border-gray-800 font-mono">
                    <span className="text-xs font-bold text-primary flex items-center space-x-1.5">
                      <span>📋</span>
                      <span>SCENARIO & HINTS</span>
                    </span>
                    <span className="text-[9px] text-textMuted bg-background px-1.5 py-0.5 rounded">Move away to close</span>
                  </div>
                  <div className="h-[calc(100%-40px)] overflow-y-auto custom-scrollbar">
                    <ChallengeDetail 
                      challenge={selectedChallenge}
                      onBack={handleExitLab}
                      onUnlockHint={handleUnlockHint}
                      activeHintsCount={activeHintsCount}
                      userXp={userXp}
                    />
                  </div>
                </div>
              </>
            )}

            {/* LAB LAYOUT */}
            <div className="flex flex-col lg:flex-row gap-6 h-full items-stretch flex-1 min-h-0">

              {/* LEFT COLUMN IN SANDBOX MODE (DATASET PICKER) */}
              {!selectedChallenge && (
                <div className="w-full lg:w-[32%] flex-none space-y-6 flex flex-col justify-start overflow-y-auto custom-scrollbar pr-2">
                  <DatasetPicker 
                    datasets={datasets}
                    selectedDataset={selectedDataset}
                    onDatasetChange={setSelectedDataset}
                  />
                  {scoreResult && <ScoreDashboard scoreResult={scoreResult} />}
                </div>
              )}

              {/* MAIN CENTER COLUMN: MONACO EDITOR */}
              <div className="flex-1 min-w-0 flex flex-col space-y-4 transition-all duration-300 overflow-hidden">
                <div className="flex-1 min-h-[300px]">
                  <MonacoEditor 
                    rule={ruleText} 
                    onChange={setRuleText} 
                    errors={validationErrors} 
                    datasetFields={datasetFields}
                    readOnly={isTimerExpired}
                  />
                </div>

                <div className="h-[90px] flex-none">
                  <ErrorGutter errors={validationErrors} />
                </div>
                
                <EditorToolbar 
                  onRun={handleRunRule}
                  onTranspile={handleTranspile}
                  targets={[{ value: 'splunk_spl', label: 'Splunk SPL' }, { value: 'sentinel_kql', label: 'Microsoft Sentinel KQL' }]}
                  selectedTarget={selectedTarget}
                  onTargetChange={setSelectedTarget}
                  isRunning={isRunning}
                  isConvertDisabled={isConvertDisabled}
                  isRunDisabled={isTimerExpired}
                />

                {transpiledQuery && (
                  <TranspilerOutput
                    query={transpiledQuery}
                    targetName={selectedTarget === 'splunk_spl' ? 'Splunk SPL' : 'Microsoft Sentinel KQL'}
                  />
                )}

                {selectedChallenge && (
                  <button
                    onClick={handleSubmitScored}
                    disabled={isRunning || validationErrors.length > 0 || isTimerExpired}
                    className="w-full flex-none bg-secondary text-black hover:bg-opacity-90 font-bold text-xs py-2.5 rounded hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 tracking-wider font-mono"
                  >
                    {isTimerExpired ? 'LAB LOCKED (EXPIRED)' : isRunning ? 'EVALUATING...' : 'SUBMIT RULE & SCORE'}
                  </button>
                )}

                {selectedChallenge && scoreResult && (
                  <div className="mt-2">
                    <ScoreDashboard scoreResult={scoreResult} />
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: RESULTS / LOGS (SLIDES IN WHEN RUN) */}
              <div className={`flex flex-col border border-gray-800 rounded bg-surface/50 overflow-hidden h-full transition-all duration-300 ease-out transform origin-right ${runResults ? 'w-full lg:w-[35%] opacity-100 translate-x-0 ml-0' : 'w-0 opacity-0 translate-x-8 overflow-hidden pointer-events-none !ml-0 !border-0'}`}>
                <div className="bg-black px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="font-mono text-xs text-textSecondary uppercase tracking-widest glow-text-blue whitespace-nowrap">Match Results</h3>
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-mono border border-primary/30 whitespace-nowrap">
                    {runResults ? runResults.match_count : 0} MATCHES
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                  {runResults || isRunning ? (
                    <LogPanel
                      matchedEntries={runResults ? runResults.matched_entries : []}
                      totalEntries={runResults ? runResults.total_entries : 0}
                      isRunning={isRunning}
                    />
                  ) : null}
                </div>
                
                {runResults && (
                  <StatsBar 
                    totalEntries={runResults.total_entries} 
                    matchCount={runResults.match_count} 
                    fpRateEstimate={runResults.fp_rate_estimate} 
                    precision={runResults.precision}
                    recall={runResults.recall}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="max-w-2xl mx-auto py-4 overflow-y-auto custom-scrollbar">
            <Leaderboard entries={leaderboard} currentUserId={getOrCreateUserId()} />
          </div>
        )}

      </main>
    </div>
  );
}
