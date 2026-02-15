import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Dashboard } from './components/Dashboard';
import { TimerView } from './components/TimerView';
import { AuthView } from './components/AuthView';
import { supabase } from './lib/supabase';

function App() {
  const { isActive, user, setUser, isGuest, isHydrated, isInitialSyncDone } = useAppStore();

  useEffect(() => {
    if (!isHydrated) return;

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser, isHydrated]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AuthView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-grow">
        {isActive ? <TimerView /> : <Dashboard />}
      </div>
      <footer className="py-4 text-center text-[10px] text-gray-700 uppercase tracking-widest border-t border-gray-900/50">
        App Version: v1.2.3-stable
      </footer>
    </div>
  );
}

export default App;
