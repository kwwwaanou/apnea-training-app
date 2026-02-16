class AudioEngine {
  private ctx: AudioContext | null = null;

  public init() {
    if (!this.ctx) {
      // @ts-ignore
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Handle iOS/Mobile locked state
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, duration: number, volume: number = 0.1) {
    this.init();
    if (!this.ctx) return;

    // Web Audio API by default on many platforms (including iOS Safari recently) 
    // can mix with others if the session category is set correctly at the native level.
    // In a browser/PWA context, 'ambient' behavior is often achieved by NOT using 
    // <audio> elements with exclusive locks. Web Audio API is generally better for mixing.

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  beepLow() {
    this.playTone(440, 0.5);
  }

  beepHigh() {
    this.playTone(880, 0.8);
  }

  beepWarning() {
    this.playTone(660, 0.1);
  }

  beepCountdown() {
    this.playTone(660, 0.2);
  }
}

export const audioEngine = new AudioEngine();
