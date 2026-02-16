import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TableConfig } from '../types';
import { Play, History, Clock, Settings, User, TrendingUp, ShieldAlert, CheckCircle2, LogOut, Cloud, Edit2, Check, X, Download, Upload, Database } from 'lucide-react';
import { audioEngine } from '../lib/audio';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const { 
    profile, startSession, history, clearHistory, 
    setSafetyAcknowledged, user, updateMaxHold, logout,
    getEstimatedPB 
  } = useAppStore();
  
  const estimatedPB = getEstimatedPB();
  
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [pendingTable, setPendingTable] = useState<TableConfig | null>(null);
  const [dynamicScalingEnabled, setDynamicScalingEnabled] = useState(false);
  
  // Manual PB Edit State
  const [isEditingPB, setIsEditingPB] = useState(false);
  const [newPBValue, setNewPBValue] = useState('');
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const { exportData, importData } = useAppStore();

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-slate-400">Loading your profile...</p>
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

  const handleSavePB = async () => {
    const seconds = parseInt(newPBValue, 10);
    if (!isNaN(seconds) && seconds >= 0) {
      await updateMaxHold(seconds);
      setIsEditingPB(false);
      showToast('Personal Best updated successfully!');
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apnea-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Backup exported!');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (re) => {
          const content = re.target?.result as string;
          const result = await importData(content);
          if (result.success) {
            showToast(result.message);
          } else {
            alert(result.message);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const smartCO2: TableConfig = {
    id: 'co2-smart',
    name: 'Smart CO2',
    type: 'CO2',
    rounds: 8,
    initialHoldTime: Math.round(profile.maxHoldBaseline * 0.5),
    initialRestTime: Math.round(profile.maxHoldBaseline * 0.5),
    holdIncrement: 0,
    restDecrement: 15,
    dynamicScaling: dynamicScalingEnabled
  };

  const smartO2: TableConfig = {
    id: 'o2-smart',
    name: 'Smart O2',
    type: 'O2',
    rounds: 8,
    initialHoldTime: Math.round(profile.maxHoldBaseline * 0.4),
    initialRestTime: profile.maxHoldBaseline,
    holdIncrement: 5,
    restDecrement: 0,
    dynamicScaling: dynamicScalingEnabled
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
      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-green-500 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 animate-bounce">
          <Check size={20} />
          {toast.message}
        </div>
      )}

      <header className="flex justify-between items-center py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight italic">APNEA<span className="text-blue-500">CORE</span></h1>
          <div className="bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1.5 border border-slate-700">
            <Cloud size={12} className="text-blue-400" />
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Cloud Sync</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-white">{profile.username}</div>
            <div className="flex items-center justify-end gap-2">
              {isEditingPB ? (
                <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                  <input 
                    type="number" 
                    value={newPBValue}
                    onChange={(e) => setNewPBValue(e.target.value)}
                    className="w-16 bg-transparent text-white text-[10px] text-center outline-none"
                    placeholder="Secs"
                    autoFocus
                  />
                  <button onClick={handleSavePB} className="text-green-500 hover:text-green-400">
                    <Check size={12} />
                  </button>
                  <button onClick={() => setIsEditingPB(false)} className="text-red-500 hover:text-red-400">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  {estimatedPB > profile.maxHoldBaseline && (
                    <div className="flex items-center gap-1 mb-0.5 animate-pulse">
                      <div className="bg-green-500/20 border border-green-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <TrendingUp size={10} className="text-green-500" />
                        <span className="text-[9px] text-green-400 font-black uppercase tracking-[0.1em]">
                          Potential: {Math.floor(estimatedPB / 60)}:{(estimatedPB % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">
                      PB: {Math.floor(profile.maxHoldBaseline / 60)}:{(profile.maxHoldBaseline % 60).toString().padStart(2, '0')}
                    </div>
                    <button 
                      onClick={() => {
                        setNewPBValue(profile.maxHoldBaseline.toString());
                        setIsEditingPB(true);
                      }}
                      className="text-gray-600 hover:text-blue-500 transition-colors"
                    >
                      <Edit2 size={10} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="bg-gray-900 p-3 rounded-full border border-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Diagnostic & Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2 text-white">
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
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px' }}
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
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Play size={18} className="text-blue-500" fill="currentColor" />
            Training Plans
          </h2>
          <button 
            onClick={() => setDynamicScalingEnabled(!dynamicScalingEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              dynamicScalingEnabled 
                ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                : 'bg-gray-900 border-gray-800 text-gray-500'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${dynamicScalingEnabled ? 'bg-blue-500 animate-pulse' : 'bg-gray-700'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Dynamic Scaling</span>
          </button>
        </div>
        {profile.maxHoldBaseline > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleStartSession(smartCO2)}
              className="bg-gray-900 border border-gray-800 p-6 rounded-2xl text-left hover:border-blue-500 transition-all"
            >
              <h3 className="font-bold text-xl mb-1 text-white">Adaptive CO2</h3>
              <p className="text-gray-500 text-sm">
                Rounds: 8 • Hold: {smartCO2.initialHoldTime}s (50%)
              </p>
            </button>
            <button
              onClick={() => handleStartSession(smartO2)}
              className="bg-gray-900 border border-gray-800 p-6 rounded-2xl text-left hover:border-blue-500 transition-all"
            >
              <h3 className="font-bold text-xl mb-1 text-white">Adaptive O2</h3>
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

      {/* Data & Settings */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-white">
          <Database size={18} className="text-blue-500" />
          Data & Settings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => {
              setNewPBValue(profile.maxHoldBaseline.toString());
              setIsEditingPB(true);
            }}
            className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col items-center gap-3 hover:border-blue-500 transition-all group"
          >
            <div className="bg-blue-500/10 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <Edit2 size={24} className="text-blue-500" />
            </div>
            {isEditingPB ? (
              <div className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-2 border border-slate-700">
                  <input 
                    type="number" 
                    value={newPBValue}
                    onChange={(e) => setNewPBValue(e.target.value)}
                    className="w-20 bg-transparent text-white text-sm text-center outline-none"
                    placeholder="Secs"
                    autoFocus
                  />
                  <button onClick={handleSavePB} className="bg-green-600 p-1 rounded text-white hover:bg-green-500">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setIsEditingPB(false)} className="bg-red-600 p-1 rounded text-white hover:bg-red-500">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <span className="font-bold text-white">Set Record</span>
            )}
          </button>
          
          <button 
            onClick={handleExport}
            className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col items-center gap-3 hover:border-green-500 transition-all group"
          >
            <div className="bg-green-500/10 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <Download size={24} className="text-green-500" />
            </div>
            <span className="font-bold text-white">Export Backup</span>
          </button>

          <button 
            onClick={handleImport}
            className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col items-center gap-3 hover:border-purple-500 transition-all group"
          >
            <div className="bg-purple-500/10 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <Upload size={24} className="text-purple-500" />
            </div>
            <span className="font-bold text-white">Import Backup</span>
          </button>
        </div>
      </section>

      {/* History */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
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
          {history.slice(0, 8).map((record) => (
            <div key={record.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${record.completed ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                   {record.completed ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white">{record.tableName}</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
                      {new Date(record.timestamp).toLocaleDateString()}
                    </p>
                    {record.difficultyScore && (
                      <span className="text-[10px] text-slate-600">•</span>
                    )}
                    {record.difficultyScore && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div key={s} className={`w-1 h-2 rounded-full ${s <= record.difficultyScore ? 'bg-blue-500' : 'bg-slate-800'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-blue-500">
                  {record.tableName === 'Max Breath Hold' 
                    ? `${Math.floor(record.totalDuration/60)}:${(record.totalDuration%60).toString().padStart(2, '0')}`
                    : `${record.completedRounds} Rounds`}
                </div>
              </div>
            </div>
          ))}
          {history.length === 0 && (
             <div className="text-gray-600 text-sm italic py-4 text-center">No records found. Training sessions will be synced here.</div>
          )}
        </div>
      </section>

      {/* Safety Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
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