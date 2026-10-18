/* ===================== AUDIO: sfx + tiny chiptune sequencer ===================== */
const Audio8 = (() => {
  let ac = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  let sfxOn = true, musicOn = true, track = null, step = 0, nextT = 0, timer = null;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function ensure(){
    if (ac) { if (ac.state === "suspended") ac.resume(); return true; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
      musicGain = ac.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
      sfxGain = ac.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
      return true;
    } catch (e) { return false; }
  }
  function tone(dest, f, t, dur, type, vol, slide){
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f*slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dest, t, dur, vol, hp){
    const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 1000;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f).connect(g).connect(dest); s.start(t); s.stop(t + dur + 0.02);
  }
  const SFX = {
    blip: t => tone(sfxGain, 1100, t, 0.025, "square", 0.018),
    select: t => tone(sfxGain, 660, t, 0.05, "square", 0.04),
    good: t => [523,659,784].forEach((f,i) => tone(sfxGain, f, t+i*0.08, 0.12, "square", 0.045)),
    bad: t => { tone(sfxGain, 220, t, 0.14, "square", 0.05); tone(sfxGain, 150, t+0.12, 0.25, "square", 0.05); },
    crit: t => [523,659,784,1047,1319].forEach((f,i) => tone(sfxGain, f, t+i*0.06, 0.16, "square", 0.045)),
    heal: t => [660,880,1175].forEach((f,i) => tone(sfxGain, f, t+i*0.07, 0.14, "triangle", 0.07)),
    hit: t => { noise(sfxGain, t, 0.12, 0.12, 400); tone(sfxGain, 140, t, 0.12, "sawtooth", 0.05, 0.4); },
    swing: t => noise(sfxGain, t, 0.09, 0.05, 2500),
    magic: t => { for (let i=0;i<5;i++) tone(sfxGain, 900 + i*180, t+i*0.03, 0.08, "square", 0.025); },
    fire: t => noise(sfxGain, t, 0.6, 0.1, 300),
    clack: (t, s=0.5) => { noise(sfxGain, t, 0.03 + s*0.03, 0.05 + s*0.18, 1800 + Math.random()*1500); tone(sfxGain, 1400 + Math.random()*900, t, 0.02, "square", 0.012*s); },
    shake: t => noise(sfxGain, t, 0.05, 0.03, 3000),
    levelup: t => [523,659,784,659,784,1047].forEach((f,i) => tone(sfxGain, f, t+i*0.09, 0.14, "square", 0.05)),
    door: t => { tone(sfxGain, 90, t, 0.5, "sawtooth", 0.05, 0.6); noise(sfxGain, t, 0.4, 0.04, 200); }
  };
  // tracks: steps of length `step` seconds; lead/bass arrays of MIDI or null; drums string (k = kick, s = snare, h = hat)
  const TRACKS = {
    tavern:{step:0.2, lead:[74,null,76,78,null,76,74,null,71,69,null,null,71,null,74,76,null,74,73,null,69,71,null,null], bass:[50,null,null,57,null,null,55,null,null,52,null,null,55,null,null,50,null,null,57,null,null,45,null,null], drums:"k..h..k..h..k..h..k..h.."},
    night:{step:0.26, lead:[69,null,null,72,null,71,null,null,64,null,null,null,67,null,null,69,null,65,null,null,64,null,null,null], bass:[45,null,null,null,null,null,45,null,null,null,null,null,41,null,null,null,null,null,40,null,null,null,null,null], drums:""},
    tower:{step:0.24, lead:[62,null,65,null,64,null,null,null,62,null,60,null,57,null,null,null,62,null,65,null,69,null,68,null,null,null,null,null,null,null,null,null], bass:[38,null,null,null,38,null,null,null,34,null,null,null,34,null,null,null,36,null,null,null,36,null,null,null,37,null,null,null,37,null,null,null], drums:""},
    battle:{step:0.1, lead:[62,62,65,62,67,65,64,60,62,62,65,69,67,65,64,null], bass:[38,null,38,38,46,null,46,46,48,null,48,48,45,null,45,45], drums:"k.h.s.h.k.k.s.hh"},
    boss:{step:0.095, lead:[62,null,63,62,null,58,null,57,62,null,63,65,null,63,62,null,70,null,69,67,null,65,null,63,62,null,58,null,57,null,null,null], bass:[38,38,38,38,39,39,39,39,36,36,36,36,37,37,37,37,38,38,38,38,39,39,39,39,36,36,36,36,37,37,37,37], drums:"k.hsk.hsk.hskkhsk.hsk.hsk.hskshs"},
    dawn:{step:0.22, lead:[72,null,76,79,null,77,76,null,74,null,72,74,null,76,null,null,79,null,81,79,null,77,76,null,74,null,76,72,null,null,null,null], bass:[48,null,55,null,53,null,55,null,48,null,55,null,50,null,55,null,53,null,57,null,55,null,59,null,48,null,55,null,48,null,null,null], drums:""}
  };
  function schedule(){
    if (!ac || !track || !musicOn) return;
    const T = TRACKS[track];
    while (nextT < ac.currentTime + 0.15){
      const L = T.lead.length, i = step % L;
      const ln = T.lead[i], bn = T.bass[i % T.bass.length], dr = T.drums ? T.drums[i % T.drums.length] : ".";
      if (ln != null) tone(musicGain, mtof(ln), nextT, T.step*1.6, "square", 0.022);
      if (bn != null) tone(musicGain, mtof(bn), nextT, T.step*1.8, "triangle", 0.075);
      if (dr === "k") tone(musicGain, 120, nextT, 0.12, "sine", 0.12, 0.35);
      if (dr === "s") noise(musicGain, nextT, 0.09, 0.05, 1500);
      if (dr === "h") noise(musicGain, nextT, 0.03, 0.022, 6000);
      nextT += T.step; step++;
    }
  }
  return {
    unlock(){ ensure(); },
    sfx(name, arg){ if (!sfxOn || !ensure()) return; try { SFX[name] && SFX[name](ac.currentTime + 0.005, arg); } catch (e) {} },
    music(name){ if (name === track) return; track = name; step = 0; if (!ac) return; nextT = ac.currentTime + 0.08;
      if (!timer) timer = setInterval(schedule, 40); },
    setMusic(on){ musicOn = on; if (on && ensure()){ nextT = ac.currentTime + 0.08; if (!timer) timer = setInterval(schedule, 40); } },
    setSfx(on){ sfxOn = on; },
    get musicOn(){ return musicOn; }, get sfxOn(){ return sfxOn; }
  };
})();
