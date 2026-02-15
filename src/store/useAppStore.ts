import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export type Phase = 'PREPARATION' | 'HOLD' | 'BREATHE' | 'FINISHED' | 'DIAGNOSTIC';

export interface UserProfile {
  id: string;
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
  username?: string;
  user_id?: string;
  configId: string;
  tableName: string;
  timestamp: number;
  completedRounds: number;
  totalDuration: number;
  completed: boolean;
  notes?: string;
}

interface AppState {
  user: User | null;
  profile: UserProfile | null;
  currentPhase: Phase;
  timeLeft: number;
  currentRound: number;
  history: SessionRecord[];
  activeConfig: TableConfig | null;
  isActive: boolean;
  isInitialSyncDone: boolean;
  isGuest: boolean;
  isHydrated: boolean; // Add hydration flag
  isPaused: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setGuestUser: (username: string) => void;
  setProfile: (profile: UserProfile) => void;
  logout: () => void;
  syncData: () => Promise<void>;
  updateMaxHold: (seconds: number) => Promise<void>;
  startSession: (config: TableConfig) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;
  tick: () => void;
  addHistory: (record: SessionRecord) => Promise<void>;
  clearHistory: () => void;
  setSafetyAcknowledged: (acknowledged: boolean) => Promise<void>;
  exportData: () => string;
  importData: (jsonData: string) => Promise<{ success: boolean; message: string }>;
  setHydrated: () => void;
}

const initialState = {
  user: null,
  profile: null,
  currentPhase: 'PREPARATION' as Phase,
  timeLeft: 0,
  currentRound: 1,
  history: [],
  activeConfig: null,
  isActive: false,
  isPaused: false,
  isInitialSyncDone: false,
  isGuest: false,
  isHydrated: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setHydrated: () => set({ isHydrated: true }),

      setUser: (user) => {
        const currentUser = get().user;
        // Only trigger update if user actually changed to avoid logout on refresh
        if (user?.id !== currentUser?.id) {
          set({ user, isGuest: false });
          if (user) {
            get().syncData();
          } else {
            set({ profile: null, isInitialSyncDone: false });
          }
        }
      },

      setGuestUser: (username) => {
        const { profile } = get();
        
        // If we already have a profile with this name, just switch to guest mode
        if (profile && profile.username === username) {
          set({ isGuest: true, user: null, isInitialSyncDone: true });
          return;
        }

        const guestProfile: UserProfile = {
          id: 'guest',
          username: username || 'Guest',
          maxHoldBaseline: 0,
          lastDiagnosticDate: 0,
          preferences: { voiceCues: true, safetyAcknowledged: false }
        };
        set({ 
          user: null, 
          isGuest: true, 
          profile: guestProfile,
          history: [], // Clear history for new guest
          isInitialSyncDone: true 
        });
      },

      logout: async () => {
        const { user } = get();
        if (user) {
          await supabase.auth.signOut();
          // For Cloud users, we clear everything to protect privacy
          set({ ...initialState, isHydrated: true });
        } else {
          // For Local (Guest) users, we keep the data even after "disconnect"
          set({ 
            user: null,
            isGuest: false, // Return to landing but keep the rest
            isInitialSyncDone: false
          });
        }
      },

      setProfile: (profile) => {
        set({ profile });
      },

      syncData: async () => {
        const { user, history, isGuest } = get();
        if (!user || isGuest) return;

        try {
          // 1. Fetch Profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const newProfile = {
              id: user.id,
              username: user.email?.split('@')[0] || 'User',
              max_hold_baseline: 0,
              last_diagnostic_date: 0,
              preferences: { voiceCues: true, safetyAcknowledged: false }
            };
            await supabase.from('profiles').insert(newProfile);
            set({ 
              profile: {
                id: user.id,
                username: newProfile.username,
                maxHoldBaseline: 0,
                lastDiagnosticDate: 0,
                preferences: newProfile.preferences
              }
            });
          } else if (profileData) {
            set({
              profile: {
                id: profileData.id,
                username: profileData.username,
                maxHoldBaseline: profileData.max_hold_baseline,
                lastDiagnosticDate: profileData.last_diagnostic_date,
                preferences: profileData.preferences
              }
            });
          }

          // 2. Sync History
          const { data: remoteHistory, error: historyError } = await supabase
            .from('training_sessions')
            .select('*')
            .order('timestamp', { ascending: false });

          if (!historyError && remoteHistory) {
            const formattedRemote = remoteHistory.map(r => ({
              id: r.id,
              user_id: r.user_id,
              configId: r.config_id,
              tableName: r.table_name,
              timestamp: r.timestamp,
              completedRounds: r.completed_rounds,
              totalDuration: r.total_duration,
              completed: r.completed,
              notes: r.notes
            }));

            const newToRemote = history.filter(h => !remoteHistory.find(r => r.id === h.id));

            if (newToRemote.length > 0) {
              const toUpload = newToRemote.map(h => ({
                id: h.id,
                user_id: user.id,
                config_id: h.configId,
                table_name: h.tableName,
                timestamp: h.timestamp,
                completed_rounds: h.completedRounds,
                total_duration: h.totalDuration,
                completed: h.completed,
                notes: h.notes
              }));
              await supabase.from('training_sessions').insert(toUpload);
            }

            const mergedHistory = [...formattedRemote];
            set({ history: mergedHistory.slice(0, 100), isInitialSyncDone: true });
          }
        } catch (error) {
          console.error('Sync failed:', error);
        }
      },

      updateMaxHold: async (seconds) => {
        const { profile, user, isGuest } = get();
        const now = Date.now();
        if (profile) {
          const updatedProfile = {
            ...profile,
            maxHoldBaseline: seconds,
            lastDiagnosticDate: now,
          };
          set({ profile: updatedProfile });

          if (user && !isGuest) {
            try {
              await supabase
                .from('profiles')
                .update({ 
                  max_hold_baseline: seconds, 
                  last_diagnostic_date: now 
                })
                .eq('id', user.id);
            } catch (err) {
              console.error('Failed to update max hold in cloud:', err);
            }
          }
        }
      },

      setSafetyAcknowledged: async (acknowledged) => {
        const { profile, user, isGuest } = get();
        if (profile) {
          const updatedProfile = {
            ...profile,
            preferences: {
              ...profile.preferences,
              safetyAcknowledged: acknowledged,
            },
          };
          set({ profile: updatedProfile });

          if (user && !isGuest) {
            try {
              await supabase
                .from('profiles')
                .update({ preferences: updatedProfile.preferences })
                .eq('id', user.id);
            } catch (err) {
              console.error('Failed to update preferences in cloud:', err);
            }
          }
        }
      },

      startSession: (config) => {
        set({
          activeConfig: config,
          currentPhase: config.type === 'Diagnostic' ? 'DIAGNOSTIC' : 'PREPARATION',
          timeLeft: config.type === 'Diagnostic' ? 0 : 15,
          currentRound: 1,
          isActive: true,
          isPaused: config.type === 'Diagnostic', // Pause by default for Diagnostic
        });
      },

      pauseSession: () => set({ isPaused: true }),
      resumeSession: () => set({ isPaused: false }),

      stopSession: () => {
        const { currentPhase, timeLeft } = get();
        if (currentPhase === 'DIAGNOSTIC') {
          get().updateMaxHold(timeLeft);
        }
        set({ isActive: false, currentPhase: 'FINISHED', isPaused: false });
      },

      tick: () => {
        const { timeLeft, currentPhase, currentRound, activeConfig, isActive, isPaused } = get();
        if (!isActive || !activeConfig || isPaused) return;

        if (currentPhase === 'DIAGNOSTIC') {
          set({ timeLeft: timeLeft + 1 });
          return;
        }

        if (timeLeft > 0) {
          set({ timeLeft: timeLeft - 1 });
        } else {
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

      addHistory: async (record) => {
        const { user } = get();
        set((state) => ({ history: [record, ...state.history].slice(0, 100) }));

        if (user) {
          try {
            await supabase.from('training_sessions').insert({
              id: record.id,
              user_id: user.id,
              config_id: record.configId,
              table_name: record.tableName,
              timestamp: record.timestamp,
              completed_rounds: record.completedRounds,
              total_duration: record.totalDuration,
              completed: record.completed,
              notes: record.notes
            });
          } catch (err) {
            console.error('Failed to add history to cloud:', err);
          }
        }
      },

      clearHistory: () => set({ history: [] }),

      exportData: () => {
        const { profile, history } = get();
        return JSON.stringify({
          version: 1,
          exportDate: Date.now(),
          profile,
          history
        }, null, 2);
      },

      importData: async (jsonData) => {
        try {
          const data = JSON.parse(jsonData);
          if (!data.history || !Array.isArray(data.history)) {
            throw new Error('Invalid backup file format');
          }
          
          set({ 
            history: data.history,
            profile: data.profile || get().profile 
          });
          
          if (get().user && !get().isGuest) {
            await get().syncData();
          }
          
          return { success: true, message: 'Data imported successfully!' };
        } catch (err: any) {
          return { success: false, message: err.message };
        }
      }
    }),
    {
      name: 'apnea-storage-v6', // Bump to v6 for clean state
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: (state) => {
        return (rehydratedState, error) => {
          if (error) {
            console.error('Hydration error:', error);
          } else if (rehydratedState) {
            rehydratedState.setHydrated();
          }
        };
      },
      partialize: (state) => ({
        history: state.history,
        profile: state.profile,
        isGuest: state.isGuest,
        user: state.user
      }),
    }
  )
);
