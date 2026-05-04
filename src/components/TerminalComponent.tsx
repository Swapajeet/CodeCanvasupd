import React, { useState, useEffect, useRef } from 'react';
import { Send, Terminal as TerminalIcon, X } from 'lucide-react';

interface TerminalComponentProps {
  terminalOutput: string;
  codeOutput: string;
  onCommand: (command: string) => void;
  isExecuting: boolean;
  activeTab: 'terminal' | 'output' | 'debug';
  setActiveTab: (tab: 'terminal' | 'output' | 'debug') => void;
  onClose: () => void;
}

export default function TerminalComponent({
  terminalOutput,
  codeOutput,
  onCommand,
  isExecuting,
  activeTab,
  setActiveTab,
  onClose
}: TerminalComponentProps) {
  const [input, setInput] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput, codeOutput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onCommand(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-slate-200">
      {/* Tabs */}
      <div className="h-9 px-4 flex items-center justify-between bg-[#161b22] border-b border-slate-800">
        <div className="flex items-center gap-6 h-full">
          <button 
            onClick={() => setActiveTab('terminal')}
            className={`text-[11px] font-bold h-full tracking-wider transition-all border-b-2 ${activeTab === 'terminal' ? 'text-white border-white' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
          >
            TERMINAL
          </button>
          <button 
            onClick={() => setActiveTab('output')}
            className={`text-[11px] font-bold h-full tracking-wider transition-all border-b-2 ${activeTab === 'output' ? 'text-white border-white' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
          >
            OUTPUT
          </button>
          <button 
            onClick={() => setActiveTab('debug')}
            className={`text-[11px] font-bold h-full tracking-wider transition-all border-b-2 ${activeTab === 'debug' ? 'text-white border-white' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
          >
            DEBUG CONSOLE
          </button>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 flex flex-col p-3 font-mono text-[12px] overflow-hidden">
        <div 
          ref={terminalRef}
          className="flex-1 overflow-y-auto mb-2 leading-relaxed whitespace-pre-wrap"
        >
          {activeTab === 'terminal' && (
            <div className="text-emerald-500/90 whitespace-pre-wrap">
              {terminalOutput}
            </div>
          )}
          {activeTab === 'output' && (
            <div className="text-slate-300">
              <pre className="whitespace-pre-wrap">{codeOutput || "No output history in this session."}</pre>
            </div>
          )}
          {activeTab === 'debug' && (
            <div className="text-slate-500 italic">
              Debugger not attached.
            </div>
          )}
          {isExecuting && (activeTab === 'terminal' || activeTab === 'output') && (
            <div className="inline-block w-2 h-4 bg-emerald-500/50 animate-pulse ml-1 align-middle" />
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-800 pt-2">
          <span className={`${isExecuting ? 'text-emerald-500' : 'text-blue-500'} font-bold`}>
            {isExecuting ? '>' : '$'}
          </span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isExecuting ? "Program is running. Type input here..." : "Type a command (e.g. ls, node main.js)..."}
            className="flex-1 bg-transparent border-none outline-none text-slate-300 placeholder:text-slate-600"
          />
          <button 
            type="submit" 
            disabled={!input.trim() && !isExecuting} 
            className="text-slate-500 hover:text-blue-400 disabled:opacity-30 p-1"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
