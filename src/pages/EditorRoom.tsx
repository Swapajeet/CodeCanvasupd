import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../lib/socket';
import { useAuth } from '../lib/AuthContext';
import Editor from '../components/Editor';
import Whiteboard from '../components/Whiteboard';
import Chat from '../components/Chat';
import Sidebar from '../components/Sidebar';
import { SUPPORTED_LANGUAGES, Language } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import TerminalComponent from '../components/TerminalComponent';
import { Terminal, Presentation, MessageSquare, Users, Play, LogOut, User as UserIcon } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import pkg from 'lodash';
const { debounce } = pkg;

export default function EditorRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const username = user?.displayName || location.state?.username;
  
  const [activeTab, setActiveTab] = useState<'editor' | 'whiteboard'>('editor');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [users, setUsers] = useState<{ username: string; color: string }[]>([]);
  const [files, setFiles] = useState<Record<string, { content: string; language: string }>>({});
  const [activeFile, setActiveFile] = useState('main.js');
  const [terminalOutput, setTerminalOutput] = useState('> Initialized compiler proxy...');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTerminalTab, setActiveTerminalTab] = useState<'terminal' | 'output' | 'debug'>('terminal');
  const [codeOutput, setCodeOutput] = useState<string>('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Debounced socket emission for code changes
  const debouncedEmitCode = useCallback(
    debounce((roomId: string, files: any, activeFile: string) => {
      socket.emit('code-change', { roomId, files, activeFile });
    }, 500),
    []
  );

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput]);

  useEffect(() => {
    if (!username) {
      const timer = setTimeout(() => {
        if (!username) navigate('/');
      }, 2000);
      return () => clearTimeout(timer);
    }

    const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    const userId = user?.uid;

    socket.emit('join-room', { roomId, username, color, userId });

    socket.on('room-init', ({ files, activeFile, users }) => {
      if (files) setFiles(files);
      if (activeFile) setActiveFile(activeFile);
      setUsers(users || []);
    });

    socket.on('code-update', ({ files, activeFile }) => {
      if (files) setFiles(files);
      if (activeFile) setActiveFile(activeFile);
    });

    socket.on('update-users', (updatedUsers) => {
      setUsers(updatedUsers);
    });

    return () => {
      socket.off('room-init');
      socket.off('code-update');
      socket.off('update-users');
      debouncedEmitCode.cancel();
    };
  }, [roomId, username, navigate, debouncedEmitCode]);

  const handleCodeChange = (newCode: string) => {
    if (!files[activeFile]) return;
    
    // Update local state immediately for responsiveness
    const updatedFiles = { 
      ...files, 
      [activeFile]: { ...files[activeFile], content: newCode } 
    };
    setFiles(updatedFiles);
    
    // Debounce the emission to the server/others
    debouncedEmitCode(roomId!, updatedFiles, activeFile);
  };

  const createFile = (name: string) => {
    if (files[name]) return alert('File already exists');
    
    // Improved extension mapping
    const extMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'html': 'html',
      'css': 'css',
      'json': 'json'
    };

    const extension = name.split('.').pop()?.toLowerCase() || '';
    const monacoLang = extMap[extension] || 'javascript';
    
    // Find matching template if possible
    const lang = SUPPORTED_LANGUAGES.find(l => l.monaco === monacoLang) || SUPPORTED_LANGUAGES[0];
    
    const updatedFiles = { ...files, [name]: { content: lang.template, language: monacoLang } };
    setFiles(updatedFiles);
    setActiveFile(name);
    socket.emit('code-change', { roomId, files: updatedFiles, activeFile: name });
  };

  const createFolder = (name: string) => {
    const placeholder = `${name}/.keep`;
    if (files[placeholder]) return alert('Folder already exists');
    const updatedFiles = { ...files, [placeholder]: { content: '', language: 'text' } };
    setFiles(updatedFiles);
    socket.emit('code-change', { roomId, files: updatedFiles, activeFile });
  };

  const deleteFile = (name: string) => {
    if (Object.keys(files).length <= 1) return alert('Cannot delete the last file');
    
    const updatedFiles = { ...files };
    let wasActive = false;

    // Recursive delete for folders (if name doesn't exist as exact key, it might be a folder name from the tree)
    if (files[name]) {
      // It's a file
      if (activeFile === name) wasActive = true;
      delete updatedFiles[name];
    } else {
      // Check if it's a folder (multiple files starting with name/)
      const prefix = `${name}/`;
      Object.keys(files).forEach(path => {
        if (path.startsWith(prefix)) {
          if (activeFile === path) wasActive = true;
          delete updatedFiles[path];
        }
      });
    }

    if (Object.keys(updatedFiles).length === 0) {
      alert('Cannot delete everything. Project must have at least one file.');
      return;
    }

    setFiles(updatedFiles);
    let nextActive = activeFile;
    if (wasActive) {
      nextActive = Object.keys(updatedFiles)[0];
      setActiveFile(nextActive);
    }
    socket.emit('code-change', { roomId, files: updatedFiles, activeFile: nextActive });
  };

  const shareRoom = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Room link copied to clipboard! Share it with your team.');
  };

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on('terminal-output', ({ output }: { output: string }) => {
      setTerminalOutput(prev => prev + output);
      setCodeOutput(prev => prev + output);
      
      // If we see execution signals, update UI state
      if (output.includes('> Starting:') || output.includes('> Requesting execution')) {
        setIsExecuting(true);
      } else if (output.includes('> Process exited with code')) {
        setIsExecuting(false);
      }
    });

    return () => {
      socket.off('terminal-output');
    };
  }, [socket, roomId, activeTerminalTab]);

  const handleCommand = async (command: string) => {
    if (!socket || !roomId) return;

    // Only show command prefix if we're not piping to a running process
    // The server-side logic handles the actual routing
    if (!isExecuting) {
      setTerminalOutput(prev => prev + `$ ${command}\n`);
    } else {
      // For interactive stdin, maybe just echo the input locally
      setTerminalOutput(prev => prev + `${command}\n`);
    }
    socket.emit('terminal-input', { roomId, input: command });
  };

  const handleExecute = async () => {
    const file = files[activeFile];
    if (!file) return;

    setIsExecuting(true);
    setTerminalOutput(prev => prev + `\r\n> Requesting execution of ${activeFile}...\r\n`);
    setCodeOutput('');
    setIsTerminalOpen(true);
    setActiveTerminalTab('output'); // Switch to output tab for the execution results
    
    try {
      await axios.post('/api/run', { 
        roomId,
        files 
      });
      // Logic for output is now handled by socket 'terminal-output'
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      setTerminalOutput(prev => prev + `> Execution error: ${errorMsg}\n`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-10 border-b border-slate-800 flex items-center justify-between px-3 bg-[#161b22] z-20">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => { if(confirm("Leave room and go back home?")) navigate('/'); }}
            className="flex items-center gap-2 text-blue-400 font-bold cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Terminal size={14} />
            <span className="text-[11px] uppercase tracking-wider font-mono">Code Canvas — {roomId}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExecute}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold rounded transition-all shadow-lg shadow-emerald-500/10"
          >
            <Play size={14} fill="currentColor" /> {isExecuting ? 'RUNNING...' : 'RUN'}
          </button>
          
          <button 
            onClick={shareRoom}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded transition-all shadow-lg shadow-blue-500/10"
          >
            <Users size={14} /> SHARE ROOM
          </button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <div className="flex -space-x-1.5 mr-2">
            {users.slice(0, 3).map((u, i) => (
              <div 
                key={i} 
                title={u.username}
                className="w-6 h-6 rounded-full border border-[#0d1117] flex items-center justify-center text-[8px] font-bold uppercase shadow-inner"
                style={{ backgroundColor: u.color }}
              >
                {u.username[0]}
              </div>
            ))}
            {users.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-[#0d1117] flex items-center justify-center text-[8px] font-bold text-slate-400">
                +{users.length - 3}
              </div>
            )}
          </div>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button 
            onClick={() => { if(confirm("Are you sure you want to logout?")) signOut(auth); }}
            className="p-1 px-2 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-all flex items-center gap-1.5"
            title="Logout"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
            ) : (
              <UserIcon size={14} />
            )}
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* VS Code Activity Bar (Far Left) */}
        <div className="w-12 bg-[#0d1117] border-r border-slate-800 flex flex-col items-center py-4 gap-6">
          <button 
            onClick={() => { setActiveTab('editor'); setIsSidebarOpen(true); }}
            className={`p-2 transition-colors ${activeTab === 'editor' && isSidebarOpen ? 'text-white border-l-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Terminal size={24} />
          </button>
          <button 
            onClick={() => { setActiveTab('whiteboard'); setIsSidebarOpen(true); }}
            className={`p-2 transition-colors ${activeTab === 'whiteboard' && isSidebarOpen ? 'text-white border-l-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Presentation size={24} />
          </button>
          
          <div className="mt-auto mb-4 flex flex-col gap-4">
            <button 
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className={`p-2 transition-colors ${isTerminalOpen ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="Toggle Terminal"
            >
              <Terminal size={24} className="rotate-90" />
            </button>
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-2 transition-colors ${isChatOpen ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Toggle Chat"
            >
              <MessageSquare size={24} />
            </button>
          </div>
        </div>

        {/* Sidebar Container */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-slate-800 bg-[#0d1117] overflow-hidden"
            >
              <Sidebar 
                users={users} 
                roomId={roomId!} 
                onExecute={handleExecute} 
                isExecuting={isExecuting}
                files={files}
                activeFile={activeFile}
                currentUser={user}
                onFileSelect={setActiveFile}
                onCreateFile={createFile}
                onCreateFolder={createFolder}
                onDeleteFile={deleteFile}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 relative flex flex-col bg-[#0d1117]">
          <div className="flex-1 relative">
            <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'editor' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <Editor 
                initialCode={files[activeFile]?.content || ''} 
                language={files[activeFile]?.language || 'javascript'} 
                onChange={handleCodeChange}
              />
            </div>
            <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'whiteboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <Whiteboard roomId={roomId!} />
            </div>
          </div>

          {/* VS Code Bottom Terminal Area */}
          <AnimatePresence>
            {isTerminalOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 240 }}
                exit={{ height: 0 }}
                className="border-t border-slate-800 bg-[#0d1117] flex flex-col"
              >
                <TerminalComponent 
                  terminalOutput={terminalOutput}
                  codeOutput={codeOutput}
                  onCommand={handleCommand}
                  isExecuting={isExecuting}
                  activeTab={activeTerminalTab}
                  setActiveTab={setActiveTerminalTab}
                  onClose={() => setIsTerminalOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Drawer */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="border-l border-slate-800 flex flex-col bg-[#0d1117]"
            >
              <Chat roomId={roomId!} username={username} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
