import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Dashboard } from './components/Dashboard';
import { TimerView } from './components/TimerView';
import { AuthView } from './components/AuthView';
import { supabase } from './lib/supabase';

function App() {
  const { isActive, user, setUser } = useAppStore();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AuthView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {isActive ? <TimerView /> : <Dashboard />}
    </div>
  );
}

export default App;
