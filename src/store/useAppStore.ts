import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Phase = 'PREPARATION' | 'HOLD' | 'BREATHE' | 'FINISHED' | 'DIAGNOSTIC';

export interface UserProfile {
  username: string;
  maxHoldBaseline: number; // seconds
  lastDiagnosticDate: number;
  preferences: {
    voiceCues: boolean;
    safetyAcknowledged: boolean;
  };
}

export interface TableConfig {
  id: string;
  name: string;
  type: 'CO2' | 'O2' | 'Custom' | 'Diagnostic';
  rounds: number;
  initialHoldTime: number; // seconds
  initialRestTime: number; // seconds
  holdIncrement: number;   // seconds
  restDecrement: number;   // seconds
}

export interface SessionRecord {
  id: string;
  username: string;
  configId: string;
  tableName: string;
  timestamp: number;
  completedRounds: number;
  totalDuration: number;
  completed: boolean;
  notes?: string;
}

interface AppState {
  profile: UserProfile | null;
  currentPhase: Phase;
  timeLeft: number;
  currentRound: number;
  history: SessionRecord[];
  activeConfig: TableConfig | null;
  isActive: boolean;
  
  // Actions
  setProfile: (username: string) => void;
  updateMaxHold: (seconds: number) => void;
  startSession: (config: TableConfig) => void;
  stopSession: () => void;
  tick: () => void;
  addHistory: (record: SessionRecord) => void;
  clearHistory: () => void;
  setSafetyAcknowledged: (acknowledged: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: null,
      currentPhase: 'PREPARATION',
      timeLeft: 0,
      currentRound: 1,
      history: [],
      activeConfig: null,
      isActive: false,

      setProfile: (username) => {
        set({
          profile: {
            username,
            maxHoldBaseline: 0,
            lastDiagnosticDate: 0,
            preferences: {
              voiceCues: true,
              safetyAcknowledged: false,
            },
          },
        });
      },

      updateMaxHold: (seconds) => {
        const { profile } = get();
        if (profile) {
          set({
            profile: {
              ...profile,
              maxHoldBaseline: seconds,
              lastDiagnosticDate: Date.now(),
            },
          });
        }
      },

      setSafetyAcknowledged: (acknowledged) => {
        const { profile } = get();
        if (profile) {
          set({
            profile: {
              ...profile,
              preferences: {
                ...profile.preferences,
                safetyAcknowledged: acknowledged,
              },
            },
          });
        }
      },

      startSession: (config) => {
        set({
          activeConfig: config,
          currentPhase: config.type === 'Diagnostic' ? 'DIAGNOSTIC' : 'PREPARATION',
          timeLeft: config.type === 'Diagnostic' ? 0 : 15, // Diagnostic starts at 0 and counts UP
          currentRound: 1,
          isActive: true,
        });
      },

      stopSession: () => {
        const { currentPhase, timeLeft, activeConfig } = get();
        if (currentPhase === 'DIAGNOSTIC') {
          // Diagnostic is finished when user stops it
          const duration = timeLeft;
          get().updateMaxHold(duration);
        }
        set({ isActive: false, currentPhase: 'FINISHED' });
      },

      tick: () => {
        const { timeLeft, currentPhase, currentRound, activeConfig, isActive } = get();
        if (!isActive || !activeConfig) return;

        if (currentPhase === 'DIAGNOSTIC') {
          // Diagnostic counts UP
          set({ timeLeft: timeLeft + 1 });
          return;
        }

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
        set((state) => ({ history: [record, ...state.history].slice(0, 100) }));
      },

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'apnea-storage-v2',
    }
  )
);
