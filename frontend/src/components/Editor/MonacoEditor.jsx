import React, { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import * as yaml from 'js-yaml';

export default function MonacoEditor({ rule, onChange, errors, datasetFields, readOnly }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const datasetFieldsRef = useRef(datasetFields);

  useEffect(() => {
    datasetFieldsRef.current = datasetFields;
  }, [datasetFields]);

  const handleMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyTier2Markers(monaco, editor, errors);
    runClientValidations(monaco, editor, rule, datasetFields);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Autocomplete provider registration
  useEffect(() => {
    if (!monacoRef.current) return;
    const monaco = monacoRef.current;

    const provider = monaco.languages.registerCompletionItemProvider('yaml', {
      triggerCharacters: ['|', ':', ' '],
      provideCompletionItems: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const textUntilPosition = lineContent.substring(0, position.column - 1);

        const wordInfo = model.getWordUntilPosition(position);
        const defaultRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endColumn: wordInfo.endColumn,
        };

        const suggestions = [];

        const pipeIndex = textUntilPosition.lastIndexOf('|');
        const colonIndex = textUntilPosition.lastIndexOf(':');

        if (pipeIndex !== -1 && pipeIndex > colonIndex) {
          const modifierRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: pipeIndex + 2,
            endColumn: position.column,
          };

          const modifiers = [
            { label: '|contains', insertText: 'contains', doc: 'String contains substring' },
            { label: '|endswith', insertText: 'endswith', doc: 'String ends with suffix' },
            { label: '|startswith', insertText: 'startswith', doc: 'String starts with prefix' },
            { label: '|re', insertText: 're', doc: 'Regular expression match' },
          ];

          modifiers.forEach(m => {
            suggestions.push({
              label: m.label,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: m.insertText,
              detail: 'Sigma Modifier',
              documentation: m.doc,
              range: modifierRange,
            });
          });

          return { suggestions };
        }

        // Structural Keywords
        const structuralKeywords = [
          { label: 'title', insertText: 'title: ', doc: 'Rule title' },
          { label: 'status', insertText: 'status: ', doc: 'Status (experimental, test, stable)' },
          { label: 'description', insertText: 'description: ', doc: 'Rule description' },
          { label: 'logsource', insertText: 'logsource:\n    product: ', doc: 'Log source definition' },
          { label: 'detection', insertText: 'detection:\n    selection:\n        ', doc: 'Detection section' },
          { label: 'condition', insertText: 'condition: selection', doc: 'Detection condition' },
          { label: 'level', insertText: 'level: ', doc: 'Severity level (low, medium, high, critical)' },
          { label: 'selection', insertText: 'selection:\n        ', doc: 'Selection block' },
          { label: 'filter', insertText: 'filter:\n        ', doc: 'Filter block' },
        ];

        structuralKeywords.forEach(k => {
          suggestions.push({
            label: k.label,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: k.insertText,
            detail: 'Sigma Keyword',
            documentation: k.doc,
            range: defaultRange,
          });
        });

        // Common Field Names from datasetFields
        const fields = datasetFieldsRef.current || [];
        fields.forEach(field => {
          suggestions.push({
            label: field,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: `${field}: `,
            detail: 'Dataset Field',
            documentation: `Field from active log dataset (${field})`,
            range: defaultRange,
          });
        });

        // Condition logic keywords
        const conditionKeywords = [
          { label: 'and', insertText: 'and ' },
          { label: 'or', insertText: 'or ' },
          { label: 'not', insertText: 'not ' },
          { label: '1 of', insertText: '1 of ' },
          { label: 'all of', insertText: 'all of ' },
          { label: 'them', insertText: 'them' },
        ];

        conditionKeywords.forEach(c => {
          suggestions.push({
            label: c.label,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: c.insertText,
            detail: 'Condition Logic',
            range: defaultRange,
          });
        });

        return { suggestions };
      }
    });

    return () => {
      provider.dispose();
    };
  }, []);

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
            readOnly: Boolean(readOnly),
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
