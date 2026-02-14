import React from 'react';
import { useAppStore } from './store/useAppStore';
import { Dashboard } from './components/Dashboard';
import { TimerView } from './components/TimerView';

function App() {
  const { isActive } = useAppStore();

  return (
    <div className="min-h-screen bg-black text-white">
      {isActive ? <TimerView /> : <Dashboard />}
    </div>
  );
}

export default App;
