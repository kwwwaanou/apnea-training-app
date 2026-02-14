import React from 'react';
import { useAppStore, TableConfig } from '../store/useAppStore';
import { Play, History, Clock, Settings } from 'lucide-react';
import { audioEngine } from '../lib/audio';

const DEFAULT_TABLES: TableConfig[] = [
  {
    id: 'co2-standard',
    name: 'Standard CO2',
    type: 'CO2',
    rounds: 8,
    initialHoldTime: 120,
    initialRestTime: 120,
    holdIncrement: 0,
    restDecrement: 15
  },
  {
    id: 'o2-standard',
    name: 'Standard O2',
    type: 'O2',
    rounds: 8,
    initialHoldTime: 120,
    initialRestTime: 120,
    holdIncrement: 15,
    restDecrement: 0
  }
];

export const Dashboard: React.FC = () => {
  const { startSession, history, clearHistory } = useAppStore();

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8 sm:space-y-12">
      <header className="flex justify-between items-center py-4 sm:py-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">APNEA<span className="text-primary">CORE</span></h1>
        <button className="text-gray-500 hover:text-white">
          <Settings size={24} />
        </button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DEFAULT_TABLES.map((table) => (
          <button
            key={table.id}
            onClick={() => {
              audioEngine.init();
              startSession(table);
            }}
            className="group relative bg-gray-900 border border-gray-800 p-8 rounded-2xl text-left hover:border-primary transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
               <Play size={48} fill="currentColor" className="text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{table.name}</h3>
            <p className="text-gray-400 text-sm">
              {table.rounds} rounds • {table.initialHoldTime}s hold • {table.type === 'CO2' ? 'Decreasing rest' : 'Increasing hold'}
            </p>
          </button>
        ))}
      </section>

      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History size={20} className="text-primary" />
            Recent Sessions
          </h2>
          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              className="text-xs text-gray-500 hover:text-red-500"
            >
              Clear All
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-2xl p-12 text-center">
            <p className="text-gray-500 italic">No training sessions recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((record) => (
              <div key={record.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-semibold">{record.tableName}</h4>
                  <p className="text-xs text-gray-500">{new Date(record.timestamp).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                   <div className="text-sm font-mono text-primary">{record.completedRounds} Rounds</div>
                   <div className="text-[10px] text-gray-600 uppercase tracking-widest">Completed</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="pt-12 text-center">
        <p className="text-xs text-gray-700 uppercase tracking-[0.2em]">Breathe Deep. Train Hard.</p>
      </footer>
    </div>
  );
};
