// Audio feedback for transactions
class SoundManager {
  private audioContext: AudioContext | null = null;
  private soundsEnabled: boolean = true;

  constructor() {
    // Initialize audio context on first user interaction
    this.initAudioContext();
    // Load sound preference from localStorage
    const savedPreference = localStorage.getItem('maclap_sounds_enabled');
    this.soundsEnabled = savedPreference !== 'false';
  }

  setSoundsEnabled(enabled: boolean) {
    this.soundsEnabled = enabled;
    localStorage.setItem('maclap_sounds_enabled', enabled.toString());
  }

  getSoundsEnabled(): boolean {
    return this.soundsEnabled;
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Create a success sound for cash in (higher pitch, pleasant)
  async playCashInSound() {
    if (!this.soundsEnabled) return;
    await this.ensureAudioContext();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Pleasant ascending notes for success
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, this.audioContext.currentTime + 0.2); // G5

    // Smooth volume envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.4);
  }

  // Create a neutral sound for cash out (lower pitch, professional)
  async playCashOutSound() {
    if (!this.soundsEnabled) return;
    await this.ensureAudioContext();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Professional descending notes
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4
    oscillator.frequency.setValueAtTime(349.23, this.audioContext.currentTime + 0.1); // F4
    oscillator.frequency.setValueAtTime(293.66, this.audioContext.currentTime + 0.2); // D4

    // Smooth volume envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.4);
  }

  // Create a subtle click sound for quick amount buttons
  async playClickSound() {
    if (!this.soundsEnabled) return;
    await this.ensureAudioContext();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }
}

export const soundManager = new SoundManager();