import React, { useState, useEffect } from 'react';
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
  validateRule,
  runRule,
  getLogDatasets,
  getChallenges,
  submitChallenge,
  transpileRule,
  getUseMock,
  setUseMock
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

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [useMockMode, setUseMockMode] = useState(getUseMock());
  
  // Game state
  const [userXp, setUserXp] = useState(150); // Start with 150 XP so hints can be tested
  const [completedChallenges, setCompletedChallenges] = useState([]);
  
  // Datasets and Challenges catalog
  const [datasets, setDatasets] = useState([]);
  const [challenges, setChallenges] = useState([]);
  
  // Rule Workspace State
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState('windows_security');
  const [ruleText, setRuleText] = useState(DEFAULT_SIGMA_RULE);
  const [validationErrors, setValidationErrors] = useState([]);
  const [runResults, setRunResults] = useState(null);
  const [scoreResult, setScoreResult] = useState(null);
  const [activeHintsCount, setActiveHintsCount] = useState(0);
  
  // Transpile state
  const [selectedTarget, setSelectedTarget] = useState('splunk_spl');
  const [transpiledQuery, setTranspiledQuery] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // Fetch datasets and challenges
  useEffect(() => {
    const fetchData = async () => {
      const dsRes = await getLogDatasets();
      const chRes = await getChallenges();
      setDatasets(dsRes.datasets || []);
      setChallenges(chRes.challenges || []);
    };
    fetchData();
  }, [useMockMode]);

  // Debounced (800ms) validation linting
  useEffect(() => {
    if (!ruleText) return;
    const timer = setTimeout(async () => {
      const res = await validateRule(ruleText);
      if (res.valid) {
        setValidationErrors([]);
      } else {
        setValidationErrors(res.errors || []);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [ruleText]);

  const handleToggleMock = (e) => {
    const val = e.target.checked;
    setUseMock(val);
    setUseMockMode(val);
  };

  const handleSelectChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    setSelectedDataset(challenge.dataset);
    setActiveHintsCount(0);
    setScoreResult(null);
    setRunResults(null);
    setTranspiledQuery('');
    
    // Set custom rule template based on challenge
    if (challenge.id === "ch_001") {
      setRuleText(`title: Pass-the-Hash Logon Attempt
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 4624
        LogonType: 3
        AuthenticationPackageName: NtLmSsp
    condition: selection`);
    } else if (challenge.id === "ch_002") {
      setRuleText(`title: Scheduled Task Creation
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 4698
    condition: selection`);
    } else if (challenge.id === "ch_003") {
      setRuleText(`title: LSASS Process Access
logsource:
    product: windows
    service: sysmon
detection:
    selection:
        EventID: 10
        TargetImage: 'C:\\Windows\\System32\\lsass.exe'
    condition: selection`);
    } else if (challenge.id === "ch_004") {
      setRuleText(`title: Encoded PowerShell Process
logsource:
    product: windows
    service: sysmon
detection:
    selection:
        EventID: 1
        Image: '*\\powershell.exe'
    condition: selection`);
    } else if (challenge.id === "ch_005") {
      setRuleText(`title: SQL Injection Web Query
logsource:
    product: webserver
    service: access
detection:
    selection:
        cs-uri-query: '*UNION SELECT*'
    condition: selection`);
    }

    setActiveTab('sandbox');
  };

  const handleRunRule = async () => {
    setIsRunning(true);
    try {
      const res = await runRule(ruleText, selectedDataset);
      setRunResults(res);
    } catch (e) {
      alert("Error executing rule: " + e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleValidate = async () => {
    const res = await validateRule(ruleText);
    if (res.valid) {
      alert("Validation Succeeded! Structure is complete.");
      setValidationErrors([]);
    } else {
      setValidationErrors(res.errors || []);
    }
  };

  const handleTranspile = async () => {
    try {
      const res = await transpileRule(ruleText, selectedTarget);
      if (selectedTarget === 'splunk_spl') {
        setTranspiledQuery(res.splunk_spl || '');
      } else {
        setTranspiledQuery(res.sentinel_kql || '');
      }
    } catch (e) {
      alert("Transpilation failed: " + e.message);
    }
  };

  const handleSubmitScored = async () => {
    if (!selectedChallenge) return;
    setIsRunning(true);
    try {
      const res = await submitChallenge(selectedChallenge.id, ruleText);
      setScoreResult(res);
      if (res.score >= 70) {
        setUserXp(prev => prev + res.xp_earned);
        if (!completedChallenges.includes(selectedChallenge.id)) {
          setCompletedChallenges(prev => [...prev, selectedChallenge.id]);
        }
      }
    } catch (e) {
      alert("Submission error: " + e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleUnlockHint = (idx) => {
    if (userXp >= 5) {
      setUserXp(prev => prev - 5);
      setActiveHintsCount(idx + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary font-sans flex flex-col relative overflow-hidden cyber-grid">
      {/* Volumetric Atmosphere Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="fog-layer absolute inset-0 animate-[fogMove_18s_ease-in-out_infinite] opacity-20 bg-[radial-gradient(closest-side,rgba(0,255,106,0.08),transparent_70%)] blur-[24px]"></div>
        <div className="fog-layer absolute inset-0 animate-[fogMove_28s_ease-in-out_infinite] opacity-15 bg-[radial-gradient(closest-side,rgba(0,240,255,0.06),transparent_70%)] blur-[28px]" style={{ mixBlendMode: "screen" }}></div>
        <div className="absolute inset-0 scanlines opacity-30"></div>
      </div>

      {/* HEADER NAVBAR */}
      <header className="bg-surface/90 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 border border-primary/40 rounded px-2.5 py-1 text-primary font-bold font-mono tracking-widest text-sm shadow-[0_0_10px_rgba(0,255,106,0.25)] glow-text">
            PWNDORA // SIGMA LAB
          </div>
          <div className="flex items-center space-x-1.5 bg-background border border-gray-800 rounded px-2.5 py-1">
            <span className={`w-2 h-2 rounded-full ${useMockMode ? 'bg-yellow-400 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(0,255,106,0.6)]'}`}></span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-textSecondary">
              {useMockMode ? 'MOCK MODE' : 'BACKEND CONNECTED'}
            </span>
          </div>
        </div>

        {/* NAVIGATION BUTTONS */}
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
            onClick={() => { setActiveTab('leaderboard'); setSelectedChallenge(null); }}
            className={`px-3 py-1.5 rounded transition-all duration-300 ${activeTab === 'leaderboard' ? 'text-primary bg-primary/10 font-bold border border-primary/20 shadow-[0_0_10px_rgba(0,255,106,0.15)]' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            LEADERBOARD
          </button>
        </nav>

        {/* PROFILE METRICS */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-1.5 text-[10px] font-mono text-textSecondary bg-background border border-gray-800 rounded px-2.5 py-1 cursor-pointer">
            <input type="checkbox" checked={useMockMode} onChange={handleToggleMock} className="accent-primary" />
            <span>MOCK MODE</span>
          </label>
          <XPBar xp={userXp} nextMilestone={200} />
          <RankBadge xp={userXp} />
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT */}
      <main className="flex-1 p-6 z-10 overflow-y-auto custom-scrollbar">
        
        {/* LANDING TAB */}
        {activeTab === 'landing' && (
          <div className="max-w-4xl mx-auto space-y-12 py-10 relative">
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

            {/* KEY FEATURES GRID */}
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

        {/* CHALLENGES TAB */}
        {activeTab === 'challenges' && (
          <div className="max-w-5xl mx-auto py-4">
            <ChallengeList 
              challenges={challenges} 
              onSelectChallenge={handleSelectChallenge} 
              completedChallenges={completedChallenges} 
            />
          </div>
        )}

        {/* SANDBOX / WORKSPACE TAB */}
        {activeTab === 'sandbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch">
            
            {/* LEFT COLUMN: PANELS & PARAMETERS */}
            <div className="lg:col-span-4 space-y-6 flex flex-col justify-start">
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
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="flex-1 min-h-[350px]">
                <MonacoEditor 
                  rule={ruleText} 
                  onChange={setRuleText} 
                  errors={validationErrors} 
                />
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

              {selectedChallenge && (
                <button
                  onClick={handleSubmitScored}
                  disabled={isRunning || validationErrors.length > 0}
                  className="w-full bg-secondary text-black hover:bg-opacity-90 font-bold text-xs py-2 rounded hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all duration-300 disabled:opacity-50 active:scale-95"
                >
                  SUBMIT OFFICIAL CHALLENGE RUN
                </button>
              )}
            </div>

            {/* RIGHT COLUMN: RUN RESULTS */}
            <div className="lg:col-span-3 space-y-6 flex flex-col justify-start">
              <ErrorGutter errors={validationErrors} />
              
              {runResults && (
                <div className="space-y-4">
                  <StatsBar 
                    matchCount={runResults.match_count}
                    totalEntries={runResults.total_entries}
                    fpRateEstimate={runResults.fp_rate_estimate}
                    precision={scoreResult?.precision}
                    recall={scoreResult?.recall}
                  />
                  {runResults.matched_entries && runResults.matched_entries.length > 0 && (
                    <div className="pb-1">
                      <AttackTechniqueBadge code={runResults.matched_entries[0].entry.attack_type} />
                    </div>
                  )}
                  <LogPanel 
                    matchedEntries={runResults.matched_entries} 
                    totalEntries={runResults.total_entries}
                    isRunning={isRunning}
                  />
                </div>
              )}

              {transpiledQuery && (
                <TranspilerOutput 
                  query={transpiledQuery}
                  targetName={selectedTarget === 'splunk_spl' ? 'Splunk SPL' : 'Microsoft Sentinel KQL'}
                />
              )}
            </div>

          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-md mx-auto py-6">
            <Leaderboard currentUserXp={userXp} />
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-surface border-t border-gray-800 px-6 py-4 flex items-center justify-between text-[10px] font-mono text-textMuted">
        <span>BREWINGSEC SUMMIT 2026  |  TRACK T-05  |  PS BSCDS26-SODE-01</span>
        <span>PROUDLY EXTENDING PWNDORA LABS</span>
      </footer>
    </div>
  );
}
