import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { audioEngine } from '../lib/audio';
import { useWakeLock } from '../hooks/useWakeLock';
import { X, Play, Pause, Square } from 'lucide-react';

export const TimerView: React.FC = () => {
  const { 
    currentPhase, 
    timeLeft, 
    currentRound, 
    activeConfig, 
    tick, 
    stopSession, 
    isActive,
    addHistory 
  } = useAppStore();

  useWakeLock(isActive);

  useEffect(() => {
    let interval: number;
    if (isActive && currentPhase !== 'FINISHED') {
      interval = setInterval(() => {
        tick();
      }, 1000) as unknown as number;
    }
    return () => clearInterval(interval);
  }, [isActive, currentPhase, tick]);

  // Audio Cues
  useEffect(() => {
    if (!isActive) return;

    // Phase start beeps
    if (timeLeft === (activeConfig?.initialHoldTime || 0) && currentPhase === 'HOLD') {
        audioEngine.beepHigh();
    }
    if (timeLeft === (activeConfig?.initialRestTime || 0) && currentPhase === 'BREATHE') {
        audioEngine.beepLow();
    }

    // Countdown beeps
    if (timeLeft <= 3 && timeLeft > 0) {
      audioEngine.beepCountdown();
    }
    
    // 10s warning
    if (timeLeft === 10) {
      audioEngine.beepWarning();
    }
  }, [timeLeft, currentPhase, isActive, activeConfig]);

  // History logging
  const hasSavedHistory = React.useRef(false);

  useEffect(() => {
      if (currentPhase === 'FINISHED' && activeConfig && !hasSavedHistory.current) {
          addHistory({
              id: crypto.randomUUID(),
              configId: activeConfig.id,
              tableName: activeConfig.name,
              timestamp: Date.now(),
              completedRounds: currentRound,
              totalDuration: 0, // Simplified for MVP
              completed: true
          });
          hasSavedHistory.current = true;
      }
      
      if (isActive && currentPhase !== 'FINISHED') {
          hasSavedHistory.current = false;
      }
  }, [currentPhase, activeConfig, currentRound, addHistory, isActive]);

  if (!activeConfig) return null;

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'HOLD': return 'text-accent';
      case 'BREATHE': return 'text-primary';
      case 'PREPARATION': return 'text-yellow-500';
      default: return 'text-white';
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6">
      <div className="absolute top-6 right-6">
        <button onClick={stopSession} className="p-2 text-gray-400 hover:text-white">
          <X size={32} />
        </button>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-xl text-gray-400 uppercase tracking-widest">{activeConfig.name}</h2>
        <p className="text-lg text-gray-500">Round {currentRound} / {activeConfig.rounds}</p>
      </div>

      <div className="flex flex-col items-center justify-center flex-1">
        <h1 className={`text-4xl sm:text-5xl font-bold mb-4 tracking-tighter transition-colors duration-500 ${getPhaseColor()}`}>
          {currentPhase}
        </h1>
        <div className={`text-7xl sm:text-8xl md:text-9xl font-black tabular-nums ${getPhaseColor()}`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="w-full max-w-md bg-gray-900 h-2 rounded-full overflow-hidden mb-12">
        <div 
          className="h-full bg-primary transition-all duration-1000"
          style={{ width: `${(currentRound / activeConfig.rounds) * 100}%` }}
        />
      </div>

      <div className="flex gap-8 mb-12">
        <button 
          onClick={stopSession}
          className="bg-gray-800 p-6 rounded-full text-white hover:bg-gray-700"
        >
          <Square size={32} fill="currentColor" />
        </button>
      </div>
    </div>
  );
};
