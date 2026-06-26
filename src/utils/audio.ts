let audioCtx: AudioContext | null = null;

export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'double' = 'light') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'light') {
        navigator.vibrate(10);
      } else if (type === 'medium') {
        navigator.vibrate(20);
      } else if (type === 'success') {
        navigator.vibrate([25, 40, 15]);
      } else if (type === 'double') {
        navigator.vibrate([15, 50, 15]);
      }
    } catch (e) {
      // Ignored if vibration permission is denied or blocked
    }
  }
}

export function playTactileClick() {
  // Always try vibration when click sound is triggered
  triggerHaptic('light');

  try {
    // Lazy initialize to bypass browser autoplay policy until user gesture
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    // Crisp click frequency sweep
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.02);
    
    // Very low volume, extremely fast decay
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  } catch (error) {
    // Silent fail if audio context is blocked
  }
}
