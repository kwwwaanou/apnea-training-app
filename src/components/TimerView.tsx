import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { audioEngine } from '../lib/audio';
import { useWakeLock } from '../hooks/useWakeLock';
import { X, Play, Pause, Square, Info } from 'lucide-react';

export const TimerView: React.FC = () => {
  const { 
    profile,
    currentPhase, 
    timeLeft, 
    currentRound, 
    activeConfig, 
    tick, 
    stopSession, 
    isActive,
    isPaused,
    resumeSession,
    pauseSession,
    togglePause,
    addHistory,
    validateRound,
    isScalingEnabled
  } = useAppStore();

  useWakeLock(isActive && !isPaused && (currentPhase !== 'HOLD' || timeLeft > 0));

  useEffect(() => {
    let interval: number;
    if (isActive && !isPaused && currentPhase !== 'FINISHED') {
      interval = setInterval(() => {
        tick();
      }, 1000) as unknown as number;
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, currentPhase, tick]);

  // Audio Cues
  useEffect(() => {
    if (!isActive) return;

    // Phase start beeps
    if (currentPhase === 'HOLD' && timeLeft === (activeConfig?.initialHoldTime || 0)) {
        audioEngine.beepHigh();
    }
    if (currentPhase === 'BREATHE' && timeLeft === (activeConfig?.initialRestTime || 0)) {
        audioEngine.beepLow();
    }

    // Countdown beeps (last 3s)
    if (currentPhase !== 'DIAGNOSTIC' && timeLeft <= 3 && timeLeft > 0) {
      audioEngine.beepCountdown();
    }
    
    // 10s warning
    if (currentPhase !== 'DIAGNOSTIC' && timeLeft === 10) {
      audioEngine.beepWarning();
    }
  }, [timeLeft, currentPhase, isActive, activeConfig]);

  // History logging for DIAGNOSTIC only (Training is handled in store)
  const hasSavedHistory = React.useRef(false);

  useEffect(() => {
      if (currentPhase === 'FINISHED' && activeConfig?.type === 'Diagnostic' && !hasSavedHistory.current) {
          addHistory({
              id: crypto.randomUUID(),
              username: profile?.username || 'unknown',
              configId: activeConfig.id,
              tableName: activeConfig.name,
              timestamp: Date.now(),
              completedRounds: 1,
              totalDuration: timeLeft,
              completed: true
          });
          hasSavedHistory.current = true;
      }
      
      if (isActive && currentPhase !== 'FINISHED') {
          hasSavedHistory.current = false;
      }
  }, [currentPhase, activeConfig, addHistory, isActive, profile, timeLeft]);

  if (!activeConfig) return null;

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'HOLD': return 'text-blue-500';
      case 'BREATHE': return 'text-green-500';
      case 'PREPARATION': return 'text-yellow-500';
      case 'DIAGNOSTIC': return 'text-blue-400';
      default: return 'text-white';
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const steps = React.useMemo(() => {
    if (!activeConfig || activeConfig.type === 'Diagnostic') return [];
    const sequence = [];
    for (let i = 1; i <= activeConfig.rounds; i++) {
      let holdDuration = activeConfig.initialHoldTime + (activeConfig.holdIncrement * (i - 1));
      let breatheDuration = Math.max(0, activeConfig.initialRestTime - (activeConfig.restDecrement * (i - 1)));

      if (isScalingEnabled && activeConfig.dynamicScaling && i > currentRound) {
        if (activeConfig.type === 'CO2') {
          breatheDuration = Math.max(5, breatheDuration - 5);
        } else if (activeConfig.type === 'O2') {
          holdDuration += 5;
        }
      }

      sequence.push({
        type: 'HOLD',
        duration: holdDuration
      });
      sequence.push({
        type: 'BREATHE',
        duration: breatheDuration
      });
    }
    return sequence;
  }, [activeConfig, isScalingEnabled]);

  const currentStepIndex = currentPhase === 'PREPARATION' ? -1 : 
    currentPhase === 'HOLD' ? (currentRound - 1) * 2 : 
    currentPhase === 'BREATHE' ? (currentRound - 1) * 2 + 1 : -1;

  return (
    <div className="fixed inset-0 bg-[#000000] z-50 flex flex-col items-center p-6 select-none overflow-hidden">
      {/* Segmented Progress Bar */}
      {activeConfig.type !== 'Diagnostic' && (
        <div className="w-full flex gap-[2px] h-[3px] mt-4 mb-12 bg-white/5 px-4">
          {steps.map((step, idx) => (
            <div 
              key={idx}
              className={`h-full transition-all duration-700 rounded-full ${
                idx < currentStepIndex 
                  ? 'bg-white/10' 
                  : idx === currentStepIndex 
                    ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] scale-y-150' 
                    : step.type === 'HOLD' ? 'bg-white/30' : 'bg-white/10'
              }`}
              style={{ flex: step.duration }}
            />
          ))}
        </div>
      )}

      <div className="absolute top-8 right-8 z-10">
        <button onClick={stopSession} className="p-2 text-white/20 hover:text-white transition-colors">
          <X size={24} strokeWidth={1.5} />
        </button>
      </div>

      <div className="text-center mt-8 space-y-1">
        <h2 className="text-[10px] text-white/30 uppercase tracking-[0.5em] font-black">{activeConfig.name}</h2>
        {currentPhase !== 'DIAGNOSTIC' && (
          <p className="text-xs font-medium text-white/20 tracking-widest uppercase">Round {currentRound} / {activeConfig.rounds}</p>
        )}
      </div>

      <div className="flex flex-col items-center justify-center flex-1 w-full">
        <div className={`text-sm font-black mb-8 tracking-[0.4em] transition-colors duration-1000 uppercase ${getPhaseColor()}`}>
          {currentPhase}
        </div>
        <div className={`text-[9rem] sm:text-[12rem] font-black tabular-nums tracking-[-0.05em] leading-none transition-all duration-300 ${getPhaseColor()}`}>
          {formatTime(timeLeft)}
        </div>
        
        {currentPhase === 'DIAGNOSTIC' && (
          <div className="mt-12 flex items-center gap-2 text-white/20 max-w-xs text-center">
            <Info size={14} />
            <p className="text-[10px] uppercase tracking-wider font-bold">Stop when you can no longer hold.</p>
          </div>
        )}
      </div>

      {/* Up Next - Minimalist */}
      {activeConfig.type !== 'Diagnostic' && currentPhase !== 'FINISHED' && (
        <div className="w-full max-w-[200px] mb-12">
          <div className="flex flex-col gap-2">
            {steps.slice(currentStepIndex + 1, currentStepIndex + 2).map((step, idx) => (
              <div key={idx} className="flex justify-between items-center opacity-40">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Next: {step.type}</span>
                <span className="text-[10px] font-mono">{formatTime(step.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-8 mb-16">
        {currentPhase === 'HOLD' && isPaused && (
          <div className="flex gap-12">
            <button 
              onClick={() => validateRound(true)}
              className="group flex flex-col items-center gap-3 transition-transform active:scale-95"
            >
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-black">
                <Check size={40} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black tracking-[0.3em] text-white">SUCCESS</span>
            </button>
            <button 
              onClick={() => validateRound(false)}
              className="group flex flex-col items-center gap-3 transition-transform active:scale-95"
            >
              <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center text-white/20">
                <X size={40} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black tracking-[0.3em] text-white/20">FAILED</span>
            </button>
          </div>
        )}

        {currentPhase !== 'FINISHED' && !(currentPhase === 'HOLD' && isPaused) && (
          <button 
            onClick={togglePause}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isPaused 
                ? 'bg-white text-black' 
                : 'bg-black border border-white/10 text-white/40'
            }`}
          >
            {isPaused ? <Play size={32} fill="currentColor" /> : <Pause size={32} fill="currentColor" />}
          </button>
        )}

        {!(currentPhase === 'HOLD' && isPaused) && (
          <button 
            onClick={stopSession}
            className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center text-white/10 hover:text-red-500 transition-colors"
          >
            <Square size={24} fill="currentColor" />
          </button>
        )}
      </div>
      
      <footer className="mb-8 opacity-10">
        <p className="text-[8px] uppercase tracking-[0.8em] font-black text-white">Deep Calm</p>
      </footer>
    </div>
  );

};
