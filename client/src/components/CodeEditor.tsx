import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const LANGUAGE_MAP: Record<string, string> = {
  PYTHON: 'python',
  JAVA: 'java',
  CPP: 'cpp',
};

export default function CodeEditor({ language, value, onChange, readOnly }: CodeEditorProps) {
  return (
    <div className="code-editor-wrapper">
      <Editor
        height="400px"
        language={LANGUAGE_MAP[language] || 'python'}
        value={value}
        onChange={(val) => onChange(val || '')}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly: readOnly || false,
          padding: { top: 16 },
          lineNumbers: 'on',
          roundedSelection: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
        }}
      />
    </div>
  );
}
