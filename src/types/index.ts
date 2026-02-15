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
  dynamicScaling?: boolean; // New option
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
  difficultyScore?: number;
  notes?: string;
}
