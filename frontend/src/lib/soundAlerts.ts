/**
 * Sound Alert Utility
 * Plays audio notifications for PPE violations
 */

class SoundAlertManager {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private lastAlertTime: number = 0;
  private alertCooldown: number = 3000; // 3 seconds to match backend

  constructor() {
    // Initialize Web Audio API
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Play a violation alert sound
   * Uses Web Audio API to generate a beep sound (no external audio files needed)
   */
  playViolationAlert(severity: 'critical' | 'high' | 'medium' | 'low' = 'high'): void {
    if (!this.isEnabled || !this.audioContext) return;

    // Check cooldown to prevent alert spam
    const now = Date.now();
    if (now - this.lastAlertTime < this.alertCooldown) {
      return;
    }
    this.lastAlertTime = now;

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Create oscillator (sound generator)
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Configure sound based on severity
    const config = this.getSoundConfig(severity);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);

    // Create beep pattern
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

    for (let i = 0; i < config.beeps; i++) {
      const startTime = this.audioContext.currentTime + (i * 0.3);
      gainNode.gain.setValueAtTime(config.volume, startTime);
      gainNode.gain.setValueAtTime(0, startTime + 0.15);
    }

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + (config.beeps * 0.3));
  }

  /**
   * Get sound configuration based on severity
   */
  private getSoundConfig(severity: 'critical' | 'high' | 'medium' | 'low'): {
    frequency: number;
    volume: number;
    beeps: number;
  } {
    switch (severity) {
      case 'critical':
        return { frequency: 880, volume: 0.5, beeps: 3 }; // High pitch, 3 beeps
      case 'high':
        return { frequency: 660, volume: 0.4, beeps: 2 }; // Medium-high pitch, 2 beeps
      case 'medium':
        return { frequency: 523, volume: 0.3, beeps: 2 }; // Medium pitch, 2 beeps
      case 'low':
        return { frequency: 440, volume: 0.2, beeps: 1 }; // Lower pitch, 1 beep
      default:
        return { frequency: 660, volume: 0.4, beeps: 2 };
    }
  }

  /**
   * Play a success/compliance sound
   */
  playSuccessSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';

    // Rising tone
    oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
    oscillator.frequency.linearRampToValueAtTime(659, this.audioContext.currentTime + 0.1); // E5

    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  /**
   * Enable/disable sound alerts
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundAlertsEnabled', enabled.toString());
    }
  }

  /**
   * Check if sound alerts are enabled
   */
  getEnabled(): boolean {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('soundAlertsEnabled');
      if (stored !== null) {
        this.isEnabled = stored === 'true';
      }
    }
    return this.isEnabled;
  }

  /**
   * Test the alert sound
   */
  testAlert(): void {
    this.playViolationAlert('high');
  }
}

// Export singleton instance
export const soundAlertManager = new SoundAlertManager();
