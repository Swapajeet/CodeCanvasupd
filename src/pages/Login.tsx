import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Code2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (isLoading) return;
    
    // Defensive check
    if (auth.currentUser) {
      navigate('/');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        navigate('/');
      }
    } catch (err: any) {
      console.warn('Firebase Auth Operation Status:', err.code, err.message);
      
      if (err.code === 'auth/popup-blocked') {
        setError('The login popup was blocked. Please enable popups for this site and try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`This domain (${window.location.hostname}) is not authorized in Firebase. Please add it to your Firebase Console under 'Authentication' > 'Settings' > 'Authorized Domains'.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        // Not really a "failure", user just closed it. Show a gentle message.
        setError('Sign-in window was closed before completion. Please try again when you are ready.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Sign-in request was cancelled. Please try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error: Unable to reach login service. Please check your connection.');
      } else if (err.message?.includes('INTERNAL ASSERTION FAILED')) {
        setError('A temporary authentication error occurred. Please refresh the page and try again.');
      } else {
        setError(err.message || 'An unexpected error occurred during login.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
            <Code2 size={40} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">Code Canvas</h1>
        <p className="text-slate-400 mb-8 font-sans">
          Collaborate in real-time. Share code, draw together, and build amazing things.
        </p>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-left"
          >
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-200 leading-relaxed font-sans">{error}</p>
          </motion.div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLoading}
          id="google-login-btn"
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          )}
          <span>{isLoading ? 'Connecting...' : 'Sign in with Google'}</span>
        </button>

        <div className="mt-8 pt-8 border-t border-slate-800">
          <div className="flex items-center justify-center gap-4 text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs uppercase tracking-wider font-medium">Real-time Sync</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-xs uppercase tracking-wider font-medium">Shared Canvas</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
