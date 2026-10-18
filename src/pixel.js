/* ===================== PIXEL SCENE ENGINE ===================== */
const SW = 320, SH = 180;
const BAYER4 = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => v/16 - 0.47);
const COL = {}; const col = h => COL[h] || (COL[h] = hex2rgb(h));
const mix = (a, b, t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
const toHex = c => "#" + c.map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
function mkRng(seed){ return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// palette lookup table (5 bits per channel)
const LUT = new Uint8Array(32768);
(function(){ for (let r=0;r<32;r++) for (let g=0;g<32;g++) for (let b=0;b<32;b++){
  const R = r*8+4, G = g*8+4, B = b*8+4; let bi = 0, bd = 1e9;
  for (let i=0;i<PAL_RGB.length;i++){ const p = PAL_RGB[i]; const dr = (R-p[0])*0.85, dg = (G-p[1]), db = (B-p[2])*0.75; const d = dr*dr+dg*dg+db*db; if (d < bd){ bd = d; bi = i; } }
  LUT[(r<<10)|(g<<5)|b] = bi; } })();

/* ---------- framebuffer ---------- */
class FB {
  constructor(w=SW, h=SH){ this.w = w; this.h = h; this.rgb = new Float32Array(w*h*3); this.em = new Uint8Array(w*h); }
  copyFrom(o){ this.rgb.set(o.rgb); this.em.set(o.em); }
  rect(x, y, w, h, c, a=1, em=0){
    c = typeof c === "string" ? col(c) : c; x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const x0 = Math.max(0,x), y0 = Math.max(0,y), x1 = Math.min(this.w, x+w), y1 = Math.min(this.h, y+h);
    for (let yy=y0; yy<y1; yy++) for (let xx=x0; xx<x1; xx++){ const i = yy*this.w+xx, j = i*3;
      if (a >= 1){ this.rgb[j]=c[0]; this.rgb[j+1]=c[1]; this.rgb[j+2]=c[2]; } else { this.rgb[j]+=(c[0]-this.rgb[j])*a; this.rgb[j+1]+=(c[1]-this.rgb[j+1])*a; this.rgb[j+2]+=(c[2]-this.rgb[j+2])*a; }
      this.em[i] = em; }
  }
  px(x, y, c, em=0){ this.rect(x, y, 1, 1, c, 1, em); }
  // dithered translucent fill: draws only on bayer cells below alpha
  dith(x, y, w, h, c, a, em=0){
    c = typeof c === "string" ? col(c) : c; x = Math.round(x); y = Math.round(y);
    for (let yy=Math.max(0,y); yy<Math.min(this.h,y+h); yy++) for (let xx=Math.max(0,x); xx<Math.min(this.w,x+w); xx++){
      if (BAYER4[(yy&3)*4+(xx&3)] + 0.47 < a){ const i = yy*this.w+xx, j = i*3; this.rgb[j]=c[0]; this.rgb[j+1]=c[1]; this.rgb[j+2]=c[2]; if (em) this.em[i]=em; } }
  }
  vgrad(y0, y1, cols){ // dithered vertical gradient across full width
    for (let y=y0; y<y1; y++){ const t = (y-y0)/(y1-y0)*(cols.length-1); const k = Math.min(cols.length-2, Math.floor(t)); const f = t-k;
      for (let x=0;x<this.w;x++){ const c = col(BAYER4[(y&3)*4+(x&3)]+0.47 < f ? cols[k+1] : cols[k]); const j = (y*this.w+x)*3; this.rgb[j]=c[0]; this.rgb[j+1]=c[1]; this.rgb[j+2]=c[2]; this.em[y*this.w+x]=0; } }
  }
  mult(x, y, w, h, f){ for (let yy=Math.max(0,y); yy<Math.min(this.h,y+h); yy++) for (let xx=Math.max(0,x); xx<Math.min(this.w,x+w); xx++){ const j=(yy*this.w+xx)*3; this.rgb[j]*=f[0]; this.rgb[j+1]*=f[1]; this.rgb[j+2]*=f[2]; } }
  text(str, x, y, c, s=1, em=1, align="center"){
    const w = textWidth(str, s); let cx = align === "center" ? Math.round(x - w/2) : x;
    for (const ch of str){ const g = FONT[ch] || FONT["?"]; for (let i=0;i<15;i++) if (g[i]==="1") this.rect(cx+(i%3)*s, y+Math.floor(i/3)*s, s, s, c, 1, em); cx += 4*s; }
  }
  textOutlined(str, x, y, c, s=1){ for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1]]) this.text(str, x+dx, y+dy, "#07090f", s, 1); this.text(str, x, y, c, s, 1); }
  sprite(sp, x, y, o={}){
    x = Math.round(x); y = Math.round(y);
    const flash = o.flash ? col(o.flash) : null, a = o.alpha ?? 1;
    for (let sy=0; sy<sp.h; sy++){ const yy = y+sy; if (yy<0||yy>=this.h) continue;
      for (let sx=0; sx<sp.w; sx++){ const k = sy*sp.w + (o.flip ? sp.w-1-sx : sx); if (!sp.a[k]) continue;
        const xx = x+sx; if (xx<0||xx>=this.w) continue;
        if (a < 1 && BAYER4[(yy&3)*4+(xx&3)]+0.47 >= a) continue;
        const i = yy*this.w+xx, j = i*3;
        if (flash && sp.a[k] === 2){ this.rgb[j]=flash[0]; this.rgb[j+1]=flash[1]; this.rgb[j+2]=flash[2]; this.em[i]=1; continue; }
        if (flash){ this.rgb[j]=flash[0]*0.5; this.rgb[j+1]=flash[1]*0.5; this.rgb[j+2]=flash[2]*0.5; this.em[i]=1; continue; }
        this.rgb[j]=sp.rgb[k*3]; this.rgb[j+1]=sp.rgb[k*3+1]; this.rgb[j+2]=sp.rgb[k*3+2]; this.em[i]=sp.em[k]; } }
  }
}

/* ---------- sprites with automatic shading + selective outline ---------- */
const SHADOW_HUE = col("#121a29"), LIGHT_HUE = col("#fff0b0"), OUTLINE = col("#07090f");
function compileSprite(def, variant){
  const g = def.g, h = g.length + 2, w = Math.max(...g.map(r => r.length)) + 2;
  const at = (x, y) => { const r = g[y-1]; if (!r) return "."; const ch = r[x-1]; return ch === undefined ? "." : ch; };
  const pal = {...def.p, ...(variant || {})};
  const rgb = new Float32Array(w*h*3), a = new Uint8Array(w*h), em = new Uint8Array(w*h);
  const emSet = new Set(def.em || []), flat = new Set(def.flat || []);
  for (let y=0; y<h; y++) for (let x=0; x<w; x++){
    const ch = at(x, y), k = y*w+x;
    if (ch !== "." && pal[ch]){
      let c = col(pal[ch]);
      if (!emSet.has(ch) && !flat.has(ch)){
        const up = at(x, y-1) === ".", lf = at(x-1, y) === ".", dn = at(x, y+1) === ".", rt = at(x+1, y) === ".";
        if (up) c = mix(c, LIGHT_HUE, 0.22); else if (lf) c = mix(c, LIGHT_HUE, 0.1);
        if (dn) c = mix(c, SHADOW_HUE, 0.38); else if (rt) c = mix(c, SHADOW_HUE, 0.22);
        if (!up && at(x, y-1) !== ch && def.p[at(x, y-1)] && y > 1){ const above = col(def.p[at(x, y-1)]); if (above[0]+above[1]+above[2] < c[0]+c[1]+c[2]) c = mix(c, SHADOW_HUE, 0.12); }
      }
      rgb.set(c, k*3); a[k] = 1; em[k] = emSet.has(ch) ? 1 : 0;
    } else {
      let nb = null; for (const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]]){ const n = at(x+dx, y+dy); if (n !== "." && pal[n]){ nb = col(pal[n]); break; } }
      if (nb){ rgb.set(mix(nb, OUTLINE, 0.82), k*3); a[k] = 2; }
    }
  }
  return {w, h, rgb, a, em};
}
function scaleSprite(sp, k){
  const w = sp.w*k, h = sp.h*k, rgb = new Float32Array(w*h*3), a = new Uint8Array(w*h), em = new Uint8Array(w*h);
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){ const s = Math.floor(y/k)*sp.w + Math.floor(x/k), d = y*w+x; a[d]=sp.a[s]; em[d]=sp.em[s]; rgb[d*3]=sp.rgb[s*3]; rgb[d*3+1]=sp.rgb[s*3+1]; rgb[d*3+2]=sp.rgb[s*3+2]; }
  return {w, h, rgb, a, em};
}
function rotateSprite(sp){ // lying down (rotated 90° clockwise)
  const w = sp.h, h = sp.w, rgb = new Float32Array(w*h*3), a = new Uint8Array(w*h), em = new Uint8Array(w*h);
  for (let y=0;y<sp.h;y++) for (let x=0;x<sp.w;x++){ const s = y*sp.w+x, nx = sp.h-1-y, ny = x, d = ny*w+nx; a[d]=sp.a[s]; em[d]=sp.em[s]; rgb[d*3]=sp.rgb[s*3]; rgb[d*3+1]=sp.rgb[s*3+1]; rgb[d*3+2]=sp.rgb[s*3+2]; }
  return {w, h, rgb, a, em};
}
const SKIN = "#dba07a";
const SPRITE_DEFS = {
  fighter:{p:{P:"#b02e33",H:"#a2a3ac",h:"#6a6c78",v:"#121a29",e:"#ffd678",s:SKIN,A:"#a2a3ac",a:"#6a6c78",T:"#b02e33",t:"#7a1f2a",Y:"#fbb954",B:"#61291a",L:"#557887",b:"#2e1712",S:"#82341c",R:"#fbb954",W:"#dfe6d6",w:"#8fadaa",G:"#fbb954"}, flat:["v"], g:[
    "........PP............",
    ".......PPPP...........",
    "......HHHHHH..........",
    ".....HHHHHHHH.........",
    ".....HhhhhhhH.........",
    ".....HvvvvveH.........",
    ".....HHhhhhHH.........",
    "......HhsshH.......W..",
    "....aAAAAAAAAa....Ww..",
    "...SSAATTYTTAAa..Ww...",
    "..SSRSATTYTTTAs.Ww....",
    "..SRRSSTTYTTTssWw.....",
    "..SRRRSTTYTTTsGG......",
    "..SRRSSTTYTTTt.G......",
    "..SSRSBBBBBBBB........",
    "...SS.TTTtTTTt........",
    "......LLL..LLL........",
    "......LLL..LLL........",
    "......LLL..LLL........",
    ".....bbbb..bbbb.......",
    ".....bbbbb.bbbbb......"]},
  wizard:{p:{H:"#344e66",h:"#1f2f45",Y:"#fbb954",s:SKIN,e:"#121a29",W:"#dfe6d6",O:"#5c3f72",o:"#3a2850",y:"#ffd678",T:"#82341c",C:"#b6cbc0",b:"#2e1712"}, em:["C"], flat:["e"], g:[
    "..........HH..........",
    ".........HHh......CC..",
    "........HHHh.....CCCC.",
    ".......HHHHh......CC..",
    "......HHYYYhh.....TT..",
    ".....hhhhhhhhhh...T...",
    ".......sssse......T...",
    ".......WsssWs.....T...",
    "......WWWWWWW....sT...",
    ".....OOWWWWWOO..sOT...",
    "....OOOOWWWOOOOOO.T...",
    "....OOOOOWOOOoOO..T...",
    "....OOyOOOOOOoo...T...",
    "....OOOOOOOOOoo...T...",
    "...OOOOOOOOOOooo..T...",
    "...OOOOOyOOOOooo..T...",
    "...OOOOOOOOOOOooo.T...",
    "..OOOOOOOOOOOOooo.T...",
    "..oooooooooooooo..T...",
    "...bbb......bbb......."]},
  rogue:{p:{G:"#2f5e3e",g:"#1f4232",s:SKIN,e:"#ffd678",M:"#182337",L:"#61291a",l:"#452017",D:"#dfe6d6",B:"#a6441f",P:"#283d55",b:"#1c0f0c"}, em:["e"], g:[
    "........GGGG..........",
    ".......GGGGGG.........",
    "......GGGGGGGg........",
    "......GGggggGg........",
    "......GgsesesG........",
    "......GgsssMMg........",
    ".......gMMMMgg........",
    ".....GGGLLLLGGG.......",
    "....GGGLLLLLLGGg......",
    "....GGgLlBBLLsGg...D..",
    "...GGgLLLBBLLssDDD....",
    "...GGgLLLLLLLg.D......",
    "...Ggg.LLLLLLg........",
    "..GGg..PPPPPP.........",
    "..Gg...PPP.PPP........",
    ".......PPP..PP........",
    "......PPP...PPP.......",
    "......bbb...bbbb......",
    ".....bbbb....bbbb....."]},
  cleric:{p:{W:"#dfe6d6",w:"#8fadaa",Y:"#fbb954",s:SKIN,e:"#121a29",h:"#61291a",M:"#a2a3ac",m:"#6a6c78",S:"#fff0b0",B:"#344e66",b:"#2e1712"}, em:["S"], flat:["e"], g:[
    "........hhhh..........",
    ".......hhhhhh.........",
    "......hhsssshh........",
    "......hsseseh.........",
    "......hsssssh.........",
    ".......hssss......MM..",
    "......YYYYYYY....MMMm.",
    ".....WWWYSYWWW....Mm..",
    "....WWWWYYYWWWs..sm...",
    "....WWWWWYWWWWss.m....",
    "....WwWWWWWWWw..m.....",
    "....WwBBBBBBBw........",
    "....WwWWWWWWWw........",
    "...WWwWWWYWWWww.......",
    "...WWwWWWYWWWww.......",
    "...WwWWWWYWWWWww......",
    "..WWwWWWWYWWWWww......",
    "..YYYYYYYYYYYYYY......",
    "...bbb.....bbb........"]},
  orna:{p:{P:"#5c3f72",p:"#3a2850",s:SKIN,e:"#121a29",W:"#dfe6d6",L:"#452017",F:"#ffd678",T:"#61291a",R:"#3a2850",r:"#241a33"}, em:["F"], flat:["e"], g:[
    "...........PPPP.......",
    "..........PPPPPP......",
    ".........PPpppPPP.....",
    "........PPpWWWWpP.....",
    "........PpWesssWp.....",
    "........PpWssssWpP....",
    "........PPpWssWpPP....",
    "...LL...PPPpWWpPPPPT..",
    "..LFFL.PPPPPPPPPPPPT..",
    "..LFFLsPPPPRPPPPPPPT..",
    "...LL..PPPRRRPPPPPPT..",
    "...L....PRRRRRRPPP.T..",
    "........RRRRRRRRRr.T..",
    ".......RRRRRRRRRRr.T..",
    ".......RRRRRRRRRRrrT..",
    "......RRRRRRRRRRRRrT..",
    "......rrrrrrrrrrrrrT.."]},
  wolf:{p:{g:"#557887",G:"#344e66",w:"#8fadaa",e:"#e04a3c",t:"#dfe6d6",n:"#07090f"}, em:["e"], flat:["n"], g:[
    "..g.g.................",
    ".gGgGg................",
    "ggggggg...............",
    "gegggGgg...........gg.",
    "ngggggggggggggggggggGg",
    ".ttgggggggggggggggGGg.",
    "..wwgggggggggggggGGg..",
    "...wwggggggggggggGg...",
    "....gGG.gGg...gGg.gG..",
    "....gG..gG....gG..gG..",
    "....gg..gg....gg..gg.."]},
  goblin:{p:{g:"#4a7f48",G:"#2f5e3e",e:"#ffd678",t:"#dfe6d6",R:"#b02e33",r:"#7a1f2a",C:"#452017",D:"#a2a3ac"}, em:["e"], g:[
    ".....RRRRR.......",
    "....RRRRRRR......",
    "...gRRrrrrRg.....",
    "..ggRgggggRgg....",
    "gggGegGgegGggg...",
    "..gGggggggGg.....",
    "...gGtgtgGg......",
    "....ggggg........",
    "..RRRRRRRRR......",
    ".DgRRrRRRrRg.....",
    "D.gRRrRRRrRg.....",
    "...RRRrRRRrR.....",
    "...RRRRRRRRR.....",
    "....CC...CC......",
    "....gg...gg......",
    "...ggg..ggg......"]},
  troll:{p:{T:"#4a7f48",M:"#1f4232",e:"#ffd678",w:"#dfe6d6",n:"#2f5e3e",k:"#142a24",b:"#7aa35a",C:"#61291a",c:"#452017",l:"#452017",s:"#4a7f48"}, em:["e"], g:[
    "..........MMMMM...........",
    "........MMMMMMMMM.........",
    ".......MTTTTTTTTTM........",
    "......MTTTTTTTTTTTM.......",
    "......TTeTTTTeTTTTT.......",
    "......TTTTTTTTTTTTT.......",
    ".....TTTTnnTTTTTTTT.......",
    ".....TTwTTTTTwTTTTT.......",
    "......TTTkkkkTTTTT........",
    ".......TTTTTTTTTT.........",
    "....TTTTTTTTTTTTTTTT......",
    "..TTTTTTTTTTTTTTTTTTTT....",
    ".TTTTTbbbbbbbbbTTTTTTTT...",
    "TTTT.TbbbbbbbbbbbT.TTTTT..",
    "TTT..TbbbbbbbbbbbT..TTTT..",
    "TTT..TTbbbbbbbbbTT...TTT..",
    "TTT..TTTTTTTTTTTTT...TTT..",
    ".TTs.TTCCCCCCCCCTT...sTTll",
    ".lll.TCCCCCCCCCCCT...llll.",
    ".lll..TCCcCCCcCCT...lllll.",
    ".lll..TTTTTTTTTTT..lllll..",
    "..l...TTTT...TTTT..lll....",
    "......TTTT...TTTT.........",
    "......TTTT...TTTT.........",
    ".....TTTTT...TTTTT........",
    "....TTTTTT...TTTTTT......."]},
  drake:{p:{R:"#b02e33",r:"#7a1f2a",d:"#4a1420",B:"#f2973c",b:"#c95a24",W:"#82341c",w:"#452017",H:"#dfe6d6",e:"#ffd678",t:"#f4f2ea",F:"#fbb954",C:"#dfe6d6"}, em:["e","F"], g:[
    "........................w...............",
    ".......................wWw........w.....",
    "......................wWWWw......wWw....",
    ".....................wWWWWWw....wWWWw...",
    "....................wWWWWWWWw..wWWWWWw..",
    "...HH..............wWWWWWWWWWwwWWWWWWWw.",
    "....HHRR..........wWWWWWWWWWWWWWWWWWWWWw",
    ".....RRRRR.......wWWWWWWWWWWWWWWWWWWWWw.",
    "...RRRRRRRR......dWWWWWWwWWWWWWWwWWWWw..",
    "..RReRRRRRRR.....ddWWWwddWWWWwwddWWw....",
    ".RRRRRRRRRRRR....ddRRRRRRRRRRRRdddw.....",
    "RRRRRRRRRRrRRR..dRRRRRRRRRRRRRRRRd......",
    "tRtRtRRRrrrRRRR.RRRRRRRRRRRRRRRRRRd.....",
    "FFFFFrRRrr.rRRRRRRRRBBRRRRRRRRRRRRRd....",
    "tFtFt.....rRRRRRRBBBBBRRRRRRRRRRRRRd....",
    "...........rRRRRBBBBBBBRRRRRRRRRRRRRd...",
    "............RRRBBBBBBBBBRRRRRRRRRRRRRd..",
    "............RRRBBbBBbBBBRRRRRRRRRRRRRRd.",
    "............rRRRBBBBBBBBRRRRRRrrRRRRRRd.",
    ".............rRRRBBBBBBRRRRRRrr..rRRRRRd",
    "..............rRRRRRRRRRRRRRr.....rRRRRd",
    "...............RRRR..rRRRRRr.......rRRRd",
    "..............RRRR....RRRRR.........rRRd",
    ".............RRRR.....RRRRR..........rRd",
    "............CRCRC....CRCRCR...........d."]},
  book:{p:{w:"#dfe6d6",b:"#8fadaa",r:"#7a1f2a"}, g:[
    ".wwwwww..wwwwww.","wbbbbbwwwwbbbbbw","wwwwwwwwwwwwwwww","wbbbbwwwwwbbbbbw","wwwwwwwwwwwwwwww","wbbbbbwwwwbbbbww","wwwwwwwwwwwwwwww","rrrrrrrrrrrrrrrr"]},
  coin:{p:{y:"#fbb954",Y:"#fff0b0",o:"#c95a24"}, g:[".yyyy.","yYYyyo","yYyyyo","yyyyyo","yyyyoo",".oooo."]},
  potion:{p:{r:"#e04a3c",R:"#7a1f2a",w:"#f0c9a0",c:"#82341c"}, g:["..cc..","..ww..",".wrrr.","wrrrrR","rrrrrR",".RRRR."]}
};
SPRITE_DEFS.knight = {p:{...SPRITE_DEFS.fighter.p, P:"#6e9198", T:"#344e66", t:"#1f2f45", S:"#344e66"}, flat:["v"], g:SPRITE_DEFS.fighter.g};
// ---- new cast for the longer road ----
SPRITE_DEFS.shadow = {p:{...SPRITE_DEFS.fighter.p, P:"#5c3f72", H:"#8a62a0", h:"#5c3f72", v:"#b6cbc0", e:"#b6cbc0", s:"#5c3f72", A:"#8a62a0", a:"#5c3f72", T:"#5c3f72", t:"#3a2850", Y:"#8a62a0", B:"#3a2850", L:"#5c3f72", b:"#3a2850", S:"#5c3f72", R:"#5c3f72", W:"#8a62a0", w:"#5c3f72", G:"#5c3f72"}, em:["v","e"], g:SPRITE_DEFS.fighter.g};
SPRITE_DEFS.hound = {p:{g:"#a6441f", G:"#61291a", w:"#e2762d", e:"#fbb954", t:"#dfe6d6", n:"#07090f"}, em:["e","w"], flat:["n"], g:SPRITE_DEFS.wolf.g};
SPRITE_DEFS.witch = {p:{...SPRITE_DEFS.orna.p, P:"#2f5e3e", p:"#142a24", s:"#b8775a", W:"#a2a3ac", R:"#3a2850", r:"#241a33", F:"#7aa35a", L:"#2e1712", T:"#452017"}, em:["F"], flat:["e"], g:SPRITE_DEFS.orna.g};
Object.assign(SPRITE_DEFS, {
  fairy:{p:{w:"#8fadaa", W:"#dfe6d6", h:"#fbb954", s:SKIN, e:"#121a29", G:"#7aa35a", g:"#4a7f48"}, em:["w","W","h"], flat:["e"], g:[
    "..ww..ww..",
    ".wWWwwWWw.",
    ".wWWwwWWw.",
    "..wwhhww..",
    "...hhhh...",
    "...sese...",
    "....ss....",
    "...GGGG...",
    "..GGGGGG..",
    "...gGGg...",
    "....s.s..."]},
  merchant:{p:{B:"#82341c", b:"#61291a", L:"#557887", h:"#2f5e3e", H:"#1f4232", s:SKIN, e:"#121a29", m:"#452017", R:"#a6441f", Y:"#fbb954", G:"#344e66", o:"#2e1712", c:"#dfe6d6"}, flat:["e"], g:[
    "..........BBBBBB..",
    ".........BbbbbbbB.",
    "...hhhh..BbBBBBbB.",
    "..hhhhhh.BbbbbbbB.",
    ".HHHHHHHHBBBBBBBB.",
    ".ssesssss.BbbbbbbB",
    ".ssssssss.BbBBBBbB",
    "..smmmms..BbbbbbbB",
    "..RRRRRRRRBBBBBBBB",
    ".RRRRRRRRRRLLLLLL.",
    "sRRRRRRYRRRLLLLLL.",
    "c.RRRRRRRRRLLLLL..",
    "..RRRRRRRRR.......",
    "..GGGGGGGGG.......",
    "...GGG..GGG.......",
    "...ooo..ooo.......",
    "..oooo..oooo......"]},
  dwarf:{p:{H:"#a2a3ac", h:"#6a6c78", s:SKIN, e:"#121a29", B:"#c95a24", b:"#a6441f", A:"#557887", a:"#344e66", Y:"#fbb954", G:"#452017", o:"#2e1712"}, flat:["e"], g:[
    "....HHHHH......",
    "...HHHHHHH.....",
    "..HhHHHHHhH....",
    "..sesssss......",
    "..sssssss......",
    "..BBBBBBB......",
    ".BBbBBBbBB.....",
    ".BBBBbBBBBB....",
    "AABBBBBBBBAA...",
    "AAAAYYYYAAAA...",
    "sAaAAAAAAaAs...",
    "..AAAAAAAA.....",
    "..GGG..GGG.....",
    "..ooo..ooo.....",
    ".oooo..oooo...."]},
  spider:{p:{B:"#5c3f72", b:"#8a62a0", e:"#e04a3c", L:"#8a62a0", l:"#5c3f72", m:"#e2762d", t:"#dfe6d6"}, em:["e"], g:[
    "..L......L....L......L..",
    ".L.L....L.L..L.L....L.L.",
    "L...L..L...LL...L..L...L",
    "L....LLBBBBBBBBBBLL....L",
    ".....LBBBbbbbbbbBBBL....",
    "....LBBbbmmbbmmbbBBBL...",
    "...L.BBbbbmmmmbbbBBB.L..",
    "...L..BBBbbbbbbBBBB..L..",
    "..L....BeBeBBBBeBeB...L.",
    "..L.....BBBBBBBBBB....L.",
    ".L.......BtBBBBtB......L",
    ".L.........t..t........L"]},
  leech:{p:{G:"#1f4232", g:"#2f5e3e", d:"#142a24", r:"#7a1f2a", e:"#e04a3c", y:"#7aa35a"}, em:["e"], g:[
    "....ggggg.....",
    "..ggGGGGGgg...",
    ".gGGyGGGyGGg..",
    "gGGGGGGGGGGGg.",
    "eGGdGGGGdGGGgg",
    "rgGGGGGGGGGGg.",
    ".rrggggggggg.."]},
  skeleton:{p:{W:"#dfe6d6", w:"#a2a3ac", k:"#07090f", e:"#8fadaa", M:"#82341c", F:"#ffd678", P:"#6a6c78", h:"#61291a"}, em:["e","F"], flat:["k"], g:[
    "......F........",
    "....MMMMM......",
    "...MMMMMMM.....",
    "...WWWWWWW.....",
    "...WeWWWeW.....",
    "...WWWWWWW.....",
    "....WkWkW......",
    ".....WWW...PPP.",
    "..ww.www.ww.h..",
    ".w..wwwww..wh..",
    "w...w.w.w...h..",
    "....wwwww...h..",
    ".....w.w....h..",
    "....ww.ww......",
    "....w...w......",
    "....w...w......",
    "...ww...ww....."]},
  gargoyle:{p:{S:"#a2a3ac", s:"#6a6c78", W:"#6a6c78", w:"#557887", H:"#dfe6d6", e:"#e2762d", t:"#dfe6d6", C:"#a2a3ac", P:"#344e66", p:"#283d55"}, em:["e"], g:[
    "........H......H........",
    ".......HS......SH.......",
    "W......SSSSSSSSSS......W",
    "WW....SSeSSSSSSeSS....WW",
    "WwW...SSSSSSSSSSSS...WwW",
    "WwwW...SStttttttSS..WwwW",
    "WwwwW...SSSSSSSSS..WwwwW",
    ".WwwwWSSSSSSSSSSSSSWwwwW",
    "..WwwSSSSSSSSSSSSSSSwwW.",
    "...WSSSsSSSSSSSSsSSSSW..",
    "....SSSsSSSSSSSSsSSSS...",
    "...SSS.SSSSSSSSSS.SSS...",
    "..CSS..SSSSSSSSSS..SSC..",
    "..C....SSSS..SSSS....C..",
    "......SSSS....SSSS......",
    ".....CCSS......SSCC.....",
    "...PPPPPPPPPPPPPPPPPP...",
    "...PppppppppppppppppP...",
    "...PPPPPPPPPPPPPPPPPP..."]}
});

const SPR = {};
const SPR_SCALE = {drake:2, gargoyle:2};
function spr(key, raw){ if (raw) return SPR[key+":raw"] || (SPR[key+":raw"] = compileSprite(SPRITE_DEFS[key]));
  return SPR[key] || (SPR[key] = SPR_SCALE[key] ? scaleSprite(spr(key, true), SPR_SCALE[key]) : spr(key, true)); }
function sprLying(key){ return SPR[key+":lie"] || (SPR[key+":lie"] = rotateSprite(spr(key))); }
// paint a sprite into a small DOM canvas (portraits, roster)
function paintSpriteCanvas(cv, key){
  const s = spr(key, true), n = Math.max(s.w, s.h); cv.width = n; cv.height = n;
  const c = cv.getContext("2d"), img = c.createImageData(n, n), ox = Math.floor((n-s.w)/2), oy = n-s.h;
  for (let y=0;y<s.h;y++) for (let x=0;x<s.w;x++){ const k = y*s.w+x; if (!s.a[k]) continue; const d = ((y+oy)*n + x+ox)*4;
    const pi = LUT[((Math.min(255,s.rgb[k*3])>>3)<<10)|((Math.min(255,s.rgb[k*3+1])>>3)<<5)|(Math.min(255,s.rgb[k*3+2])>>3)], p = PAL_RGB[pi];
    img.data[d]=p[0]; img.data[d+1]=p[1]; img.data[d+2]=p[2]; img.data[d+3]=255; }
  c.putImageData(img, 0, 0);
}

/* ---------- backgrounds ---------- */
// each: ground (feet line), amb (ambient light), lights, draw(fb, rng) static, anim(fb, t, S) animated, emit(t, scene) particles
const GLOW = "#ffd678", FIRE1 = "#fbb954", FIRE2 = "#e2762d", FIRE3 = "#c95a24";
function flame(fb, x, y, w, h, t, seed=0){
  for (let i=0;i<w;i++){ const fh = Math.max(1, Math.round(h*(0.55 + 0.45*Math.abs(Math.sin(t/90 + i*1.7 + seed))) - Math.abs(i - w/2)*h/w*0.9));
    fb.rect(x+i, y-fh, 1, fh, FIRE3, 1, 1); fb.rect(x+i, y-Math.round(fh*0.75), 1, Math.round(fh*0.75), FIRE2, 1, 1);
    if (Math.abs(i-w/2) < w/3) fb.rect(x+i, y-Math.round(fh*0.45), 1, Math.round(fh*0.45), FIRE1, 1, 1); }
  fb.rect(x+Math.floor(w/2)-1, y-2, 2, 2, GLOW, 1, 1);
}
function stars(fb, rng, n, ymax){ for (let i=0;i<n;i++){ const x = Math.floor(rng()*SW), y = Math.floor(rng()*ymax); fb.px(x, y, rng() < 0.2 ? "#dfe6d6" : "#557887", rng() < 0.3 ? 1 : 0); } }
function bricks(fb, x0, y0, w, h, bw, bh, c1, c2, rng){
  fb.rect(x0, y0, w, h, c1);
  for (let y=y0; y<y0+h; y+=bh){ fb.rect(x0, y, w, 1, c2); const off = ((y-y0)/bh)%2 ? bw/2 : 0; for (let x=x0+off; x<x0+w; x+=bw) fb.rect(x, y, 1, bh, c2);
    if (rng) for (let x=x0+off; x<x0+w; x+=bw) if (rng() < 0.25) fb.rect(x+1, y+1, Math.min(bw-2, x0+w-x-1), 1, mix(col(c1), LIGHT_HUE, 0.08)); }
}
function pine(fb, cx, base, h, c){ for (let y=0;y<h;y++){ const w = Math.floor((y % 7 + y*0.5)*0.55) + 1; fb.rect(cx-w, base-h+y, w*2+1, 1, c); } }
const BGS = {
  tavern:{ground:154, amb:[0.34,0.4,0.52], shadowFrom:0,
    lights:[{x:166,y:128,r:150,c:[1.35,0.72,0.34],f:0.22},{x:100,y:44,r:80,c:[1.1,0.78,0.42],f:0.1},{x:272,y:118,r:46,c:[1.0,0.7,0.4],f:0.15},{x:48,y:62,r:70,c:[0.35,0.55,0.85],f:0}],
    draw(fb, r){
      fb.rect(0,0,SW,SH,"#2e1712");
      for (let x=0;x<SW;x+=14){ fb.rect(x,14,1,128,"#1c0f0c"); fb.rect(x+1,14,1,128,"#452017"); for (let k=0;k<3;k++) if (r()<0.6) fb.rect(x+3+Math.floor(r()*8), 20+Math.floor(r()*110), 2+Math.floor(r()*3), 1, "#1c0f0c"); }
      fb.rect(0,0,SW,14,"#1c0f0c"); fb.rect(0,10,SW,4,"#452017"); fb.rect(0,14,SW,1,"#07090f");
      for (let x=20;x<SW;x+=70){ fb.rect(x,0,8,14,"#452017"); fb.rect(x,14,8,3,"#2e1712"); }
      fb.rect(0,112,SW,30,"#1c0f0c"); fb.rect(0,112,SW,2,"#452017");
      // window
      fb.rect(26,36,46,52,"#1c0f0c"); fb.rect(29,39,40,46,"#121a29");
      for (let y=39;y<85;y++) for (let x=29;x<69;x++) if ((y-39)/46 > 0.5 && BAYER4[(y&3)*4+(x&3)]+0.47 < (y-39)/46-0.4) fb.px(x,y,"#182337");
      fb.rect(37,45,7,7,"#dfe6d6",1,1); fb.rect(36,46,1,5,"#b6cbc0",1,1); fb.rect(44,46,1,5,"#b6cbc0",1,1);
      fb.rect(48,39,2,46,"#1c0f0c"); fb.rect(29,60,40,2,"#1c0f0c"); fb.rect(24,86,50,4,"#452017");
      // shelf with bottles
      fb.rect(206,52,74,3,"#61291a"); fb.rect(206,55,74,1,"#1c0f0c");
      [["#2f5e3e",8],["#7a1f2a",11],["#344e66",7],["#a6441f",9],["#2f5e3e",10],["#5c3f72",8],["#b6cbc0",6]].forEach(([c,h],i)=>{ const x=210+i*10; fb.rect(x,52-h,6,h,c); fb.rect(x+2,52-h-3,2,3,c); fb.rect(x+1,52-h+2,1,h-4,mix(col(c),LIGHT_HUE,0.3)); });
      fb.rect(206,84,74,3,"#61291a"); [0,1,2,3].forEach(i=>{ fb.rect(212+i*16,72,10,12,"#82341c"); fb.rect(212+i*16,72,10,2,"#a6441f"); fb.rect(212+i*16,77,10,1,"#452017"); });
      // fireplace
      bricks(fb, 130, 58, 72, 90, 10, 6, "#344e66", "#1f2f45", r);
      fb.rect(124,52,84,7,"#61291a"); fb.rect(124,52,84,2,"#82341c"); fb.rect(124,59,84,1,"#1c0f0c");
      fb.rect(146,90,40,58,"#0c111c"); fb.rect(146,90,40,3,"#1f2f45");
      fb.rect(150,140,32,4,"#2e1712"); fb.rect(152,138,28,2,"#452017");
      // floor
      fb.rect(0,142,SW,38,"#452017"); for (let y=142;y<SH;y+=6){ fb.rect(0,y,SW,1,"#2e1712"); for (let x=(y%12)*3; x<SW; x+=36) fb.rect(x,y,1,6,"#2e1712"); }
      fb.rect(0,142,SW,1,"#61291a");
      fb.rect(62,158,112,14,"#7a1f2a"); fb.rect(62,158,112,1,"#b02e33"); fb.dith(66,161,104,8,"#4a1420",0.4);
      // table + stool
      fb.rect(250,124,60,5,"#82341c"); fb.rect(250,124,60,1,"#a6441f"); fb.rect(256,129,4,26,"#452017"); fb.rect(300,129,4,26,"#452017");
      fb.rect(268,112,8,12,"#b6cbc0"); fb.rect(269,113,6,3,"#fff0b0"); fb.rect(286,118,6,6,"#a6441f"); fb.rect(292,119,2,3,"#a6441f");
      // hanging lantern chain
      for (let y=14;y<36;y+=2) fb.px(100,y,"#6a6c78"); fb.rect(96,36,9,3,"#2e1712"); fb.rect(97,39,7,9,"#452017"); fb.rect(96,48,9,2,"#2e1712");
    },
    anim(fb, t){ flame(fb, 152, 140, 28, 26, t); fb.rect(99,40,3,6,GLOW,1,1); fb.rect(98,42,5,3,FIRE1,1,1); fb.rect(271,108,2,4,FIRE1,1,1); fb.px(271,107,GLOW,1);
      for (let i=0;i<8;i++){ const x = 30 + ((i*13 + Math.floor(t/50))%38), y = 40 + ((i*17 + Math.floor(t/18))%44); if (x<68) fb.px(x,y,"#344e66"); } },
    emit(t, sc){ if (Math.random()<0.35) sc.spawn({x:156+Math.random()*20,y:118,vx:(Math.random()-0.5)*6,vy:-14-Math.random()*10,life:1.4,c:Math.random()<0.5?FIRE1:FIRE2,em:1}); }
  },
  forest:{ground:156, amb:[0.3,0.42,0.6], shadowFrom:0,
    lights:[{x:236,y:104,r:96,c:[1.3,0.8,0.42],f:0.12},{x:196,y:72,r:200,c:[0.22,0.32,0.45],f:0}],
    draw(fb, r){
      fb.vgrad(0,120,["#07090f","#0c111c","#121a29","#1f2f45","#283d55"]);
      stars(fb, r, 60, 80);
      for (let y=-10;y<=10;y++){ const w = Math.floor(Math.sqrt(100-y*y)); fb.rect(196-w,72+y,w*2,1,"#dfe6d6",1,1); }
      fb.rect(192,68,4,3,"#b6cbc0",1,1); fb.rect(200,76,3,2,"#b6cbc0",1,1);
      for (let x=-10;x<SW+10;x+=14) pine(fb, x+Math.floor(r()*6), 122, 30+Math.floor(r()*26), "#121a29");
      for (let x=-6;x<SW+10;x+=22) pine(fb, x+Math.floor(r()*10), 132, 44+Math.floor(r()*30), "#0c111c");
      fb.rect(0,130,SW,50,"#121a29");
      fb.rect(0,140,SW,40,"#1f2f45"); for (let y=140;y<SH;y++){ const w = 70 + (y-140)*4; fb.rect(160-w/2,y,w,1,"#283d55"); }
      for (let i=0;i<40;i++) fb.rect(Math.floor(r()*SW),142+Math.floor(r()*36),2,1,"#344e66");
      for (let i=0;i<60;i++){ const x = Math.floor(r()*SW), y = 138+Math.floor(r()*40); fb.rect(x,y-2,1,3,"#1f4232"); fb.px(x+1,y-1,"#2f5e3e"); }
      [6,52,288].forEach(x=>{ fb.rect(x,0,12,146,"#0c111c"); fb.rect(x+2,0,2,146,"#121a29"); });
      // signpost with lantern
      fb.rect(244,96,4,52,"#452017"); fb.rect(244,96,1,52,"#61291a"); fb.rect(232,96,16,3,"#452017");
      fb.rect(222,118,30,8,"#61291a"); fb.rect(222,118,30,1,"#82341c"); fb.rect(226,121,20,1,"#2e1712");
      fb.rect(233,99,1,4,"#6a6c78"); fb.rect(230,103,8,2,"#2e1712"); fb.rect(231,105,6,7,"#452017"); fb.rect(230,112,8,2,"#2e1712");
    },
    anim(fb, t){ fb.rect(232,106,4,5,FIRE1,1,1); fb.rect(233,107,2,3,GLOW,1,1); },
    emit(t, sc){ if (Math.random()<0.5) sc.spawn({x:Math.random()*SW,y:-2,vx:3+Math.random()*4,vy:8+Math.random()*6,life:14,c:"#8fadaa",em:0,ash:1});
      if (Math.random()<0.04) sc.spawn({x:Math.random()*SW,y:120+Math.random()*30,vx:(Math.random()-0.5)*6,vy:-2,life:3,c:"#ffd678",em:1,fly:1}); }
  },
  bridge:{ground:144, amb:[0.3,0.4,0.58], shadowFrom:0,
    lights:[{x:36,y:96,r:90,c:[1.3,0.78,0.4],f:0.12},{x:284,y:96,r:90,c:[1.3,0.78,0.4],f:0.12},{x:190,y:48,r:60,c:[0.9,0.3,0.25],f:0.3}],
    draw(fb, r){
      fb.vgrad(0,110,["#07090f","#0c111c","#182337","#283d55"]);
      stars(fb, r, 70, 70);
      for (let y=0;y<40;y++){ const w = Math.floor(y*1.8)+2; fb.rect(60-w,82+y,w*2,1,"#121a29"); } for (let y=0;y<30;y++){ const w = Math.floor(y*2.2)+2; fb.rect(260-w,92+y,w*2,1,"#121a29"); }
      fb.rect(184,52,12,70,"#121a29"); fb.rect(180,50,20,4,"#121a29"); fb.rect(186,56,4,6,"#e04a3c",1,1);
      fb.rect(0,112,SW,68,"#0c111c");
      for (let y=150;y<SH;y++) for (let x=0;x<SW;x++) if (BAYER4[(y&3)*4+(x&3)]+0.47 < 0.3) fb.px(x,y,"#182337");
      // arches
      bricks(fb, 0, 144, SW, 8, 12, 4, "#426276", "#283d55", r);
      fb.rect(0,140,SW,4,"#557887"); fb.rect(0,140,SW,1,"#8fadaa");
      [[30,110],[130,210],[230,310]].forEach(([a,b])=>{ for (let x=a;x<b;x++){ const tt = (x-a)/(b-a)*2-1; const y = 152 + Math.round(Math.sqrt(1-tt*tt)*-6 + 6); fb.rect(x,152,1,Math.max(0,y-152)+2,"#344e66"); } });
      [0,110,210,310].forEach(x=> bricks(fb, x-10, 152, 20, 28, 10, 5, "#344e66", "#1f2f45"));
      // railing
      fb.rect(0,120,SW,3,"#426276"); fb.rect(0,120,SW,1,"#6e9198");
      for (let x=4;x<SW;x+=20){ fb.rect(x,120,4,20,"#344e66"); fb.rect(x,120,1,20,"#557887"); }
      [34,282].forEach(x=>{ fb.rect(x,86,4,54,"#1f2f45"); fb.rect(x-3,84,10,3,"#121a29"); fb.rect(x-2,87,8,9,"#182337"); fb.rect(x-3,96,10,2,"#121a29"); });
    },
    anim(fb, t){ [34,282].forEach(x=>{ fb.rect(x-1,88,6,7,FIRE1,1,1); fb.rect(x,89,4,4,GLOW,1,1); });
      for (let i=0;i<14;i++){ const y = 160 + (i*5)%20, x0 = (i%2 ? 36 : 284) - 6 + Math.round(Math.sin(t/300+i)*3); fb.rect(x0, y, 8 - (i%3)*2, 1, i%2 ? FIRE2 : FIRE1, 1, 1); }
      for (let i=0;i<24;i++){ const x = ((i*37 + t*0.02) % (SW+20)) - 10, y = 156 + (i*7)%22; fb.rect(x,y,5,1,"#283d55"); } },
    emit(){}
  },
  gate:{ground:156, amb:[0.28,0.38,0.56], shadowFrom:0,
    lights:[{x:84,y:110,r:110,c:[1.35,0.7,0.32],f:0.25},{x:236,y:110,r:110,c:[1.35,0.7,0.32],f:0.25},{x:160,y:96,r:60,c:[1.1,0.45,0.2],f:0.4}],
    draw(fb, r){
      fb.vgrad(0,60,["#07090f","#0c111c","#121a29"]); stars(fb, r, 30, 50);
      bricks(fb, 40, 0, 240, 150, 16, 8, "#283d55", "#182337", r);
      fb.rect(40,0,6,150,"#1f2f45"); fb.rect(274,0,6,150,"#1f2f45");
      for (let i=0;i<5;i++){ fb.rect(30+i*2,20+i*26,8,6,"#344e66"); fb.rect(282-i*2,20+i*26,8,6,"#344e66"); }
      // door arch
      for (let y=40;y<150;y++){ const tt = y < 70 ? Math.sqrt(1-((70-y)/30)**2) : 1; const w = Math.round(38*tt); fb.rect(160-w-6,y,w*2+12,1,"#121a29"); fb.rect(160-w,y,w*2,1,"#82341c"); }
      fb.rect(159,42,2,108,"#452017");
      for (let y=60;y<150;y+=16) for (const x of [128,150,168,190]) fb.rect(x,y,3,3,"#fbb954");
      for (let y=74;y<140;y+=22){ fb.rect(124,y,72,2,"#61291a"); }
      fb.rect(150,30,20,10,"#344e66"); fb.rect(156,32,8,6,"#121a29");
      // steps + ground
      fb.rect(0,148,SW,32,"#1f2f45"); for (let x=0;x<SW;x+=12) for (let y=150;y<SH;y+=7) fb.rect(x+((y/7)%2)*6,y,11,6,r()<0.5?"#283d55":"#1f2f45");
      fb.rect(108,146,104,4,"#344e66"); fb.rect(100,150,120,4,"#283d55");
      // braziers
      [84,236].forEach(x=>{ fb.rect(x-10,128,20,4,"#2e1712"); fb.rect(x-8,132,16,4,"#452017"); fb.rect(x-2,136,4,14,"#2e1712"); fb.rect(x-7,150,14,3,"#2e1712"); });
    },
    anim(fb, t){ [84,236].forEach((x,i)=> flame(fb, x-9, 129, 18, 22, t, i*3));
      const a = 0.5+0.5*Math.sin(t/400); for (let i=0;i<3;i++){ fb.rect(132,82+i*22,16,1, a>0.5?FIRE1:FIRE2,1,1); fb.rect(172,82+i*22,16,1, a>0.5?FIRE2:FIRE1,1,1); } },
    emit(t, sc){ if (Math.random()<0.5){ const x = Math.random()<0.5?84:236; sc.spawn({x:x+(Math.random()-0.5)*12,y:108,vx:(Math.random()-0.5)*8,vy:-16-Math.random()*12,life:1.6,c:Math.random()<0.5?FIRE1:FIRE2,em:1}); } }
  },
  hall:{ground:156, amb:[0.3,0.36,0.5], shadowFrom:0,
    lights:[{x:70,y:70,r:100,c:[1.3,0.7,0.35],f:0.2},{x:250,y:70,r:100,c:[1.3,0.7,0.35],f:0.2},{x:160,y:150,r:70,c:[0.5,0.9,0.6],f:0.15}],
    draw(fb, r){
      bricks(fb, 0, 0, SW, 146, 18, 9, "#1f2f45", "#121a29", r);
      [24,138,280].forEach(x=>{ fb.rect(x,0,22,146,"#283d55"); fb.rect(x,0,3,146,"#344e66"); fb.rect(x+19,0,3,146,"#182337"); fb.rect(x-3,0,28,8,"#344e66"); fb.rect(x-3,136,28,10,"#344e66"); });
      [92,206].forEach(x=>{ fb.rect(x,14,26,56,"#7a1f2a"); fb.rect(x,14,26,2,"#b02e33"); for (let i=0;i<6;i++) fb.rect(x+i*5,70,3,4+((i%2)*3),"#7a1f2a");
        fb.rect(x+8,30,10,9,"#dfe6d6"); fb.rect(x+10,33,2,2,"#07090f"); fb.rect(x+14,33,2,2,"#07090f"); fb.rect(x+11,37,4,1,"#07090f"); fb.rect(x+9,40,8,3,"#dfe6d6"); });
      [70,250].forEach(x=>{ fb.rect(x-3,70,6,3,"#2e1712"); fb.rect(x-1,73,3,12,"#452017"); });
      fb.rect(0,146,SW,34,"#182337"); for (let y=146;y<SH;y+=8) for (let x=((y/8)%2)*12; x<SW; x+=24){ fb.rect(x,y,23,7,"#1f2f45"); fb.rect(x,y,23,1,"#283d55"); }
      // cauldron
      fb.rect(146,138,28,14,"#121a29"); fb.rect(144,136,32,3,"#283d55"); fb.rect(150,152,4,4,"#121a29"); fb.rect(166,152,4,4,"#121a29");
      for (let i=0;i<10;i++){ const x=Math.floor(r()*300)+10; fb.rect(x,152+Math.floor(r()*20),4,2,"#b6cbc0"); }
    },
    anim(fb, t){ [70,250].forEach((x,i)=> flame(fb, x-4, 70, 9, 14, t, i)); const b = Math.sin(t/200); fb.rect(148,135,24,2,"#4a7f48",1,1); fb.rect(152+Math.round(b*3),133,3,2,"#7aa35a",1,1); fb.rect(162-Math.round(b*2),132,2,2,"#7aa35a",1,1); },
    emit(t, sc){ if (Math.random()<0.15) sc.spawn({x:150+Math.random()*20,y:132,vx:(Math.random()-0.5)*4,vy:-8,life:2,c:"#7aa35a",em:1}); }
  },
  library:{ground:156, amb:[0.26,0.33,0.48], shadowFrom:0,
    lights:[{x:262,y:116,r:110,c:[0.45,1.05,1.0],f:0.18},{x:40,y:60,r:60,c:[1.2,0.75,0.4],f:0.2},{x:150,y:40,r:60,c:[1.2,0.75,0.4],f:0.2}],
    draw(fb, r){
      fb.rect(0,0,SW,SH,"#121a29");
      const BOOK = ["#7a1f2a","#344e66","#2f5e3e","#82341c","#5c3f72","#426276","#a6441f"];
      for (let s=0;s<4;s++){ const x0 = s*80+4; fb.rect(x0,4,74,140,"#2e1712"); fb.rect(x0,4,2,140,"#452017"); fb.rect(x0+72,4,2,140,"#1c0f0c");
        for (let row=0; row<5; row++){ const y = 8+row*27; let x = x0+4;
          while (x < x0+70){ const w = Math.min(2+Math.floor(r()*4), x0+70-x); const h = 16+Math.floor(r()*7); const c = BOOK[Math.floor(r()*BOOK.length)];
            if (r()<0.1){ fb.rect(x,y+23-h+2,w+3,3,c); x += w+4; continue; }
            fb.rect(x,y+23-h,w,h,c); fb.rect(x,y+23-h+3,w,1,"#fbb954"); x += w + (r()<0.12?2:0); }
          fb.rect(x0,y+23,74,3,"#61291a"); fb.rect(x0,y+23,74,1,"#82341c"); } }
      fb.rect(0,146,SW,34,"#2e1712"); for (let y=146;y<SH;y+=5) fb.rect(0,y,SW,1,"#1c0f0c");
      fb.rect(60,156,200,14,"#3a2850"); fb.rect(60,156,200,1,"#5c3f72");
      // ladder
      for (let y=10;y<146;y++){ fb.px(118,y,"#82341c"); fb.px(128,y,"#82341c"); } for (let y=16;y<146;y+=12) fb.rect(118,y,11,2,"#61291a");
      // lectern
      fb.rect(254,124,16,28,"#452017"); fb.rect(250,152,24,3,"#2e1712"); fb.rect(244,116,36,8,"#61291a");
      fb.rect(246,110,32,6,"#dfe6d6"); fb.rect(261,110,2,6,"#8fadaa");
      [40,150].forEach(x=>{ fb.rect(x-3,62,8,3,"#6a6c78"); fb.rect(x-1,56,3,6,"#dfe6d6"); });
    },
    anim(fb, t){ const a = 0.5+0.5*Math.sin(t/260); for (let i=0;i<6;i++){ const y = 104 - ((i*5 + t/60) % 26), x = 250 + (i*7)%26; fb.rect(x, y, 2, 2, a>0.5?"#b6cbc0":"#6e9198", 1, 1); }
      fb.rect(248,111,12,1,"#6e9198",1,1); fb.rect(264,113,12,1,"#6e9198",1,1); [40,150].forEach(x=>{ fb.rect(x,52,1,4,FIRE1,1,1); fb.px(x,51,GLOW,1); }); },
    emit(t, sc){ if (Math.random()<0.08) sc.spawn({x:Math.random()*SW,y:40+Math.random()*100,vx:(Math.random()-0.5)*2,vy:-1,life:5,c:"#557887",em:0}); }
  },
  shrine:{ground:156, amb:[0.28,0.34,0.5], shadowFrom:0,
    lights:[{x:160,y:84,r:150,c:[0.45,0.65,0.95],f:0},{x:218,y:118,r:60,c:[1.2,0.75,0.4],f:0.2},{x:282,y:118,r:60,c:[1.2,0.75,0.4],f:0.2}],
    draw(fb, r){
      bricks(fb, 0, 0, SW, 146, 24, 12, "#1f2f45", "#121a29", r);
      for (let y=34;y<94;y++){ const tt = y < 50 ? Math.sqrt(1-((50-y)/16)**2) : 1; const w = Math.round(14*tt); fb.rect(160-w-3,y,w*2+6,1,"#283d55"); fb.rect(160-w,y,w*2,1,"#8fadaa",1,1); }
      fb.rect(159,34,2,60,"#283d55",1,0); fb.rect(146,64,28,2,"#283d55");
      for (let y=94;y<SH;y++){ const w = 14 + (y-94)*0.5, sh = (y-94)*0.6; for (let x=Math.round(160-w+sh); x<160+w+sh; x++) if (x>=0&&x<SW&&BAYER4[(y&3)*4+(x&3)]+0.47 < 0.22) fb.px(x,y,"#6e9198"); }
      fb.rect(0,146,SW,34,"#1f2f45"); for (let x=0;x<SW;x+=16) fb.rect(x,146,1,34,"#121a29"); fb.rect(0,146,SW,1,"#344e66");
      fb.rect(206,124,90,24,"#426276"); fb.rect(202,120,98,5,"#557887"); fb.rect(202,120,98,1,"#8fadaa"); fb.rect(240,128,22,12,"#283d55"); fb.rect(248,130,6,8,"#fbb954");
      for (let y=0;y<60;y+=3){ fb.rect(298,y,2,2,"#6a6c78"); fb.rect(20,y+20,2,2,"#6a6c78"); }
      [218,282].forEach(x=>{ fb.rect(x-2,112,5,8,"#dfe6d6"); });
    },
    anim(fb, t){ [218,282].forEach((x,i)=>{ const h = 3 + Math.round(Math.abs(Math.sin(t/110+i))*2); fb.rect(x-1,112-h,3,h,FIRE1,1,1); fb.px(x,111-h,GLOW,1); }); },
    emit(t, sc){ if (Math.random()<0.15) sc.spawn({x:150+Math.random()*40,y:70+Math.random()*80,vx:0.5,vy:-0.6,life:5,c:"#b6cbc0",em:1,mote:1}); }
  },
  lair:{ground:156, amb:[0.36,0.26,0.32], shadowFrom:0,
    lights:[{x:80,y:170,r:120,c:[1.4,0.55,0.25],f:0.2},{x:240,y:170,r:120,c:[1.4,0.55,0.25],f:0.2},{x:250,y:140,r:70,c:[1.2,0.9,0.4],f:0.1},{x:40,y:60,r:80,c:[1.2,0.45,0.2],f:0.3}],
    draw(fb, r){
      fb.vgrad(0,150,["#0c111c","#1c0f0c","#2e1712","#452017"]);
      for (let x=0;x<SW;x+=10){ const h = 8 + Math.floor(r()*34); for (let y=0;y<h;y++){ const w = Math.max(1, Math.floor((h-y)/2.4)); fb.rect(x+5-w,y,w*2,1, y > h-4 ? "#2e1712" : "#1c0f0c"); } }
      for (let i=0;i<5;i++){ const x = 20 + i*70 + Math.floor(r()*20); for (let y=30;y<150;y++) fb.rect(x + Math.round(Math.sin(y/9+i)*3), y, 6, 1, "#1c0f0c"); }
      fb.rect(30,40,10,110,"#61291a",1,0); fb.rect(32,40,6,110,"#a6441f",1,1);
      fb.rect(0,148,SW,32,"#2e1712"); for (let i=0;i<60;i++) fb.rect(Math.floor(r()*SW),150+Math.floor(r()*28),3,2,"#1c0f0c");
      for (let y=0;y<22;y++){ const w = 64 - y*2.6; fb.rect(250-w,156-y,w*2,1, y%3 ? "#c95a24" : "#e2762d"); }
      for (let i=0;i<60;i++) fb.px(196+Math.floor(r()*110),136+Math.floor(r()*20),"#ffd678",1);
      [[40,162],[90,168],[300,166]].forEach(([x,y])=>{ fb.rect(x,y,12,2,"#dfe6d6"); fb.rect(x-1,y-1,2,4,"#dfe6d6"); fb.rect(x+11,y-1,2,4,"#dfe6d6"); });
      fb.rect(130,164,10,7,"#dfe6d6"); fb.rect(132,166,2,2,"#07090f"); fb.rect(136,166,2,2,"#07090f");
    },
    anim(fb, t){ const p = 0.5+0.5*Math.sin(t/320); const g = mkRng(5);
      for (let k=0;k<7;k++){ let x = Math.floor(g()*SW), y = 152 + Math.floor(g()*26); for (let s=0;s<8;s++){ const nx = x + 3 + Math.floor(g()*6); fb.rect(x,y,nx-x,1, (s+k)%2 ? (p>0.5?FIRE1:FIRE2) : FIRE3, 1, 1); x = nx; y += Math.floor(g()*3)-1; } }
      for (let y=40;y<150;y+=3) fb.rect(33, y + Math.floor(t/50)%3, 4, 1, FIRE1, 1, 1); },
    emit(t, sc){ if (Math.random()<0.4) sc.spawn({x:Math.random()*SW,y:176,vx:(Math.random()-0.5)*6,vy:-10-Math.random()*16,life:2.5,c:Math.random()<0.5?FIRE1:FIRE2,em:1}); }
  },
  glade:{ground:156, amb:[0.26,0.34,0.5], shadowFrom:0,
    lights:[{x:176,y:150,r:120,c:[0.35,0.95,0.75],f:0.15},{x:60,y:118,r:70,c:[0.95,0.45,0.95],f:0.2},{x:262,y:116,r:70,c:[0.45,0.85,1.0],f:0.2},{x:200,y:70,r:160,c:[0.2,0.28,0.4],f:0}],
    draw(fb, r){
      fb.vgrad(0,132,["#07090f","#0c111c","#142a24","#1f4232"]);
      stars(fb, r, 40, 80);
      for (let x=-10;x<SW+10;x+=12) pine(fb, x+Math.floor(r()*6), 132, 26+Math.floor(r()*20), "#0c111c");
      for (let y=40;y<156;y++){ const x0 = Math.round(200 - (y-40)*0.35), w = 10 + (y-40)*0.25; for (let x=x0; x<x0+w; x++) if (BAYER4[(y&3)*4+(x&3)]+0.47 < 0.16) fb.px(x,y,"#6e9198"); }
      fb.rect(0,140,SW,40,"#142a24"); fb.rect(0,140,SW,1,"#2f5e3e");
      for (let i=0;i<90;i++){ const x=Math.floor(r()*SW), y=142+Math.floor(r()*36); fb.rect(x,y-2,1,3,"#1f4232"); fb.px(x+1,y-1,"#2f5e3e"); }
      [[0,24],[294,26]].forEach(([x,w])=>{ fb.rect(x,30,w,126,"#1c0f0c"); for (let k=2;k<w;k+=5) fb.rect(x+k,30,1,126,"#2e1712"); fb.rect(x-6,148,w+12,8,"#1c0f0c"); });
      for (let a=0;a<7;a++){ const ang=a/6*Math.PI*0.5; for (let t=0;t<36;t++) fb.px(24+Math.round(Math.cos(ang)*t), 58+Math.round(Math.sin(ang)*t), "#8fadaa"); }
      for (let ring=7;ring<36;ring+=7) for (let t=0;t<=24;t++){ const ang=t/24*Math.PI*0.5; fb.px(24+Math.round(Math.cos(ang)*ring), 58+Math.round(Math.sin(ang)*ring), "#557887"); }
      const shroom=(x,base,h,cw,c1,c2)=>{ fb.rect(x-2,base-h,5,h,"#dfe6d6"); fb.rect(x-1,base-h,1,h,"#b6cbc0"); for (let y=0;y<cw/2;y++){ const w=cw-Math.round(y*y*2/cw); fb.rect(x-Math.round(w/2), base-h-y, w, 1, c1); } for (let k=0;k<4;k++) fb.rect(x-cw/2+4+k*cw/4.5, base-h-3-(k%2)*3, 2, 2, c2, 1, 1); };
      shroom(56,154,22,26,"#5c3f72","#dfe6d6"); shroom(76,154,12,14,"#3a2850","#b6cbc0"); shroom(266,154,20,24,"#283d55","#b6cbc0"); shroom(248,154,10,12,"#344e66","#dfe6d6");
    },
    anim(fb, t){ const p = 0.5+0.5*Math.sin(t/380);
      for (let k=0;k<16;k++){ const a=k/16*Math.PI*2, x=176+Math.cos(a)*52, y=151+Math.sin(a)*6; fb.rect(x-1,y-2,3,2, k%2 ? (p>0.5?"#b6cbc0":"#6e9198") : (p>0.5?"#8a62a0":"#5c3f72"), 1, 1); fb.px(x,y,"#dfe6d6",1); } },
    emit(t, sc){ if (Math.random()<0.14) sc.spawn({x:40+Math.random()*240,y:96+Math.random()*56,vx:(Math.random()-0.5)*6,vy:-3,life:4,c:Math.random()<0.5?"#b6cbc0":"#ffd678",em:1,fly:1}); }
  },
  swamp:{ground:154, amb:[0.26,0.34,0.4], shadowFrom:0,
    lights:[{x:258,y:112,r:80,c:[1.25,0.85,0.4],f:0.15},{x:150,y:110,r:220,c:[0.16,0.26,0.24],f:0},{x:206,y:146,r:40,c:[0.55,1.0,0.5],f:0.35}],
    draw(fb, r){
      fb.vgrad(0,124,["#0c111c","#142a24","#1f4232","#2f5e3e"]);
      const dead=(x,base,h,c)=>{ fb.rect(x,base-h,4,h,c); for (let k=0;k<4;k++){ const by=base-h+8+k*9, dir=k%2?1:-1; for (let i=0;i<9+k*2;i++) fb.px(x+2+dir*i, by-Math.floor(i/2), c); } };
      dead(26,140,74,"#0c111c"); dead(104,138,54,"#142a24"); dead(178,138,64,"#0c111c");
      fb.rect(0,136,SW,44,"#142a24");
      for (let y=138;y<SH;y+=3) for (let x=(y*7)%11; x<SW; x+=11+((y*3)%9)) fb.rect(x,y,5,1,"#1f4232");
      [[60,146],[130,142],[176,160],[300,150]].forEach(([x,y])=>{ fb.rect(x-4,y,9,2,"#2f5e3e"); fb.rect(x-3,y-1,7,1,"#4a7f48"); fb.px(x+1,y,"#142a24"); });
      [[88,150],[94,152],[150,150],[214,148]].forEach(([x,y])=>{ fb.rect(x,y-16,1,16,"#2f5e3e"); fb.rect(x-1,y-20,3,5,"#452017"); });
      fb.rect(0,152,SW,5,"#452017"); fb.rect(0,152,SW,1,"#61291a"); for (let x=4;x<SW;x+=9) fb.rect(x,152,1,5,"#2e1712"); for (let x=10;x<SW;x+=38) fb.rect(x,157,3,14,"#2e1712");
      for (let y=0;y<22;y++){ const w = 8 + y*4; fb.rect(262 - w/2, 74+y, w, 1, y%3 ? "#1f4232" : "#2f5e3e"); }
      fb.rect(226,96,72,44,"#2e1712"); for (let x=226;x<298;x+=6) fb.rect(x,96,1,44,"#1c0f0c"); fb.rect(226,96,72,2,"#142a24");
      fb.rect(242,110,14,12,"#1c0f0c"); fb.rect(244,112,10,8,"#ffd678",1,1); fb.rect(248,112,1,8,"#2e1712"); fb.rect(244,115,10,1,"#2e1712");
      fb.rect(268,118,14,22,"#1c0f0c"); fb.rect(270,120,10,20,"#452017");
      [230,250,272,294].forEach(x => fb.rect(x,140,3,22,"#1c0f0c"));
      [[236,88],[284,90]].forEach(([x,y])=>{ fb.rect(x,y,3,5,"#dfe6d6"); fb.px(x+1,y+2,"#07090f"); });
    },
    anim(fb, t){ fb.rect(209,138,4,5,"#7aa35a",1,1); fb.px(210,137,"#dfe6d6",1);
      for (let b=0;b<3;b++){ const y = 120 + b*12, off = (t*0.01*(b+1)) % 80; for (let x=-80+off; x<SW; x+=80) fb.dith(Math.round(x), y, 60, 6, "#557887", 0.18); } },
    emit(t, sc){ if (Math.random()<0.06) sc.spawn({x:Math.random()*SW,y:130+Math.random()*40,vx:0,vy:-2,life:2.5,c:"#7aa35a",em:1}); if (Math.random()<0.05) sc.spawn({x:Math.random()*SW,y:100+Math.random()*50,vx:(Math.random()-0.5)*5,vy:-1,life:4,c:"#ffd678",em:1,fly:1}); }
  },
  cave:{ground:156, amb:[0.22,0.26,0.36], shadowFrom:0,
    lights:[{x:120,y:70,r:92,c:[1.3,0.8,0.4],f:0.2},{x:258,y:128,r:70,c:[0.4,0.95,1.0],f:0.25},{x:34,y:136,r:56,c:[0.4,0.95,1.0],f:0.25}],
    draw(fb, r){
      fb.rect(0,0,SW,SH,"#121a29");
      for (let i=0;i<340;i++){ const w=3+Math.floor(r()*7), h=2+Math.floor(r()*4); fb.rect(Math.floor(r()*SW), Math.floor(r()*150), w, h, r()<0.5?"#182337":"#1f2f45"); }
      for (let y=64;y<150;y++){ const w = y < 86 ? Math.round(58*Math.sqrt(1-((86-y)/22)**2)) : 58; fb.rect(150-w,y,w*2,1,"#07090f"); if (y > 86) fb.dith(150-w,y,w*2,1,"#121a29",(y-86)/120); }
      [66,226].forEach(x=>{ fb.rect(x,60,8,96,"#61291a"); fb.rect(x,60,2,96,"#82341c"); fb.rect(x+6,60,2,96,"#452017"); });
      fb.rect(60,54,176,8,"#61291a"); fb.rect(60,54,176,2,"#82341c"); fb.rect(60,61,176,1,"#2e1712");
      fb.rect(0,148,SW,32,"#1f2f45"); fb.rect(0,148,SW,1,"#283d55");
      for (let i=0;i<60;i++) fb.rect(Math.floor(r()*SW),150+Math.floor(r()*28),2+Math.floor(r()*3),1,"#182337");
      for (let x=0;x<SW;x+=10) fb.rect(x,158,6,3,"#452017"); fb.rect(0,157,SW,1,"#a2a3ac"); fb.rect(0,161,SW,1,"#a2a3ac");
      fb.rect(8,136,34,16,"#3d3f4a"); fb.rect(8,136,34,2,"#6a6c78"); fb.rect(10,138,30,6,"#283d55"); [14,34].forEach(x=>{ fb.rect(x,152,6,5,"#07090f"); fb.px(x+2,154,"#6a6c78"); });
      for (let i=0;i<40;i++){ const x = 258 + Math.floor((r()-0.5)*80*(1-i/60)), y = 128 + Math.floor(r()*28); fb.rect(x, y, 4+Math.floor(r()*8), 3+Math.floor(r()*4), r()<0.5 ? "#3d3f4a" : "#283d55"); }
      fb.rect(282,120,30,4,"#61291a"); fb.rect(286,124,3,14,"#452017");
      const crystal=(x,y)=>{ for (let k=0;k<4;k++){ const h=6+((x+k*7)%8); fb.rect(x+k*3, y-h, 2, h, k%2?"#8fadaa":"#b6cbc0", 1, 1); } };
      crystal(28,150); crystal(250,150); crystal(300,136);
      for (let y=62;y<70;y+=2) fb.px(120,y,"#6a6c78"); fb.rect(116,70,9,2,"#2e1712"); fb.rect(117,72,7,8,"#452017"); fb.rect(116,80,9,2,"#2e1712");
    },
    anim(fb, t){ fb.rect(119,73,3,6,GLOW,1,1); fb.rect(118,75,5,3,FIRE1,1,1); const tw = Math.floor(t/220)%4; fb.px(29+tw*3,142,"#f4f2ea",1); fb.px(251+tw*3,141,"#f4f2ea",1); },
    emit(t, sc){ if (Math.random()<0.1) sc.spawn({x:60+Math.random()*180,y:60,vx:0,vy:10+Math.random()*10,life:6,c:"#557887",em:0}); }
  },
  camp:{ground:156, amb:[0.22,0.28,0.46], shadowFrom:0,
    lights:[{x:170,y:146,r:138,c:[1.5,0.75,0.35],f:0.3},{x:268,y:62,r:56,c:[1.0,0.3,0.2],f:0.3}],
    draw(fb, r){
      fb.vgrad(0,128,["#07090f","#0c111c","#121a29","#1f2f45"]); stars(fb, r, 80, 110);
      for (let y=0;y<30;y++){ const w = Math.floor(y*2.4)+2; fb.rect(70-w,112+y,w*2,1,"#121a29"); fb.rect(300-w,116+y,w*2,1,"#121a29"); }
      fb.rect(258,52,22,90,"#0c111c"); fb.rect(254,48,30,6,"#0c111c"); for (let k=0;k<4;k++) fb.rect(256+k*8,44,4,4,"#0c111c");
      fb.rect(266,60,6,8,"#e04a3c",1,1);
      fb.rect(0,136,SW,44,"#142a24"); fb.rect(0,136,SW,1,"#1f4232"); for (let i=0;i<60;i++) fb.rect(Math.floor(r()*SW),138+Math.floor(r()*40),2,1,"#1f4232");
      const tent=(x,w,h,c1,c2)=>{ for (let y=0;y<h;y++){ const ww = Math.round(w*y/h); fb.rect(x-ww/2,156-h+y,ww,1, y%4 ? c1 : c2); } fb.rect(x-1,156-h,2,h,"#1c0f0c"); fb.rect(x-3,146,6,10,"#1c0f0c"); };
      tent(44,54,32,"#82341c","#61291a"); tent(300,44,26,"#344e66","#283d55");
      for (let a=0;a<10;a++){ const x = 170 + Math.round(Math.cos(a/10*Math.PI*2)*12), y = 154 + Math.round(Math.sin(a/10*Math.PI*2)*3); fb.rect(x-2,y-1,4,3,"#6a6c78"); }
      fb.rect(112,150,26,5,"#61291a"); fb.rect(112,150,26,1,"#82341c"); fb.rect(204,152,24,5,"#61291a"); fb.rect(204,152,24,1,"#82341c");
      fb.rect(162,150,16,3,"#2e1712"); fb.rect(166,148,8,3,"#452017");
    },
    anim(fb, t){ flame(fb, 162, 151, 16, 20, t); },
    emit(t, sc){ if (Math.random()<0.4) sc.spawn({x:164+Math.random()*12,y:132,vx:(Math.random()-0.5)*8,vy:-16-Math.random()*12,life:1.4,c:Math.random()<0.5?FIRE1:FIRE2,em:1}); }
  },
  mirror:{ground:156, amb:[0.3,0.25,0.4], shadowFrom:0,
    lights:[{x:70,y:84,r:70,c:[1.2,0.75,0.4],f:0.2},{x:250,y:84,r:70,c:[1.2,0.75,0.4],f:0.2},{x:160,y:100,r:130,c:[0.55,0.45,0.95],f:0.1}],
    draw(fb, r){
      fb.rect(0,0,SW,SH,"#241a33");
      for (let x=0;x<SW;x+=40){ fb.rect(x,30,1,118,"#3a2850"); }
      fb.rect(0,40,SW,3,"#3a2850"); fb.rect(0,140,SW,8,"#3a2850"); fb.rect(0,140,SW,1,"#5c3f72");
      [36,102,160,218,284].forEach((cx, i) => { const w = i === 2 ? 40 : 32, x = cx - w/2;
        fb.rect(x-4,50,w+8,92,"#82341c"); fb.rect(x-3,51,w+6,90,"#c95a24"); fb.rect(x-4,46,w+8,6,"#82341c"); fb.rect(cx-3,42,6,6,"#fbb954");
        for (let y=54;y<138;y++){ const tt = (y-54)/84; fb.rect(x,y,w,1, tt < 0.5 ? "#3a2850" : "#5c3f72"); }
        for (let k=0;k<3;k++) for (let y=0;y<26;y++) fb.px(x+4+k*6+y*0.5, 60+y, "#8a62a0");
        const sx = cx - 4; fb.rect(sx,104,8,30,"#241a33"); fb.rect(sx+1,98,6,7,"#241a33"); });
      for (let y=148;y<SH;y+=8) for (let x=((y-148)/8%2)*12; x<SW; x+=24) fb.rect(x,y,12,8,"#3a2850");
      for (let y=148;y<SH;y+=8) for (let x=((y-148)/8%2)*12+12; x<SW; x+=24) fb.rect(x,y,12,8,"#241a33");
      [70,130,190,250].forEach(x=>{ fb.rect(x-1,112,3,36,"#82341c"); fb.rect(x-6,108,13,3,"#c95a24"); [x-5,x,x+5].forEach(cx=>fb.rect(cx-1,102,3,6,"#dfe6d6")); });
    },
    anim(fb, t){ [70,130,190,250].forEach((x,i)=>[x-5,x,x+5].forEach((cx,j)=>{ const h=3+Math.round(Math.abs(Math.sin(t/120+i+j))*2); fb.rect(cx-1,102-h,3,h,FIRE1,1,1); fb.px(cx,101-h,GLOW,1); }));
      const sx = (t*0.03) % 400 - 40; [36,102,160,218,284].forEach(cx=>{ for (let y=56;y<136;y++){ const x = Math.round(sx + (y-56)*0.4); if (Math.abs(x - cx) < 14) fb.px(x,y,"#b6cbc0",1); } }); },
    emit(t, sc){ if (Math.random()<0.08) sc.spawn({x:20+Math.random()*280,y:60+Math.random()*70,vx:0,vy:-1,life:2,c:"#dfe6d6",em:1}); }
  },
  dawn:{ground:156, amb:[0.92,0.78,0.72], shadowFrom:0,
    lights:[{x:160,y:118,r:180,c:[0.6,0.4,0.2],f:0}],
    draw(fb, r){
      fb.vgrad(0,124,["#283d55","#5c3f72","#a6441f","#e2762d","#fbb954","#ffd678"]);
      for (let y=-20;y<=0;y++){ const w = Math.floor(Math.sqrt(400-y*y)); fb.rect(160-w,122+y,w*2,1,"#fff0b0",1,1); }
      for (let y=0;y<26;y++){ const w = Math.floor(y*2.2)+2; fb.rect(60-w,100+y,w*2,1,"#5c3f72"); fb.rect(250-w,104+y,w*2,1,"#5c3f72"); }
      fb.rect(296,64,10,62,"#3a2850"); fb.rect(293,60,16,5,"#3a2850");
      fb.rect(0,124,SW,56,"#2f5e3e"); fb.rect(0,124,SW,1,"#7aa35a"); for (let i=0;i<70;i++) fb.rect(Math.floor(r()*SW),128+Math.floor(r()*50),2,1,"#4a7f48");
      for (let y=124;y<SH;y++){ const w = 30 + (y-124)*2; fb.rect(160-w/2,y,w,1,"#82341c"); }
      [[8,40],[50,30],[214,36],[262,28]].forEach(([x,h])=>{ fb.rect(x,126-h,40,h,"#3a2850"); for (let i=0;i<14;i++) fb.rect(x-4+i,126-h-i,48-i*2,1,"#241a33"); fb.rect(x+14,126-h+10,8,8,"#ffd678",1,1); fb.rect(x+17,126-h+10,1,8,"#3a2850"); });
    },
    anim(fb, t){ for (let i=0;i<4;i++){ const x = Math.floor((i*90 + t*0.02) % 360) - 20, y = 34 + i*10 + Math.round(Math.sin(t/300+i)*2); fb.rect(x,y,3,1,"#241a33"); fb.rect(x+3,y+1,1,1,"#241a33"); fb.rect(x+4,y,3,1,"#241a33"); } },
    emit(){}
  }
};

/* ---------- scene runtime ---------- */
class PixelScene {
  constructor(canvas){
    this.cv = canvas; canvas.width = SW; canvas.height = SH;
    this.ctx = canvas.getContext("2d"); this.img = this.ctx.createImageData(SW, SH);
    this.fb = new FB(); this.cache = {}; this.L = new Float32Array(SW*SH*3); this.shadow = new Uint8Array(SW*SH);
    this.parts = []; this.floats = []; this.dyn = []; this.fxs = []; this.shakeT = 0; this.fade = 0; this.fadeTo = 0; this.flashT = 0; this.flashC = [255,255,255]; this.flashDur = 1;
    this.bgKey = "tavern"; this.units = []; this.party = [];
    this.vign = new Float32Array(SW*SH); for (let y=0;y<SH;y++) for (let x=0;x<SW;x++){ const dx = (x-SW/2)/(SW/2), dy = (y-SH/2)/(SH/2); this.vign[y*SW+x] = Math.max(0.55, 1 - 0.32*(dx*dx*0.7+dy*dy)); }
  }
  layer(key){
    if (this.cache[key]) return this.cache[key];
    const fb = new FB(); BGS[key].draw(fb, mkRng(key.length*977 + 13)); return this.cache[key] = fb;
  }
  spawn(p){ p.t = 0; this.parts.push(p); if (this.parts.length > 400) this.parts.shift(); }
  burst(x, y, n, c, sp=40, opts={}){ for (let i=0;i<n;i++){ const a = Math.random()*Math.PI*2, s = sp*(0.4+Math.random()*0.6); this.spawn({x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - (opts.up||0), life:opts.life||0.6, c:Array.isArray(c) ? c[i%c.length] : c, em:1, g:opts.g ?? 60}); } }
  float(text, x, y, c, big){ this.floats.push({text, x, y, c, t:0, big}); }
  light(x, y, r, c, life){ this.dyn.push({x, y, r, c, t:0, life}); }
  shake(ms=260){ this.shakeT = performance.now() + ms; }
  addFx(type, o){ this.fxs.push({type, t0:performance.now() + (o.delay || 0), ...o}); }
  flash(ms=120, c="#f4f2ea"){ this.flashT = performance.now() + ms; this.flashDur = ms; this.flashC = col(c); }
  update(dt, t){
    const bg = BGS[this.bgKey]; if (bg.emit && !REDUCED) bg.emit(t, this);
    for (const p of this.parts){ p.t += dt; if (p.ash){ p.vx += Math.sin(t/700 + p.y*0.05)*0.3; } if (p.fly){ p.vx += (Math.random()-0.5)*8; p.vy += (Math.random()-0.5)*8; }
      if (p.g) p.vy += p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt; }
    this.parts = this.parts.filter(p => p.t < p.life && p.y < SH+4 && p.y > -10);
    for (const f of this.floats) f.t += dt; this.floats = this.floats.filter(f => f.t < 1.3);
    for (const l of this.dyn) l.t += dt; this.dyn = this.dyn.filter(l => l.t < l.life);
    if (this.fade !== this.fadeTo) this.fade += Math.sign(this.fadeTo - this.fade)*Math.min(Math.abs(this.fadeTo-this.fade), dt*3.2);
  }
  render(t, units, overlay){
    const fb = this.fb, bg = BGS[this.bgKey];
    fb.copyFrom(this.layer(this.bgKey));
    bg.anim(fb, t);
    // shadows: long, cast away from the main light
    const L0 = bg.lights[bg.shadowFrom || 0]; this.shadow.fill(0);
    for (const u of units){ if (!u.sp || u.noShadow) continue; const sp = u.sp, foot = u.y + sp.h;
      const shx = Math.max(-1.6, Math.min(1.6, (u.x + sp.w/2 - L0.x)/70)), shy = 0.22;
      for (let sy=0; sy<sp.h; sy++) for (let sx=0; sx<sp.w; sx++){ if (!sp.a[sy*sp.w+(u.flip ? sp.w-1-sx : sx)]) continue; const hgt = foot - (u.y+sy);
        const X = Math.round(u.x + sx + hgt*shx), Y = Math.round(foot - 1 + hgt*shy); if (X>=0&&X<SW&&Y>=0&&Y<SH) this.shadow[Y*SW+X] = 1; } }
    for (let i=0;i<SW*SH;i++) if (this.shadow[i] && !fb.em[i]){ fb.rgb[i*3]*=0.5; fb.rgb[i*3+1]*=0.55; fb.rgb[i*3+2]*=0.68; }
    for (const u of units) if (u.sp) fb.sprite(u.sp, u.x, u.y, {flip:u.flip, flash:u.flash, alpha:u.alpha});
    for (const p of this.parts){ const a = 1 - p.t/p.life; if (a < 0.15 && BAYER4[((p.y|0)&3)*4+((p.x|0)&3)]+0.47 > a*4) continue; fb.rect(p.x, p.y, p.s||1, p.s||1, p.c, 1, p.em); }
    // attack effects: drawn as emissive palette pixels so they glow and stay pixel-art
    const nowFx = performance.now();
    for (const f of this.fxs){ const p = (nowFx - f.t0) / f.dur; if (p < 0) continue; if (p >= 1){ f.done = true; continue; } FXDRAW[f.type] && FXDRAW[f.type](fb, p, f, this); if (f.light) this.dyn.push({x:f.lx ?? f.x, y:f.ly ?? f.y, r:f.light, c:f.lc || [1.2,0.8,0.4], t:0, life:0.05}); }
    this.fxs = this.fxs.filter(f => { if (f.done && f.onEnd){ const cb = f.onEnd; f.onEnd = null; setTimeout(cb, 0); } return !f.done; });
    if (overlay) overlay(fb, t);
    // lighting
    const Lb = this.L, amb = bg.amb;
    const ab = this.ambBoost || 1;
    for (let i=0;i<SW*SH;i++){ const v = this.vign[i]*ab; Lb[i*3]=amb[0]*v; Lb[i*3+1]=amb[1]*v; Lb[i*3+2]=amb[2]*v; }
    const add = (lx, ly, r, c, k) => { const x0 = Math.max(0, Math.floor(lx-r)), x1 = Math.min(SW, Math.ceil(lx+r)), y0 = Math.max(0, Math.floor(ly-r)), y1 = Math.min(SH, Math.ceil(ly+r)), r2 = r*r;
      for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++){ const d2 = (x-lx)*(x-lx)+(y-ly)*(y-ly); if (d2 >= r2) continue; let f = 1 - Math.sqrt(d2)/r; f = f*f*k; const j = (y*SW+x)*3; Lb[j]+=c[0]*f; Lb[j+1]+=c[1]*f; Lb[j+2]+=c[2]*f; } };
    for (const l of bg.lights){ const k = 1 - l.f*0.5 + l.f*0.5*Math.sin(t/(70+l.x%40)) * (REDUCED ? 0 : 1) - l.f*0.25*(REDUCED?0:Math.random()); add(l.x, l.y, l.r, l.c, k); }
    for (const l of this.dyn) add(l.x, l.y, l.r, l.c, 1 - l.t/l.life);
    for (const u of units) if (u.glow) add(u.x+u.glow[0], u.y+u.glow[1], u.glow[2], u.glow[3], 1);
    // floating text drawn after lighting decisions (emissive)
    for (const f of this.floats){ const y = Math.round(f.y - 18*Math.min(1, f.t*2.2) ); fb.textOutlined(f.text, f.x, y, f.c, f.big ? 3 : 2); }
    // compose + quantize
    const d = this.img.data, rgb = fb.rgb, em = fb.em, fade = this.fade, flashA = this.flashT > performance.now() ? 0.55 * (this.flashT - performance.now()) / this.flashDur : 0;
    for (let y=0;y<SH;y++) for (let x=0;x<SW;x++){
      const i = y*SW+x, j = i*3, o = i*4, b = BAYER4[(y&3)*4+(x&3)];
      if (fade > 0 && b + 0.47 < fade){ d[o]=7; d[o+1]=9; d[o+2]=15; d[o+3]=255; continue; }
      if (flashA > 0 && b + 0.47 < flashA){ const fc = this.flashC; d[o]=fc[0]; d[o+1]=fc[1]; d[o+2]=fc[2]; d[o+3]=255; continue; }
      let r = rgb[j], g = rgb[j+1], bl = rgb[j+2];
      if (!em[i]){ r *= Lb[j]; g *= Lb[j+1]; bl *= Lb[j+2]; } else { r *= 1.05; g *= 1.05; bl *= 1.05; }
      const s = b*18; r += s; g += s; bl += s;
      r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; bl = bl < 0 ? 0 : bl > 255 ? 255 : bl;
      const p = PAL_RGB[LUT[((r>>3)<<10)|((g>>3)<<5)|(bl>>3)]]; d[o]=p[0]; d[o+1]=p[1]; d[o+2]=p[2]; d[o+3]=255;
    }
    let ox = 0, oy = 0; if (performance.now() < this.shakeT && !REDUCED){ ox = Math.round(Math.random()*4-2); oy = Math.round(Math.random()*2-1); }
    if (ox || oy){ this.ctx.fillStyle = "#07090f"; this.ctx.fillRect(0,0,SW,SH); }
    this.ctx.putImageData(this.img, ox, oy);
  }
}

/* ---------- event pictures: a lit crop of a scene with sprites and an effect painted on top ---------- */
const OVER = {
  trap(fb){ const x = 100, y = 154; for (let k=0;k<7;k++){ fb.rect(x-14+k*4, y-6+(k%2)*2, 2, 5, "#a2a3ac"); fb.rect(x-14+k*4, y-9+(k%2)*2, 2, 2, "#dfe6d6"); } fb.rect(x-16,y-1,32,2,"#6a6c78"); fb.rect(x-3,y-14,6,4,"#e04a3c",1,1); for (let k=0;k<5;k++) fb.rect(x-8+k*4, y-20-k%2*3, 2, 2, "#e04a3c", 1, 1); fb.text("!", x+14, y-34, "#ffd678", 3, 1); },
  trapset(fb){ const x = 104, y = 155; fb.rect(x-12,y-1,24,2,"#6a6c78"); for (let k=0;k<6;k++) fb.rect(x-11+k*4, y-4, 2, 3, "#a2a3ac"); fb.text("!", x, y-30, "#ffd678", 3, 1); },
  coins(fb){ for (let k=0;k<26;k++){ const x = 150 + ((k*37)%40) - 20, y = 150 - Math.floor(k/6)*3 + (k%3); fb.rect(x,y,4,2,"#c95a24"); fb.rect(x,y-1,4,2,"#fbb954",1,1); } fb.rect(140,146,8,9,"#61291a"); fb.rect(141,144,6,2,"#82341c"); for (let k=0;k<6;k++) fb.px(130+k*9, 128+(k%3)*5, "#fff0b0", 1); },
  eyes(fb){ for (let k=0;k<3;k++){ const x = 200 + k*26, y = 118 + (k%2)*6; fb.rect(x,y,2,1,"#e04a3c",1,1); fb.rect(x+5,y,2,1,"#e04a3c",1,1); } },
  eyes2(fb){ for (let k=0;k<4;k++){ const x = 150 + k*24, y = 100 + (k%2)*8; fb.rect(x,y,2,2,"#8fadaa",1,1); fb.rect(x+5,y,2,2,"#8fadaa",1,1); } },
  eyes3(fb){ fb.dith(140,30,200,112,"#07090f",0.25); },
  web(fb){ const cx = 70, cy = 66; for (let a=0;a<12;a++){ const ang = a/12*Math.PI*2; for (let t=0;t<44;t++) fb.px(cx+Math.round(Math.cos(ang)*t), cy+Math.round(Math.sin(ang)*t*0.8), "#b6cbc0"); }
    for (let r=8;r<44;r+=8) for (let t=0;t<48;t++){ const ang = t/48*Math.PI*2; fb.px(cx+Math.round(Math.cos(ang)*r), cy+Math.round(Math.sin(ang)*r*0.8), "#8fadaa"); } },
  sparkle(fb, t){ for (let k=0;k<40;k++){ const a = k*2.4, r = 6 + (k*7)%40; fb.px(176+Math.round(Math.cos(a)*r), 120+Math.round(Math.sin(a)*r*0.7), k%3 ? "#ffd678" : "#dfe6d6", 1); } },
  mud(fb){ for (let k=0;k<30;k++){ const x = 118 + ((k*29)%40) - 20, y = 140 + ((k*13)%16); fb.rect(x,y,3,2, k%2 ? "#452017" : "#61291a"); } fb.rect(96,150,48,8,"#2e1712"); },
  plank(fb){ fb.rect(90,150,30,4,"#2e1712"); for (let k=0;k<5;k++) fb.rect(92+k*6, 154+k%2*2, 4, 3, "#61291a"); fb.text("!", 108, 118, "#ffd678", 3, 1); for (let k=0;k<10;k++) fb.px(96+k*3, 160+(k%3), "#557887"); },
  fire(fb, t){ for (let k=0;k<9;k++) flame(fb, 90 + k*16, 156, 14, 18 + (k%3)*6, t, k); },
  greenfire(fb, t){ for (let k=0;k<5;k++){ const x = 210 + k*8, y = 112 - (k%2)*6; fb.rect(x,y,3,6,"#7aa35a",1,1); fb.rect(x+1,y-2,1,2,"#dfe6d6",1,1); } },
  cauldron(fb, t){ fb.rect(214,140,20,14,"#121a29"); fb.rect(212,138,24,3,"#3d3f4a"); fb.rect(216,136,16,2,"#7aa35a",1,1); fb.px(220,132,"#b6cbc0",1); fb.px(226,129,"#b6cbc0",1); },
  dust(fb){ for (let k=0;k<60;k++) fb.px(60 + (k*53)%180, 40 + (k*31)%60, "#557887"); for (let k=0;k<6;k++) fb.rect(80 + k*30, 48 + (k%3)*8, 3, 3, "#3d3f4a"); },
  rocks(fb){ for (let k=0;k<9;k++){ const x = 70 + k*18, y = 60 + (k%3)*22; fb.rect(x,y,8+k%3*3,7,"#3d3f4a"); fb.rect(x,y,8+k%3*3,2,"#6a6c78"); for (let j=1;j<4;j++) fb.px(x+3, y-4*j, "#557887"); } fb.dith(50,120,200,40,"#6a6c78",0.25); },
  cart(fb){ fb.rect(120,136,34,16,"#3d3f4a"); fb.rect(120,136,34,2,"#6a6c78"); [124,146].forEach(x=>fb.rect(x,152,6,5,"#07090f")); for (let k=0;k<5;k++) fb.rect(96-k*8,140+k*3,10,1,"#dfe6d6",1,1); for (let k=0;k<8;k++) fb.rect(200+(k*9)%50, 120+(k*7)%30, 3, 2, "#dfe6d6"); },
  rubble(fb){ for (let k=0;k<18;k++){ const x = 228 + (k*17)%56, y = 132 + (k*11)%22; fb.rect(x,y,7,5, k%2 ? "#3d3f4a" : "#6a6c78"); } },
  chest(fb){ const x = 196, y = 140; fb.rect(x,y,22,14,"#61291a"); fb.rect(x,y-6,22,6,"#82341c"); fb.rect(x,y-1,22,2,"#fbb954"); fb.rect(x+9,y-2,4,5,"#fbb954"); for (let k=0;k<12;k++) fb.px(x+11+Math.round(Math.cos(k)*16), y-14+Math.round(Math.sin(k*1.3)*8), "#ffd678", 1); },
  riddle(fb, t){ const p = 0.5+0.5*Math.sin(t/300); for (let k=0;k<3;k++) fb.rect(130,82+k*22,60,2, p > 0.5 ? "#fbb954" : "#e2762d", 1, 1); fb.text("?", 160, 50, "#ffd678", 4, 1); },
  glint(fb, t){ for (let k=0;k<5;k++) fb.px(80 + k*40, 70 + (k%2)*30, "#f4f2ea", 1); },
  shatter(fb){ const cx = 160, cy = 100; for (let a=0;a<10;a++){ const ang = a/10*Math.PI*2; for (let t=4;t<26;t++) fb.px(cx+Math.round(Math.cos(ang)*t), cy+Math.round(Math.sin(ang)*t*1.4), "#dfe6d6", 1); } },
  spikes0(fb){ for (let k=0;k<12;k++) fb.rect(150 + k*10, 154, 4, 1, "#07090f"); for (let k=0;k<5;k++) fb.rect(150 + k*24, 110, 3, 3, "#07090f"); },
  spikes(fb){ for (let k=0;k<14;k++){ const x = 80 + k*7, h = 8 + (k%3)*4; for (let y=0;y<h;y++) fb.rect(x + Math.floor(y/3), 156 - y, Math.max(1, 3 - Math.floor(y/3)), 1, y > h-3 ? "#dfe6d6" : "#a2a3ac"); } fb.rect(96,128,3,3,"#e04a3c",1,1); fb.rect(112,134,2,2,"#e04a3c",1,1); },
  book(fb, t){ const p = 0.5+0.5*Math.sin(t/260); for (let k=0;k<14;k++){ const x = 244 + (k*7)%30, y = 104 - ((k*5 + t/60) % 30); fb.rect(x, y, 2, 2, p > 0.5 ? "#b6cbc0" : "#8fadaa", 1, 1); } }
};
const VIG = (() => {
  let sc = null;
  return {
    // spec: {bg, u:[[sprite, centerX, flip]], o: overlay, c:[x,y,w,h]}
    draw(target, spec, t = 2600){
      if (!sc){ const cv = document.createElement("canvas"); sc = new PixelScene(cv); sc.ambBoost = 1.45; }
      const bg = BGS[spec.bg] ? spec.bg : "forest", G = BGS[bg].ground;
      sc.bgKey = bg; sc.parts = []; sc.floats = []; sc.dyn = []; sc.fade = sc.fadeTo = 0; sc.shakeT = 0;
      const units = (spec.u || []).map(([k, x, flip]) => { const sp = spr(k); return {sp, x:Math.round(x - sp.w/2), y:G - sp.h, flip}; });
      sc.render(t, units, spec.o && OVER[spec.o] ? fb => OVER[spec.o](fb, t) : null);
      let [x, y, w, h] = spec.c || [60, 40, 200, 112];
      const z = spec.z || (w >= 180 ? 0.7 : 1); // event pictures zoom in on the action
      if (z !== 1){ const cx = x + w/2, cy = y + h*0.6; w = Math.round(w*z); h = Math.round(h*z); x = Math.round(Math.max(0, Math.min(SW - w, cx - w/2))); y = Math.round(Math.max(0, Math.min(SH - h, cy - h*0.6))); }
      target.width = w; target.height = h; const c = target.getContext("2d"); c.imageSmoothingEnabled = false; c.drawImage(sc.cv, x, y, w, h, 0, 0, w, h);
    }
  };
})();

/* ---------- attack effects (scene pixels, progress p = 0..1) ---------- */
const EASE = p => 1 - (1 - p)*(1 - p);
function arcPts(fb, cx, cy, r, a0, a1, w, cols, sx = 1, sy = 1){
  const n = Math.ceil(Math.abs(a1 - a0) * r * 1.4);
  for (let k=0;k<=n;k++){ const tt = k/n, a = a0 + (a1 - a0)*tt, ww = Math.max(1, Math.round(w * Math.sin(tt*Math.PI)));
    for (let j=0;j<ww;j++){ const rr = r - j; const x = Math.round(cx + Math.cos(a)*rr*sx), y = Math.round(cy + Math.sin(a)*rr*sy); fb.px(x, y, cols[Math.min(cols.length-1, j === 0 ? 0 : j < ww/2 ? 1 : 2)], 1); } }
}
function lineFx(fb, x0, y0, x1, y1, c, w = 1){ const n = Math.max(Math.abs(x1-x0), Math.abs(y1-y0)); for (let k=0;k<=n;k++){ const x = Math.round(x0 + (x1-x0)*k/n), y = Math.round(y0 + (y1-y0)*k/n); fb.rect(x - (w>>1), y - (w>>1), w, w, c, 1, 1); } }
function ringFx(fb, cx, cy, r, c, sy = 1, gap = 1){ const n = Math.ceil(r*6.3); for (let k=0;k<n;k+=gap){ const a = k/n*Math.PI*2; fb.px(Math.round(cx + Math.cos(a)*r), Math.round(cy + Math.sin(a)*r*sy), c, 1); } }
function discFx(fb, cx, cy, r, c, a){ for (let y=-r;y<=r;y++) for (let x=-r;x<=r;x++){ if (x*x + y*y > r*r) continue; const X = Math.round(cx + x), Y = Math.round(cy + y); if (X<0||Y<0||X>=SW||Y>=SH) continue; if (BAYER4[(Y&3)*4+(X&3)] + 0.47 < a) fb.px(X, Y, c, 1); } }
const WHITE = ["#f4f2ea","#dfe6d6","#8fadaa"], FIRE = ["#fff0b0","#fbb954","#e2762d"], BLOOD = ["#f4f2ea","#e04a3c","#7a1f2a"], ARCANE = ["#f4f2ea","#b6cbc0","#6e9198"], VOID = ["#dfe6d6","#8a62a0","#5c3f72"];
const FXDRAW = {
  // sword slash: a crescent that sweeps across the target
  slash(fb, p, f){ const a0 = -2.3, sweep = 2.6*EASE(Math.min(1, p*1.8)), cols = f.cols || WHITE;
    arcPts(fb, f.x + 4, f.y - 2, 15, a0 + Math.max(0, sweep - 1.4), a0 + sweep, Math.round(5*(1-p) + 1), cols, 1, 0.9);
    if (p < 0.3) lineFx(fb, f.x - 14, f.y + 10, f.x + 16, f.y - 12, cols[0]); },
  // 강타: two crossing heavy arcs, ember core, debris
  heavy(fb, p, f){ const s1 = EASE(Math.min(1, p*2.2)), s2 = EASE(Math.max(0, Math.min(1, (p-0.18)*2.2)));
    arcPts(fb, f.x, f.y, 20, -2.5 + Math.max(0, s1*2.8 - 1.5), -2.5 + s1*2.8, Math.round(7*(1-p)+1), FIRE, 1, 0.8);
    if (s2 > 0) arcPts(fb, f.x, f.y, 20, -0.6 - s2*2.8, -0.6 - Math.max(0, s2*2.8 - 1.5), Math.round(7*(1-p)+1), FIRE, 1, 0.8);
    if (p > 0.3){ const q = (p - 0.3)/0.7; for (let k=0;k<6;k++){ const a = k*1.05 + 0.3; lineFx(fb, f.x, f.g, Math.round(f.x + Math.cos(a)*24*q), Math.round(f.g + Math.sin(a)*3), q < 0.6 ? "#fbb954" : "#c95a24"); } } },
  // dagger thrust: speed lines into a pin-point spark
  stab(fb, p, f){ const q = EASE(Math.min(1, p*2.5)); for (let k=0;k<4;k++){ const y = f.y - 6 + k*4, x1 = f.x - 4 + q*6, len = 26*(1-p); lineFx(fb, Math.round(x1 - len), y, Math.round(x1), y, k%2 ? "#b6cbc0" : "#f4f2ea"); }
    if (p > 0.25){ const r = Math.round(2 + (p-0.25)*14); ringFx(fb, f.x + 2, f.y, r, "#f4f2ea", 1, 3); fb.rect(f.x, f.y - 2, 4, 4, "#fff0b0", 1, 1); } },
  // 급소 찌르기: afterimages behind the foe and a blood-red X
  backstab(fb, p, f, sc){ const sp = spr(f.who || "rogue");
    for (let k=0;k<3;k++){ const q = Math.max(0, p*1.6 - k*0.15); if (q <= 0 || q > 1) continue; fb.sprite(sp, Math.round(f.sx + (f.x + 14 - f.sx)*q), f.sy, {alpha:0.5 - k*0.15, flash:"#8a62a0"}); }
    if (p > 0.45){ const q = (p - 0.45)/0.55; const L = Math.round(16*EASE(Math.min(1, q*2))); lineFx(fb, f.x - L, f.y - L, f.x + L, f.y + L, q < 0.5 ? "#f4f2ea" : "#e04a3c", 2); lineFx(fb, f.x + L, f.y - L, f.x - L, f.y + L, q < 0.5 ? "#f4f2ea" : "#e04a3c", 2); } },
  // mace / club: a downward streak, then a shockwave on the ground
  smash(fb, p, f){ if (p < 0.35){ const q = p/0.35; lineFx(fb, f.x + 4, Math.round(f.y - 30 + q*26), f.x + 4, Math.round(f.y - 34 + q*26), "#f4f2ea", 3); }
    else { const q = (p - 0.35)/0.65; ringFx(fb, f.x, f.g, Math.round(4 + q*26), q < 0.5 ? "#fff0b0" : "#fbb954", 0.25, 1); ringFx(fb, f.x, f.g, Math.round(2 + q*16), "#e2762d", 0.25, 2);
      for (let k=0;k<5;k++){ const a = k*1.26 + q*3; fb.rect(Math.round(f.x + Math.cos(a)*10), Math.round(f.y - 16 - q*8 + Math.sin(a)*3), 2, 2, "#ffd678", 1, 1); } } },
  // 화염 화살: a fire ball with a trail, then an explosion
  bolt(fb, p, f, sc){ const q = EASE(p), x = f.x0 + (f.x1 - f.x0)*q, y = f.y0 + (f.y1 - f.y0)*q - Math.sin(q*Math.PI)*8;
    for (let k=1;k<7;k++){ const tq = Math.max(0, q - k*0.035), tx = f.x0 + (f.x1-f.x0)*tq, ty = f.y0 + (f.y1-f.y0)*tq - Math.sin(tq*Math.PI)*8; discFx(fb, tx, ty, Math.max(1, 4 - Math.floor(k/2)), k < 3 ? "#fbb954" : "#c95a24", 0.8 - k*0.1); }
    discFx(fb, x, y, 4, "#e2762d", 1); discFx(fb, x, y, 3, "#fbb954", 1); discFx(fb, x, y, 1, "#fff0b0", 1);
    if (Math.random() < 0.8) sc.spawn({x, y, vx:(Math.random()-0.5)*20, vy:-10 - Math.random()*20, life:0.4, c:Math.random()<0.5?"#fbb954":"#e2762d", em:1}); f.lx = x; f.ly = y; },
  boom(fb, p, f){ const r = Math.round(4 + EASE(p)*(f.r || 22)); discFx(fb, f.x, f.y, r, p < 0.3 ? "#fff0b0" : p < 0.6 ? "#fbb954" : "#c95a24", 1 - p); ringFx(fb, f.x, f.y, r + 2, p < 0.5 ? "#ffd678" : "#e2762d", 1, 1); },
  // 마법 화살: curving arcane darts
  missile(fb, p, f, sc){ const q = EASE(p), x = f.x0 + (f.x1 - f.x0)*q, y = f.y0 + (f.y1 - f.y0)*q - Math.sin(q*Math.PI)*f.arc;
    for (let k=1;k<9;k++){ const tq = Math.max(0, q - k*0.03), tx = f.x0 + (f.x1-f.x0)*tq, ty = f.y0 + (f.y1-f.y0)*tq - Math.sin(tq*Math.PI)*f.arc; fb.px(Math.round(tx), Math.round(ty), k < 4 ? "#b6cbc0" : "#6e9198", 1); }
    fb.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, "#f4f2ea", 1, 1); f.lx = x; f.ly = y; },
  spark(fb, p, f){ const r = Math.round(2 + p*10); for (let k=0;k<8;k++){ const a = k*Math.PI/4; fb.px(Math.round(f.x + Math.cos(a)*r), Math.round(f.y + Math.sin(a)*r), p < 0.5 ? "#f4f2ea" : "#b6cbc0", 1); } },
  // 치유의 빛: a pillar of light with rising crosses
  pillar(fb, p, f){ const w = Math.round(10*Math.sin(Math.min(1, p*1.4)*Math.PI)), top = Math.round(30 + (1-EASE(Math.min(1,p*3)))*40);
    for (let y=top; y<f.g; y++) for (let x=-w; x<=w; x++){ const X = f.x + x; if (BAYER4[(y&3)*4+(X&3)] + 0.47 < (1 - Math.abs(x)/(w+1))*0.85) fb.px(X, y, Math.abs(x) < w/3 ? "#f4f2ea" : "#dfe6d6", 1); }
    for (let k=0;k<5;k++){ const yy = Math.round(f.g - 6 - ((p*60 + k*13) % 50)), xx = f.x - 10 + k*5; fb.rect(xx, yy - 2, 1, 5, "#7aa35a", 1, 1); fb.rect(xx - 2, yy, 5, 1, "#7aa35a", 1, 1); } },
  // enemy hits on a hero
  bite(fb, p, f){ const c = Math.round(10*(1 - EASE(Math.min(1, p*2)))); for (let k=0;k<5;k++){ const x = f.x - 8 + k*4; fb.rect(x, f.y - 6 - c, 2, 4, "#f4f2ea", 1, 1); fb.rect(x, f.y + 3 + c, 2, 4, "#f4f2ea", 1, 1); }
    if (p > 0.45) for (let k=0;k<6;k++) fb.px(f.x - 6 + k*3, f.y + (k%2)*2, "#e04a3c", 1); },
  claw(fb, p, f){ const q = EASE(Math.min(1, p*2)); for (let k=0;k<3;k++){ const ox = f.x - 8 + k*7; lineFx(fb, ox + 6, f.y - 12, Math.round(ox + 6 - 12*q), Math.round(f.y - 12 + 22*q), p < 0.5 ? "#f4f2ea" : "#e04a3c", 2); } },
  drain(fb, p, f){ for (let k=0;k<6;k++){ const q = (p*1.5 + k/6) % 1, x = f.x + (f.x1 - f.x)*q, y = f.y + (f.y1 - f.y)*q + Math.sin(q*9 + k)*3; fb.rect(Math.round(x), Math.round(y), 2, 2, k%2 ? "#e04a3c" : "#7aa35a", 1, 1); } },
  // dragon breath: a widening cone of fire across the party
  cone(fb, p, f){ const reach = EASE(Math.min(1, p*1.6)), fade = p > 0.7 ? (1 - p)/0.3 : 1;
    for (let k=0;k<260;k++){ const d = Math.random()*reach, spread = d*0.45, x = f.x - d*(f.x - 10), y = f.y + (Math.random()-0.5)*spread*90 + d*24;
      if (Math.random() > fade) continue; const c = d < 0.25 ? "#fff0b0" : d < 0.55 ? "#fbb954" : Math.random() < 0.5 ? "#e2762d" : "#c95a24"; fb.rect(Math.round(x), Math.round(y), 2, 2, c, 1, 1); } }
};
