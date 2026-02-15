import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TableConfig } from '../types';
import { Play, History, Clock, Settings, User, TrendingUp, ShieldAlert, CheckCircle2, LogOut, Cloud, Edit2, Check, X, Download, Upload, Database } from 'lucide-react';
import { audioEngine } from '../lib/audio';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';

export const Dashboard: React.FC = () => {
  const { 
    profile, startSession, history, clearHistory, 
    setSafetyAcknowledged, user, updateMaxHold, logout 
  } = useAppStore();
  
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
    holdIncrement: 15,
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
    <div className="max-w-2xl mx-auto p-6 sm:p-12 space-y-16">
      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] bg-white text-black px-8 py-4 rounded-2xl shadow-2xl font-black text-xs tracking-widest uppercase animate-in fade-in slide-in-from-top-4 duration-500">
          {toast.message}
        </div>
      )}

      <header className="flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-[0.2em] text-white">APNEA<span className="text-white/20">CORE</span></h1>
          <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] mt-1">v1.2.7 Stable</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">{profile.username}</div>
            <div className="text-[10px] text-white/20 uppercase tracking-[0.2em]">
              PB: {Math.floor(profile.maxHoldBaseline / 60)}:{(profile.maxHoldBaseline % 60).toString().padStart(2, '0')}
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="text-white/10 hover:text-white transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Action: Diagnostic */}
      <section>
        <button 
          onClick={() => handleStartSession(diagnosticTable)}
          className="w-full bg-white text-black p-12 rounded-[2rem] flex flex-col items-center gap-4 transition-transform active:scale-[0.98] group"
        >
          <Clock size={32} strokeWidth={2.5} />
          <div className="text-center">
            <div className="font-black text-2xl uppercase tracking-tighter">Diagnostic</div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Update Baseline</div>
          </div>
        </button>
      </section>

      {/* Training Tables */}
      <section className="space-y-8">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Training</h2>
          <button 
            onClick={() => setDynamicScalingEnabled(!dynamicScalingEnabled)}
            className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
              dynamicScalingEnabled ? 'text-blue-500' : 'text-white/10'
            }`}
          >
            Scaling {dynamicScalingEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {profile.maxHoldBaseline > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleStartSession(smartCO2)}
              className="bg-[#080808] border border-white/5 p-8 rounded-3xl text-center hover:border-white/20 transition-all active:scale-95"
            >
              <h3 className="font-black text-lg text-white uppercase tracking-tight">CO2 Tolerance</h3>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mt-2">
                8 Rounds • {smartCO2.initialHoldTime}s Hold
              </p>
            </button>
            <button
              onClick={() => handleStartSession(smartO2)}
              className="bg-[#080808] border border-white/5 p-8 rounded-3xl text-center hover:border-white/20 transition-all active:scale-95"
            >
              <h3 className="font-black text-lg text-white uppercase tracking-tight">O2 Hypoxia</h3>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mt-2">
                8 Rounds • {smartO2.initialRestTime}s Rest
              </p>
            </button>
          </div>
        ) : (
          <div className="bg-[#050505] border border-dashed border-white/5 rounded-3xl p-12 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Run Diagnostic to Unlock</p>
          </div>
        )}
      </section>

      {/* Data Management - Simplified */}
      <section className="flex justify-center gap-12 pt-8 border-t border-white/5">
        <button onClick={handleExport} className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors flex items-center gap-2">
          <Download size={14} /> Export
        </button>
        <button onClick={handleImport} className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors flex items-center gap-2">
          <Upload size={14} /> Import
        </button>
        <button 
          onClick={() => {
            setNewPBValue(profile.maxHoldBaseline.toString());
            setIsEditingPB(true);
          }}
          className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors flex items-center gap-2"
        >
          <Edit2 size={14} /> Record
        </button>
      </section>

      {/* Safety Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black">
          <div className="max-w-sm w-full space-y-12">
            <div className="flex justify-center">
              <ShieldAlert size={64} className="text-white" strokeWidth={1} />
            </div>
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-black text-white tracking-tighter italic uppercase">Safety Warning</h2>
              <div className="text-white/40 text-[10px] font-black uppercase tracking-widest leading-loose">
                <p className="text-white underline mb-4">DRY TRAINING ONLY.</p>
                <p>NEVER IN WATER. NEVER ALONE. NEVER WHILE DRIVING.</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSafetyAcknowledged(true);
                setShowSafetyModal(false);
                if (pendingTable) startSession(pendingTable);
              }}
              className="w-full bg-white text-black font-black py-6 rounded-2xl text-xs tracking-[0.3em] hover:bg-gray-200 transition-colors"
            >
              I ACCEPT
            </button>
          </div>
        </div>
      )}

      {/* Record Editor Modal (Simple) */}
      {isEditingPB && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
          <div className="bg-white p-12 rounded-[2rem] w-full max-w-xs space-y-8">
            <div className="text-center">
              <h3 className="text-black font-black uppercase tracking-widest text-xs mb-8">Set New Record</h3>
              <input 
                type="number" 
                value={newPBValue}
                onChange={(e) => setNewPBValue(e.target.value)}
                className="w-full bg-transparent text-black text-6xl font-black text-center outline-none border-b-4 border-black pb-4 mb-4"
                placeholder="0"
                autoFocus
              />
              <p className="text-[10px] font-black uppercase text-black/40">Seconds</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsEditingPB(false)} className="flex-1 text-[10px] font-black uppercase tracking-widest text-black/20">Cancel</button>
              <button onClick={handleSavePB} className="flex-1 bg-black text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};
