import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Phase = 'PREPARATION' | 'HOLD' | 'BREATHE' | 'FINISHED';

export interface TableConfig {
  id: string;
  name: string;
  type: 'CO2' | 'O2' | 'Custom';
  rounds: number;
  initialHoldTime: number; // seconds
  initialRestTime: number; // seconds
  holdIncrement: number;   // seconds
  restDecrement: number;   // seconds
}

export interface SessionRecord {
  id: string;
  configId: string;
  tableName: string;
  timestamp: number;
  completedRounds: number;
  totalDuration: number;
  completed: boolean;
  notes?: string;
}

interface AppState {
  currentPhase: Phase;
  timeLeft: number;
  currentRound: number;
  history: SessionRecord[];
  activeConfig: TableConfig | null;
  isActive: boolean;
  
  // Actions
  startSession: (config: TableConfig) => void;
  stopSession: () => void;
  tick: () => void;
  addHistory: (record: SessionRecord) => void;
  clearHistory: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentPhase: 'PREPARATION',
      timeLeft: 0,
      currentRound: 1,
      history: [],
      activeConfig: null,
      isActive: false,

      startSession: (config) => {
        set({
          activeConfig: config,
          currentPhase: 'PREPARATION',
          timeLeft: 15, // 15s prep by default
          currentRound: 1,
          isActive: true,
        });
      },

      stopSession: () => {
        set({ isActive: false, currentPhase: 'FINISHED' });
      },

      tick: () => {
        const { timeLeft, currentPhase, currentRound, activeConfig, isActive } = get();
        if (!isActive || !activeConfig) return;

        if (timeLeft > 0) {
          set({ timeLeft: timeLeft - 1 });
        } else {
          // Phase transition
          if (currentPhase === 'PREPARATION') {
            set({ 
              currentPhase: 'HOLD', 
              timeLeft: activeConfig.initialHoldTime + (activeConfig.holdIncrement * (currentRound - 1))
            });
          } else if (currentPhase === 'HOLD') {
            set({ 
              currentPhase: 'BREATHE', 
              timeLeft: Math.max(0, activeConfig.initialRestTime - (activeConfig.restDecrement * (currentRound - 1)))
            });
          } else if (currentPhase === 'BREATHE') {
            if (currentRound < activeConfig.rounds) {
              const nextRound = currentRound + 1;
              set({ 
                currentRound: nextRound,
                currentPhase: 'HOLD',
                timeLeft: activeConfig.initialHoldTime + (activeConfig.holdIncrement * (nextRound - 1))
              });
            } else {
              set({ currentPhase: 'FINISHED', isActive: false });
            }
          }
        }
      },

      addHistory: (record) => {
        set((state) => ({ history: [record, ...state.history].slice(0, 50) }));
      },

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'apnea-storage',
      partialize: (state) => ({ history: state.history }), // Only persist history
    }
  )
);
