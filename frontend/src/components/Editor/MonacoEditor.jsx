import React, { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import * as yaml from 'js-yaml';

export default function MonacoEditor({ rule, onChange, errors, datasetFields }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const handleMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyTier2Markers(monaco, editor, errors);
    runClientValidations(monaco, editor, rule, datasetFields);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tier 2 (server-side sigma-spec)
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      applyTier2Markers(monacoRef.current, editorRef.current, errors);
    }
  }, [errors]);

  // Tier 1 & Tier 3 (client-side)
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const timer = setTimeout(() => {
       runClientValidations(monacoRef.current, editorRef.current, rule, datasetFields);
    }, 150);
    return () => clearTimeout(timer);
  }, [rule, datasetFields]);

  return (
    <div className="flex flex-col h-full bg-[#0a1410e6] rounded-lg border border-emerald-400/25 focus-within:shadow-cyber focus-within:border-primary glow-border transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-800">
        <span className="font-mono text-xs text-emerald-400 font-semibold tracking-wider">SIGMA_RULE.YAML</span>
        <div className="flex space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="yaml"
          theme="vs-dark"
          value={rule}
          onChange={(value) => onChange(value ?? '')}
          onMount={handleMount}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            renderLineHighlight: 'gutter',
            glyphMargin: true,
          }}
        />
      </div>
    </div>
  );
}

function applyTier2Markers(monaco, editor, errors) {
  const model = editor.getModel();
  if (!model) return;

  if (!errors || errors.length === 0) {
    monaco.editor.setModelMarkers(model, 'sigma-spec', []);
    return;
  }

  const lineCount = model.getLineCount();

  const markers = errors.map((err) => {
    const line = err.line && err.line >= 1 && err.line <= lineCount ? err.line : 1;
    const lineLength = model.getLineMaxColumn(line);

    return {
      severity: monaco.MarkerSeverity.Error,
      message: err.message,
      startLineNumber: line,
      startColumn: 1,
      endLineNumber: line,
      endColumn: lineLength,
    };
  });

  monaco.editor.setModelMarkers(model, 'sigma-spec', markers);
}

function runClientValidations(monaco, editor, ruleText, datasetFields) {
  const model = editor.getModel();
  if (!model) return;

  let parsedYaml = null;
  try {
    parsedYaml = yaml.load(ruleText);
    monaco.editor.setModelMarkers(model, 'yaml-syntax', []);
  } catch (e) {
    const line = e.mark ? e.mark.line + 1 : 1;
    monaco.editor.setModelMarkers(model, 'yaml-syntax', [{
      severity: monaco.MarkerSeverity.Error,
      message: e.message,
      startLineNumber: line,
      startColumn: 1,
      endLineNumber: line,
      endColumn: model.getLineMaxColumn(line)
    }]);
    // Clear tier 3 if YAML is invalid, to avoid confusion
    monaco.editor.setModelMarkers(model, 'field-case', []);
    return;
  }

  // Tier 3 Validation: Field case sensitivity and recognition
  const tier3Markers = [];
  if (parsedYaml && typeof parsedYaml === 'object' && parsedYaml.detection && typeof parsedYaml.detection === 'object') {
    const knownFields = datasetFields || [];
    const knownFieldsLower = knownFields.map(f => f.toLowerCase());
    
    // Iterate over detection blocks
    for (const [blockName, blockValue] of Object.entries(parsedYaml.detection)) {
      if (blockName === 'condition') continue;
      
      // Ensure the block is an object (not an array, string, etc.)
      if (blockValue && typeof blockValue === 'object' && !Array.isArray(blockValue)) {
         for (const rawKey of Object.keys(blockValue)) {
            // Some keys in sigma can be lists of fields or contain modifiers
            const fieldName = rawKey.split('|')[0];
            
            // Skip fields that we can't reasonably parse
            if (!fieldName || fieldName.trim() === '') continue;

            const matches = model.findMatches(rawKey, false, false, true, null, false);
            
            let hasExact = knownFields.includes(fieldName);
            let hasCaseInsensitive = knownFieldsLower.includes(fieldName.toLowerCase());
            
            if (!hasExact && hasCaseInsensitive) {
               const correctCase = knownFields.find(f => f.toLowerCase() === fieldName.toLowerCase());
               matches.forEach(m => {
                 // only flag if the match is inside the detection block (roughly)
                 // to avoid false positives in descriptions.
                 tier3Markers.push({
                   severity: monaco.MarkerSeverity.Warning,
                   message: `Did you mean '${correctCase}'? Field names are case-sensitive.`,
                   startLineNumber: m.range.startLineNumber,
                   startColumn: m.range.startColumn,
                   endLineNumber: m.range.endLineNumber,
                   endColumn: m.range.endColumn
                 });
               });
            } else if (!hasExact && !hasCaseInsensitive) {
               matches.forEach(m => {
                 tier3Markers.push({
                   severity: monaco.MarkerSeverity.Warning,
                   message: `'${fieldName}' is not a recognized field in this dataset.`,
                   startLineNumber: m.range.startLineNumber,
                   startColumn: m.range.startColumn,
                   endLineNumber: m.range.endLineNumber,
                   endColumn: m.range.endColumn
                 });
               });
            }
         }
      }
    }
  }
  monaco.editor.setModelMarkers(model, 'field-case', tier3Markers);
}
