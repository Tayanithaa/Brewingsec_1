import React, { useState, useEffect, useCallback } from 'react';
import MonacoEditor from './components/Editor/MonacoEditor.jsx';
import EditorToolbar from './components/Editor/EditorToolbar.jsx';
import ErrorGutter from './components/Editor/ErrorGutter.jsx';
import LogPanel from './components/LogViewer/LogPanel.jsx';
import StatsBar from './components/LogViewer/StatsBar.jsx';
import ChallengeList from './components/Challenges/ChallengeList.jsx';
import ChallengeDetail from './components/Challenges/ChallengeDetail.jsx';
import ScoreDashboard from './components/Challenges/ScoreDashboard.jsx';
import XPBar from './components/Gamification/XPBar.jsx';
import RankBadge from './components/Gamification/RankBadge.jsx';
import Leaderboard from './components/Gamification/Leaderboard.jsx';
import DatasetPicker from './components/DatasetPicker.jsx';
import AttackTechniqueBadge from './components/AttackTechniqueBadge.jsx';
import TranspilerOutput from './components/TranspilerOutput.jsx';

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

function getOrCreateUserId() {
  const STORAGE_KEY = 'pwndora_user_id';
  let userId = localStorage.getItem(STORAGE_KEY);
  if (!userId) {
    userId = `user_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(STORAGE_KEY, userId);
  }
  return userId;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  
  const [authToken, setAuthToken] = useState(null);

  const [userXp, setUserXp] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  const [datasets, setDatasets] = useState([]);
  const [challenges, setChallenges] = useState([]);
  
  const [selectedChallenge, setSelectedChallenge] = useState(null);
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


  const handleSelectChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    setSelectedDataset(challenge.dataset);
    setActiveHintsCount(0);
    setScoreResult(null);
    setRunResults(null);
    setTranspiledQuery('');
    
    if (challenge.id === "ch_001") {
      setRuleText(`title: Pass-the-Hash Logon Attempt\nlogsource:\n    product: windows\n    service: security\ndetection:\n    selection:\n        EventID: 4624\n        LogonType: 3\n        AuthenticationPackageName: NTLM\n    condition: selection`);
    } else if (challenge.id === "ch_002") {
      setRuleText(`title: Scheduled Task Creation\nlogsource:\n    product: windows\n    service: security\ndetection:\n    selection:\n        EventID: 4698\n    condition: selection`);
    } else if (challenge.id === "ch_003") {
      setRuleText(`title: LSASS Process Access\nlogsource:\n    product: windows\n    service: sysmon\ndetection:\n    selection:\n        EventID: 10\n        TargetImage: 'C:\\\\Windows\\\\System32\\\\lsass.exe'\n    condition: selection`);
    } else if (challenge.id === "ch_004") {
      setRuleText(`title: Encoded PowerShell Process\nlogsource:\n    product: windows\n    service: sysmon\ndetection:\n    selection:\n        EventID: 1\n        Image: '*\\\\powershell.exe'\n    condition: selection`);
    } else if (challenge.id === "ch_005") {
      setRuleText(`title: SQL Injection Web Query\nlogsource:\n    category: webserver\ndetection:\n    selection:\n        URI|contains: 'UNION SELECT'\n    condition: selection`);
    }

    setActiveTab('sandbox');
  };

  const handleRunRule = async () => {
    if (!authToken) return;
    setIsRunning(true);
    try {
      const res = await runRule(ruleText, selectedDataset, authToken);
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

  const handleValidate = async () => {
    if (!authToken) return;
    try {
      const res = await validateRule(ruleText, authToken);
      if (res.valid) {
        alert("Validation Succeeded! Structure is complete.");
        setValidationErrors([]);
      } else {
        setValidationErrors(res.errors || []);
      }
    } catch (e) {
      if (e.response && e.response.status === 401) {
        loginFlow();
      }
    }
  };

  const handleTranspile = async () => {
    if (!authToken) return;
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
    if (!selectedChallenge || !authToken) return;
    setIsRunning(true);
    try {
      const res = await submitChallenge(selectedChallenge.id, ruleText, authToken);
      setScoreResult(res);
      setUserXp(res.total_xp);
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
            onClick={() => { setActiveTab('landing'); setSelectedChallenge(null); }}
            className={`px-3 py-1.5 rounded transition-all duration-300 ${activeTab === 'landing' ? 'text-primary bg-primary/10 font-bold border border-primary/20 shadow-[0_0_10px_rgba(0,255,106,0.15)]' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            LANDING
          </button>
          <button 
            onClick={() => { setActiveTab('challenges'); setSelectedChallenge(null); }}
            className={`px-3 py-1.5 rounded transition-all duration-300 ${activeTab === 'challenges' ? 'text-primary bg-primary/10 font-bold border border-primary/20 shadow-[0_0_10px_rgba(0,255,106,0.15)]' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            CHALLENGES
          </button>
          <button 
            onClick={() => { setActiveTab('sandbox'); setSelectedChallenge(null); setRuleText(DEFAULT_SIGMA_RULE); }}
            className={`px-3 py-1.5 rounded transition-all duration-300 ${activeTab === 'sandbox' && !selectedChallenge ? 'text-primary bg-primary/10 font-bold border border-primary/20 shadow-[0_0_10px_rgba(0,255,106,0.15)]' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            SANDBOX
          </button>
          <button 
            onClick={() => { setActiveTab('leaderboard'); setSelectedChallenge(null); if (authToken) refreshProgress(authToken); }}
            className={`px-3 py-1.5 rounded transition-all duration-300 ${activeTab === 'leaderboard' ? 'text-primary bg-primary/10 font-bold border border-primary/20 shadow-[0_0_10px_rgba(0,255,106,0.15)]' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            LEADERBOARD
          </button>
        </nav>

        <div className="flex items-center space-x-3">
          <XPBar xp={userXp} nextMilestone={(Math.floor(userXp / 200) + 1) * 200} />
          <RankBadge xp={userXp} />
        </div>
      </header>

      <main className="flex-1 p-6 z-10 overflow-hidden flex flex-col">
        
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
                  onClick={() => setActiveTab('challenges')}
                  className="bg-primary text-black font-bold text-xs px-8 py-3 rounded hover:shadow-cyber transition-all duration-300 active:scale-95 border border-primary"
                >
                  START CHALLENGES
                </button>
                <button 
                  onClick={() => { setActiveTab('sandbox'); setSelectedChallenge(null); }}
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
          <div className="max-w-5xl mx-auto py-4 overflow-y-auto custom-scrollbar">
            <ChallengeList 
              challenges={challenges} 
              onSelectChallenge={handleSelectChallenge} 
              completedChallenges={completedChallenges} 
            />
          </div>
        )}

        {activeTab === 'sandbox' && (
          <div className="flex flex-col lg:flex-row gap-6 h-full items-stretch flex-1 min-h-0">
            
            {/* LEFT COLUMN: PANELS & PARAMETERS */}
            <div className="w-full lg:w-[32%] flex-none space-y-6 flex flex-col justify-start overflow-y-auto custom-scrollbar pr-2">
              {selectedChallenge ? (
                <ChallengeDetail 
                  challenge={selectedChallenge}
                  onBack={() => { setSelectedChallenge(null); setActiveTab('challenges'); }}
                  onUnlockHint={handleUnlockHint}
                  activeHintsCount={activeHintsCount}
                  userXp={userXp}
                />
              ) : (
                <DatasetPicker 
                  datasets={datasets}
                  selectedDataset={selectedDataset}
                  onDatasetChange={setSelectedDataset}
                />
              )}
              {scoreResult && <ScoreDashboard scoreResult={scoreResult} />}
            </div>

            {/* CENTER COLUMN: MONACO EDITOR */}
            <div className="flex-1 min-w-0 flex flex-col space-y-4 transition-all duration-300 overflow-hidden">
              <div className="flex-1 min-h-[300px]">
                <MonacoEditor 
                  rule={ruleText} 
                  onChange={setRuleText} 
                  errors={validationErrors} 
                  datasetFields={datasetFields}
                />
              </div>

              <div className="h-[90px] flex-none">
                <ErrorGutter errors={validationErrors} />
              </div>
              
              <EditorToolbar 
                onRun={handleRunRule}
                onValidate={handleValidate}
                onTranspile={handleTranspile}
                targets={[{ value: 'splunk_spl', label: 'Splunk SPL' }, { value: 'sentinel_kql', label: 'Microsoft Sentinel KQL' }]}
                selectedTarget={selectedTarget}
                onTargetChange={setSelectedTarget}
                isRunning={isRunning}
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
                  disabled={isRunning || validationErrors.length > 0}
                  className="w-full flex-none bg-secondary text-black hover:bg-opacity-90 font-bold text-xs py-2 rounded hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all duration-300 disabled:opacity-50 active:scale-95"
                >
                  {isRunning ? 'EVALUATING...' : 'SUBMIT RULE & SCORE'}
                </button>
              )}
            </div>

            {/* RIGHT COLUMN: RESULTS / LOGS (SLIDES IN) */}
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
