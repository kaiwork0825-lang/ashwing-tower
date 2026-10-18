/* ================= SPLASH: "press to start" =================
   Browsers keep audio locked until the first click or key, so the game opens on a scene that asks for one:
   the ash tower far off, its red window beating like a heart, the dragon circling it, the party on a cliff.
   The press unlocks sound, starts the theme and opens the title. */
SPRITE_DEFS.d20icon = {p:{o:"#07090f", g:"#ffd678", G:"#fbb954", d:"#c95a24"}, em:["g","G","d"], g:[
  ".....o.....",
  "....oGo....",
  "...oGgGo...",
  "..oGgggGo..",
  ".oGdGgGdGo.",
  "oGdddGdddGo",
  ".oGdGgGdGo.",
  "..oGgggGo..",
  "...oGgGo...",
  "....oGo....",
  ".....o....."]};
BGS.ashtower = {ground:150, amb:[0.4,0.42,0.6], shadowFrom:0,
  lights:[{x:236,y:38,r:46,c:[1.3,0.3,0.16],f:0.3}, {x:236,y:60,r:150,c:[0.3,0.36,0.5],f:0}, {x:60,y:150,r:80,c:[0.3,0.3,0.4],f:0}],
  draw(fb, r){
    fb.vgrad(0, 152, ["#07090f","#0c111c","#121a29","#182337","#283d55","#3a2850"]);
    for (let i=0;i<70;i++) fb.px(Math.floor(r()*SW), Math.floor(r()*70), r() < 0.2 ? "#dfe6d6" : "#557887", r() < 0.25 ? 1 : 0);
    // a huge pale moon behind the tower, with a soft halo
    for (let y=-40;y<=40;y++) for (let x=-40;x<=40;x++){ const d = Math.sqrt(x*x + y*y); if (d > 25 && d < 40){ const X = 236 + x, Y = 58 + y; if (BAYER4[(Y&3)*4+(X&3)] + 0.47 < (40 - d)/15*0.5) fb.px(X, Y, "#283d55"); } }
    for (let y=-24;y<=24;y++){ const w = Math.floor(Math.sqrt(576 - y*y)); fb.rect(236 - w, 58 + y, w*2, 1, y > 10 ? "#b6cbc0" : "#dfe6d6", 1, 1); }
    [[222, 50, 5, 3], [246, 64, 6, 4], [229, 70, 3, 2], [250, 46, 3, 2]].forEach(([x, y, w, h]) => fb.rect(x, y, w, h, "#b6cbc0", 1, 1));
    // far ranges
    for (let x=0;x<SW;x++){ const h = 20 + Math.round(Math.sin(x/37)*8 + Math.sin(x/11 + 2)*3); fb.rect(x, 140 - h, 1, h + 12, "#182337"); }
    for (let x=0;x<SW;x++){ const h = 10 + Math.round(Math.sin(x/23 + 1)*5 + Math.sin(x/7)*2); fb.rect(x, 146 - h, 1, h + 8, "#121a29"); }
    // the crag and the tower on it
    for (let y=0;y<30;y++){ const w = 18 + y*2.2; fb.rect(236 - w, 124 + y, w*2, 1, y % 4 ? "#0c111c" : "#121a29"); }
    const cx = 236;
    for (let y=26;y<128;y++){ const hw = Math.round(9 + (y - 26)*0.075); fb.rect(cx - hw, y, hw*2, 1, "#0c111c"); fb.px(cx - hw, y, "#182337"); fb.px(cx + hw - 1, y, "#1f2f45"); }
    for (let k=0;k<5;k++) fb.rect(cx - 11 + k*5, 20, 3, 7, "#0c111c");
    fb.rect(cx - 11, 25, 22, 3, "#0c111c");
    for (let y=0;y<16;y++) fb.px(cx - 3 + Math.floor(y/5), 4 + y, "#0c111c");
    [[cx - 5, 62], [cx + 3, 80], [cx - 4, 98], [cx + 2, 112]].forEach(([x, y]) => fb.rect(x, y, 2, 5, "#07090f"));
    // the near cliff where the party stands, and a dead tree
    for (let x=0;x<170;x++){ const top = 146 + Math.round(Math.max(0, (x - 120)*0.35) + Math.sin(x/9)*1.2); fb.rect(x, top, 1, SH - top, "#07090f"); }
    for (let x=170;x<SW;x++){ const top = 162 + Math.round(Math.sin(x/13)*2); fb.rect(x, top, 1, SH - top, "#07090f"); }
    const tree = (x, b, h) => { fb.rect(x, b - h, 2, h, "#07090f"); for (let k=0;k<5;k++){ const by = b - h + 4 + k*6, d = k % 2 ? 1 : -1; for (let i=0;i<8 - k;i++) fb.px(x + 1 + d*i, by - Math.floor(i/2), "#07090f"); } };
    tree(18, 148, 38); tree(150, 152, 22);
  },
  anim(fb, t){
    // heartbeat in the top window: two quick pulses, then rest
    const ph = (t % 1700)/1700, beat = ph < 0.08 || (ph > 0.16 && ph < 0.24);
    fb.rect(234, 34, 4, 6, beat ? "#ffd678" : "#e04a3c", 1, 1); fb.rect(235, 35, 2, 4, beat ? "#fff0b0" : "#e2762d", 1, 1);
    // ash clouds drifting around the tower
    for (let b=0;b<3;b++){ const y = 92 + b*9, off = ((t*0.006*(b + 1)) % 140) - 70; fb.dith(170 + off + b*12, y, 80, 2, "#283d55", 0.2); fb.dith(210 - off*0.7, y + 4, 70, 2, "#344e66", 0.14); }
  },
  emit(t, sc){
    if (Math.random() < 0.45) sc.spawn({x:Math.random()*SW, y:-2, vx:3 + Math.random()*4, vy:7 + Math.random()*6, life:16, c:Math.random() < 0.8 ? "#8fadaa" : "#b6cbc0", em:0, ash:1});
    if (Math.random() < 0.22) sc.spawn({x:Math.random()*SW, y:-2, vx:2 + Math.random()*4, vy:6 + Math.random()*5, life:16, c:["#e04a3c","#e2762d","#7a1f2a"][Math.floor(Math.random()*3)], em:Math.random() < 0.4 ? 1 : 0, ash:1});
    if (Math.random() < 0.18) sc.spawn({x:228 + Math.random()*16, y:30, vx:(Math.random() - 0.3)*10, vy:-6 - Math.random()*8, life:3, c:Math.random() < 0.5 ? FIRE1 : FIRE2, em:1, fly:1});
  }
};
function splashUnits(t){
  const G = BGS.ashtower.ground, u = [];
  // once the player presses, the four set off toward the tower
  const walk = splashWalkT ? Math.max(0, performance.now() - splashWalkT) : 0;
  ["fighter","wizard","rogue","cleric"].forEach((k, i) => { const sp = spr(k), bob = walk && !REDUCED ? Math.floor(t/140 + i) % 2 : 0;
    u.push({sp, x:Math.round(12 + i*22 + walk*0.05), y:G - sp.h - (i === 1 ? 1 : 0) - bob, flash:"#426276"}); });
  // the dragon wheels around the tower top
  const d = spr("drake", true), a = t/2600, x = 236 + Math.cos(a)*58 - d.w/2, y = 30 + Math.sin(a)*12;
  u.push({sp:d, x:Math.round(x), y:Math.round(y), flip:Math.sin(a) < 0, flash:"#07090f", noShadow:true});
  return u;
}
let splashGo = false, splashWalkT = 0;
// press → the party walks off toward the tower, the night closes in, and they arrive at its gate (the title)
function pressStart(){
  if (splashGo || S.screen !== "splash") return; splashGo = true;
  Audio8.unlock(); sfx("door"); splashWalkT = performance.now(); $("#soundHint").hidden = true;
  $("#sSplash").classList.add("go");
  setTimeout(() => { titleScene.fadeTo = 1; }, REDUCED ? 100 : 900);
  setTimeout(() => { titleScene.bgKey = "gate"; titleScene.parts = []; titleScene.fade = 1; titleScene.fadeTo = 0; TITLE.arriveT = performance.now() + 200; show("title"); }, REDUCED ? 300 : 1450);
}
