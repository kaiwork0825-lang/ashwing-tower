/* ===================== AUDIO: sfx + tiny chiptune sequencer ===================== */
/* ---- "잿빛 회랑": calm retro synth-pop BGM (D minor, 84 BPM, half-time drums) ----
   SynthPop(ac, out) builds the instrument rack once and returns { SD, step(i, t) }:
   SD is one 16th note in seconds, step(i, t) schedules everything that sounds on 16th #i at time t.
   The song is 8 bars (128 steps) of Dm – B♭maj7 – Gm7 – Asus4→A, played in 4 passes that add and
   drop parts so the loop never feels busy: pads + arp → + drums & melody → arp & low melody → no melody. */
function SynthPop(ac, out){
  const BPM = 84, SD = 60 / BPM / 4, mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const bus = ac.createGain(); bus.gain.value = 0.36;   // sits under the sfx, about as loud as the chiptune tracks
  const glue = ac.createBiquadFilter(); glue.type = "lowpass"; glue.frequency.value = 7000;   // soften the top end
  bus.connect(glue).connect(out);
  // reverb: generated stereo tail (~2.6 s)
  const rev = ac.createConvolver(), rlen = Math.floor(ac.sampleRate * 2.6), rb = ac.createBuffer(2, rlen, ac.sampleRate);
  for (let c = 0; c < 2; c++){ const d = rb.getChannelData(c); for (let i = 0; i < rlen; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/rlen, 3.2); }
  rev.buffer = rb; const revOut = ac.createGain(); revOut.gain.value = 0.42; rev.connect(revOut).connect(bus);
  // dotted-eighth delay with a darkening feedback loop
  const dly = ac.createDelay(2); dly.delayTime.value = SD * 3;
  const dlp = ac.createBiquadFilter(); dlp.type = "lowpass"; dlp.frequency.value = 1900;
  const fb = ac.createGain(); fb.gain.value = 0.36; dly.connect(dlp).connect(fb).connect(dly);
  const dOut = ac.createGain(); dOut.gain.value = 0.5; dlp.connect(dOut); dOut.connect(bus); dOut.connect(rev);
  // one mixer strip per instrument: dry level + reverb send + delay send
  function strip(dry, toRev, toDly){
    const inp = ac.createGain(), a = ac.createGain(); a.gain.value = dry; inp.connect(a).connect(bus);
    if (toRev){ const r = ac.createGain(); r.gain.value = toRev; inp.connect(r).connect(rev); }
    if (toDly){ const e = ac.createGain(); e.gain.value = toDly; inp.connect(e).connect(dly); }
    return inp;
  }
  const PAD = strip(1, 0.55, 0), BASS = strip(1, 0.05, 0), ARP = strip(0.8, 0.35, 0.7), LEAD = strip(1, 0.4, 0.45),
        KICK = strip(1, 0, 0), SNR = strip(0.9, 0.75, 0), HAT = strip(1, 0.15, 0);
  const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random()*2-1;

  function env(g, t, peak, a, hold, rel){   // attack → hold → release
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
    return t + a + hold + rel;
  }
  function pad(t, notes, dur){               // two detuned saws per note, panned apart, slow filter swell
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 0.7;
    f.frequency.setValueAtTime(520, t); f.frequency.linearRampToValueAtTime(1150, t + dur*0.5); f.frequency.linearRampToValueAtTime(700, t + dur);
    const g = ac.createGain(); f.connect(g).connect(PAD);
    const end = env(g, t, 1, 0.9, Math.max(0, dur - 1.2), 1.4);
    notes.forEach(m => [-8, 8].forEach(ct => {
      const o = ac.createOscillator(), p = ac.createStereoPanner ? ac.createStereoPanner() : null, v = ac.createGain();
      o.type = "sawtooth"; o.frequency.value = mtof(m); o.detune.value = ct; v.gain.value = 0.013;
      if (p){ p.pan.value = ct < 0 ? -0.45 : 0.45; o.connect(v).connect(p).connect(f); } else o.connect(v).connect(f);
      o.start(t); o.stop(end + 0.05);
    }));
  }
  function bass(t, m, len){                  // plucky filtered saw + sine sub
    const o = ac.createOscillator(), s = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = "sawtooth"; o.frequency.value = mtof(m); s.type = "sine"; s.frequency.value = mtof(m);
    f.type = "lowpass"; f.Q.value = 3; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + 0.22);
    const sg = ac.createGain(); sg.gain.value = 0.9;
    o.connect(f).connect(g); s.connect(sg).connect(g); g.connect(BASS);
    const end = env(g, t, 0.06, 0.006, len*0.4, len*0.8);
    o.start(t); s.start(t); o.stop(end + 0.02); s.stop(end + 0.02);
  }
  function arp(t, m, vol){                   // soft square blips, mostly heard through the delay
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = "square"; o.frequency.value = mtof(m); f.type = "lowpass"; f.frequency.value = 1500;
    o.connect(f).connect(g).connect(ARP);
    const end = env(g, t, vol, 0.004, 0.02, 0.2); o.start(t); o.stop(end + 0.02);
  }
  function lead(t, m, dur){                  // mellow triangle + quiet saw, gentle late vibrato
    const f = ac.createBiquadFilter(), g = ac.createGain(); f.type = "lowpass"; f.frequency.value = 1700; f.Q.value = 0.5;
    f.connect(g).connect(LEAD);
    const end = env(g, t, 1, 0.07, Math.max(0, dur - 0.1), 0.45);
    const lfo = ac.createOscillator(), ld = ac.createGain(); lfo.frequency.value = 5;
    ld.gain.setValueAtTime(0, t); ld.gain.linearRampToValueAtTime(0, t + 0.25); ld.gain.linearRampToValueAtTime(7, t + 0.7);
    lfo.connect(ld); lfo.start(t); lfo.stop(end + 0.05);
    [["triangle", 0, 0.022], ["sawtooth", 6, 0.004]].forEach(([type, ct, vol]) => {
      const o = ac.createOscillator(), v = ac.createGain(); o.type = type; o.frequency.value = mtof(m); o.detune.value = ct;
      ld.connect(o.detune); v.gain.value = vol; o.connect(v).connect(f); o.start(t); o.stop(end + 0.05);
    });
  }
  function kick(t){
    const o = ac.createOscillator(), g = ac.createGain(); o.type = "sine";
    o.frequency.setValueAtTime(105, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    o.connect(g).connect(KICK); const end = env(g, t, 0.17, 0.003, 0.04, 0.3); o.start(t); o.stop(end + 0.02);
  }
  function noiseHit(t, ch, type, freq, q, vol, dur){
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nb; s.playbackRate.value = 0.7 + Math.random()*0.6; f.type = type; f.frequency.value = freq; f.Q.value = q;
    s.connect(f).connect(g).connect(ch); const end = env(g, t, vol, 0.002, 0.005, dur); s.start(t, Math.random()*0.4); s.stop(end + 0.02);
  }
  function snare(t){
    noiseHit(t, SNR, "bandpass", 1700, 0.8, 0.055, 0.2);
    const o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle"; o.frequency.value = 185;
    o.connect(g).connect(SNR); const end = env(g, t, 0.035, 0.002, 0.01, 0.08); o.start(t); o.stop(end + 0.02);
  }
  const hat = (t, v) => noiseHit(t, HAT, "highpass", 7500, 0.7, 0.012*v, 0.035);

  // ---- song data ----
  const CH = [   // per 2 bars: bass root, pad voicing (+ a second voicing at bar 2 for the Asus4 → A resolve)
    {b:38, pad:[57,62,65,69]}, {b:34, pad:[58,62,65,69]}, {b:43, pad:[55,58,62,65]}, {b:45, pad:[57,62,64,69], pad2:[57,61,64,69]}
  ];
  const MEL_A = [[0,69,8],[10,67,2],[12,65,4],[16,64,4],[20,62,10], [32,65,6],[38,67,2],[40,69,8],[48,70,4],[52,69,10],
                 [64,67,6],[70,65,2],[72,62,16], [96,64,6],[102,62,2],[104,64,8],[112,61,14]];
  const MEL_B = [[0,62,4],[4,65,4],[8,64,10],[20,62,10], [32,62,4],[36,65,4],[40,69,10],[52,67,10],
                 [64,67,6],[70,65,2],[72,70,8],[80,69,14], [96,69,6],[102,67,2],[104,64,8],[112,61,14]];
  const melAt = (mel, s) => mel.find(n => n[0] === s);
  const ARP_ORDER = [0, 1, 2, 3, 2, 1, 3, 2];
  //            pads  bass   drums  arp   melody
  const PASSES = [
    {bass:"q", drums:"hat", arp:true,  mel:null},     // 1: floating intro
    {bass:"e", drums:"full", arp:false, mel:MEL_A},   // 2: groove + melody
    {bass:"e", drums:"full", arp:true,  mel:MEL_B},   // 3: answer phrase over the arp
    {bass:"e", drums:"full", arp:true,  mel:null}     // 4: breathing room
  ];

  function step(i, t){
    const s = i % 128, P = PASSES[Math.floor(i / 128) % PASSES.length], c = CH[Math.floor(s / 32)], cs = s % 32, bs = s % 16;
    const voicing = c.pad2 && cs >= 16 ? c.pad2 : c.pad;
    if (cs === 0) pad(t, c.pad, (c.pad2 ? 16 : 32) * SD + 0.3);
    if (c.pad2 && cs === 16) pad(t, c.pad2, 16 * SD + 0.3);
    if (P.bass === "q" ? cs % 4 === 0 : cs % 2 === 0){
      const oct = P.bass === "e" && bs === 14 ? 12 : 0;            // octave pickup at the end of each bar
      bass(t, c.b + oct, P.bass === "q" ? 3*SD : 1.4*SD);
    }
    if (P.arp && cs % 2 === 0){
      const k = ARP_ORDER[(cs / 2) % ARP_ORDER.length], m = voicing[k] + 12;
      arp(t, m, bs % 8 === 0 ? 0.03 : 0.02);
    }
    if (P.drums === "full"){
      if (bs === 0 || (bs === 11 && Math.floor(s/16) % 2 === 1)) kick(t);
      if (bs === 8) snare(t);
    }
    if (P.drums && cs % 2 === 0) hat(t, bs % 4 === 2 ? 1 : 0.55);
    const n = P.mel && melAt(P.mel, s);
    if (n) lead(t, n[1], n[2] * SD);
  }
  return { SD, step };
}

const Audio8 = (() => {
  let ac = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  let sfxOn = true, musicOn = true, track = null, step = 0, nextT = 0, timer = null, synth = null;
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
    ashen:{synth:true},   // retro synth-pop: title screen + exploration (see SynthPop above)
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
    if (nextT < ac.currentTime - 0.25) nextT = ac.currentTime + 0.05;   // tab was in the background: skip ahead instead of bursting
    if (T.synth){
      if (!synth) synth = SynthPop(ac, musicGain);
      while (nextT < ac.currentTime + 0.2){ synth.step(step, nextT); nextT += synth.SD; step++; }
      return;
    }
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
    // browsers keep audio locked until the first click/key; once it unlocks, start the track that was already chosen (the title theme)
    unlock(){ const was = !!ac; if (!ensure()) return; if (!was && track && musicOn && !timer){ nextT = ac.currentTime + 0.08; timer = setInterval(schedule, 40); } },
    sfx(name, arg){ if (!sfxOn || !ensure()) return; try { SFX[name] && SFX[name](ac.currentTime + 0.005, arg); } catch (e) {} },
    music(name){ if (name === track) return; track = name; step = 0; if (!ac) return; nextT = ac.currentTime + 0.08;
      if (!timer) timer = setInterval(schedule, 40); },
    setMusic(on){ musicOn = on; if (on && ensure()){ nextT = ac.currentTime + 0.08; if (!timer) timer = setInterval(schedule, 40); } },
    setSfx(on){ sfxOn = on; },
    get musicOn(){ return musicOn; }, get sfxOn(){ return sfxOn; }
  };
})();
