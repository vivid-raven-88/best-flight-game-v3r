// Engine and wind, made with WebAudio and nothing else: no audio files,
// no network. Sound starts on the first key or click, as browsers require.

export function createAudio() {
  return { ctx: null, engine: null, engineGain: null, wind: null, windGain: null, started: false };
}

export function startAudio(audio) {
  if (audio.started) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    audio.ctx = ctx;

    // Engine: a low sawtooth whose pitch follows throttle and speed.
    const engine = ctx.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = 70;
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;
    engine.connect(engineGain);
    engineGain.connect(ctx.destination);
    engine.start();

    // Wind: looped filtered noise whose loudness follows airspeed.
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const wind = ctx.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.0;
    wind.connect(filter);
    filter.connect(windGain);
    windGain.connect(ctx.destination);
    wind.start();

    audio.engine = engine;
    audio.engineGain = engineGain;
    audio.windGain = windGain;
    audio.started = true;
  } catch (err) {
    audio.started = false;
  }
}

// Called every frame: pitch and loudness follow the plane.
export function updateAudio(audio, plane) {
  if (!audio.started || !audio.ctx) return;
  try {
    const t = audio.ctx.currentTime;
    const throttle = plane.throttle;
    audio.engine.frequency.setTargetAtTime(55 + throttle * 75 + plane.speed * 0.35, t, 0.1);
    audio.engineGain.gain.setTargetAtTime(0.02 + throttle * 0.045, t, 0.1);
    audio.windGain.gain.setTargetAtTime(Math.min(0.09, plane.speed * 0.0007), t, 0.1);
  } catch (err) {
    // Sound is garnish: a failure never stops the game.
  }
}

export function stopAudio(audio) {
  if (!audio.started || !audio.ctx) return;
  try {
    audio.ctx.close();
  } catch (err) {
    // Already closed; nothing to do.
  }
  audio.started = false;
}
