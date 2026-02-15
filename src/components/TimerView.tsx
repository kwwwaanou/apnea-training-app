import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { audioEngine } from '../lib/audio';
import { useWakeLock } from '../hooks/useWakeLock';
import { X, Play, Pause, Square, Info, Check } from 'lucide-react';

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

  const [difficultyScore, setDifficultyScore] = React.useState(3);
  const hasSavedHistory = React.useRef(false);

  const handleFinish = () => {
    if (!activeConfig) return;
    
    addHistory({
      id: crypto.randomUUID(),
      username: profile?.username || 'unknown',
      configId: activeConfig.id,
      tableName: activeConfig.name,
      timestamp: Date.now(),
      completedRounds: currentPhase === 'BREATHE' ? currentRound : (currentRound > 0 ? currentRound : 1),
      totalDuration: 0,
      completed: currentRound >= activeConfig.rounds,
      difficultyScore: difficultyScore
    });
    
    stopSession();
  };

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

  if (currentPhase === 'FINISHED' && activeConfig.type !== 'Diagnostic') {
    return (
      <div className="fixed inset-0 bg-black z-[60] flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-500">
        <div className="w-full max-w-sm space-y-12 flex flex-col items-center">
          <div className="text-center space-y-4">
             <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-6 mx-auto border border-blue-500/30">
               <Check size={40} className="text-blue-500" />
             </div>
             <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Workout Complete</h2>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{activeConfig.name} • {currentRound} Rounds</p>
          </div>

          <div className="w-full bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 space-y-8 backdrop-blur-sm">
            <div className="text-center space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Intensity Score</p>
              <p className="text-sm text-slate-400 font-medium">How difficult was this session?</p>
            </div>
            
            <div className="flex justify-between items-center gap-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setDifficultyScore(s)}
                  className={`flex-1 aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 ${
                    difficultyScore === s 
                      ? 'bg-white text-black scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                      : 'bg-slate-800/50 text-slate-600 hover:bg-slate-800 hover:text-slate-400 border border-slate-700/50'
                  }`}
                >
                  {s === 1 ? '😊' : s === 2 ? '😐' : s === 3 ? '🤨' : s === 4 ? '😫' : '💀'}
                </button>
              ))}
            </div>

            <div className="text-center h-4">
               <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">
                  {difficultyScore === 1 && "Easy - Recovery was plenty"}
                  {difficultyScore === 2 && "Moderate - Felt some urge"}
                  {difficultyScore === 3 && "Challenging - Focused effort"}
                  {difficultyScore === 4 && "Hard - Heavy contractions"}
                  {difficultyScore === 5 && "Extreme - Maximum effort"}
               </p>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-blue-50 transition-all uppercase tracking-widest text-sm shadow-xl"
          >
            Save to History
          </button>
        </div>
      </div>
    );
  }

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'HOLD': return 'text-red-500';
      case 'BREATHE': return 'text-blue-500';
      case 'PREPARATION': return 'text-yellow-500';
      case 'DIAGNOSTIC': return 'text-orange-400';
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
  }, [activeConfig, isScalingEnabled, currentRound]);

  const currentStepIndex = currentPhase === 'PREPARATION' ? -1 : 
    currentPhase === 'HOLD' ? (currentRound - 1) * 2 : 
    currentPhase === 'BREATHE' ? (currentRound - 1) * 2 + 1 : -1;

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center p-6 select-none overflow-hidden">
      {/* Segmented Progress Bar */}
      {activeConfig.type !== 'Diagnostic' && (
        <div className="w-full flex gap-1 h-3 mt-2 mb-8 rounded-full overflow-hidden bg-slate-900 px-1 border border-slate-800">
          {steps.map((step, idx) => (
            <div 
              key={idx}
              className={`h-full transition-all duration-300 rounded-sm ${
                idx < currentStepIndex 
                  ? 'opacity-20' 
                  : idx === currentStepIndex 
                    ? 'opacity-100 ring-2 ring-white scale-y-125 shadow-[0_0_15px_rgba(255,255,255,0.6)] z-10' 
                    : 'opacity-60'
              } ${step.type === 'HOLD' ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ flex: step.duration }}
            />
          ))}
        </div>
      )}

      <div className="absolute top-6 right-6 z-10">
        <button onClick={stopSession} className="p-2 text-slate-400 hover:text-white transition-colors">
          <X size={32} />
        </button>
      </div>

      <div className="text-center mb-8 space-y-1">
        <h2 className="text-sm text-slate-500 uppercase tracking-[0.3em] font-bold">{activeConfig.name}</h2>
        {currentPhase !== 'DIAGNOSTIC' && (
          <p className="text-xl font-bold text-slate-400">Round {currentRound} / {activeConfig.rounds}</p>
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
          <div className="mt-8 flex items-center gap-2 text-slate-500 max-w-xs text-center">
            <Info size={16} />
            <p className="text-xs">Stop the timer when you can no longer hold your breath.</p>
          </div>
        )}
      </div>

      {/* Up Next */}
      {activeConfig.type !== 'Diagnostic' && currentPhase !== 'FINISHED' && (
        <div className="w-full max-w-xs mb-8 space-y-2 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Up Next</p>
          <div className="space-y-1">
            {steps.slice(currentStepIndex + 1, currentStepIndex + 4).map((step, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className={step.type === 'HOLD' ? 'text-red-400/80' : 'text-blue-400/80'}>
                  {step.type} {Math.floor((currentStepIndex + 1 + idx) / 2) + 1}
                </span>
                <span className="text-slate-400 tabular-nums font-mono">{formatTime(step.duration)}</span>
              </div>
            ))}
            {currentStepIndex + 1 >= steps.length && (
              <p className="text-sm text-slate-600 italic">Finish</p>
            )}
          </div>
        </div>
      )}

      {currentPhase !== 'DIAGNOSTIC' && (
        <div className="w-full max-w-md bg-slate-900 h-2 rounded-full overflow-hidden mb-12 border border-slate-800">
          <div 
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            style={{ width: `${(currentRound / activeConfig.rounds) * 100}%` }}
          />
        </div>
      )}

      <div className="flex gap-6 mb-12">
        {currentPhase === 'HOLD' && isPaused && (
          <>
            <button 
              onClick={() => validateRound(true)}
              className="bg-green-600 border border-green-500 p-8 rounded-full text-white hover:bg-green-500 transition-all flex flex-col items-center justify-center gap-2 shadow-lg shadow-green-900/20"
              title="Success"
            >
              <Check size={32} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-widest">Success</span>
            </button>
            <button 
              onClick={() => validateRound(false)}
              className="bg-red-600 border border-red-500 p-8 rounded-full text-white hover:bg-red-500 transition-all flex flex-col items-center justify-center gap-2 shadow-lg shadow-red-900/20"
              title="Failed"
            >
              <X size={32} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-widest">Failed</span>
            </button>
          </>
        )}

        {currentPhase !== 'FINISHED' && !(currentPhase === 'HOLD' && isPaused) && (
          <button 
            onClick={togglePause}
            className={`p-8 rounded-full text-white transition-all flex items-center justify-center border shadow-xl ${
              isPaused 
                ? 'bg-blue-600 border-blue-500 hover:bg-blue-500 shadow-blue-900/20' 
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play size={32} fill="currentColor" /> : <Pause size={32} fill="currentColor" />}
          </button>
        )}

        {!(currentPhase === 'HOLD' && isPaused) && (
          <button 
            onClick={stopSession}
            className="bg-slate-800 border border-slate-700 p-8 rounded-full text-white hover:bg-slate-700 hover:border-red-500/50 transition-all group flex items-center justify-center shadow-xl"
          >
            <Square size={32} fill="currentColor" className="group-hover:text-red-500 transition-colors" />
          </button>
        )}
      </div>
      
      <footer className="mb-4">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black">Stay Focused. Keep Calm.</p>
      </footer>
    </div>
  );
};