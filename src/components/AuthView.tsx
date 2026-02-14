import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Mail, Lock, UserPlus, Loader2 } from 'lucide-react';

export const AuthView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Registration successful! Check your email for confirmation.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      let errorMessage = error.message || 'An error occurred';
      
      if (errorMessage.includes('Invalid API key') || errorMessage.includes('apiKey')) {
        errorMessage = 'Configuration Error: Invalid API key. Please check your environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) in Vercel.';
      } else if (errorMessage.includes('rate limit') || error.status === 429) {
        errorMessage = 'Email rate limit exceeded. Please wait a few minutes before trying again, or try signing in with a different method.';
      } else if (error.message === 'Failed to fetch') {
        errorMessage = 'Network error: Please check your internet connection or verify your Supabase configuration.';
      }

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email first' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Magic link sent! Check your email.' });
    } catch (error: any) {
      let errorMessage = error.message || 'An error occurred';
      
      if (errorMessage.includes('Invalid API key') || errorMessage.includes('apiKey')) {
        errorMessage = 'Configuration Error: Invalid API key. Please check your environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) in Vercel.';
      } else if (errorMessage.includes('rate limit') || error.status === 429) {
        errorMessage = 'Email rate limit exceeded. Please wait a few minutes before trying again, or use your password to sign in.';
      } else if (error.message === 'Failed to fetch') {
        errorMessage = 'Network error: Please check your connection.';
      }

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-500/20 p-4 rounded-full">
            <LogIn className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-2">
          {isSignUp ? 'Create an Account' : 'Welcome Back'}
        </h2>
        <p className="text-slate-400 text-center mb-8">
          Sync your training history to the cloud
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />)}
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4">
          <button
            onClick={handleMagicLink}
            disabled={loading}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Email me a Magic Link instead
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-800 px-2 text-slate-500">Or</span>
            </div>
          </div>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-slate-400 text-sm hover:text-white transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};
