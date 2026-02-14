import React, { useState } from 'react';
import { useAppStore, TableConfig } from '../store/useAppStore';
import { Play, History, Clock, Settings, User, TrendingUp, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { audioEngine } from '../lib/audio';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const { 
    profile, setProfile, startSession, history, clearHistory, 
    setSafetyAcknowledged 
  } = useAppStore();
  
  const [usernameInput, setUsernameInput] = useState('');
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [pendingTable, setPendingTable] = useState<TableConfig | null>(null);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 p-8 rounded-3xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black tracking-tight italic">APNEA<span className="text-primary text-blue-500">CORE</span></h1>
            <p className="text-gray-400">Welcome. What should we call you?</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => usernameInput && setProfile(usernameInput)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleStartSession = (table: TableConfig) => {
    audioEngine.init();
    if (!profile.preferences.safetyAcknowledged) {
      setPendingTable(table);
      setShowSafetyModal(true);
    } else {
      startSession(table);
    }
  };

  const smartCO2: TableConfig = {
    id: 'co2-smart',
    name: 'Smart CO2',
    type: 'CO2',
    rounds: 8,
    initialHoldTime: Math.round(profile.maxHoldBaseline * 0.5),
    initialRestTime: Math.round(profile.maxHoldBaseline * 0.5),
    holdIncrement: 0,
    restDecrement: 15
  };

  const smartO2: TableConfig = {
    id: 'o2-smart',
    name: 'Smart O2',
    type: 'O2',
    rounds: 8,
    initialHoldTime: Math.round(profile.maxHoldBaseline * 0.4),
    initialRestTime: profile.maxHoldBaseline,
    holdIncrement: 15,
    restDecrement: 0
  };

  const diagnosticTable: TableConfig = {
    id: 'diagnostic',
    name: 'Max Breath Hold',
    type: 'Diagnostic',
    rounds: 1,
    initialHoldTime: 0,
    initialRestTime: 0,
    holdIncrement: 0,
    restDecrement: 0
  };

  const chartData = history
    .filter(h => h.tableName === 'Max Breath Hold' && h.completed)
    .map(h => ({
      date: new Date(h.timestamp).toLocaleDateString(),
      value: h.totalDuration
    }))
    .reverse();

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
      <header className="flex justify-between items-center py-4">
        <h1 className="text-2xl font-black tracking-tight italic">APNEA<span className="text-blue-500">CORE</span></h1>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold">{profile.username}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest">
              PB: {Math.floor(profile.maxHoldBaseline / 60)}:{(profile.maxHoldBaseline % 60).toString().padStart(2, '0')}
            </div>
          </div>
          <button className="bg-gray-900 p-3 rounded-full border border-gray-800 text-gray-400 hover:text-white">
            <User size={20} />
          </button>
        </div>
      </header>

      {/* Diagnostic & Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              Progress
            </h2>
          </div>
          <div className="h-48 w-full">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">
                Complete multiple diagnostics to see trends
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => handleStartSession(diagnosticTable)}
          className="bg-blue-600 hover:bg-blue-700 p-8 rounded-3xl text-left flex flex-col justify-between transition-colors group"
        >
          <div className="bg-white/10 w-fit p-3 rounded-2xl group-hover:scale-110 transition-transform">
            <Clock size={24} className="text-white" />
          </div>
          <div>
            <div className="text-white font-black text-2xl">Diagnostic</div>
            <div className="text-blue-100 text-sm">Update your baseline</div>
          </div>
        </button>
      </section>

      {/* Training Tables */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Play size={18} className="text-blue-500" fill="currentColor" />
          Training Plans
        </h2>
        {profile.maxHoldBaseline > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleStartSession(smartCO2)}
              className="bg-gray-900 border border-gray-800 p-6 rounded-2xl text-left hover:border-blue-500 transition-all"
            >
              <h3 className="font-bold text-xl mb-1">Adaptive CO2</h3>
              <p className="text-gray-500 text-sm">
                Rounds: 8 • Hold: {smartCO2.initialHoldTime}s (50%)
              </p>
            </button>
            <button
              onClick={() => handleStartSession(smartO2)}
              className="bg-gray-900 border border-gray-800 p-6 rounded-2xl text-left hover:border-blue-500 transition-all"
            >
              <h3 className="font-bold text-xl mb-1">Adaptive O2</h3>
              <p className="text-gray-500 text-sm">
                Rounds: 8 • Rest: {smartO2.initialRestTime}s (100%)
              </p>
            </button>
          </div>
        ) : (
          <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-2xl p-8 text-center space-y-4">
            <p className="text-gray-400">Run a Diagnostic to unlock Adaptive Smart Tables.</p>
          </div>
        )}
      </section>

      {/* History */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <History size={18} className="text-blue-500" />
            Recent Logs
          </h2>
          {history.length > 0 && (
            <button onClick={clearHistory} className="text-xs text-gray-500 hover:text-red-500">
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-2">
          {history.slice(0, 5).map((record) => (
            <div key={record.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-sm">{record.tableName}</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
                  {new Date(record.timestamp).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-blue-500">
                  {record.tableName === 'Max Breath Hold' 
                    ? `${Math.floor(record.totalDuration/60)}:${(record.totalDuration%60).toString().padStart(2, '0')}`
                    : `${record.completedRounds} Rounds`}
                </div>
              </div>
            </div>
          ))}
          {history.length === 0 && (
             <div className="text-gray-600 text-sm italic py-4">No records found.</div>
          )}
        </div>
      </section>

      {/* Safety Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="max-w-md w-full bg-gray-900 border border-red-900/50 p-8 rounded-3xl space-y-6 shadow-2xl">
            <div className="flex justify-center">
              <div className="bg-red-500/10 p-4 rounded-full">
                <ShieldAlert size={48} className="text-red-500" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white">SAFETY FIRST</h2>
              <div className="text-gray-400 text-sm space-y-4">
                <p className="font-bold text-red-400 underline uppercase">NEVER TRAIN ALONE IN WATER.</p>
                <p>Dry training only. Do not practice while driving or operating machinery. Blackouts can happen without warning.</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSafetyAcknowledged(true);
                setShowSafetyModal(false);
                if (pendingTable) startSession(pendingTable);
              }}
              className="w-full bg-white text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <CheckCircle2 size={20} />
              I UNDERSTAND THE RISKS
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
