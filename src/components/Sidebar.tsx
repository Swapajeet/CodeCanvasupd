import React, { useState } from 'react';
import { Users, Copy, Check, Play, Save, Database, Terminal, LogIn, Globe, File, FolderPlus, FilePlus, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import axios from 'axios';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { SUPPORTED_LANGUAGES, Language } from '../constants';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface SidebarProps {
  users: { username: string; color: string }[];
  roomId: string;
  onExecute: () => void;
  isExecuting: boolean;
  files: Record<string, { content: string; language: string }>;
  activeFile: string;
  currentUser: any;
  onFileSelect: (name: string) => void;
  onCreateFile: (name: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFile: (name: string) => void;
}

export default function Sidebar({ 
  users, 
  roomId, 
  onExecute, 
  isExecuting,
  files,
  activeFile,
  currentUser,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onDeleteFile
}: SidebarProps) {
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [sectionsExpanded, setSectionsExpanded] = useState({
    explorer: true,
    details: true,
    contributors: true,
    runtime: true
  });

  const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const signInWithGoogle = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      // Add custom parameter to force account selection and potentially help with some iframe issues
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Sign in failed:", err);
      if (err.code === 'auth/popup-blocked') {
        alert("Sign-in popup was blocked by your browser. Please allow popups for this site and try again.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Just ignore this one as it's usually a secondary click
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User closed it, no need for major alert
      } else {
        alert("Failed to sign in with Google: " + err.message);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
      if (confirm("You must be signed in to save sessions. Would you like to sign in with Google?")) {
        await signInWithGoogle();
      }
      return;
    }

    setIsSaving(true);
    const path = `sessions/${roomId}`;
    try {
      await setDoc(doc(db, 'sessions', roomId), {
        files,
        activeFile,
        updatedAt: serverTimestamp(),
        lastSavedBy: auth.currentUser.uid
      }, { merge: true });
      alert("Session saved successfully!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const promptNewFile = () => {
    let parent = '';
    if (selectedNode) {
      if (!files[selectedNode]) {
        parent = selectedNode;
      } else {
        const parts = selectedNode.split('/');
        parts.pop();
        parent = parts.join('/');
      }
    }
    const name = prompt("Enter file name (e.g. index.js, styles.css):", parent ? `${parent}/` : '');
    if (name) onCreateFile(name);
  };

  const promptNewFolder = () => {
    let parent = '';
    if (selectedNode) {
      if (!files[selectedNode]) {
        parent = selectedNode;
      } else {
        const parts = selectedNode.split('/');
        parts.pop();
        parent = parts.join('/');
      }
    }
    const name = prompt("Enter folder name:", parent ? `${parent}/` : '');
    if (name) onCreateFolder(name);
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  // Organize files into a tree structure
  const buildTree = () => {
    const tree: any = { root: {} };
    Object.keys(files).forEach(path => {
      const parts = path.split('/');
      let current = tree.root;
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? { __is_file: true, path } : {};
        }
        current = current[part];
      });
    });
    return tree;
  };

  const renderTree = (node: any, name: string, level: number = 0, parentPath: string = '') => {
    const itemPath = name === 'root' ? '' : (parentPath ? `${parentPath}/${name}` : name);

    if (node.__is_file) {
      if (name === '.keep') return null; // Hide placeholder files
      const isSelected = selectedNode === node.path;
      return (
        <div 
          key={node.path}
          onClick={() => { onFileSelect(node.path); setSelectedNode(node.path); }}
          className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-slate-800/50 group ${isSelected ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
          style={{ paddingLeft: `${level * 12 + 16}px` }}
        >
          <File size={14} className={isSelected ? 'text-blue-400' : 'text-slate-500'} />
          <span className="text-[12px] flex-1 truncate">{name}</span>
          <button 
            onClick={(e) => { e.stopPropagation(); if(confirm(`Delete ${name}?`)) onDeleteFile(node.path); }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
          >
            <Trash2 size={12} />
          </button>
        </div>
      );
    }

    const isExpanded = expandedFolders[itemPath] || level === 0;
    const isSelected = selectedNode === itemPath;
    return (
      <div key={itemPath} className="w-full">
        <div 
          onClick={() => { toggleFolder(itemPath); setSelectedNode(itemPath); }}
          className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-slate-800/50 group ${isSelected ? 'text-blue-400 bg-slate-800/20' : 'text-slate-300'}`}
          style={{ paddingLeft: `${level * 12 + 16}px` }}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-[11px] font-bold uppercase tracking-tight flex-1 truncate">{name === 'root' ? 'PROJECT' : name}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                const fileName = prompt("New file in " + (name === 'root' ? 'PROJECT' : name) + ":", itemPath ? `${itemPath}/` : '');
                if (fileName) onCreateFile(fileName);
              }} 
              className="p-1 hover:text-white" 
              title="New File"
            >
              <FilePlus size={12} />
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                const folderName = prompt("New folder in " + (name === 'root' ? 'PROJECT' : name) + ":", itemPath ? `${itemPath}/` : '');
                if (folderName) onCreateFolder(folderName);
              }} 
              className="p-1 hover:text-white" 
              title="New Folder"
            >
              <FolderPlus size={12} />
            </button>
            {name !== 'root' && (
              <button 
                onClick={(e) => { e.stopPropagation(); if(confirm(`Delete folder ${name} and all its contents?`)) onDeleteFile(itemPath); }}
                className="p-1 hover:text-red-400"
                title="Delete Folder"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
        {isExpanded && (
          <div className="flex flex-col">
            {Object.keys(node).sort((a,b) => {
              if (node[a].__is_file && !node[b].__is_file) return 1;
              if (!node[a].__is_file && node[b].__is_file) return -1;
              return a.localeCompare(b);
            }).map(key => renderTree(node[key], key, level + 1, itemPath))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree();

  return (
    <div className="w-full flex flex-col h-full bg-[#0d1117] text-slate-400 select-none">
      <div 
        onClick={() => toggleSection('explorer')}
        className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-[#161b22] cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {sectionsExpanded.explorer ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="text-[10px] font-bold uppercase tracking-wider">Explorer</span>
        </div>
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={promptNewFile} className="hover:text-white" title="New File"><FilePlus size={14} /></button>
          <button onClick={promptNewFolder} className="hover:text-white" title="New Folder"><FolderPlus size={14} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-2">
        {/* File Explorer Tree */}
        {sectionsExpanded.explorer && (
          <div className="mb-4">
            {Object.keys(tree).map(key => renderTree(tree[key], key))}
          </div>
        )}

        {/* Room Info Section */}
        <div className="mb-1 border-t border-slate-800/50 pt-1">
          <div 
            onClick={() => toggleSection('details')}
            className="px-4 py-1.5 flex items-center gap-2 hover:bg-slate-800/50 cursor-pointer text-slate-300"
          >
            <div className="flex items-center gap-2">
              {sectionsExpanded.details ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Users size={14} className="text-blue-500" />
              <span className="text-[11px] font-semibold uppercase">Room Details</span>
            </div>
          </div>
          {sectionsExpanded.details && (
            <div className="px-8 py-2 space-y-3">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500">Room ID</span>
                <div className="flex items-center justify-between gap-2 bg-[#161b22] px-2 py-1.5 rounded border border-slate-800">
                  <span className="font-mono text-[11px] text-blue-400 truncate">{roomId}</span>
                  <button 
                    onClick={copyRoomId}
                    className="hover:text-white transition-colors"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
              
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-white text-[11px] font-semibold rounded border border-slate-700 transition-all disabled:opacity-50"
              >
                <Save size={14} /> {isSaving ? "SAVING..." : "SAVE SNAPSHOT"}
              </button>
            </div>
          )}
        </div>

        {/* Contributors Section */}
        <div className="border-t border-slate-800/50 pt-1">
          <div 
            onClick={() => toggleSection('contributors')}
            className="px-4 py-1.5 flex items-center justify-between hover:bg-slate-800/50 cursor-pointer text-slate-300"
          >
            <div className="flex items-center gap-2">
              {sectionsExpanded.contributors ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Users size={14} className="text-emerald-500" />
              <span className="text-[11px] font-semibold uppercase">Contributors</span>
            </div>
            <span className="text-[9px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded-full font-bold">
              {users.length}
            </span>
          </div>
          {sectionsExpanded.contributors && (
            <div className="px-6 py-2 space-y-1">
              {users.map((user, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-800/30 rounded cursor-default group">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: user.color, boxShadow: `0 0 6px ${user.color}44` }} 
                  />
                  <span className="text-[12px] truncate group-hover:text-slate-200 transition-colors">
                    {user.username} {user.username === currentUser?.displayName ? "(You)" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer / User Profile */}
      <div className="border-t border-slate-800 p-3 bg-[#161b22]">
        {!currentUser || currentUser.isAnonymous ? (
          <button 
            onClick={signInWithGoogle}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded transition-all disabled:opacity-50"
          >
            <LogIn size={14} className={isLoggingIn ? "animate-spin" : ""} /> {isLoggingIn ? "SIGNING IN..." : "SIGN IN WITH GOOGLE"}
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <img src={currentUser.photoURL} alt="" className="w-6 h-6 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-slate-200 truncate">{currentUser.displayName}</span>
                <span className="text-[9px] text-slate-500 truncate">{currentUser.email}</span>
              </div>
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogIn size={14} className="rotate-180" />
            </button>
          </div>
        )}
      </div>
    </div>

  );
}
