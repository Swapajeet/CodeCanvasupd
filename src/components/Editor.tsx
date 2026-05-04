import React, { useEffect, useState, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import socket from '../lib/socket';

interface EditorProps {
  initialCode: string;
  language: string;
  onChange: (code: string) => void;
}

export default function Editor({ initialCode, language, onChange }: EditorProps) {
  const [code, setCode] = useState(initialCode);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onChange(newCode);
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <MonacoEditor
        height="100%"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 13,
          fontFamily: 'JetBrains Mono',
          minimap: { enabled: false },
          automaticLayout: true,
          padding: { top: 16 },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorSmoothCaretAnimation: "on",
          cursorBlinking: "smooth",
          renderLineHighlight: "all",
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
          },
          lineHeight: 20,
          letterSpacing: 0.5
        }}

      />
    </div>
  );
}
