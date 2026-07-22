import axios from 'axios';

// Get API base URL from Vite environment, fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Configurable flag to swap mock vs real backend
// Default to true for offline development, or check env variable
let USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// Simple helper to retrieve current JWT token (mock token for hackathon)
const getAuthHeaders = () => {
  const token = localStorage.getItem('pwndora_token') || 'mock_jwt_token_admin_brewsec_2026';
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

export const setUseMock = (val) => {
  USE_MOCK = val;
};

export const getUseMock = () => {
  return USE_MOCK;
};

// ==========================================
// MOCK DATA FIXTURES
// ==========================================

const mockDatasets = [
  { 
    id: "windows_security", 
    name: "Windows Security Event Logs", 
    description: "Event IDs: 4624 (Logon), 4625 (Failed Logon), 4688 (Process Creation), 4698 (Scheduled Task), 7045 (Service Creation)", 
    entry_count: 5
  },
  { 
    id: "sysmon", 
    name: "Sysmon Event Logs", 
    description: "Event IDs: 1 (Process Creation), 10 (ProcessAccess to LSASS), 13 (RegistryValue), 19/20/21 (WMI)", 
    entry_count: 4
  },
  { 
    id: "web_access", 
    name: "Nginx/Apache Web Access Logs", 
    description: "Standard HTTP logs showing IP, timestamp, method, URI query parameters, response code, and user-agent", 
    entry_count: 4
  }
];

const mockChallenges = [
  { 
    id: "ch_001", 
    title: "Pass-the-Hash Detection", 
    difficulty: "Bronze", 
    dataset: "windows_security", 
    attack_type: "T1550.002", 
    hints: [
      "Focus on EventID 4624 (Successful Logon).", 
      "LogonType 3 (Network logon) or LogonType 9 (NewCredentials) is typical for Pass-the-Hash.", 
      "The Authentication Package (AuthenticationPackageName) must be 'NtLmSsp'."
    ], 
    max_score: 100, 
    xp_reward: 150 
  },
  { 
    id: "ch_002", 
    title: "Scheduled Task Creation", 
    difficulty: "Bronze", 
    dataset: "windows_security", 
    attack_type: "T1053.005", 
    hints: [
      "Look for EventID 4698 (Scheduled Task Created).", 
      "Inspect the TaskName or TaskContent fields.", 
      "Flag tasks executing files from Temp directories or running encoded commands."
    ], 
    max_score: 100, 
    xp_reward: 150 
  },
  { 
    id: "ch_003", 
    title: "LSASS Access (Credential Dumping)", 
    difficulty: "Silver", 
    dataset: "sysmon", 
    attack_type: "T1003.001", 
    hints: [
      "Look for Sysmon EventID 10 (ProcessAccess).", 
      "Filter on TargetImage ending with 'lsass.exe'.", 
      "Filter on GrantedAccess (Mimikatz typical access rights is 0x1010)."
    ], 
    max_score: 100, 
    xp_reward: 200 
  },
  { 
    id: "ch_004", 
    title: "Encoded PowerShell Execution", 
    difficulty: "Silver", 
    dataset: "sysmon", 
    attack_type: "T1059.001", 
    hints: [
      "Look for Sysmon EventID 1 (Process Creation).", 
      "Search for 'powershell.exe' or 'pwsh.exe' in Image.", 
      "Check CommandLine for -enc, -encodedcommand, or -e followed by base64 arguments."
    ], 
    max_score: 100, 
    xp_reward: 200 
  },
  { 
    id: "ch_005", 
    title: "SQL Injection Exploitation", 
    difficulty: "Gold", 
    dataset: "web_access", 
    attack_type: "T1190", 
    hints: [
      "Look for web requests with HTTP response status 200.", 
      "Analyze the URI query parameters (cs-uri-query) for suspicious SQL sequences.", 
      "Search for keywords like 'UNION SELECT', 'OR 1=1', and SQL comments '--'."
    ], 
    max_score: 100, 
    xp_reward: 250 
  }
];

// Mock database logs to evaluate against
const mockLogs = {
  windows_security: [
    { EventID: 4624, LogonType: 3, AuthenticationPackageName: "NtLmSsp", WorkstationName: "WIN-SRV-AD", IpAddress: "10.0.0.15", SubjectUserName: "Administrator", malicious: true, attack_type: "T1550.002", description: "Successful logon using NTLM NtLmSsp package from unexpected network location" },
    { EventID: 4624, LogonType: 2, AuthenticationPackageName: "Negotiate", WorkstationName: "WKS-DEV-03", IpAddress: "127.0.0.1", SubjectUserName: "developer1", malicious: false, description: "Normal interactive user logon" },
    { EventID: 4698, TaskName: "\\Microsoft\\Windows\\UpdateTask", TaskContent: "powershell.exe -enc SQBmA... (Encoded download cradle)", SubjectUserName: "svc_backup", malicious: true, attack_type: "T1053.005", description: "New Scheduled Task created executing suspicious Base64 encoded PowerShell" },
    { EventID: 4698, TaskName: "\\Microsoft\\Windows\\TimeSync", TaskContent: "w32tm.exe /resync", SubjectUserName: "SYSTEM", malicious: false, description: "Standard time synchronization scheduled task" },
    { EventID: 4625, LogonType: 3, FailureReason: "0xC000006D", WorkstationName: "WIN-SRV-AD", IpAddress: "192.168.1.100", SubjectUserName: "guest", malicious: false, description: "Failed network logon attempt" }
  ],
  sysmon: [
    { EventID: 10, SourceImage: "C:\\Temp\\mimikatz.exe", TargetImage: "C:\\Windows\\System32\\lsass.exe", GrantedAccess: "0x1010", CallTrace: "unknown", malicious: true, attack_type: "T1003.001", description: "Mimikatz requesting LSASS memory dump via 0x1010 access rights" },
    { EventID: 10, SourceImage: "C:\\Program Files\\Windows Defender\\MsMpEng.exe", TargetImage: "C:\\Windows\\System32\\lsass.exe", GrantedAccess: "0x1400", CallTrace: "kernel32.dll", malicious: false, description: "Legitimate anti-malware process inspecting LSASS" },
    { EventID: 1, Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", CommandLine: "powershell.exe -enc SQB4AGUA... -nop -w hidden", ParentImage: "C:\\Windows\\explorer.exe", malicious: true, attack_type: "T1059.001", description: "PowerShell process spawned with base64 encoded payload and stealth flags" },
    { EventID: 1, Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", CommandLine: "powershell.exe Get-Date", ParentImage: "C:\\Windows\\System32\\cmd.exe", malicious: false, description: "Normal execution of PowerShell command line utility" }
  ],
  web_access: [
    { method: "GET", path: "/index.php", "cs-uri-query": "id=1%20UNION%20SELECT%20username,%20password%20FROM%20users", status: 200, ip: "192.168.4.52", user_agent: "sqlmap/1.8.2", malicious: true, attack_type: "T1190", description: "Web access request attempting classic SQL Injection union query" },
    { method: "GET", path: "/login.php", "cs-uri-query": "user=admin'%20OR%20'1'='1", status: 200, ip: "192.168.4.52", user_agent: "Mozilla/5.0", malicious: true, attack_type: "T1190", description: "Web access request attempting SQL Injection authentication bypass" },
    { method: "POST", path: "/api/login", "cs-uri-query": "", status: 200, ip: "10.0.2.14", user_agent: "Mozilla/5.0", malicious: false, description: "Standard successful authentication POST request" },
    { method: "GET", path: "/css/bootstrap.min.css", "cs-uri-query": "v=4.6", status: 304, ip: "10.0.2.14", user_agent: "Mozilla/5.0", malicious: false, description: "Static resource fetch" }
  ]
};

// ==========================================
// CLIENT API IMPLEMENTATIONS
// ==========================================

/**
 * 1. POST /validate-rule
 * Checks Sigma YAML rule structure and fields
 */
export const validateRule = async (ruleText) => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    try {
      if (!ruleText || ruleText.trim() === "") {
        return { valid: false, errors: [{ line: 1, message: "Rule cannot be empty" }] };
      }
      
      // Basic YAML syntax mock check
      if (ruleText.includes("\t")) {
        return { valid: false, errors: [{ line: ruleText.split("\t")[0].split("\n").length, message: "YAML cannot contain tab characters. Use spaces instead." }] };
      }

      // Check required fields
      const lines = ruleText.split("\n");
      const hasTitle = lines.some(l => l.trim().startsWith("title:"));
      const hasLogsource = lines.some(l => l.trim().startsWith("logsource:"));
      const hasDetection = lines.some(l => l.trim().startsWith("detection:"));
      const hasCondition = lines.some(l => l.trim().startsWith("condition:"));

      const missing = [];
      if (!hasTitle) missing.push("title");
      if (!hasLogsource) missing.push("logsource");
      if (!hasDetection) missing.push("detection");

      if (missing.length > 0) {
        return { 
          valid: false, 
          errors: [{ line: 1, message: `Missing mandatory Sigma fields: ${missing.join(', ')}` }] 
        };
      }

      // Extract title and fields
      let title = "Suspicious Event Rule";
      const titleLine = lines.find(l => l.trim().startsWith("title:"));
      if (titleLine) {
        title = titleLine.split("title:")[1].trim().replace(/['"]/g, '');
      }

      const detectionFields = [];
      lines.forEach(l => {
        const trimmed = l.trim();
        if (trimmed.includes(":") && !trimmed.startsWith("detection:") && !trimmed.startsWith("condition:") && !trimmed.startsWith("title:") && !trimmed.startsWith("status:") && !trimmed.startsWith("level:") && !trimmed.startsWith("product:") && !trimmed.startsWith("service:")) {
          const field = trimmed.split(":")[0].trim();
          if (field && !detectionFields.includes(field)) {
            detectionFields.push(field);
          }
        }
      });

      return {
        valid: true,
        parsed_fields: {
          title,
          detection_fields: detectionFields
        }
      };

    } catch (e) {
      return { valid: false, errors: [{ line: 1, message: `YAML Parsing Error: ${e.message}` }] };
    }
  }

  // Real backend call
  try {
    const response = await axios.post(`${API_URL}/validate-rule`, { rule: ruleText }, getAuthHeaders());
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return error.response.data;
    }
    return { valid: false, errors: [{ line: 1, message: error.message }] };
  }
};

/**
 * 2. POST /run-rule
 * Runs rule against chosen dataset
 */
export const runRule = async (ruleText, datasetId) => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 400));
    
    // Evaluate rule text against mock logs
    const datasetLogs = mockLogs[datasetId] || [];
    const matchedEntries = [];

    // Simple rule keyword evaluation to simulate live parser
    datasetLogs.forEach((log, index) => {
      let isMatch = false;

      if (datasetId === "windows_security") {
        const check4624 = ruleText.includes("4624") && log.EventID === 4624;
        const checkLogonType = (ruleText.includes("LogonType: 3") && log.LogonType === 3) || (ruleText.includes("LogonType: 9") && log.LogonType === 9);
        const checkNtLm = ruleText.toLowerCase().includes("ntlmssp") && log.AuthenticationPackageName === "NtLmSsp";
        const check4698 = ruleText.includes("4698") && log.EventID === 4698;
        const checkPowerShell = ruleText.toLowerCase().includes("powershell") && log.TaskContent && log.TaskContent.toLowerCase().includes("powershell");

        if (check4624 && checkLogonType && checkNtLm) isMatch = true;
        else if (check4698 && checkPowerShell) isMatch = true;
        else if (ruleText.includes("EventID: 4624") && !ruleText.includes("LogonType") && log.EventID === 4624) isMatch = true;
        else if (ruleText.includes("EventID: 4698") && !ruleText.includes("powershell") && log.EventID === 4698) isMatch = true;
      } 
      else if (datasetId === "sysmon") {
        const check10 = ruleText.includes("10") && log.EventID === 10;
        const checkLsass = ruleText.toLowerCase().includes("lsass.exe") && log.TargetImage && log.TargetImage.toLowerCase().includes("lsass.exe");
        const check0x1010 = ruleText.toLowerCase().includes("0x1010") && log.GrantedAccess === "0x1010";
        const check1 = ruleText.includes("1") && log.EventID === 1;
        const checkPowerShell = ruleText.toLowerCase().includes("powershell.exe") && log.Image && log.Image.toLowerCase().includes("powershell.exe");
        const checkEnc = (ruleText.includes("-enc") || ruleText.includes("EncodedCommand")) && log.CommandLine && (log.CommandLine.includes("-enc") || log.CommandLine.includes("-EncodedCommand"));

        if (check10 && checkLsass && check0x1010) isMatch = true;
        else if (check10 && checkLsass && !ruleText.includes("0x1010")) isMatch = true;
        else if (check1 && checkPowerShell && checkEnc) isMatch = true;
        else if (check1 && checkPowerShell && !ruleText.includes("-enc")) isMatch = true;
      } 
      else if (datasetId === "web_access") {
        const checkUnion = ruleText.toLowerCase().includes("union select") && log["cs-uri-query"] && log["cs-uri-query"].toLowerCase().includes("union select");
        const checkOr = ruleText.toLowerCase().includes("or 1=1") && log["cs-uri-query"] && log["cs-uri-query"].toLowerCase().includes("or 1=1");
        const checkComment = ruleText.toLowerCase().includes("--") && log["cs-uri-query"] && log["cs-uri-query"].includes("--");

        if (checkUnion || checkOr || checkComment) isMatch = true;
      }

      if (isMatch) {
        // Collect matched fields
        const matchedFields = [];
        if (datasetId === "windows_security") {
          if (ruleText.includes("EventID")) matchedFields.push("EventID");
          if (ruleText.includes("LogonType")) matchedFields.push("LogonType");
          if (ruleText.includes("AuthenticationPackageName")) matchedFields.push("AuthenticationPackageName");
          if (ruleText.includes("TaskContent")) matchedFields.push("TaskContent");
        } else if (datasetId === "sysmon") {
          if (ruleText.includes("EventID")) matchedFields.push("EventID");
          if (ruleText.includes("TargetImage")) matchedFields.push("TargetImage");
          if (ruleText.includes("GrantedAccess")) matchedFields.push("GrantedAccess");
          if (ruleText.includes("CommandLine")) matchedFields.push("CommandLine");
        } else if (datasetId === "web_access") {
          if (ruleText.includes("cs-uri-query")) matchedFields.push("cs-uri-query");
        }

        matchedEntries.push({
          index,
          entry: log,
          matched_fields: matchedFields.length > 0 ? matchedFields : ["EventID"]
        });
      }
    });

    const benignTotal = datasetLogs.filter(l => !l.malicious).length;
    const benignMatched = matchedEntries.filter(m => !m.entry.malicious).length;
    const fp_rate_estimate = benignTotal > 0 ? benignMatched / benignTotal : 0.0;

    return {
      match_count: matchedEntries.length,
      total_entries: datasetLogs.length,
      fp_rate_estimate,
      matched_entries: matchedEntries
    };
  }

  // Real backend call
  const response = await axios.post(`${API_URL}/run-rule`, { rule: ruleText, dataset: datasetId }, getAuthHeaders());
  return response.data;
};

/**
 * 3. GET /log-datasets
 * Fetches available datasets
 */
export const getLogDatasets = async () => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 100));
    return { datasets: mockDatasets };
  }

  const response = await axios.get(`${API_URL}/log-datasets`, getAuthHeaders());
  return response.data;
};

/**
 * 4. GET /challenges
 * Fetches available challenges
 */
export const getChallenges = async () => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 150));
    return { challenges: mockChallenges };
  }

  const response = await axios.get(`${API_URL}/challenges`, getAuthHeaders());
  return response.data;
};

/**
 * 5. POST /challenges/{id}/submit
 * Submits scored challenge attempt
 */
export const submitChallenge = async (id, ruleText) => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 500));
    
    // Scenarios based on challenge completion
    const challenge = mockChallenges.find(c => c.id === id);
    const datasetId = challenge ? challenge.dataset : "windows_security";
    const runResult = await runRule(ruleText, datasetId);
    
    // Calculate metrics
    const logs = mockLogs[datasetId] || [];
    const maliciousTotal = logs.filter(l => l.malicious && l.attack_type === challenge?.attack_type).length;
    const maliciousMatched = runResult.matched_entries.filter(m => m.entry.malicious && m.entry.attack_type === challenge?.attack_type).length;
    
    // Recall: fraction of target attacks caught
    const recall = maliciousTotal > 0 ? maliciousMatched / maliciousTotal : 0.0;
    
    // Precision: fraction of matches that are correct target attacks
    const precision = runResult.match_count > 0 ? maliciousMatched / runResult.match_count : 0.0;
    
    // FP rate: fraction of benign logs matched
    const benignTotal = logs.filter(l => !l.malicious).length;
    const benignMatched = runResult.matched_entries.filter(m => !m.entry.malicious).length;
    const fp_rate = benignTotal > 0 ? benignMatched / benignTotal : 0.0;
    
    // Scoring formula: (Precision * 40) + (Recall * 40) + ((1 - FP Rate) * 20)
    const score = Math.round((precision * 40) + (recall * 40) + ((1 - fp_rate) * 20));
    const xp_earned = score >= 70 ? (challenge?.xp_reward || 150) : 0;

    return {
      precision,
      recall,
      fp_rate,
      score,
      xp_earned
    };
  }

  const response = await axios.post(`${API_URL}/challenges/${id}/submit`, { rule: ruleText }, getAuthHeaders());
  return response.data;
};

/**
 * 6. POST /transpile-rule
 * Bonus: converts rule to splunk spl or sentinel kql
 */
export const transpileRule = async (ruleText, target) => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    
    let splunk_spl = `index=wineventlog EventCode=4698 | stats count`;
    let sentinel_kql = `SecurityEvent | where EventID == 4698`;
    
    if (ruleText.includes("4624")) {
      splunk_spl = `index=wineventlog EventCode=4624 Logon_Type=3 Authentication_Package=NtLmSsp | table _time, WorkstationName, IpAddress, SubjectUserName`;
      sentinel_kql = `SecurityEvent | where EventID == 4624 and LogonType == 3 and AuthenticationPackageName == "NtLmSsp" | project TimeGenerated, Computer, IpAddress, Account`;
    } else if (ruleText.includes("lsass.exe")) {
      splunk_spl = `index=sysmon EventCode=10 TargetImage="*\\\\lsass.exe" GrantedAccess="0x1010" | table _time, SourceImage, TargetImage, GrantedAccess`;
      sentinel_kql = `DeviceEvents | where ActionType == "ProcessAccess" and TargetFileName == "lsass.exe" and RequestAccountName == "0x1010"`;
    } else if (ruleText.includes("UNION SELECT")) {
      splunk_spl = `index=web_proxy cs_uri_query="*UNION SELECT*" | stats count by clientip, uri`;
      sentinel_kql = `W3CIISLog | where csUriQuery contains "UNION SELECT" | project TimeGenerated, cIP, csUriStem, csUriQuery`;
    }

    if (target === "splunk_spl") {
      return { splunk_spl };
    } else {
      return { sentinel_kql };
    }
  }

  const response = await axios.post(`${API_URL}/transpile-rule`, { rule: ruleText, target }, getAuthHeaders());
  return response.data;
};

/**
 * 7. POST /explain-rule
 * Bonus: explains rule and offers fixes
 */
export const explainRule = async (ruleText, datasetId, failed) => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 400));
    
    let explanation = "This Sigma rule filters event records to detect specific patterns inside your active environment.";
    let suggested_fix_hint = "Ensure all required YAML fields are correctly mapped under 'detection'.";

    if (ruleText.includes("4624")) {
      explanation = "This rule detects network logons (Event ID 4624, LogonType 3) using NTLM authentication package NtLmSsp. Attackers performing Pass-the-Hash actions typically trigger network logons via NTLM without authentication package negotiation.";
      suggested_fix_hint = "If you are getting too many false positives, verify that LogonType matches only '3' (network) or '9' (NewCredentials) and that the authentication package is NtLmSsp.";
    } else if (ruleText.includes("4698")) {
      explanation = "This rule monitors the Windows Task Scheduler (Event ID 4698) for scheduled task creation events. Scheduled tasks are commonly abused by adversaries to maintain persistence inside target systems.";
      suggested_fix_hint = "Try targeting task contents that spawn Command Prompt or PowerShell scripts (look for 'powershell.exe' or '-enc' patterns in TaskContent).";
    } else if (ruleText.includes("lsass.exe")) {
      explanation = "This rule flags Sysmon Event ID 10 where the TargetImage points to 'lsass.exe'. This indicates memory inspection of the Local Security Authority Subsystem Service, commonly triggered during credential dumping (e.g. Mimikatz).";
      suggested_fix_hint = "Filter out legitimate antivirus programs by adding exclusionary rules for SourceImage, or restrict detection to GrantedAccess = '0x1010'.";
    }

    return {
      explanation,
      suggested_fix_hint
    };
  }

  const response = await axios.post(`${API_URL}/explain-rule`, { rule: ruleText, dataset: datasetId, failed }, getAuthHeaders());
  return response.data;
};
