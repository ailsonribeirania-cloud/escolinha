let audio:AudioContext|null=null;
export function enableSound(enabled:boolean){if(!enabled){void audio?.close();audio=null;return;}audio??=new AudioContext();void audio.resume();playAlert();}
export function playAlert(){if(!audio||audio.state!=='running')return;const oscillator=audio.createOscillator();const gain=audio.createGain();oscillator.connect(gain);gain.connect(audio.destination);oscillator.frequency.value=660;gain.gain.setValueAtTime(.025,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.3);oscillator.start();oscillator.stop(audio.currentTime+.3);}
