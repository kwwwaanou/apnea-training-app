import React, { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { LogIn, Lock, UserPlus, Loader2, Cloud, User, Smartphone } from 'lucide-react';

type AuthMode = 'QUICK_SYNC' | 'LOCAL_ONLY' | 'STANDARD';

export const AuthView: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('QUICK_SYNC');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Explicitly extract setGuestUser and ensure it's stable
  const setGuestUser = useAppStore((state) => state.setGuestUser);

  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (authMode === 'LOCAL_ONLY') {
        const finalUsername = 'Guest';
        
        try {
          if (typeof setGuestUser === 'function') {
            setGuestUser(finalUsername);
          } else {
            throw new Error('Store service is currently unavailable. Please refresh.');
          }
        } catch (storeErr: any) {
          console.error('Store error:', storeErr);
          throw new Error('Application state error. Please try again or refresh.');
        }
        return;
      }

      const finalEmail = authMode === 'QUICK_SYNC' 
        ? `${username.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`
        : email;

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: finalEmail,
          password,
          options: {
            data: {
              username: username || finalEmail.split('@')[0],
            }
          }
        });
        if (error) throw error;
        
        if (authMode === 'QUICK_SYNC') {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: finalEmail,
            password,
          });
          if (signInError) throw signInError;
        } else {
          setMessage({ type: 'success', text: 'Registration successful! Check your email for confirmation.' });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: finalEmail,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let errorMessage = error.message || 'An error occurred';
      
      if (errorMessage.includes('Invalid API key') || errorMessage.includes('apiKey')) {
        errorMessage = 'Configuration Error: Invalid API key. Please check your environment variables.';
      } else if (errorMessage.includes('rate limit') || error.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait a few minutes.';
      }

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [authMode, username, email, password, isSignUp, setGuestUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-500/20 p-4 rounded-full">
            {authMode === 'QUICK_SYNC' ? (
              <Cloud className="w-12 h-12 text-blue-400" />
            ) : authMode === 'LOCAL_ONLY' ? (
              <Smartphone className="w-12 h-12 text-emerald-400" />
            ) : (
              <LogIn className="w-12 h-12 text-purple-400" />
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-6">
          {authMode === 'QUICK_SYNC' ? 'Cloud Sync' : 
           authMode === 'LOCAL_ONLY' ? 'Local Only' : 'Standard Account'}
        </h2>

        {/* Tab Selector */}
        <div className="flex p-1 bg-slate-900 rounded-xl mb-8">
          <button 
            onClick={() => { setAuthMode('QUICK_SYNC'); setMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${authMode === 'QUICK_SYNC' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Quick Sync
          </button>
          <button 
            onClick={() => { setAuthMode('LOCAL_ONLY'); setMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${authMode === 'LOCAL_ONLY' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Local
          </button>
          <button 
            onClick={() => { setAuthMode('STANDARD'); setMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${authMode === 'STANDARD' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Email
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode !== 'LOCAL_ONLY' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                {authMode === 'STANDARD' ? 'Email Address' : 'Username'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={authMode === 'STANDARD' ? 'email' : 'text'}
                  value={authMode === 'STANDARD' ? email : username}
                  onChange={(e) => authMode === 'STANDARD' ? setEmail(e.target.value) : setUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={authMode === 'STANDARD' ? 'you@example.com' : 'Choose a username'}
                  required
                  autoFocus
                />
              </div>
              {authMode === 'QUICK_SYNC' && (
                <p className="text-[10px] text-slate-500 ml-1">Will be stored as {username.trim().toLowerCase() || 'user'}@example.com</p>
              )}
            </div>
          )}

          {authMode !== 'LOCAL_ONLY' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          )}

          {message && (
            <div className={`p-4 rounded-xl text-sm ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              authMode === 'QUICK_SYNC' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20' : 
              authMode === 'LOCAL_ONLY' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' :
              'bg-purple-600 hover:bg-purple-700 shadow-purple-900/20'
            }`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              authMode === 'LOCAL_ONLY' ? <LogIn className="w-5 h-5" /> :
              isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />
            )}
            {authMode === 'LOCAL_ONLY' ? 'Start Training' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {authMode !== 'LOCAL_ONLY' && (
          <div className="mt-6 flex flex-col gap-4">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-slate-400 text-sm hover:text-white transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <p className="text-xs text-slate-400 text-center leading-relaxed">
            {authMode === 'QUICK_SYNC' && "Quick Sync uses a pseudo-email to backup your data to the cloud without needing a real email address."}
            {authMode === 'LOCAL_ONLY' && "Data is saved only on this device. If you clear your browser cache or change devices, your history will be lost."}
            {authMode === 'STANDARD' && "Use your real email for maximum security and account recovery."}
          </p>
          {/* Version tag for mobile users */}
          <div className="pt-8 text-center">
            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">
              v1.3.0-stable
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
