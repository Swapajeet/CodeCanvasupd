import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  limit 
} from 'firebase/firestore';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  roomId: string;
  username: string;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: any;
}

export default function Chat({ roomId, username }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!roomId) return;

    const messagesRef = collection(db, `sessions/${roomId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(newMessages);
    }, (error) => {
      console.error("Firestore Chat Error:", error);
    });

    return () => unsubscribe();
  }, [roomId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !roomId) return;

    const text = input;
    setInput('');

    try {
      await addDoc(collection(db, `sessions/${roomId}/messages`), {
        sender: username,
        text: text,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617]/40 backdrop-blur-sm">
      <div className="p-4 border-b border-slate-800 bg-[#020617]/60">
        <h3 className="font-semibold text-sm uppercase tracking-widest text-slate-400">Live Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex flex-col ${msg.sender === username ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  {msg.sender}
                </span>
                <span className="text-[10px] text-slate-600">
                  {msg.timestamp?.toDate ? 
                    new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                    '...'
                  }
                </span>
              </div>
              <div 
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  msg.sender === username 
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/10' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-[#020617]/60">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
