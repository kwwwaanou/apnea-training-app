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
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center p-6 select-none overflow-hidden">
      {/* Segmented Progress Bar */}
      {activeConfig.type !== 'Diagnostic' && (
        <div className="w-full flex gap-1 h-2 mt-2 mb-8 rounded-full overflow-hidden bg-gray-900 px-1">
          {steps.map((step, idx) => (
            <div 
              key={idx}
              className={`h-full transition-all duration-300 rounded-sm ${
                idx < currentStepIndex 
                  ? 'opacity-30' 
                  : idx === currentStepIndex 
                    ? 'opacity-100 ring-2 ring-white scale-y-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' 
                    : 'opacity-70'
              } ${step.type === 'HOLD' ? 'bg-red-600' : 'bg-blue-600'}`}
              style={{ flex: step.duration }}
            />
          ))}
        </div>
      )}

      <div className="absolute top-6 right-6 z-10">
        <button onClick={stopSession} className="p-2 text-gray-400 hover:text-white transition-colors">
          <X size={32} />
        </button>
      </div>

      <div className="text-center mb-8 space-y-1">
        <h2 className="text-sm text-gray-500 uppercase tracking-[0.3em] font-bold">{activeConfig.name}</h2>
        {currentPhase !== 'DIAGNOSTIC' && (
          <p className="text-xl font-bold text-gray-400">Round {currentRound} / {activeConfig.rounds}</p>
        )}
      </div>

      <div className="flex flex-col items-center justify-center flex-1 w-full">
        <div className={`text-2xl sm:text-3xl font-black mb-4 tracking-[0.2em] transition-colors duration-500 uppercase ${getPhaseColor()}`}>
          {currentPhase}
        </div>
        <div className={`text-8xl sm:text-9xl md:text-[12rem] font-black tabular-nums tracking-tighter transition-all duration-300 ${getPhaseColor()}`}>
          {formatTime(timeLeft)}
        </div>
        
        {currentPhase === 'DIAGNOSTIC' && (
          <div className="mt-8 flex items-center gap-2 text-gray-500 max-w-xs text-center">
            <Info size={16} />
            <p className="text-xs">Stop the timer when you can no longer hold your breath.</p>
          </div>
        )}
      </div>

      {/* Up Next */}
      {activeConfig.type !== 'Diagnostic' && currentPhase !== 'FINISHED' && (
        <div className="w-full max-w-xs mb-8 space-y-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Up Next</p>
          <div className="space-y-1">
            {steps.slice(currentStepIndex + 1, currentStepIndex + 4).map((step, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className={step.type === 'HOLD' ? 'text-red-500/80' : 'text-blue-500/80'}>
                  {step.type} {Math.floor((currentStepIndex + 1 + idx) / 2) + 1}
                </span>
                <span className="text-gray-500 tabular-nums font-mono">{formatTime(step.duration)}</span>
              </div>
            ))}
            {currentStepIndex + 1 >= steps.length && (
              <p className="text-sm text-gray-700 italic">Finish</p>
            )}
          </div>
        </div>
      )}

      {currentPhase !== 'DIAGNOSTIC' && (
        <div className="w-full max-w-md bg-gray-900 h-1.5 rounded-full overflow-hidden mb-12">
          <div 
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(currentRound / activeConfig.rounds) * 100}%` }}
          />
        </div>
      )}

      <div className="flex gap-4 mb-12">
        {currentPhase === 'HOLD' && isPaused && (
          <>
            <button 
              onClick={() => validateRound(true)}
              className="bg-green-600 border border-green-500 p-8 rounded-full text-white hover:bg-green-500 transition-all flex items-center justify-center"
              title="Success"
            >
              <div className="text-2xl font-bold">✅</div>
            </button>
            <button 
              onClick={() => validateRound(false)}
              className="bg-red-600 border border-red-500 p-8 rounded-full text-white hover:bg-red-500 transition-all flex items-center justify-center"
              title="Failed"
            >
              <div className="text-2xl font-bold">❌</div>
            </button>
          </>
        )}

        {currentPhase !== 'FINISHED' && !(currentPhase === 'HOLD' && isPaused) && (
          <button 
            onClick={togglePause}
            className={`p-8 rounded-full text-white transition-all flex items-center justify-center border ${
              isPaused 
                ? 'bg-blue-600 border-blue-500 hover:bg-blue-500' 
                : 'bg-gray-900 border-gray-800 hover:bg-gray-800'
            }`}
          >
            {isPaused ? <Play size={32} fill="currentColor" /> : <Pause size={32} fill="currentColor" />}
          </button>
        )}

        <button 
          onClick={stopSession}
          className="bg-gray-900 border border-gray-800 p-8 rounded-full text-white hover:bg-gray-800 hover:border-red-500/50 transition-all group flex items-center justify-center"
        >
          <Square size={32} fill="currentColor" className="group-hover:text-red-500 transition-colors" />
        </button>
      </div>
      
      <footer className="mb-4">
        <p className="text-[10px] text-gray-800 uppercase tracking-widest font-black">Stay Focused. Keep Calm.</p>
      </footer>
    </div>
  );
};
