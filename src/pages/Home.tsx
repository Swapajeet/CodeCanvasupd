import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { motion } from 'motion/react';
import { Code2, PenTool, MessageSquare, ArrowRight, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Home() {
  const { user } = useAuth();
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.displayName) {
      setUsername(user.displayName);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return alert('Please enter a username');
    const id = nanoid(10);
    navigate(`/room/${id}`, { state: { username } });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !username) return alert('Please enter room ID and username');
    navigate(`/room/${roomId}`, { state: { username } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#020617] text-white overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-emerald-600/10 blur-[120px] rounded-full" />
      </div>

      <nav className="absolute top-0 right-0 p-6 flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3 bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-slate-700" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <UserIcon size={16} className="text-slate-400" />
              </div>
            )}
            <span className="text-sm font-medium text-slate-300 hidden sm:inline">{user.displayName}</span>
            <button 
              onClick={handleLogout}
              className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </nav>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full z-10"
      >
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">
              <Code2 size={40} className="text-white" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight">Code Canvas</h1>
          </div>
          <p className="text-slate-400 text-xl max-w-2xl mx-auto font-sans leading-relaxed">
            Real-time collaborative code editor, shared whiteboard, and chat.
            Built for modern development teams.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Room */}
          <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2rem] backdrop-blur-md shadow-2xl">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Code2 className="text-blue-500" /> Create Room
            </h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                Start New Session <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>

          {/* Join Room */}
          <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2rem] backdrop-blur-md shadow-2xl">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <ArrowRight className="text-emerald-500" /> Join Room
            </h2>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Room ID</label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter ID..."
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-sans"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 rounded-2xl transition-all border border-slate-700 active:scale-[0.98]"
              >
                Join Existing
              </button>
            </form>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 text-center text-slate-500">
          {[
            { icon: <PenTool size={20} />, label: 'Whiteboard' },
            { icon: <MessageSquare size={20} />, label: 'Live Chat' },
            { icon: <Code2 size={20} />, label: 'Live Runner' }
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center gap-2 group">
              <div className="p-3 bg-slate-900/50 rounded-2xl mb-2 border border-slate-800 group-hover:border-slate-700 transition-colors shadow-lg shadow-black/20">
                {feature.icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{feature.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
