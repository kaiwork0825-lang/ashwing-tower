/* ================= REGIONS: the hunt for the three relics =================
   Past the forest fork the road splits three ways. Each region is a field the party walks through, then a
   dungeon, and at its end the keeper of one relic:
     악취나는 늪 → 썩은 뿌리 굴 → the witch Greta's three trials (mind, arm, breath)  → 재의 방패
     드워프 광산 → 고블린 갱도 → find the goblin chief in one of three side tunnels    → 용살의 검
     외눈박이 숲 → by day into the troll's cave, or wait for it in the woods by night → 진실의 눈
   With all three, the road from the fork to the tower opens. The relics also matter in the dragon fight. */

/* ---------- small drawing helpers ---------- */
const lumOf = h => { const c = col(h); return (0.3*c[0] + 0.59*c[1] + 0.11*c[2])/255; };
// repaint a sprite through a colour ramp (dark → light), keeping its shape
function recolorDef(def, ramp, over, em){ const p = {};
  Object.entries(def.p).forEach(([k, v]) => { p[k] = ramp[Math.min(ramp.length - 1, Math.floor(lumOf(v)*ramp.length*1.15))]; });
  return {...def, p:{...p, ...(over || {})}, em:em || def.em}; }
function discFill(fb, cx, cy, r, c, em){ for (let y=-r;y<=r;y++){ const w = Math.floor(Math.sqrt(r*r - y*y)); fb.rect(cx - w, cy + y, w*2, 1, c, 1, em ? 1 : 0); } }
function deadTree(fb, x, base, h, c){ fb.rect(x, base - h, 4, h, c); for (let k=0;k<4;k++){ const by = base - h + 8 + k*9, d = k % 2 ? 1 : -1; for (let i=0;i<9 + k*2;i++) fb.px(x + 2 + d*i, by - Math.floor(i/2), c); } }
function wideStars(fb, r, n, ymax){ for (let i=0;i<n;i++) fb.px(Math.floor(r()*fb.w), Math.floor(r()*ymax), r() < 0.2 ? "#dfe6d6" : "#557887", r() < 0.3 ? 1 : 0); }
// a thick wavy line, for roots and vines
function wavy(fb, x0, y0, len, dx, amp, ph, th, c, hi){ for (let k=0;k<len;k++){ const x = Math.round(x0 + dx*k + Math.sin(k/9 + ph)*amp); fb.rect(x, y0 + k, th, 1, c); if (hi) fb.px(x, y0 + k, hi); } }
const onScreen = (x, m) => x > -(m || 12) && x < SW + (m || 12);

/* ---------- sprites ---------- */
SPRITE_DEFS.wraith = recolorDef(SPRITE_DEFS.shadow, ["#142a24","#1f4232","#2f5e3e","#6e9198","#b6cbc0"], {e:"#7aa35a", v:"#7aa35a"}, ["e","v"]);
// 고르그: a mossy troll with one eye socket holding a green gem (the Eye of Truth) and a scar over the other
SPRITE_DEFS.eyetroll = (() => { const g = SPRITE_DEFS.troll.g.map(r => r.split(""));
  [[4,8],[4,9],[5,8],[5,9]].forEach(([y, x]) => g[y][x] = "E"); [[3,13],[4,13],[5,14],[4,14]].forEach(([y, x]) => g[y][x] = "k");
  [[10,8],[10,11],[10,14],[11,9],[11,13]].forEach(([y, x]) => { if (g[y][x] !== ".") g[y][x] = "w"; });
  return {p:{T:"#2f5e3e", M:"#142a24", E:"#7aa35a", e:"#ffd678", w:"#dfe6d6", n:"#1f4232", k:"#0c111c", b:"#4a7f48", C:"#452017", c:"#2e1712", l:"#61291a", s:"#2f5e3e"}, em:["E"], g:g.map(r => r.join(""))}; })();
// 그라크: a goblin chief under an iron helm, a red-hot iron tusk jutting from his jaw
SPRITE_DEFS.grak = (() => { const g = SPRITE_DEFS.goblin.g.map(r => r.split(""));
  [0,1].forEach(y => g[y] = g[y].map(c => c === "R" ? "Y" : c)); g[6][7] = "I"; g[7][6] = "I"; g[7][7] = "I";
  return {p:{...SPRITE_DEFS.goblin.p, R:"#7a1f2a", r:"#4a1420", Y:"#6a6c78", H:"#dfe6d6", I:"#e2762d", D:"#6a6c78", g:"#4a7f48"}, em:["e","I"], g:["....H.....H......", ...g.map(r => r.join(""))]}; })();
// 늪지기: mud, bones and roots heaped into a hulking body
SPRITE_DEFS.mudgolem = {p:{m:"#2e1712", M:"#452017", e:"#7aa35a", k:"#142a24", b:"#dfe6d6", v:"#4a7f48", V:"#2f5e3e"}, em:["e"], g:[
  "........mmmmm.........",
  "......mmMMMMMmm.......",
  ".....mMMvMMMMMMm......",
  ".....mMeMMMMMeMm......",
  "....mMMMMMMMMMMMm.....",
  "....mMMMkkkkkMMMm.....",
  "..mmmMMMbkbkbMMMmmm...",
  ".mMMMMMbMMMMMbMMMMMm..",
  "mMMMmMMMMMvMMMMMmMMMm.",
  "mMMm.mMMMvVvMMMMm.mMMm",
  "mMMm.mMbMMvMMbMMm.mMMm",
  "mMMm.mMMMMMMMMMMm.mMMm",
  ".mm..mMMvMMMMvMMm..mm.",
  "vmmv.mMMMMMMMMMMm.vmmv",
  "......mMMMm.mMMMm.....",
  "......mMMm...mMMm.....",
  ".....mMMMm...mMMMm....",
  ".....mmmmm...mmmmm...."]};
SPRITE_DEFS.bat = {p:{B:"#3a2850", b:"#5c3f72", k:"#241a33", e:"#e04a3c"}, em:["e"], g:[
  "B.........B",
  "BB..k.k..BB",
  "BBBbkkkbBBB",
  ".BBbkekbBB.",
  "..B.kkk.B..",
  ".....k....."]};
SPRITE_DEFS.thorin = {...SPRITE_DEFS.dwarf, p:{...SPRITE_DEFS.dwarf.p, B:"#fbb954", b:"#c95a24", A:"#61291a", a:"#452017", H:"#82341c", h:"#61291a"}};
SPRITE_DEFS.miner = {...SPRITE_DEFS.dwarf, p:{...SPRITE_DEFS.dwarf.p, B:"#a2a3ac", b:"#6a6c78", A:"#2f5e3e", a:"#1f4232", H:"#3d3f4a", h:"#283d55"}};
SPRITE_DEFS.woodcutter = {...SPRITE_DEFS.merchant, p:{...SPRITE_DEFS.merchant.p, B:"#2f5e3e", b:"#1f4232", h:"#7a1f2a", H:"#4a1420", R:"#a2a3ac", Y:"#6a6c78"}};
Object.assign(SPR_SCALE, {eyetroll:2, grak:2, mudgolem:2});
// soft lights carried by some scene sprites [x, y, radius, colour] (sprite pixels from the top-left)
const SPR_GLOW = {wraith:[12, 12, 30, [0.35, 0.9, 0.65]], eyetroll:[17, 9, 34, [0.45, 1.0, 0.55]], mudgolem:[16, 8, 22, [0.4, 0.9, 0.4]], grak:[14, 14, 20, [1.2, 0.5, 0.2]]};
Object.assign(SPEAKERS, {thorin:{name:"드워프 소년 토린", spr:"thorin"}, miner:{name:"갇힌 광부", spr:"miner"}, grak:{name:"고블린 대장 그라크", spr:"grak"},
  eyetroll:{name:"외눈 트롤 고르그", spr:"eyetroll"}, woodcutter:{name:"도끼골 촌장 헤일라", spr:"woodcutter"}, dwarf:{name:"무쇠골 대장장이 브론", spr:"dwarf"}});
FX.gas = function(){ const [fx, fy] = FX.foeCenter(); scene.flash(140, "#7aa35a"); hitstop(70);
  for (let k=0;k<90;k++) scene.spawn({x:fx - 14, y:fy - 8 + (Math.random() - 0.5)*18, vx:-100 - Math.random()*90, vy:(Math.random() - 0.5)*34, life:1.5, c:["#4a7f48","#7aa35a","#2f5e3e","#b6cbc0"][k % 4], em:k % 3 === 0 ? 1 : 0, g:-12});
  scene.light(110, 130, 120, [0.5, 1.0, 0.4], 0.6); sfx("hit"); };

/* ---------- the relics ---------- */
ICONS.shield = {p:{m:"#3d3f4a", M:"#6a6c78", g:"#e2762d", G:"#fbb954"}, g:["..mmmmmmmm..",".mMMMMMMMMm.","mMMgMMMMgMMm","mMMgGMMGgMMm","mMMMgGGgMMMm","mMMMMggMMMMm",".mMMMggMMMm.",".mMMMMMMMMm.","..mMMMMMMm..","...mMMMMm...","....mMMm....",".....mm....."]};
const RELIC_ITEMS = {
  relic_shield:{name:"재의 방패", slot:"armor", type:"shield", r:4, relic:1, fx:{ac:2, hp:6, fireRes:1}, desc:"백 년 전 엘다인 경이 바르쿠스의 숨결을 막아 낸 방패. 누구든 들 수 있다. 용의 숨결 피해 절반."},
  relic_sword:{name:"용살의 검", slot:"weapon", type:"sword", r:4, relic:1, fx:{atk:2, dmg:3}, pal:{m:"#c95a24", M:"#ffd678", h:"#4a1420", g:"#e04a3c"}, desc:"용철로 다시 벼린 브론 가문의 검. 검이 손을 고른다 — 누구든 쥘 수 있다. 바르쿠스에게 명중하면 +2d6 피해."},
  relic_eye:{name:"진실의 눈", slot:"amulet", type:"amulet", r:4, relic:1, fx:{check:2, wis:1}, pal:{m:"#2f5e3e", M:"#7aa35a", g:"#4a7f48", G:"#dfe6d6"}, desc:"외눈 트롤의 눈구멍에서 나온 초록 보석. 숨은 것을 꿰뚫어 본다. 바르쿠스의 방어도 −2."}
};
Object.assign(ITEMS, RELIC_ITEMS);
Object.keys(RELIC_ITEMS).forEach(k => { const it = ITEMS[k], ic = ICONS[it.type]; SPRITE_DEFS["it_" + k] = {p:{...ic.p, ...(it.pal || {})}, g:ic.g, em:["g","G"]}; LOOT_UNIQUE.add(k); });
LOOK.relic_shield = ["#6a6c78", "#3d3f4a"];
function gainRelic(k){
  const out = []; if (S.flags[k]) return out; S.flags[k] = true; giveItem(k);
  const n = relicCount(), it = ITEMS[k];
  out.push(["sys", `전설의 유물 「${it.name}」! — 가방(I)에서 누가 지닐지 정하세요.`]);
  setTimeout(() => { itemToast(k); banner("전설의 유물!", "gold"); sfx("levelup"); }, 500);
  if (n >= 3 && S.world){ S.world.open[AREA_I("camp")] = true; S.objective = "탑으로 — 잿빛 숲길 이정표에서 탑 아래 언덕으로";
    out.push(["sys", "세 유물이 모두 모였다! 잿빛 숲길 오른쪽 끝 이정표에서 「탑 아래 언덕」으로 가는 길이 열렸다."]); }
  else { S.objective = `세 유물을 모아라 (${n}/3)`; out.push(["sys", `세 유물 ${n}/3`]); }
  return out;
}
// the reforged blade bites the dragon harder
const slayerDice = h => S.battle && S.battle.key === "drake" && eqItems(h).includes(ITEMS.relic_sword) ? [6, 6] : [];

/* ---------- clues the party picks up ---------- */
Object.assign(FLAG_TXT, {
  trialHint:"단서: 마녀의 시험은 머리 · 팔 · 숨 — 거짓말쟁이 솥 셋, 참말은 하나",
  lightHint:"단서: 뿌리 굴의 망령은 빛을 싫어한다",
  mask:"박하 천 — 독한 안개와 포자를 막아 준다",
  mineMap:"획득: 브론이 그린 갱도 지도",
  grakHint:"단서: 쇠 두드리는 소리가 나는 갱도에 그라크가 있다",
  trollTrail:"단서: 외눈 트롤이 밤마다 지나는 길목",
  trollLore:"단서: 낮엔 잠든 트롤 · 굴 속 이끼 웅덩이 · 밤엔 굶주린 트롤",
  villagersHelp:"도끼골 사람들이 밤 싸움을 돕기로 했다 (불 공격)",
  poolSpoiled:"이끼 웅덩이를 망가뜨렸다 — 트롤의 재생이 약해진다",
  nightTrap:"길목에 사냥 덫을 묻었다",
  nightFire:"길목에 기름 불 함정을 놓았다",
  tusk:"획득: 그라크의 용철 어금니"
});

/* ---------- foes ---------- */
// tier: grows with the relics already won, so a region taken last is as tense as the first
Object.assign(FOES, {
  leeches_bog:{name:"썩은 늪 거머리", sprite:"leech", count:3, hp:30, ac:11, atk:5, dmg:[4,4], dmgB:1, verb:"달라붙어 빨기", xp:80, tier:1, loot:["wis_ring","copper_ring","mage_robe","healer_robe"], intro:"팔뚝만 한 거머리들이 널빤지 위로 꿈틀꿈틀 기어오른다!"},
  wraiths:{name:"늪 망령", sprite:"wraith", count:2, hp:36, ac:12, atk:5, dmg:[6], dmgB:2, verb:"차가운 손길", xp:100, tier:1, loot:["wis_ring","guard_ring","healer_robe","sage_amulet"], intro:"망령들이 물 위를 미끄러지듯 다가온다! 등불이 파르르 떨린다."},
  bogkeeper:{name:"늪지기", sprite:"mudgolem", count:1, hp:56, ac:13, atk:6, dmg:[8,6], dmgB:2, verb:"진흙 주먹", xp:150, tier:1, aoe:{every:3, name:"썩은 숨", dice:[6,6], st:"con", dc:13}, intro:"늪지기가 가슴을 부풀리자 썩은 늪 냄새가 사방을 덮는다! 숨의 시험이다."},
  gob_scouts:{name:"고블린 정찰병", sprite:"goblin", count:2, hp:28, ac:13, atk:5, dmg:[6], dmgB:1, verb:"녹슨 칼 휘두르기", xp:70, tier:1, loot:["venom_dagger","leather","dex_ring","silver_dagger"], intro:"고블린들이 술통을 걷어차고 녹슨 칼을 뽑는다!",
    pre:S => S.flags.ambushScouts ? {hpCut:0.4, msg:["기습! 고블린들이 상처를 입은 채 싸움을 시작한다."]} : {}},
  gob_guards:{name:"고블린 경비병", sprite:"goblin", count:3, hp:34, ac:13, atk:5, dmg:[6], dmgB:2, verb:"녹슨 창 찌르기", xp:90, tier:1, loot:["steel_sword","chainmail","battle_axe","shadow_dagger"], intro:"종소리를 듣고 달려온 고블린들이 창끝을 겨눈다!"},
  gob_nest:{name:"고블린 둥지", sprite:"goblin", count:3, hp:36, ac:12, atk:5, dmg:[6], dmgB:1, verb:"이빨과 손톱", xp:90, tier:1, loot:["luck_ring","shadow_cloak","venom_dagger","pilgrim_mace"], intro:"어미 고블린이 꽥 소리를 지르자 둥지 전체가 들고일어난다!"},
  grak:{name:"고블린 대장 그라크", sprite:"grak", count:1, hp:58, ac:15, atk:6, dmg:[8,6], dmgB:2, verb:"쇠어금니 물어뜯기", xp:200, tier:1, drops:1, loot:["flame_axe","shadow_cloak","luck_ring","str_ring","fire_wand"], intro:"그라크가 쇳덩이 어금니를 드러내며 모루망치를 휘두른다!",
    pre:S => S.flags.grakSneak ? {hpCut:0.3, msg:["뒤를 잡았다! 그라크가 큰 상처를 입은 채 돌아선다."]} : {}},
  bats:{name:"동굴 박쥐 떼", sprite:"bat", count:3, hp:26, ac:14, atk:5, dmg:[4,4], dmgB:0, verb:"물어뜯기", xp:70, tier:1, loot:["dex_ring","copper_ring","shadow_cloak"], intro:"박쥐 떼가 날카롭게 울며 얼굴로 달려든다!"},
  gorg_day:{name:"외눈 트롤 고르그", sprite:"eyetroll", count:1, hp:66, ac:13, atk:6, dmg:[8,8], dmgB:3, verb:"통나무 휘두르기", xp:240, tier:1, regen:[6], intro:"고르그가 뼈 더미를 박차고 일어선다! 외눈이 초록빛으로 타오른다!",
    pre:S => { const awake = (+S.flags.noise || 0) >= 2, p = {regen:S.flags.poolSpoiled ? [6] : [8], msg:[]};
      if (!awake){ p.hpCut = 0.3; p.acMinus = 2; p.msg.push("기습! 잠든 트롤에게 첫 일격 — 체력의 30%를 잃은 채, 잠이 덜 깨 방어도 −2."); }
      else p.msg.push("트롤이 깨어 있다! 기습은 물 건너갔다.");
      p.msg.push(S.flags.poolSpoiled ? "이끼 웅덩이를 망가뜨렸다 — 재생은 보통(d6)." : "이끼 웅덩이 곁이다 — 재생이 강하다(d8).");
      return p; }},
  gorg_night:{name:"외눈 트롤 고르그", sprite:"eyetroll", count:1, hp:66, ac:13, atk:6, dmg:[8,8], dmgB:3, verb:"통나무 휘두르기", xp:240, tier:1, regen:[6], intro:"달빛 아래 고르그가 포효한다! 굶주린 밤의 트롤이다!",
    pre:S => { const p = {atkPlus:2, hpMul:1.15, msg:["굶주린 밤의 트롤! 명중 +2, 체력이 더 많다."]};
      if (S.flags.nightTrap){ p.hpCut = 0.15; p.stun = true; p.msg.push("덫에 물린 발목! 피해를 입은 채 시작하고, 첫 턴은 꼼짝 못 한다."); }
      if (S.flags.nightFire){ p.burn = true; p.msg.push("불 함정에 그을렸다! 첫 재생 방해 굴림에 이점."); }
      if (S.flags.villagersHelp){ p.burnAlways = true; p.msg.push("도끼골 사람들이 쉬지 않고 횃불을 던진다 — 재생 방해 굴림에 늘 이점."); }
      return p; }}
});
Object.assign(FOE_STYLE, {leeches_bog:"drain", wraiths:"slash", bogkeeper:"smash", gob_scouts:"slash", gob_guards:"slash", gob_nest:"bite", grak:"bite", bats:"bite", gorg_day:"smash", gorg_night:"smash"});

/* ================= backgrounds: each region's field and dungeon (wide pictures, no tiling) ================= */
const BOG_VENTS = [215, 300, 400, 505];
BGS.bog = {w:640, ground:154, amb:[0.26,0.34,0.32], shadowFrom:0,
  lights:[{x:90,y:40,r:130,c:[0.3,0.42,0.3],f:0}, {x:215,y:144,r:40,c:[0.55,1.0,0.45],f:0.35}, {x:400,y:144,r:40,c:[0.55,1.0,0.45],f:0.35},
    {x:352,y:130,r:46,c:[0.7,0.8,0.95],f:0.05}, {x:600,y:118,r:90,c:[0.45,0.95,0.55],f:0.22}, {x:505,y:144,r:36,c:[0.55,1.0,0.45],f:0.3}],
  draw(fb, r){
    const W = fb.w;
    fb.vgrad(0, 132, ["#0c111c","#142a24","#1f4232","#2f5e3e","#4a7f48"]);
    discFill(fb, 90, 40, 13, "#b6cbc0", 1); fb.rect(84, 34, 5, 3, "#8fadaa", 1, 1); fb.rect(94, 44, 4, 2, "#8fadaa", 1, 1);
    for (let y=48;y<122;y+=9) fb.dith(0, y, W, 3, "#4a7f48", 0.12);
    for (let x=-6;x<W;x+=11 + Math.floor(r()*9)) deadTree(fb, x, 130, 18 + Math.floor(r()*22), "#142a24");
    fb.rect(0, 126, W, 10, "#142a24");
    // the drowned forest: big dead trees with moss beards
    [[20,70],[150,58],[262,82],[430,66],[520,74]].forEach(([x, h]) => { deadTree(fb, x, 142, h, "#0c111c");
      for (let k=0;k<6;k++){ const mx = x - 10 + Math.floor(r()*24), my = 142 - h + 8 + Math.floor(r()*22); fb.rect(mx, my, 1, 6 + Math.floor(r()*10), "#2f5e3e"); } });
    // black water, scum and reeds
    fb.rect(0, 134, W, 46, "#142a24");
    for (let y=136;y<SH;y+=3) for (let x=(y*7)%11; x<W; x+=11 + ((y*3)%9)) fb.rect(x, y, 5, 1, "#1f4232");
    for (let i=0;i<30;i++){ const x = Math.floor(r()*W), y = 160 + Math.floor(r()*18), w = 6 + Math.floor(r()*16); fb.rect(x, y, w, 2, "#2f5e3e"); fb.rect(x + 2, y, Math.max(1, w - 4), 1, "#4a7f48"); }
    for (let i=0;i<34;i++){ const x = Math.floor(r()*W), h = 8 + Math.floor(r()*12); fb.rect(x, 152 - h, 1, h, "#2f5e3e"); if (r() < 0.4) fb.rect(x - 1, 152 - h - 4, 3, 5, "#452017"); }
    BOG_VENTS.forEach(x => { fb.rect(x - 6, 150, 13, 2, "#1c0f0c"); fb.rect(x - 4, 149, 9, 1, "#2e1712"); });
    // rotting plank walkway, boards missing here and there
    fb.rect(0, 152, W, 5, "#452017"); fb.rect(0, 152, W, 1, "#61291a");
    for (let x=4;x<W;x+=9) fb.rect(x, 152, 1, 5, "#2e1712");
    for (let x=10;x<W;x+=38) fb.rect(x, 157, 3, 14, "#2e1712");
    [[118,7],[244,5],[455,6]].forEach(([x, w]) => { fb.rect(x, 152, w, 5, "#142a24"); fb.rect(x, 155, w, 1, "#1f4232"); });
    // a deer carcass half sunk in the mire
    fb.rect(228, 147, 22, 4, "#61291a"); for (let k=0;k<6;k++) fb.rect(230 + k*3, 141 + (k%2), 1, 7, "#b6cbc0"); fb.rect(250, 144, 6, 5, "#b6cbc0"); fb.px(252, 146, "#07090f");
    // the pilgrim: a skeleton in a violet cloak leaning on a stump, a burnt-wing shield sunk beside him
    fb.rect(358, 122, 12, 30, "#1c0f0c"); fb.rect(360, 122, 2, 30, "#2e1712");
    fb.rect(346, 138, 12, 14, "#3a2850"); fb.rect(347, 140, 10, 1, "#5c3f72"); fb.rect(348, 131, 7, 7, "#dfe6d6"); fb.rect(349, 133, 2, 2, "#07090f"); fb.rect(352, 133, 2, 2, "#07090f");
    fb.rect(343, 146, 4, 2, "#dfe6d6"); fb.rect(356, 147, 6, 1, "#dfe6d6");
    fb.rect(330, 144, 12, 9, "#6a6c78"); fb.rect(331, 145, 10, 1, "#a2a3ac"); fb.rect(334, 147, 4, 3, "#c95a24");
    // the root cave at the east end: a mouth of black under an arch of giant roots, bone chimes hanging
    for (let y=92;y<154;y++){ const t = (y - 92)/62, hw = Math.round(30*Math.sqrt(Math.min(1, t*1.6))); fb.rect(600 - hw, y, hw*2, 1, "#07090f"); }
    for (let i=0;i<14;i++){ const x0 = 548 + i*7 + Math.floor(r()*5), side = x0 < 600 ? -1 : 1; wavy(fb, x0, 40 + Math.floor(r()*30), 120, side*0.12, 3 + r()*4, r()*6, 3 + Math.floor(r()*3), i % 2 ? "#1c0f0c" : "#2e1712", "#452017"); }
    for (let k=0;k<16;k++){ const x = 560 + k*5, y = 86 + Math.round(Math.sin(k*1.7)*6); for (let j=0;j<k%3 + 2;j++) fb.rect(x, y - 30 + j*10, 4, 2, "#2e1712"); }
    for (let y=92;y<154;y++){ const t = (y - 92)/62, hw = Math.round(24*Math.sqrt(Math.min(1, t*1.6))); fb.dith(600 - hw, y, hw*2, 1, "#142a24", 0.25); }
  },
  anim(fb, t, ox){ const X = x => x - ox;
    BOG_VENTS.forEach((x, i) => { const sx = X(x); if (!onScreen(sx)) return; const ph = (t/700 + i*0.37) % 1, y = 149 - Math.floor(ph*7);
      if (ph < 0.8){ const r0 = 1 + Math.floor(ph*2.5); fb.rect(sx - r0, y - r0, r0*2 + 1, r0*2 + 1, "#4a7f48"); fb.px(sx - r0 + 1, y - r0 + 1, "#7aa35a", 1); }
      else { fb.rect(sx - 3, y - 1, 7, 1, "#7aa35a", 1, 1); fb.px(sx - 4, y - 2, "#7aa35a", 1); fb.px(sx + 4, y - 2, "#7aa35a", 1); } });
    for (let b=0;b<3;b++){ const y = 116 + b*11, off = ((t*0.008*(b + 1)) - ox) % 90; for (let x=-90 + off; x<SW; x+=90) fb.dith(Math.round(x), y, 64, 5, b % 2 ? "#7aa35a" : "#4a7f48", 0.16); }
    [568, 586, 612, 630].forEach((x, i) => { const sx = X(x) + Math.round(Math.sin(t/500 + i)*1.5); if (!onScreen(sx)) return; fb.px(sx, 92 + i*3, "#6a6c78"); fb.rect(sx - 1, 95 + i*3, 3, 2, "#dfe6d6"); fb.rect(sx, 97 + i*3, 1, 3, "#b6cbc0"); });
    const wx = X(590) + Math.round(Math.sin(t/600)*9), wy = 112 + Math.round(Math.cos(t/450)*5); if (onScreen(wx)){ fb.rect(wx, wy, 2, 2, "#b6cbc0", 1, 1); fb.px(wx - 1, wy, "#7aa35a", 1); }
  },
  emit(t, sc, ox){
    if (Math.random() < 0.25) sc.spawn({x:Math.random()*SW, y:118 + Math.random()*32, vx:(Math.random() - 0.5)*3, vy:-1.5 - Math.random()*2, life:5, c:Math.random() < 0.6 ? "#4a7f48" : "#7aa35a", em:0, mote:1});
    BOG_VENTS.forEach(x => { const sx = x - ox; if (onScreen(sx) && Math.random() < 0.08) sc.spawn({x:sx, y:146, vx:(Math.random() - 0.5)*4, vy:-6 - Math.random()*4, life:3, c:"#7aa35a", em:1}); });
    if (Math.random() < 0.04) sc.spawn({x:Math.random()*SW, y:100 + Math.random()*50, vx:(Math.random() - 0.5)*5, vy:-1, life:4, c:"#7aa35a", em:1, fly:1});
  }
};

BGS.roots = {w:640, ground:154, amb:[0.34,0.36,0.4], shadowFrom:0,
  lights:[{x:60,y:122,r:52,c:[0.4,0.95,0.85],f:0.25}, {x:178,y:100,r:52,c:[0.4,0.95,0.85],f:0.25}, {x:300,y:130,r:52,c:[0.4,0.95,0.85],f:0.25}, {x:418,y:106,r:52,c:[0.4,0.95,0.85],f:0.25},
    {x:512,y:140,r:50,c:[1.1,0.9,0.35],f:0.2}, {x:610,y:80,r:120,c:[0.55,0.7,0.5],f:0}, {x:622,y:116,r:44,c:[1.35,0.85,0.4],f:0.15}],
  draw(fb, r){
    const W = fb.w;
    fb.vgrad(0, 150, ["#0c111c","#121a29","#142a24","#121a29"]);
    // a wall of tangled roots, hanging strands and crossing limbs
    for (let i=0;i<78;i++){ const x = Math.floor(r()*W); wavy(fb, x, -4, 156, (r() - 0.5)*0.4, 3 + r()*6, r()*6, 2 + Math.floor(r()*5), r() < 0.5 ? "#2e1712" : "#452017", r() < 0.5 ? "#61291a" : null); }
    for (let i=0;i<20;i++){ const y = 18 + Math.floor(r()*100), x0 = Math.floor(r()*W), len = 40 + Math.floor(r()*90);
      for (let k=0;k<len;k++){ const yy = y + Math.round(Math.sin(k/11 + i)*4); fb.rect(x0 + k, yy, 1, 3, "#452017"); fb.px(x0 + k, yy, "#82341c"); } }
    for (let i=0;i<16;i++) fb.dith(Math.floor(r()*W), 26 + Math.floor(r()*84), 30, 24, "#0c111c", 0.5);
    // glowing fungus shelves
    [[60,124],[178,100],[300,132],[418,108],[520,124],[250,70],[470,58],[110,64]].forEach(([x, y]) => { for (let k=0;k<5;k++){ const fx = x + k*5 - 10, fy = y + (k%2)*3; fb.rect(fx + 1, fy + 2, 1, 3, "#344e66"); fb.rect(fx, fy, 4, 2, "#6e9198", 1, 1); fb.px(fx + 1, fy - 1, "#b6cbc0", 1); } });
    // mud bank to walk on, black water below
    fb.rect(0, 146, W, 34, "#07090f"); fb.rect(0, 146, W, 1, "#142a24");
    fb.rect(0, 148, W, 9, "#452017"); fb.rect(0, 148, W, 1, "#61291a"); for (let i=0;i<90;i++) fb.rect(Math.floor(r()*W), 149 + Math.floor(r()*7), 3, 1, "#2e1712");
    for (let x=12;x<W;x+=37){ fb.rect(x, 150, 14, 3, "#2e1712"); fb.rect(x + 1, 150, 12, 1, "#82341c"); }
    for (let y=160;y<SH;y+=3) for (let x=(y*5)%13; x<W; x+=13 + ((y*7)%11)) fb.rect(x, y, 6, 1, "#142a24");
    // the spore patch: head-sized puffballs breathing yellow dust
    for (let k=0;k<9;k++){ const x = 478 + k*8 + Math.floor(r()*4), h = 6 + Math.floor(r()*8), cw = 8 + Math.floor(r()*5);
      fb.rect(x - 1, 148 - h, 3, h, "#b6cbc0"); for (let y=0;y<cw/2;y++){ const w = cw - Math.round(y*y*2/cw); fb.rect(x - Math.round(w/2), 148 - h - y, w, 1, y < 2 ? "#61291a" : "#82341c"); }
      for (let d=0;d<3;d++) fb.px(x - cw/2 + 2 + d*3, 148 - h - 2 - (d%2), "#fbb954", 1); }
    // the far end opens to the sky: Greta's stilt hut, a lamp in its window
    fb.dith(566, 0, 74, 152, "#344e66", 0.32); fb.rect(588, 0, 52, 36, "#142a24"); for (let i=0;i<12;i++) fb.px(590 + Math.floor(r()*48), Math.floor(r()*30), "#b6cbc0", 1);
    fb.rect(598, 98, 42, 34, "#1c0f0c"); for (let y=0;y<14;y++){ const w = 6 + y*2; fb.rect(620 - w/2, 84 + y, w, 1, "#142a24"); }
    fb.rect(616, 108, 9, 8, "#ffd678", 1, 1); fb.rect(620, 108, 1, 8, "#2e1712"); [602, 616, 632].forEach(x => fb.rect(x, 132, 2, 20, "#1c0f0c"));
  },
  anim(fb, t, ox){ const X = x => x - ox;
    // root tips sway, bone chimes knock
    for (let k=0;k<20;k++){ const x = X(18 + k*31), len = 10 + (k*7)%16; if (!onScreen(x)) continue; const sw = Math.round(Math.sin(t/900 + k)*2); fb.rect(x + sw, 0, 2, len, "#2e1712"); fb.px(x + sw, len, "#452017"); }
    [140, 290, 380, 450].forEach((x, i) => { const sx = X(x) + Math.round(Math.sin(t/420 + i*2)*1.5); if (!onScreen(sx)) return; fb.rect(sx, 0, 1, 30 + i*4, "#452017"); fb.rect(sx - 1, 30 + i*4, 3, 2, "#dfe6d6"); fb.rect(sx, 33 + i*4, 1, 3, "#b6cbc0"); fb.rect(sx + 2, 36 + i*4, 2, 2, "#dfe6d6"); });
    const p = 0.5 + 0.5*Math.sin(t/700); [[60,124],[300,132],[520,124]].forEach(([x, y]) => { if (onScreen(X(x))) fb.px(X(x) - 3, y - 2, p > 0.5 ? "#dfe6d6" : "#6e9198", 1); });
  },
  emit(t, sc, ox){
    const sp = 512 - ox; if (onScreen(sp, 40) && Math.random() < 0.3) sc.spawn({x:sp - 34 + Math.random()*68, y:132 + Math.random()*10, vx:(Math.random() - 0.5)*6, vy:-3 - Math.random()*4, life:4, c:Math.random() < 0.5 ? "#fbb954" : "#c95a24", em:1, mote:1});
    if (Math.random() < 0.12) sc.spawn({x:Math.random()*SW, y:20 + Math.random()*20, vx:0, vy:16 + Math.random()*10, life:7, c:"#344e66", em:0});
    if (Math.random() < 0.08) sc.spawn({x:Math.random()*SW, y:60 + Math.random()*80, vx:(Math.random() - 0.5)*3, vy:-0.8, life:5, c:"#6e9198", em:1, mote:1});
  }
};

BGS.mtn = {w:640, ground:156, amb:[0.26,0.32,0.5], shadowFrom:0,
  lights:[{x:520,y:30,r:170,c:[0.32,0.4,0.6],f:0}, {x:110,y:116,r:60,c:[1.3,0.8,0.4],f:0.15}, {x:588,y:110,r:76,c:[1.45,0.6,0.28],f:0.32}, {x:345,y:110,r:40,c:[1.3,0.55,0.3],f:0.3}],
  draw(fb, r){
    const W = fb.w;
    fb.vgrad(0, 120, ["#07090f","#0c111c","#121a29","#182337","#1f2f45"]); wideStars(fb, r, 150, 80);
    discFill(fb, 520, 30, 11, "#dfe6d6", 1); fb.rect(515, 25, 4, 3, "#b6cbc0", 1, 1); fb.rect(524, 33, 3, 2, "#b6cbc0", 1, 1);
    // snowy far peaks, then the dark near range
    for (let x=0;x<W;x++){ const h = 62 + Math.round(Math.sin(x/53)*20 + Math.sin(x/17 + 2)*6 + Math.sin(x/7)*2); fb.rect(x, 128 - h, 1, h + 8, "#182337"); fb.rect(x, 128 - h, 1, h > 70 ? 3 : 1, "#557887"); }
    for (let x=0;x<W;x++){ const h = 34 + Math.round(Math.sin(x/37 + 1)*12 + Math.sin(x/11)*3); fb.rect(x, 136 - h, 1, h + 8, "#121a29"); }
    // the ravine behind the road, a rusty cable and its hanging cart
    for (let y=96;y<146;y++){ const hw = Math.max(0, Math.round(34 - (y - 96)*0.55)); fb.rect(482 - hw, y, hw*2, 1, "#07090f"); }
    [[436,74],[530,70]].forEach(([x, y]) => { fb.rect(x, y, 3, 146 - y, "#2e1712"); fb.rect(x - 4, y, 11, 2, "#452017"); });
    for (let x=437;x<531;x++){ const y = Math.round(74 - (x - 437)*0.04 + Math.sin((x - 437)/94*Math.PI)*6); fb.px(x, y, "#6a6c78"); }
    fb.rect(450, 82, 1, 4, "#6a6c78"); fb.rect(445, 86, 12, 8, "#3d3f4a"); fb.rect(445, 86, 12, 1, "#6a6c78");
    // the cliff the dwarves built into: stone houses with round doors, red goblin hands on every door
    fb.rect(0, 96, 440, 56, "#1f2f45"); for (let i=0;i<120;i++) fb.rect(Math.floor(r()*440), 96 + Math.floor(r()*54), 4 + Math.floor(r()*8), 2 + Math.floor(r()*3), r() < 0.5 ? "#182337" : "#283d55");
    for (let x=0;x<440;x+=2) fb.rect(x, 94 + Math.round(Math.sin(x/13)*2), 2, 3, "#283d55");
    const house = (x, w, h) => { const top = 152 - h; fb.rect(x, top, w, h, "#3d3f4a"); fb.rect(x, top, w, 2, "#6a6c78"); for (let y=top + 6; y<152; y+=6) fb.rect(x, y, w, 1, "#283d55");
      fb.rect(x + 4, top - 10, 6, 10, "#3d3f4a"); fb.rect(x + 3, top - 11, 8, 2, "#283d55");
      const dx = x + Math.floor(w/2) - 6; for (let y=0;y<18;y++){ const hw = y < 6 ? Math.round(6*Math.sqrt(1 - ((6 - y)/6)**2)) : 6; fb.rect(dx + 6 - hw, 134 + y, hw*2, 1, "#2e1712"); }
      fb.rect(dx + 4, 140, 4, 4, "#b02e33"); for (let k=0;k<4;k++) fb.rect(dx + 3 + k, 137, 1, 3, "#b02e33");
      fb.rect(x + w - 12, top + 10, 7, 6, "#121a29"); fb.rect(x + w - 12, top + 10, 7, 1, "#6a6c78"); };
    house(30, 56, 34); house(150, 48, 30); house(236, 62, 38); house(356, 50, 30);
    // road: gravel, mine rails, ore carts and barrels
    fb.rect(0, 150, W, 30, "#1f2f45"); fb.rect(0, 150, W, 1, "#283d55");
    for (let i=0;i<90;i++) fb.rect(Math.floor(r()*W), 152 + Math.floor(r()*26), 2 + Math.floor(r()*3), 1, "#182337");
    for (let x=0;x<540;x+=10) fb.rect(x, 162, 6, 3, "#452017"); fb.rect(0, 161, 540, 1, "#a2a3ac"); fb.rect(0, 165, 540, 1, "#a2a3ac");
    const cart = x => { fb.rect(x, 140, 22, 12, "#3d3f4a"); fb.rect(x, 140, 22, 2, "#6a6c78"); for (let k=0;k<4;k++) fb.rect(x + 2 + k*5, 137, 4, 3, k % 2 ? "#a2a3ac" : "#6a6c78"); [x + 3, x + 15].forEach(c => { fb.rect(c, 152, 4, 4, "#07090f"); fb.px(c + 1, 153, "#6a6c78"); }); };
    cart(96); cart(300);
    const barrel = (x, y) => { fb.rect(x, y, 11, 13, "#61291a"); fb.rect(x, y + 3, 11, 1, "#2e1712"); fb.rect(x, y + 9, 11, 1, "#2e1712"); fb.rect(x, y, 11, 1, "#82341c"); };
    barrel(196, 139); barrel(208, 141); barrel(414, 139);
    // lantern posts (one smashed) and goblin skull totems
    [110, 280].forEach((x, i) => { fb.rect(x, 104, 3, 48, "#2e1712"); fb.rect(x - 6, 104, 12, 2, "#2e1712"); if (!i){ fb.rect(x - 7, 106, 7, 2, "#2e1712"); fb.rect(x - 7, 108, 7, 8, "#452017"); } else { fb.rect(x + 2, 150, 6, 2, "#6a6c78"); fb.px(x + 4, 149, "#a2a3ac"); } });
    [340, 568].forEach(x => { fb.rect(x, 114, 2, 38, "#452017"); fb.rect(x - 3, 108, 8, 7, "#dfe6d6"); fb.rect(x - 2, 110, 2, 2, "#07090f"); fb.rect(x + 2, 110, 2, 2, "#07090f"); fb.rect(x - 4, 116, 10, 2, "#7a1f2a"); fb.rect(x - 4, 118, 2, 6, "#7a1f2a"); });
    // the great dwarf gate: a stone face with a beard of carved lines, its door half open
    fb.rect(540, 30, 100, 122, "#3d3f4a"); fb.rect(540, 30, 100, 3, "#6a6c78"); for (let y=36;y<150;y+=8) fb.rect(540, y, 100, 1, "#283d55");
    fb.rect(560, 46, 60, 6, "#283d55"); fb.rect(564, 56, 14, 6, "#07090f"); fb.rect(602, 56, 14, 6, "#07090f"); fb.rect(586, 58, 8, 18, "#6a6c78"); fb.rect(586, 58, 2, 18, "#a2a3ac");
    for (let k=0;k<11;k++) fb.rect(554 + k*7, 80, 3, 30 - Math.abs(k - 5)*2, "#6a6c78");
    for (let y=112;y<152;y++){ const hw = y < 124 ? Math.round(20*Math.sqrt(1 - ((124 - y)/12)**2)) : 20; fb.rect(590 - hw, y, hw*2, 1, "#07090f"); }
    fb.rect(606, 116, 8, 36, "#6a6c78"); fb.rect(606, 116, 2, 36, "#a2a3ac");
    for (let k=0;k<5;k++) fb.rect(520 + k*13, 157 + (k%2), 10, 1, "#121a29");
  },
  anim(fb, t, ox){ const X = x => x - ox;
    if (onScreen(X(588))) flame(fb, X(582), 112, 10, 12, t, 4);
    if (onScreen(X(106))){ const on = Math.sin(t/130) > -0.5; fb.rect(X(105), 109, 3, 5, on ? FIRE1 : FIRE2, 1, 1); fb.px(X(106), 108, GLOW, 1); }
    if (onScreen(X(345))){ fb.rect(X(343), 106, 4, 4, Math.sin(t/110) > 0 ? FIRE1 : FIRE2, 1, 1); }
    const sw = Math.round(Math.sin(t/800)*1); if (onScreen(X(451))){ fb.rect(X(445) + sw, 86, 12, 8, "#3d3f4a"); fb.rect(X(445) + sw, 86, 12, 1, "#6a6c78"); }
  },
  emit(t, sc, ox){
    if (Math.random() < 0.3) sc.spawn({x:SW + 4, y:20 + Math.random()*120, vx:-14 - Math.random()*10, vy:2 + Math.random()*3, life:10, c:Math.random() < 0.7 ? "#557887" : "#8fadaa", em:0, ash:1});
    const gx = 588 - ox; if (onScreen(gx) && Math.random() < 0.3) sc.spawn({x:gx - 4 + Math.random()*8, y:100, vx:(Math.random() - 0.5)*8, vy:-14 - Math.random()*10, life:1.2, c:Math.random() < 0.5 ? FIRE1 : FIRE2, em:1});
  }
};

const TUN_X = [570, 660, 750];
BGS.warren = {w:800, ground:156, amb:[0.3,0.32,0.42], shadowFrom:0,
  lights:[{x:60,y:96,r:70,c:[1.3,0.78,0.4],f:0.2}, {x:250,y:96,r:70,c:[1.3,0.78,0.4],f:0.2}, {x:420,y:96,r:70,c:[1.3,0.78,0.4],f:0.2}, {x:620,y:96,r:70,c:[1.3,0.78,0.4],f:0.2}, {x:760,y:96,r:60,c:[1.3,0.78,0.4],f:0.2},
    {x:180,y:140,r:70,c:[1.5,0.65,0.3],f:0.3}, {x:500,y:140,r:40,c:[0.5,0.55,0.8],f:0}, {x:570,y:90,r:44,c:[1.2,0.7,0.4],f:0.2}, {x:660,y:90,r:44,c:[1.2,0.7,0.4],f:0.2}, {x:750,y:90,r:44,c:[1.2,0.7,0.4],f:0.2}],
  draw(fb, r){
    const W = fb.w;
    fb.rect(0, 0, W, SH, "#121a29");
    for (let i=0;i<700;i++){ const w = 3 + Math.floor(r()*7), h = 2 + Math.floor(r()*4); fb.rect(Math.floor(r()*W), Math.floor(r()*150), w, h, r() < 0.5 ? "#182337" : "#1f2f45"); }
    for (let x=0;x<W;x+=6){ const h = 4 + Math.floor(r()*10); for (let y=0;y<h;y++) fb.rect(x + Math.floor(y/3), y, Math.max(1, 5 - Math.floor(y/2)), 1, "#0c111c"); }
    // timber frames along the tunnel
    for (let x=40;x<540;x+=150){ [x, x + 64].forEach(px => { fb.rect(px, 56, 7, 100, "#61291a"); fb.rect(px, 56, 2, 100, "#82341c"); fb.rect(px + 5, 56, 2, 100, "#452017"); }); fb.rect(x - 4, 50, 76, 7, "#61291a"); fb.rect(x - 4, 50, 76, 2, "#82341c"); }
    // goblin marks: red hands, scrawls, rag banners
    for (let i=0;i<26;i++){ const x = Math.floor(r()*540), y = 70 + Math.floor(r()*60); fb.rect(x, y, 4, 4, "#b02e33"); for (let k=0;k<4;k++) fb.rect(x - 1 + k*1.4, y - 3, 1, 3, "#b02e33"); }
    [[90,92],[400,84]].forEach(([x, y]) => { for (let k=0;k<20;k++) fb.px(x + k, y + Math.round(Math.sin(k/2)*3), "#e04a3c"); for (let k=0;k<8;k++) fb.px(x + 6 + k, y - 6 - (k%3), "#e04a3c"); });
    [210, 520].forEach(x => { for (let k=0;k<4;k++) fb.rect(x + k*6, 57, 4, 18 + (k*7)%12, k % 2 ? "#7a1f2a" : "#4a1420"); });
    // bones and the goblins' fire pit
    for (let i=0;i<22;i++){ const x = 100 + Math.floor(r()*60), y = 148 + Math.floor(r()*6); fb.rect(x, y, 3 + Math.floor(r()*4), 1, "#b6cbc0"); }
    fb.rect(166, 150, 28, 4, "#2e1712"); fb.rect(170, 148, 20, 3, "#452017");
    // floor, rails
    fb.rect(0, 150, W, 30, "#1f2f45"); fb.rect(0, 150, W, 1, "#283d55");
    for (let i=0;i<120;i++) fb.rect(Math.floor(r()*W), 152 + Math.floor(r()*26), 2 + Math.floor(r()*3), 1, "#182337");
    for (let x=0;x<W;x+=10) fb.rect(x, 160, 6, 3, "#452017"); fb.rect(0, 159, W, 1, "#a2a3ac"); fb.rect(0, 163, W, 1, "#a2a3ac");
    // Bron's camp: a cold forge, bellows, the stump where his anvil stood
    fb.rect(478, 116, 34, 34, "#3d3f4a"); fb.rect(478, 116, 34, 2, "#6a6c78"); fb.rect(486, 128, 18, 14, "#0c111c"); fb.rect(482, 96, 10, 20, "#3d3f4a");
    fb.rect(462, 138, 14, 8, "#452017"); fb.rect(462, 138, 14, 1, "#61291a"); fb.rect(474, 140, 6, 2, "#2e1712");
    fb.rect(520, 140, 16, 12, "#2e1712"); fb.rect(520, 140, 16, 1, "#452017"); for (let k=0;k<4;k++) fb.px(523 + k*3, 141, "#6a6c78");
    // three side tunnels, carved I · II · III over the timber
    TUN_X.forEach((x, i) => { for (let y=96;y<152;y++){ const hw = y < 112 ? Math.round(26*Math.sqrt(1 - ((112 - y)/16)**2)) : 26; fb.rect(x - hw, y, hw*2, 1, "#344e66"); }
      for (let y=104;y<152;y++){ const hw = y < 116 ? Math.round(16*Math.sqrt(1 - ((116 - y)/12)**2)) : 16; fb.rect(x - hw, y, hw*2, 1, "#07090f"); }
      fb.rect(x - 20, 100, 5, 52, "#61291a"); fb.rect(x + 15, 100, 5, 52, "#61291a"); fb.rect(x - 22, 96, 44, 5, "#82341c");
      for (let k=0;k<=i;k++) fb.rect(x - i*3 + k*6 - 1, 88, 2, 6, "#a2a3ac"); });
  },
  anim(fb, t, ox){ const X = x => x - ox;
    [60, 250, 420, 548, 638, 728].forEach((x, i) => { const sx = X(x); if (!onScreen(sx)) return; for (let y=57;y<80;y+=2) fb.px(sx, y, "#6a6c78"); fb.rect(sx - 3, 80, 7, 2, "#2e1712"); fb.rect(sx - 2, 82, 5, 6, "#452017");
      fb.rect(sx - 1, 83, 3, 4, Math.sin(t/120 + i) > -0.3 ? FIRE1 : FIRE2, 1, 1); fb.px(sx, 82, GLOW, 1); });
    if (onScreen(X(180), 20)) flame(fb, X(170), 149, 20, 14, t, 2);
    // the hanging cages rock a little
    [334, 366].forEach((x, i) => { const sx = X(x) + Math.round(Math.sin(t/900 + i)*1.5); if (!onScreen(sx, 20)) return; fb.rect(sx + 6, 0, 1, 70, "#6a6c78");
      fb.rect(sx, 70, 14, 2, "#3d3f4a"); fb.rect(sx, 92, 14, 2, "#3d3f4a"); for (let k=0;k<5;k++) fb.rect(sx + k*3, 72, 1, 20, "#6a6c78");
      if (!S.flags.cageOpen){ fb.rect(sx + 4, 80, 6, 12, "#1c0f0c"); fb.rect(sx + 5, 76, 4, 4, "#dba07a"); fb.rect(sx + 4, 84, 6, 3, i ? "#a2a3ac" : "#c95a24"); } });
  },
  emit(t, sc, ox){
    if (Math.random() < 0.1) sc.spawn({x:Math.random()*SW, y:56, vx:0, vy:10 + Math.random()*10, life:6, c:"#557887", em:0});
    const fx = 180 - ox; if (onScreen(fx) && Math.random() < 0.35) sc.spawn({x:fx - 6 + Math.random()*12, y:138, vx:(Math.random() - 0.5)*8, vy:-14 - Math.random()*10, life:1.2, c:Math.random() < 0.5 ? FIRE1 : FIRE2, em:1});
  }
};

// the troll woods: dusk by day, a green-moon night for the ambush
function drawEyewood(fb, r, night){
  const W = fb.w, dark = night ? "#0c111c" : "#1c0f0c";
  fb.vgrad(0, 116, night ? ["#0c111c","#121a29","#1f2f45","#283d55","#2f5e3e"] : ["#241a33","#3a2850","#7a1f2a","#a6441f","#c95a24"]);
  if (night){ wideStars(fb, r, 140, 70); discFill(fb, 120, 30, 12, "#b6cbc0", 1); fb.rect(114, 26, 4, 3, "#8fadaa", 1, 1); }
  else { discFill(fb, 520, 100, 16, "#fbb954", 1); discFill(fb, 520, 100, 11, "#ffd678", 1); for (let y=60;y<116;y+=4) fb.dith(0, y, W, 2, "#e2762d", 0.1); }
  for (let x=-10;x<W + 10;x+=12) pine(fb, x + Math.floor(r()*6), 124, 28 + Math.floor(r()*22), night ? "#182337" : "#2e1712");
  for (let x=-6;x<W + 10;x+=20) pine(fb, x + Math.floor(r()*10), 134, 40 + Math.floor(r()*26), night ? "#121a29" : dark);
  fb.rect(0, 130, W, 50, night ? "#142a24" : "#142a24"); fb.rect(0, 142, W, 38, night ? "#1f2f45" : "#1f4232");
  fb.rect(0, 148, W, 12, night ? "#1c0f0c" : "#2e1712"); for (let i=0;i<120;i++) fb.rect(Math.floor(r()*W), 148 + Math.floor(r()*12), 2, 1, night ? "#2e1712" : "#452017");
  for (let i=0;i<70;i++){ const x = Math.floor(r()*W), y = 160 + Math.floor(r()*18); fb.rect(x, y - 2, 1, 3, night ? "#142a24" : "#1f4232"); fb.px(x + 1, y - 1, night ? "#1f4232" : "#2f5e3e"); }
  // giant old trunks, each carved with one red-ochre eye that stares deeper into the wood
  [[34,26],[150,22],[262,30],[462,28],[530,20]].forEach(([x, w]) => { fb.rect(x, 0, w, 152, dark); for (let k=3;k<w;k+=5) fb.rect(x + k, 0, 1, 152, night ? "#182337" : "#2e1712");
    for (let k=0;k<3;k++){ fb.rect(x - 4 - k*3, 146 + k*2, 6, 3, dark); fb.rect(x + w - 2 + k*3, 146 + k*2, 6, 3, dark); }
    const ex = x + Math.floor(w/2), ey = 84 + (x % 3)*6;
    for (let k=-6;k<=6;k++){ const h = Math.round(Math.sqrt(36 - k*k)*0.55); fb.px(ex + k, ey - h, "#a6441f"); fb.px(ex + k, ey + h, "#a6441f"); }
    discFill(fb, ex + 1, ey, 2, night ? "#7aa35a" : "#e04a3c", night); });
  // the woodcutters' village, smashed: a broken palisade, caved-in huts, an axe left in a stump
  for (let x=296;x<432;x+=7){ if ((x*7) % 5 === 0) continue; const lean = ((x*13) % 7) - 3, h = 18 + (x*3) % 14; for (let y=0;y<h;y++) fb.rect(x + Math.round(lean*y/h), 148 - y, 4, 1, night ? "#1c0f0c" : "#452017"); }
  const hut = (x, tilt) => { fb.rect(x, 126, 34, 22, night ? "#121a29" : "#2e1712"); for (let y=0;y<16;y++){ const w = Math.round(40*(y + 1)/16); fb.rect(x + 17 - w/2 + Math.round(tilt*(16 - y)/16), 112 + y + (tilt ? Math.round(y*0.3) : 0), w, 1, y % 3 ? (night ? "#0c111c" : "#61291a") : "#1c0f0c"); }
    fb.rect(x + 12, 134, 10, 14, "#07090f"); fb.dith(x, 112, 40, 36, "#07090f", 0.3); };
  hut(318, 6); hut(382, -4);
  fb.rect(300, 140, 18, 8, "#452017"); fb.rect(300, 140, 18, 1, "#61291a"); fb.rect(304, 134, 14, 6, "#61291a");
  fb.rect(420, 140, 12, 8, "#61291a"); fb.rect(425, 132, 2, 9, "#82341c"); fb.rect(421, 131, 7, 4, "#a2a3ac");
  // claw marks gouged into the bark, footprints three times a man's
  for (let k=0;k<3;k++) for (let s=0;s<16;s++) fb.px(470 + k*4 + Math.floor(s/3), 98 + s, night ? "#2e1712" : "#82341c");
  for (let k=0;k<4;k++){ const x = 486 + k*20, y = 151 + (k%2)*4; fb.rect(x, y, 10, 4, "#07090f"); for (let d=0;d<3;d++) fb.px(x + 1 + d*3, y - 1, "#07090f"); }
  // the troll's hill and its cave
  for (let y=66;y<152;y++){ const hw = Math.round(46*Math.sqrt((y - 66)/86)); fb.rect(600 - hw, y, hw*2 + 40, 1, y % 5 ? "#1f2f45" : "#283d55"); }
  for (let i=0;i<40;i++) fb.rect(560 + Math.floor(r()*80), 80 + Math.floor(r()*70), 5, 3, night ? "#182337" : "#344e66");
  for (let y=108;y<152;y++){ const hw = y < 122 ? Math.round(20*Math.sqrt(1 - ((122 - y)/14)**2)) : 20; fb.rect(610 - hw, y, hw*2, 1, "#07090f"); }
  for (let i=0;i<14;i++) fb.rect(586 + Math.floor(r()*50), 148 + Math.floor(r()*6), 3 + Math.floor(r()*4), 1, "#dfe6d6");
  fb.dith(0, 138, W, 10, night ? "#283d55" : "#557887", 0.14);
}
BGS.eyewood = {w:640, ground:156, amb:[0.46,0.34,0.4], shadowFrom:0,
  lights:[{x:520,y:100,r:230,c:[1.25,0.62,0.35],f:0}, {x:420,y:130,r:50,c:[1.0,0.6,0.35],f:0.1}],
  draw(fb, r){ drawEyewood(fb, r, false); },
  anim(fb, t, ox){ const sx = 610 - ox; if (onScreen(sx, 30) && Math.floor(t/2400) % 3 === 0){ fb.px(sx - 4, 126, "#7aa35a", 1); fb.px(sx + 4, 126, "#7aa35a", 1); } },
  emit(t, sc){ if (Math.random() < 0.14) sc.spawn({x:Math.random()*SW, y:-2, vx:4 + Math.random()*5, vy:10 + Math.random()*6, life:14, c:["#a6441f","#61291a","#c95a24"][Math.floor(Math.random()*3)], em:0, ash:1}); }
};
BGS.eyewood_n = {w:640, ground:156, amb:[0.3,0.36,0.52], shadowFrom:0, camAt:320,
  lights:[{x:120,y:30,r:220,c:[0.3,0.42,0.48],f:0}, {x:47,y:90,r:24,c:[0.5,1.0,0.5],f:0.3}, {x:161,y:96,r:24,c:[0.5,1.0,0.5],f:0.3}, {x:277,y:84,r:24,c:[0.5,1.0,0.5],f:0.3}, {x:476,y:90,r:24,c:[0.5,1.0,0.5],f:0.3}, {x:540,y:96,r:24,c:[0.5,1.0,0.5],f:0.3}],
  draw(fb, r){ drawEyewood(fb, r, true); },
  anim(fb, t, ox){ const sx = 610 - ox; if (onScreen(sx, 30)){ const on = Math.sin(t/700) > 0; fb.px(sx - 4, 126, on ? "#7aa35a" : "#2f5e3e", 1); } },
  emit(t, sc){ if (Math.random() < 0.06) sc.spawn({x:Math.random()*SW, y:90 + Math.random()*60, vx:(Math.random() - 0.5)*5, vy:-1, life:4, c:"#7aa35a", em:1, fly:1});
    if (Math.random() < 0.12) sc.spawn({x:Math.random()*SW, y:130 + Math.random()*20, vx:2 + Math.random()*2, vy:-0.3, life:6, c:"#283d55", em:0, mote:1}); }
};

const POOL_X = 476;
BGS.trollcave = {w:640, ground:156, amb:[0.32,0.38,0.4], shadowFrom:0,
  lights:[{x:0,y:110,r:130,c:[0.45,0.5,0.55],f:0}, {x:POOL_X,y:150,r:90,c:[0.5,1.1,0.5],f:0.2}, {x:POOL_X - 6,y:60,r:70,c:[0.6,0.7,0.65],f:0}, {x:604,y:140,r:56,c:[1.2,0.9,0.4],f:0.08}, {x:30,y:100,r:80,c:[0.4,0.45,0.5],f:0}],
  draw(fb, r){
    const W = fb.w;
    fb.rect(0, 0, W, SH, "#142a24");
    for (let i=0;i<700;i++){ const w = 3 + Math.floor(r()*8), h = 2 + Math.floor(r()*5); fb.rect(Math.floor(r()*W), Math.floor(r()*150), w, h, ["#1f4232","#182337","#2f5e3e","#283d55","#121a29"][Math.floor(r()*5)]); }
    for (let i=0;i<50;i++){ const x = Math.floor(r()*W), y = Math.floor(r()*80); fb.rect(x, y, 1, 20 + Math.floor(r()*40), "#344e66"); }
    // stalactites
    for (let x=0;x<W;x+=8){ const h = 8 + Math.floor(r()*24); for (let y=0;y<h;y++){ const w = Math.max(1, Math.round((h - y)/3)); fb.rect(x + 4 - w, y, w*2, 1, y > h - 3 ? "#4a7f48" : y % 4 ? "#0c111c" : "#1f4232"); } }
    // light from a crack, over the moss pool
    for (let y=0;y<150;y++){ const hw = 4 + y*0.12; fb.dith(Math.round(POOL_X - 6 - hw), y, Math.round(hw*2), 1, "#557887", 0.22); }
    fb.rect(0, 150, W, 30, "#1f2f45"); fb.rect(0, 150, W, 1, "#344e66");
    for (let i=0;i<140;i++) fb.rect(Math.floor(r()*W), 152 + Math.floor(r()*26), 2 + Math.floor(r()*3), 1, r() < 0.5 ? "#121a29" : "#283d55");
    // bones everywhere near the mouth
    for (let i=0;i<70;i++){ const x = 40 + Math.floor(r()*240), y = 146 + Math.floor(r()*10); fb.rect(x, y, 3 + Math.floor(r()*5), 1, r() < 0.5 ? "#dfe6d6" : "#b6cbc0"); if (r() < 0.2) fb.rect(x, y - 1, 1, 3, "#b6cbc0"); }
    [[90,142],[176,144],[236,141]].forEach(([x, y]) => { fb.rect(x, y, 7, 6, "#dfe6d6"); fb.rect(x + 1, y + 2, 2, 2, "#07090f"); fb.rect(x + 4, y + 2, 2, 2, "#07090f"); });
    // bats asleep on the ceiling
    for (let k=0;k<26;k++){ const x = 290 + Math.floor(r()*100), y = 10 + Math.floor(r()*20); fb.rect(x, y, 2, 4, "#241a33"); fb.px(x - 1, y + 1, "#3a2850"); fb.px(x + 2, y + 1, "#3a2850"); }
    // the regeneration pool: glowing moss
    for (let y=0;y<9;y++){ const hw = Math.round(34*Math.sqrt(1 - (y/9)**2)); fb.rect(POOL_X - hw, 156 + y, hw*2, 1, y < 2 ? "#4a7f48" : "#2f5e3e", 1, y < 2 ? 1 : 0); }
    for (let k=0;k<26;k++){ const a = k/26*Math.PI*2, x = Math.round(POOL_X + Math.cos(a)*38), y = Math.round(158 + Math.sin(a)*6); fb.rect(x, y - 1, 3, 2, "#7aa35a", 1, 1); }
    [[POOL_X - 46,140],[POOL_X + 40,136]].forEach(([x, y]) => { fb.rect(x, y, 16, 16, "#1f4232"); fb.rect(x, y, 16, 3, "#4a7f48", 1, 1); });
    // the troll's bed: a hoard heaped on moss and bones
    for (let y=0;y<18;y++){ const hw = Math.round(40 - y*2); fb.rect(604 - hw, 150 - y, hw*2, 1, y % 3 ? "#61291a" : "#452017"); }
    for (let i=0;i<50;i++) fb.px(570 + Math.floor(r()*68), 134 + Math.floor(r()*16), "#fbb954", 1);
    fb.rect(586, 136, 10, 8, "#6a6c78"); fb.rect(587, 137, 8, 1, "#a2a3ac"); fb.rect(612, 138, 3, 12, "#a2a3ac"); fb.rect(608, 138, 11, 2, "#6a6c78");
  },
  anim(fb, t, ox){ const X = x => x - ox, p = 0.5 + 0.5*Math.sin(t/500);
    if (onScreen(X(POOL_X), 40)) for (let k=0;k<6;k++){ const x = X(POOL_X) - 24 + k*9 + Math.round(Math.sin(t/400 + k)*2); fb.rect(x, 158, 4, 1, p > 0.5 ? "#b6cbc0" : "#7aa35a", 1, 1); }
    for (let k=0;k<8;k++){ const x = 30 + k*79, sx = X(x), ph = ((t/1300 + k*0.31) % 1); if (!onScreen(sx)) continue; fb.px(sx, 24 + Math.floor(ph*126), "#6e9198", 1); }
    if (Math.floor(t/1800) % 4 === 0){ const sx = X(330); if (onScreen(sx)){ fb.px(sx - 2, 18, "#3a2850"); fb.px(sx + 3, 18, "#3a2850"); } }
  },
  emit(t, sc, ox){ const px = POOL_X - ox;
    if (onScreen(px, 40) && Math.random() < 0.25) sc.spawn({x:px - 30 + Math.random()*60, y:156, vx:(Math.random() - 0.5)*3, vy:-4 - Math.random()*4, life:3, c:Math.random() < 0.5 ? "#7aa35a" : "#b6cbc0", em:1, mote:1}); }
};

/* ================= story ================= */
const noiseLine = S => ["sys", `소음 ${Math.min(2, +S.flags.noise || 0)}/2 — 소음이 2가 되면 트롤이 깬다.`];
Object.assign(NODES, {
  /* ---------- 악취나는 늪 ---------- */
  bog_enter:{bg:"bog", lines:[
    "동쪽 길은 금세 질척한 늪으로 바뀐다. 썩은 달걀 같은 냄새가 코를 찌르고, 눈이 따끔거린다.",
    "물 위로 거품이 올라와 터질 때마다 누런 안개가 피어오른다. 저걸 들이마시면 좋을 리가 없다."
  ], prompt:"독한 늪 안개가 길을 덮었다.", choices:[
    {t:"check", label:"숨을 참고 안개를 단숨에 지나간다", stat:"con", dc:12, pass:"bog_enter_ok", fail:"bog_enter_gas"},
    {t:"check", label:"바람이 부는 쪽을 읽어 안개를 피해 돈다", stat:"wis", dc:12, pass:"bog_enter_ok", fail:"bog_enter_gas"},
    {t:"check", label:"젖은 천에 박하를 문질러 코와 입을 막는다", stat:"int", dc:11, pass:"bog_enter_mask", fail:"bog_enter_gas"}
  ]},
  bog_enter_ok:{bg:"bog", fx:{xp:20}, lines:["안개가 걷힌 틈으로 무사히 빠져나왔다.", "뒤를 돌아보니 방금 지나온 자리에서 늪쥐 한 마리가 비틀거리다 쓰러진다."], next:"bog_pilgrim", nextLabel:"계속 걷는다"},
  bog_enter_mask:{bg:"bog", fx:{xp:25, flag:"mask"}, lines:["박하 향 덕분에 숨쉬기가 한결 낫다. 남은 천을 모두에게 나눠 묶었다.", "이 늪에서는 숨 한 번이 목숨값이다. 천은 버리지 말자."], next:"bog_pilgrim", nextLabel:"계속 걷는다"},
  bog_enter_gas:{bg:"bog", fx:{dmg:"1d4", who:"all"}, lines:["콜록! 누런 안개가 목구멍을 긁는다. 모두 눈물을 흘리며 겨우 빠져나왔다."], next:"bog_pilgrim", nextLabel:"계속 걷는다"},
  bog_pilgrim:{bg:"bog", lines:[
    "널빤지 길 옆, 그루터기에 기대앉은 해골이 보인다. 보라색 순례자 망토가 늪물에 젖어 있다.",
    "곁에는 그을린 날개 문장이 새겨진 방패가 반쯤 가라앉아 있다. 해골은 가죽 일지를 품에 꼭 안고 있다."
  ], prompt:"망자를 어떻게 할까?", choices:[
    {t:"check", label:"젖은 일지를 조심스럽게 펼쳐 읽는다", stat:"int", dc:11, pass:"pilgrim_read", fail:"pilgrim_tear"},
    {t:"go", label:"망자를 마른 땅에 묻어 준다", to:"pilgrim_bury"},
    {t:"go", label:"쓸 만한 것만 챙긴다", to:"pilgrim_loot"}
  ]},
  pilgrim_read:{bg:"bog", fx:{flag:"trialHint", xp:30}, lines:[
    "「…사흘째. 그레타의 오두막에 닿았다. 마녀는 머리와 팔과 숨을 시험한다 했다.」",
    "「머리의 시험은 거짓말쟁이 솥 셋. 쪽지 가운데 참말은 오직 하나. 나는… 셋 다 믿고 말았다.」",
    "「뿌리 굴의 망령들은 빛을 싫어한다. 등불을 높이 들 것. 내 등불은 이미 꺼졌다.」",
    "마지막 장은 비어 있다. 재의 방패를 찾아 나섰던 누군가의 기록이다."
  ], next:"bog_leech", nextLabel:"일지를 품고 나아간다"},
  pilgrim_tear:{bg:"bog", fx:{flag:"lightHint"}, lines:["물먹은 종이가 손가락 사이에서 바스러졌다. 겨우 읽은 건 한 줄뿐이다.", "「…망령은 빛을 싫어…」"], next:"bog_leech", nextLabel:"나아간다"},
  pilgrim_bury:{bg:"bog", fx:{luck:1, xp:20}, lines:["일행은 마른 둔덕을 골라 망자를 묻고 돌을 쌓았다.", "돌무더기 위에 앉은 반딧불 하나가 한참을 떠나지 않는다. 왠지 운이 따를 것 같다."], next:"bog_leech", nextLabel:"나아간다"},
  pilgrim_loot:{bg:"bog", fx:{gold:18, potion:1}, lines:["녹슨 동전 주머니와 마개가 단단한 물약 한 병을 챙겼다.", "일지는... 손을 뻗는 사이 늪에 미끄러져 가라앉았다."], next:"bog_leech", nextLabel:"나아간다"},
  bog_leech:{bg:"bog", show:["leech","leech","leech"], lines:["널빤지 길이 끊긴 자리. 시커먼 물이 부글거리더니 팔뚝만 한 거머리들이 줄지어 기어오른다.", "저 순례자를 이 늪에 붙잡아 둔 것도 이놈들이었을지 모른다."], prompt:"거머리 떼가 다가온다!", choices:[
    {t:"battle", label:"쳐낸다", foe:"leeches_bog", win:"bog_leech_win"},
    {t:"check", label:"등불 기름을 뿌려 불을 붙인다", stat:"int", dc:12, pass:"bog_leech_burn", fail:"bog_leech_fight"}
  ]},
  bog_leech_burn:{bg:"bog", fx:{xp:60}, art:{bg:"bog", u:P2, o:"fire", c:[60,50,200,112]}, lines:["화르륵! 늪 가스에 불이 옮겨붙으며 물 위로 불길이 번진다. 거머리들이 쉭쉭거리며 물러난다."], next:"bog_gate", nextLabel:"불길이 잦아들면 지나간다"},
  bog_leech_fight:{bg:"bog", show:["leech","leech","leech"], lines:["기름이 젖어서 불이 붙지 않는다! 거머리들이 달려든다."], choices:[{t:"battle", label:"싸운다", foe:"leeches_bog", win:"bog_leech_win"}]},
  bog_leech_win:{bg:"bog", fx:{gold:8}, lines:["마지막 거머리를 떼어 내고 숨을 고른다. 늪 동쪽 끝, 거대한 뿌리가 얽힌 그림자가 보인다."], next:"bog_gate", nextLabel:"동쪽 끝으로"},
  bog_gate:{bg:"bog", lines:[
    "늪의 동쪽 끝. 거대한 나무뿌리들이 서로 얽혀 동굴처럼 입을 벌리고 있다.",
    "뿌리마다 새 뼈로 엮은 풍경이 매달려, 바람도 없는데 달그락거린다. 마녀의 경고일까, 초대일까."
  ], next:"root_maze", nextLabel:"뿌리 굴로 들어간다"},

  /* ---------- 썩은 뿌리 굴 ---------- */
  root_maze:{bg:"roots", lines:[
    "뿌리 굴 안은 생각보다 넓다. 천장에서 늘어진 뿌리들이 커튼처럼 흔들리고, 발밑은 검은 물이 찰랑인다.",
    "몇 걸음 들어서자 뒤쪽 입구가 뿌리에 가려 보이지 않는다. 갈림길이 넷, 다섯... 뿌리가 움직이는 걸까?"
  ], prompt:"길을 잃기 딱 좋은 곳이다.", choices:[
    {t:"check", label:"썩은 냄새가 옅어지는 쪽을 따라간다", stat:"wis", dc:13, pass:"root_maze_ok", fail:"root_maze_lost"},
    {t:"check", label:"뼈 풍경이 기운 방향으로 마녀의 표식을 읽는다", stat:"int", dc:13, pass:"root_maze_ok", fail:"root_maze_lost"},
    {t:"go", label:"뿌리를 베어 곧장 길을 낸다", to:"root_maze_cut"}
  ]},
  root_maze_ok:{bg:"roots", fx:{xp:30}, lines:["뼈 풍경은 언제나 한쪽으로만 기울어 있었다. 그쪽을 따라가자 뿌리 사이로 희미한 청록빛이 보인다."], next:"root_wraith", nextLabel:"빛을 따라간다"},
  root_maze_lost:{bg:"roots", fx:{dmg:"1d6", who:"roller"}, lines:["한참을 헤매다 같은 자리로 돌아왔다. 발목을 감은 뿌리를 떼어 내다 살갗이 찢겼다.", "결국 물이 흘러가는 쪽을 따라 겨우 길을 찾았다."], next:"root_wraith", nextLabel:"나아간다"},
  root_maze_cut:{bg:"roots", fx:{dmg:"1d4", who:"all"}, lines:["칼날이 닿자 뿌리가 비명처럼 삐걱거리며 사방에서 조여 온다! 가까스로 빠져나왔지만 모두 긁히고 멍들었다.", "...이 굴은 살아 있다."], next:"root_wraith", nextLabel:"나아간다"},
  root_wraith:{bg:"roots", show:["wraith","wraith"], lines:["물 위로 희뿌연 형체들이 떠오른다. 늪에 빠져 죽은 자들의 망령이다.", "텅 빈 눈구멍들이 일행의 등불을 바라본다."], prompt:"망령들이 다가온다!", choices:[
    {t:"check", label:"순례자의 일지대로 등불을 높이 들어 몰아낸다", stat:"wis", dc:11, need:"lightHint", pass:"root_light", fail:"root_wraith_fight"},
    {t:"check", label:"망령들에게 이제 편히 쉬라고 말을 건넨다", stat:"cha", dc:14, pass:"root_rest", fail:"root_wraith_fight"},
    {t:"battle", label:"싸운다", foe:"wraiths", win:"root_wraith_win"}
  ]},
  root_light:{bg:"roots", fx:{xp:70}, lines:["등불을 높이 치켜들자 망령들이 빛을 피해 뿌리 틈으로 흩어진다.", "그중 하나가 사라지기 전, 고개를 숙여 인사한 것 같았다. 보라색 망토를 두른 모습이었다."], next:"root_spore", nextLabel:"더 깊이"},
  root_rest:{bg:"roots", fx:{xp:60, luck:1}, lines:[["narr","「이제 가도 된다. 늪은 너희를 붙잡지 않는다.」"], "망령들이 잠시 멈추더니, 하나둘 물안개처럼 풀려 사라진다. 등불이 따뜻해진 것 같다."], next:"root_spore", nextLabel:"더 깊이"},
  root_wraith_fight:{bg:"roots", show:["wraith","wraith"], lines:["망령들이 날카로운 비명을 지르며 달려든다!"], choices:[{t:"battle", label:"싸운다", foe:"wraiths", win:"root_wraith_win"}]},
  root_wraith_win:{bg:"roots", fx:{gold:12}, lines:["망령들이 흩어지자 물 아래에서 녹슨 동전들이 반짝인다. 늪에 삼켜진 이들의 노잣돈이다."], next:"root_spore", nextLabel:"더 깊이"},
  root_spore:{bg:"roots", lines:["굴 깊은 곳, 사람 머리만 한 버섯들이 빽빽하다. 갓이 숨 쉬듯 부풀었다 오그라든다.", "발소리에 맞춰 버섯 하나가 퍽 터지며 노란 포자를 뿜는다. 저 사이를 지나야 한다."], prompt:"포자 버섯 밭이다.", choices:[
    {t:"go", label:"박하 천으로 입을 막고 지나간다", need:"mask", to:"root_spore_mask"},
    {t:"check", label:"버섯이 터지기 전에 사이사이로 빠져나간다", stat:"dex", dc:13, pass:"root_spore_ok", fail:"root_spore_bad"},
    {t:"check", label:"숨을 꾹 참고 천천히 걸어간다", stat:"con", dc:13, pass:"root_spore_ok", fail:"root_spore_bad"},
    {t:"check", label:"작은 불꽃으로 버섯 밭을 태운다", stat:"int", dc:12, pass:"root_spore_burn", fail:"root_spore_bad"}
  ]},
  root_spore_mask:{bg:"roots", fx:{xp:30}, lines:["미리 적셔 둔 박하 천이 제 몫을 한다. 노란 포자 속을 숨 한 번 막히지 않고 지나왔다."], next:"greta", nextLabel:"빛이 보이는 쪽으로"},
  root_spore_ok:{bg:"roots", fx:{xp:40}, lines:["포자 구름이 등 뒤에서 터졌다. 아슬아슬했다."], next:"greta", nextLabel:"빛이 보이는 쪽으로"},
  root_spore_burn:{bg:"roots", fx:{xp:40}, art:{bg:"roots", u:P2, o:"fire", c:[60,50,200,112]}, lines:["불꽃이 닿자 버섯들이 쉭쉭 소리를 내며 오그라든다. 탄내 속에 길이 열렸다."], next:"greta", nextLabel:"빛이 보이는 쪽으로"},
  root_spore_bad:{bg:"roots", fx:{dmg:"1d6", who:"all"}, lines:["포자를 들이마셨다! 눈앞이 노랗게 번지고 다리가 휘청거린다.", "한참을 기침한 끝에 겨우 버섯 밭을 벗어났다."], next:"greta", nextLabel:"빛이 보이는 쪽으로"},

  /* ---------- 마녀 그레타의 세 가지 시험 ---------- */
  greta:{bg:"swamp", show:["witch"], art:{bg:"swamp", u:[["witch",250]], o:"cauldron", c:[150,50,200,112]}, lines:[
    "뿌리 굴을 빠져나오자 하늘이 뚫린 공터가 나온다. 장대 위 오두막에서 등불이 깜빡인다.",
    "오두막 문이 끼익 열리고, 녹색 두건을 쓴 노파가 지팡이를 짚고 나온다.",
    ["witch","오호호, 뿌리 굴을 제 발로 지나왔다고? 오르나가 보낸 아이들이로구나."],
    ["witch","재의 방패를 원하는 게지. 백 년 전 엘다인이라는 꼬마 기사가 그 방패로 바르쿠스의 숨을 막아 냈단다."],
    ["witch","하지만 방패는 아무 손에나 쥐여 줄 수 없지. 시험은 셋 — 머리, 팔, 그리고 숨. 하나라도 꺾이면 방패는 다시 늪에 잠든다."]
  ], next:"trial1", nextLabel:"시험을 받겠다"},
  trial1:{bg:"swamp", show:["witch"], art:{bg:"swamp", u:[["witch",250]], o:"cauldron", c:[150,50,200,112]}, lines:[
    ["witch","첫째, 머리의 시험이다."],
    "그레타가 솥 세 개를 늘어놓는다. 초록 솥, 붉은 솥, 검은 솥. 솥마다 쪽지가 붙어 있다.",
    "초록 솥 「독은 여기 없다.」 · 붉은 솥 「독은 초록 솥에 있다.」 · 검은 솥 「독은 붉은 솥에 없다.」",
    ["witch","셋 중 하나에만 독이 들었지. 그리고 쪽지 셋 가운데 참말은 딱 하나뿐이란다. 독이 든 솥을 골라 늪에 엎어 보거라."]
  ], again:[["witch","오호호! 다시 해 보렴. 늪은 기다리는 걸 잘하거든."], "초록 솥 「독은 여기 없다.」 · 붉은 솥 「독은 초록 솥에 있다.」 · 검은 솥 「독은 붉은 솥에 없다.」 — 참말은 하나뿐."],
  prompt:"독이 든 솥은? (다 같이 풀어 보세요)", choices:[
    {t:"go", label:"초록 솥을 엎는다", to:"trial1_wrong"},
    {t:"go", label:"붉은 솥을 엎는다", to:"trial1_pass"},
    {t:"go", label:"검은 솥을 엎는다", to:"trial1_wrong"},
    {t:"check", label:"일지에 적힌 대로 쪽지를 하나씩 따져 본다", stat:"int", dc:12, need:"trialHint", pass:"trial1_pass", fail:"trial1_wrong"},
    {t:"check", label:"솥 냄새만으로 독을 감정한다", stat:"int", dc:16, hide:"trialHint", pass:"trial1_pass", fail:"trial1_wrong"}
  ]},
  trial1_wrong:{bg:"swamp", show:["witch"], fx:{dmg:"1d4", who:"all"}, lines:["솥을 엎자 달콤한 김이 피어오른다... 약초 수프였다.", "그레타가 깔깔 웃는 사이, 진짜 독 솥에서 시큼한 독기가 새어 나와 모두의 목을 긁는다!"], next:"trial1", nextLabel:"다시 생각한다"},
  trial1_pass:{bg:"swamp", show:["witch"], fx:{xp:70}, lines:["붉은 솥을 엎자 시커먼 액체가 늪으로 쏟아진다. 물고기들이 배를 뒤집고 떠오른다.", ["witch","흐음, 머리는 쓸 줄 아는구나. 참말은 초록 솥 하나뿐이었지. 독이 붉은 솥에 있으니 「여기 없다」는 참, 나머지 둘은 거짓."]], next:"trial2", nextLabel:"다음 시험"},
  trial2:{bg:"swamp", show:["witch"], lines:[
    ["witch","둘째, 팔의 시험이다."],
    "그레타가 지팡이로 늪을 가리킨다. 시커먼 물 아래로 굵은 쇠사슬 하나가 늪 바닥까지 이어져 있다.",
    ["witch","그 끝에 백 년 묵은 닻돌이 잠겨 있지. 엘다인은 혼자서 그걸 끌어올렸단다. 너희 중에도 그만한 팔뚝이 있을까?"]
  ], again:[["witch","한 번 더. 이번엔 허리로 당겨 봐."]], prompt:"누가 사슬을 당길까?", choices:[
    {t:"check", label:"사슬을 두 손으로 감아쥐고 끌어올린다", stat:"str", dc:14, pass:"trial2_pass", fail:"trial2_fail"},
    {t:"check", label:"고목 가지에 사슬을 걸어 도르래처럼 당긴다", stat:"int", dc:15, pass:"trial2_trick", fail:"trial2_fail"}
  ]},
  trial2_fail:{bg:"swamp", show:["witch"], fx:{dmg:"1d6", who:"roller"}, lines:["사슬이 손바닥을 훑고 미끄러졌다! 닻돌이 다시 늪 바닥으로 가라앉는다."], next:"trial2", nextLabel:"다시 당긴다"},
  trial2_pass:{bg:"swamp", show:["witch"], fx:{xp:70}, lines:["근육이 터질 듯 부풀고... 쿠웅! 이끼 덮인 닻돌이 늪 위로 끌려 나왔다.", ["witch","오호! 엘다인보다 낫구나. 그 녀석은 세 번 만에 했거든."]], next:"trial3", nextLabel:"마지막 시험"},
  trial2_trick:{bg:"swamp", show:["witch"], fx:{xp:70}, lines:["사슬이 고목 가지 위로 미끄러지며 닻돌이 천천히 떠오른다.", ["witch","팔 대신 머리를 썼구먼. ...뭐, 들어 올렸으면 된 거지."]], next:"trial3", nextLabel:"마지막 시험"},
  trial3:{bg:"swamp", show:["witch"], lines:[
    ["witch","마지막, 숨의 시험이다. 이 늪에서 끝까지 숨 쉬고 서 있는 자에게 방패를 주마."],
    "그레타가 늪에 초록 가루를 한 줌 뿌린다. 물이 끓어오르더니 진흙과 뼈와 썩은 뿌리가 뭉쳐 거대한 형체가 일어선다.",
    ["witch","늪지기란다. 세 번 숨 쉴 때마다 썩은 숨을 뿜지. 버텨 보렴!"]
  ], choices:[{t:"battle", label:"늪지기와 싸운다", foe:"bogkeeper", win:"trial3_win"}]},
  trial3_win:{bg:"swamp", show:["witch"], fx:{relic:"relic_shield", clear:true, xp:80}, art:{bg:"swamp", u:P2, o:"sparkle", c:[60,40,200,112]}, lines:[
    "늪지기가 무너지며 다시 진흙이 되어 늪으로 흘러내린다. 모두 숨이 턱까지 차올랐다.",
    ["witch","...오호호. 숨이 붙어 있구먼. 좋아, 약속은 약속이지."],
    "그레타가 오두막 바닥 널을 들어 올린다. 잿빛 천에 싸인 둥근 방패 — 표면에 그을린 날개 자국이 새겨져 있다.",
    ["witch","재의 방패. 용의 숨결을 반으로 꺾는단다. 누가 들지는 너희가 정해."],
    ["witch","광산의 브론 집안은 아직 망치를 놓지 않았을 게다. 그리고 외눈박이 녀석은... 낮엔 자고 밤엔 굶주린다는 걸 잊지 마라."]
  ], next:"hub", nextLabel:"방패를 챙긴다"},

  /* ---------- 드워프 광산 ---------- */
  mine_road:{bg:"mtn", lines:[
    "북쪽 산길을 오르자 바위산에 기대어 지은 돌집들이 나타난다. 드워프 광부 마을, 무쇠골이다.",
    "그런데 굴뚝에 연기가 하나도 없다. 문짝마다 붉은 손바닥 자국이 찍혀 있다. 고블린의 표식이다.",
    "길가의 빈 술통 하나가 덜컹 움직인다. 안에서 누군가 숨을 죽이고 있다."
  ], prompt:"술통 속에 누군가 있다.", choices:[
    {t:"check", label:"「해치지 않아」 하고 부드럽게 말을 건다", stat:"cha", dc:11, pass:"mine_thorin", fail:"mine_thorin_scared"},
    {t:"check", label:"다가가기 전에 술통 주변의 흔적을 살핀다", stat:"wis", dc:12, pass:"mine_thorin", fail:"mine_thorin_scared"},
    {t:"go", label:"술통 뚜껑을 확 열어젖힌다", to:"mine_thorin_scared"}
  ]},
  mine_thorin:{bg:"mtn", show:["thorin"], fx:{xp:30, flag:"mineMap"}, lines:[
    "술통 속에서 수염도 덜 난 드워프 소년이 고개를 내민다.",
    ["thorin","...사, 사람이다! 고블린인 줄 알았어요. 저는 토린이에요."],
    ["thorin","사흘 전에 고블린 대장 그라크가 마을을 쳤어요. 브론 할아버지 대장간을 털고... 모루까지 끌고 갔어요. 백 년을 대대로 쓰던 모루를요!"],
    ["thorin","할아버지는 혼자 망치를 들고 갱도로 쫓아 들어갔어요. 아직 안 나왔고요..."],
    ["thorin","이거 가져가세요. 할아버지가 그린 갱도 지도예요. 안쪽 세 갈래 갱도까지 다 그려져 있어요."]
  ], next:"mine_scouts", nextLabel:"갱도 쪽으로 오른다"},
  mine_thorin_scared:{bg:"mtn", show:["thorin"], fx:{xp:15}, lines:[
    "「으아악!」 술통에서 드워프 소년이 튀어나와 망치를 마구 휘두르다가, 일행을 보고 얼어붙는다.",
    ["thorin","...사람이네요. 죄송해요. 고블린 대장 그라크가 브론 할아버지 대장간을 털고 모루까지 가져갔어요."],
    ["thorin","할아버지는 갱도로 쫓아 들어갔어요. 제발 도와주세요!"],
    "소년은 그대로 다른 집으로 달아나 숨어 버렸다. 뭔가 더 말하려던 것 같았는데."
  ], next:"mine_scouts", nextLabel:"갱도 쪽으로 오른다"},
  mine_scouts:{bg:"mtn", show:["goblin","goblin"], lines:["마을 위쪽 비탈길. 바위 뒤에서 킥킥거리는 소리가 들린다.", "고블린 정찰병 둘이 약탈한 술통을 굴리며 놀고 있다. 아직 이쪽을 보지 못했다."], prompt:"어떻게 할까?", choices:[
    {t:"check", label:"바위 뒤로 돌아가 기습한다", stat:"dex", dc:13, pass:"mine_scouts_amb", fail:"mine_scouts_fight"},
    {t:"check", label:"고블린 말을 흉내 내 「대장이 부른다!」고 외친다", stat:"cha", dc:14, pass:"mine_scouts_trick", fail:"mine_scouts_fight"},
    {t:"battle", label:"정면으로 덤빈다", foe:"gob_scouts", win:"mine_scouts_win"}
  ]},
  mine_scouts_amb:{bg:"mtn", show:["goblin","goblin"], fx:{flag:"ambushScouts"}, lines:["그림자를 타고 등 뒤까지 다가갔다. 고블린들이 돌아보는 순간 이미 칼이 닿아 있다!"], choices:[{t:"battle", label:"기습한다!", foe:"gob_scouts", win:"mine_scouts_win"}]},
  mine_scouts_trick:{bg:"mtn", fx:{xp:60, gold:20}, lines:[["goblin","대, 대장이? 지금? 키익!"], "고블린들이 술통을 내팽개치고 갱도 쪽으로 허둥지둥 달아난다.", "굴러온 술통 안에서 금화 주머니가 나왔다. 무쇠골 사람들의 것이리라."], next:"mine_lift", nextLabel:"계속 오른다"},
  mine_scouts_fight:{bg:"mtn", show:["goblin","goblin"], lines:["자갈이 미끄러졌다! 고블린들이 녹슨 칼을 뽑아 든다."], choices:[{t:"battle", label:"싸운다", foe:"gob_scouts", win:"mine_scouts_win"}]},
  mine_scouts_win:{bg:"mtn", fx:{gold:10}, lines:["고블린들이 쓰러졌다. 녀석들 허리춤에 대장간 집게가 매달려 있다. 브론의 물건이다."], next:"mine_lift", nextLabel:"계속 오른다"},
  mine_lift:{bg:"mtn", lines:[
    "광산 대문으로 가는 길이 깊은 협곡에 한 번 끊긴다. 건너편까지 녹슨 케이블에 매달린 광차 한 대가 걸려 있다.",
    "도르래가 녹슬어 삐걱거린다. 바람이 불 때마다 협곡 아래로 돌이 굴러떨어진다."
  ], prompt:"협곡을 어떻게 건널까?", choices:[
    {t:"check", label:"도르래 손잡이를 힘껏 돌려 광차를 보낸다", stat:"str", dc:13, pass:"mine_lift_ok", fail:"mine_lift_fall"},
    {t:"check", label:"녹슨 톱니에 기름을 먹이고 제동기를 고친다", stat:"int", dc:12, pass:"mine_lift_ok", fail:"mine_lift_fall"},
    {t:"check", label:"케이블에 매달려 손으로 건넌다", stat:"dex", dc:14, pass:"mine_lift_ok", fail:"mine_lift_fall"}
  ]},
  mine_lift_ok:{bg:"mtn", fx:{xp:40}, lines:["끼이익... 광차가 협곡 위를 미끄러져 건너편에 닿았다. 발밑으로는 까마득한 어둠뿐이다."], next:"mine_gate", nextLabel:"광산 대문으로"},
  mine_lift_fall:{bg:"mtn", fx:{dmg:"1d8", who:"roller"}, art:{bg:"mtn", u:P2, o:"rocks", c:[60,40,200,112]}, lines:["케이블이 툭 끊기며 광차가 기울었다! 건너편 바위를 붙잡고 겨우 기어올랐다.", "광차는 협곡 아래로 사라졌다."], next:"mine_gate", nextLabel:"광산 대문으로"},
  mine_gate:{bg:"mtn", lines:[
    "산허리에 드워프 얼굴을 새긴 거대한 돌문이 반쯤 열려 있다. 문지방에 고블린 낙서와 깊게 패인 자국이 이어진다.",
    "무언가 무거운 걸 질질 끌고 들어간 흔적이다. 브론의 모루다."
  ], next:"war_trap", nextLabel:"갱도로 들어간다"},

  /* ---------- 고블린 갱도 ---------- */
  war_trap:{bg:"warren", lines:["갱도 안은 고블린 냄새로 가득하다. 기름 등잔이 드문드문 걸려 있고, 벽마다 붉은 손바닥이 찍혀 있다.", "발목 높이에 가는 줄이 번뜩인다. 줄 끝에는 녹슨 종이 잔뜩 매달려 있다."], prompt:"고블린의 경보 덫이다.", choices:[
    {t:"check", label:"줄을 하나하나 찾아 넘어간다", stat:"wis", dc:12, pass:"war_trap_ok", fail:"war_trap_ring"},
    {t:"check", label:"종을 손으로 감싸 쥐고 줄을 끊는다", stat:"dex", dc:13, pass:"war_trap_cut", fail:"war_trap_ring"}
  ]},
  war_trap_ok:{bg:"warren", fx:{xp:30}, lines:["숨을 죽이고 줄 사이를 넘어갔다. 종은 한 번도 울리지 않았다."], next:"war_cage", nextLabel:"안쪽으로"},
  war_trap_cut:{bg:"warren", fx:{xp:40, gold:6}, lines:["종을 감싸 쥐고 줄을 끊었다. 줄을 맨 말뚝 밑에 고블린이 숨겨 둔 동전 몇 닢까지."], next:"war_cage", nextLabel:"안쪽으로"},
  war_trap_ring:{bg:"warren", show:["goblin","goblin","goblin"], lines:["땡그랑! 종소리가 갱도를 타고 울려 퍼진다. 안쪽에서 고블린들이 우르르 몰려온다!"], choices:[{t:"battle", label:"싸운다", foe:"gob_guards", win:"war_trap_win"}]},
  war_trap_win:{bg:"warren", fx:{gold:10}, lines:["고블린들을 쓰러뜨렸다. 이제 안쪽에서도 침입자가 왔다는 걸 알 것이다. 서둘러야 한다."], next:"war_cage", nextLabel:"안쪽으로"},
  war_cage:{bg:"warren", show:["miner"], lines:["넓은 채굴장. 천장에 매달린 쇠우리 안에 드워프 광부들이 갇혀 있다. 고블린들이 저녁거리로 남겨 둔 모양이다.", ["miner","쉿! 거기 사람들! 우리 좀 꺼내 주시오. 열쇠는 대장 놈이 가지고 있소."]], prompt:"광부들을 구할까?", choices:[
    {t:"check", label:"쇠창살을 맨손으로 벌린다", stat:"str", dc:13, pass:"war_cage_free", fail:"war_cage_noise"},
    {t:"check", label:"자물쇠를 딴다", stat:"dex", dc:13, pass:"war_cage_free", fail:"war_cage_noise"},
    {t:"go", label:"꼭 돌아오겠다고 약속하고 지나간다", to:"war_cage_later"}
  ]},
  war_cage_free:{bg:"warren", show:["miner"], fx:{xp:60, flag:["grakHint","cageOpen"], potion:1}, lines:[
    "철컥! 우리 문이 열리자 광부들이 비틀거리며 내려온다.", ["miner","고맙소! 이건 우리가 신발 속에 숨겨 둔 물약이오."],
    ["miner","그라크 놈 말이오. 놈은 브론 영감의 모루를 끼고 산다오. 갱도 안쪽에서 쇠 두드리는 소리가 나거든, 거기가 놈의 굴이오."],
    "광부들은 출구 쪽으로 서둘러 사라졌다."
  ], next:"bron", nextLabel:"더 깊이"},
  war_cage_noise:{bg:"warren", show:["miner"], fx:{dmg:"1d4", who:"roller"}, lines:["끼이익— 쇠창살이 비명을 질렀다! 손을 베였지만, 다행히 고블린들은 오지 않았다.", ["miner","...문은 그대로구려. 브론 영감이 안쪽에 있소. 영감이라면 열 수 있을 거요."]], next:"bron", nextLabel:"더 깊이"},
  war_cage_later:{bg:"warren", show:["miner"], lines:[["miner","...꼭 돌아오시오. 꼭."]], next:"bron", nextLabel:"더 깊이"},
  bron:{bg:"warren", show:["dwarf"], fx:{flag:"bronMet", stagePass:true}, lines:[
    "갱도 깊은 곳, 꺼진 화덕 앞에 드워프 노인이 망치를 쥔 채 웅크리고 있다. 수염이 그을음투성이다.",
    ["dwarf","...고블린이 아니로군. 나는 브론, 무쇠골의 대장장이요."],
    ["dwarf","용살의 검을 찾으러 왔다고? 허. 내 증조부가 벼린 검이지. 바르쿠스의 비늘에 부러져 반쪽만 돌아왔소."],
    "브론이 가죽에 싼 칼날 조각을 꺼내 보인다. 부러진 단면이 아직도 희미하게 붉다.",
    ["dwarf","이걸 다시 벼리려면 용철이 필요하오. 우리 집안 모루가 바로 그 용철로 만든 거였지. 그런데 그라크 놈이..."],
    ["dwarf","놈이 모루를 깨뜨려 그 쇳조각을 제 어금니에 박아 넣었다는구려. 쇳덩이 어금니를 단 고블린이라니, 원."],
    ["dwarf","이 앞 갱도는 세 갈래요. 놈은 그중 하나에 숨어 있소. 내 다리로는 더 못 가겠구려. 놈의 어금니를 가져다주시오. 그러면 검을 벼려 주리다."],
    S => S.flags.grakHint ? "광부들의 말이 떠오른다. 쇠 두드리는 소리가 나는 갱도 — 거기가 그라크의 굴이다." : ["dwarf","...어딘가에서 내 모루 조각으로 장난질을 하고 있겠지. 쇠가 우는 소리가 들리는 것만 같구려."]
  ], next:"hub", nextLabel:"갈림 갱도를 살펴본다"},
  bron_talk:{bg:"warren", show:["dwarf"], noVote:true, lines:[["dwarf","그라크의 어금니를 가져오시오. 놈은 이 앞 세 갈래 갱도 중 하나에 있소."], S => S.flags.grakHint ? ["dwarf","광부들 말로는 쇠 두드리는 소리가 난다던가. 귀를 기울여 보시오."] : ["dwarf","놈은 훔친 쇠붙이를 두들기며 노는 걸 좋아하오. 귀를 기울여 보시오."]], next:"hub", nextLabel:"돌아간다"},
  bron_forge:{bg:"warren", show:["dwarf"], lines:[
    ["dwarf","이건... 틀림없는 용철이오! 놈의 입에서 뽑아 왔구려!"],
    "브론이 꺼진 화덕에 숯을 쏟아붓는다. 풀무가 숨을 몰아쉬자 화덕이 다시 붉게 깨어난다.",
    ["dwarf","마지막 담금질에 손이 하나 더 필요하오. 누가 망치를 들겠소?"]
  ], prompt:"누가 브론을 도울까?", choices:[
    {t:"check", label:"브론과 박자를 맞춰 망치를 내려친다", stat:"str", dc:12, pass:"forge_ok", fail:"forge_burn"},
    {t:"check", label:"뜨거운 화덕 곁에서 풀무를 끝까지 밟는다", stat:"con", dc:12, pass:"forge_ok", fail:"forge_burn"}
  ]},
  forge_ok:{bg:"warren", show:["dwarf"], fx:{relic:"relic_sword", clear:true, xp:80, flag:"secret"}, art:{bg:"warren", u:P2, o:"sparkle", c:[60,40,200,112]}, lines:[
    "땅— 땅— 땅! 망치 소리가 갱도를 울릴 때마다 부러진 칼날이 용철을 삼키며 하나로 이어진다.",
    "브론이 칼날을 물통에 꽂자, 하얀 김 속에서 붉은 문양이 깨어난다.",
    ["dwarf","용살의 검이오. 바르쿠스의 비늘도 이 날 앞에선 종잇장이지. 누가 들든, 검이 손을 고를 거요."],
    ["dwarf","그리고 하나 더. 탑 아래층에 우리 광부들이 몰래 뚫은 통로가 있소. 함정 복도를 건너뛸 수 있을 거요. 무쇠골은 이 은혜를 잊지 않겠소."]
  ], next:"hub", nextLabel:"검을 받아 든다"},
  forge_burn:{bg:"warren", show:["dwarf"], fx:{relic:"relic_sword", clear:true, xp:70, flag:"secret", dmg:"1d6", who:"roller"}, lines:[
    "치익! 튄 쇳물에 팔을 데었다. 그래도 망치는 놓지 않았다.",
    "브론이 칼날을 물통에 꽂자, 하얀 김 속에서 붉은 문양이 깨어난다.",
    ["dwarf","용살의 검이오. 데인 자국은 훈장이라 생각하시오. 누가 들든, 검이 손을 고를 거요."],
    ["dwarf","그리고 하나 더. 탑 아래층에 우리 광부들이 몰래 뚫은 통로가 있소. 함정 복도를 건너뛸 수 있을 거요."]
  ], next:"hub", nextLabel:"검을 받아 든다"},
  bron_after:{bg:"warren", show:["dwarf"], noVote:true, fx:{flag:"weakness"}, lines:[["dwarf","검은 잘 쓰고 있소? 증조부는 바르쿠스의 왼쪽 가슴을 찔렀다오. 거기만 비늘이 없거든."], ["dwarf","토린 녀석이 당신들 얘기만 하오. 살아서 돌아오시오."]], next:"hub", nextLabel:"돌아간다"},
  // the side tunnels (which one hides the chief is rolled each game)
  tun_grak:{bg:"cave", show:["grak"], lines:["쿵, 쿵, 쿵. 갱도 끝 동굴에서 쇠 두드리는 소리가 울린다.", "모닥불 옆에서 덩치 큰 고블린이 깨진 모루 위에 쇳조각을 올려놓고 망치질을 하고 있다. 입가에 붉게 달아오른 쇳덩이 어금니가 번뜩인다.", "그라크다. 아직 이쪽을 보지 못했다."], prompt:"고블린 대장 그라크다!", choices:[
    {t:"check", label:"망치 소리에 맞춰 발소리를 숨기고 뒤로 돌아간다", stat:"dex", dc:14, pass:"grak_sneak", fail:"grak_fight"},
    {t:"battle", label:"그라크에게 덤빈다", foe:"grak", win:"grak_win"},
    {t:"go", label:"일단 물러나 준비한다", to:"hub"}
  ]},
  grak_sneak:{bg:"cave", show:["grak"], fx:{flag:"grakSneak"}, lines:["쿵— 망치가 내려가는 순간 몸을 날렸다! 그라크가 비명을 지르며 돌아선다."], choices:[{t:"battle", label:"몰아친다!", foe:"grak", win:"grak_win"}]},
  grak_fight:{bg:"cave", show:["grak"], lines:[["grak","키히히! 쥐새끼가 들어왔군! 영감이 보낸 거냐?"], "그라크가 모루망치를 어깨에 걸치고 일어선다."], choices:[{t:"battle", label:"싸운다", foe:"grak", win:"grak_win"}]},
  grak_win:{bg:"cave", fx:{flag:"tusk", gold:30, xp:40}, lines:["그라크가 깨진 모루 위로 고꾸라졌다. 쇳덩이 어금니가 데굴데굴 굴러 나온다.", "손에 쥐자 묵직하고, 아직 뜨겁다. 용철이다.", "브론에게 어금니를 가져가자."], next:"hub", nextLabel:"브론에게 돌아간다"},
  tun_nest:{bg:"cave", show:["goblin","goblin","goblin"], lines:["킥킥킥... 갱도 끝 둥지에서 어린 고블린들과 그 어미가 뼈다귀를 뜯고 있다.", "둥지 한쪽에 약탈품이 산처럼 쌓여 있다. 그라크는 여기 없다."], prompt:"고블린 둥지다.", choices:[
    {t:"battle", label:"둥지를 쓸어버리고 약탈품을 되찾는다", foe:"gob_nest", win:"tun_nest_win"},
    {t:"go", label:"조용히 물러난다", to:"tun_nest_leave"}
  ]},
  tun_nest_win:{bg:"cave", fx:{flag:"nestDone", gold:25, loot:["guard_ring","sage_amulet","oak_staff","silver_dagger","pilgrim_mace","healer_robe"]}, lines:["둥지가 조용해졌다. 약탈품 더미에서 무쇠골 사람들의 물건과 쓸 만한 장비를 골라냈다."], next:"hub", nextLabel:"갈림길로 돌아간다"},
  tun_nest_leave:{bg:"cave", fx:{flag:"nestDone"}, lines:["뒷걸음질로 둥지를 빠져나왔다. 그라크가 있는 곳은 여기가 아니다."], next:"hub", nextLabel:"갈림길로 돌아간다"},
  tun_col:{bg:"cave", lines:["조용하다. 버팀목이 신음하듯 삐걱거리고, 천장에서 모래가 쉬지 않고 흘러내린다.", "안쪽 끝, 무너진 돌 틈에 광부의 상자가 깔려 있다. 그라크는 여기 없다."], prompt:"무너지기 직전의 갱도다.", choices:[
    {t:"check", label:"모래가 쏟아지기 전에 상자를 끌어낸다", stat:"dex", dc:13, pass:"tun_col_ok", fail:"tun_col_bad"},
    {t:"check", label:"버팀목을 어깨로 받치고 들어간다", stat:"str", dc:14, pass:"tun_col_ok", fail:"tun_col_bad"},
    {t:"go", label:"건드리지 않고 돌아 나온다", to:"tun_col_leave"}
  ]},
  tun_col_ok:{bg:"cave", fx:{flag:"colDone", gold:35, loot:["foreman_blade","lamp_staff","deep_cloak","saint_mace"]}, art:{bg:"cave", u:P2, o:"chest", c:[60,40,200,112]}, lines:["상자를 끌어내자마자 등 뒤에서 천장이 우르르 무너졌다!", "상자 안에는 광부들이 숨겨 둔 보물이 들어 있었다."], next:"hub", nextLabel:"갈림길로 돌아간다"},
  tun_col_bad:{bg:"cave", fx:{flag:"colDone", dmg:"2d6", who:"roller"}, art:{bg:"cave", u:P2, o:"rocks", c:[60,40,200,112]}, lines:["우르릉! 천장이 무너졌다! 상자는 돌무더기에 묻히고, 겨우 몸만 빠져나왔다."], next:"hub", nextLabel:"갈림길로 돌아간다"},
  tun_col_leave:{bg:"cave", fx:{flag:"colDone"}, lines:["살금살금 뒷걸음질로 빠져나왔다. 등 뒤에서 모래 흘러내리는 소리가 점점 커진다."], next:"hub", nextLabel:"갈림길로 돌아간다"},

  /* ---------- 외눈박이 숲 ---------- */
  eye_totem:{bg:"eyewood", lines:[
    "서쪽 숲은 다른 숲과 다르다. 나무들이 지나치게 크고, 새소리가 하나도 없다.",
    "줄기마다 커다란 외눈이 하나씩 새겨져 있다. 칼로 판 자국 위에 붉은 흙을 문질러 놓았다. 눈동자가 모두 숲 안쪽을 향하고 있다."
  ], prompt:"이상한 표식이다.", choices:[
    {t:"check", label:"표식의 뜻을 읽는다", stat:"int", dc:12, pass:"eye_totem_read", fail:"eye_totem_no"},
    {t:"check", label:"표식 주변의 흔적을 살핀다", stat:"wis", dc:12, pass:"eye_totem_track", fail:"eye_totem_no"},
    {t:"go", label:"신경 쓰지 않고 지나간다", to:"eye_totem_no"}
  ]},
  eye_totem_read:{bg:"eyewood", fx:{flag:"trollTrail", xp:30}, lines:["나무꾼들의 경고 표식이다. 눈동자가 가리키는 쪽이 「외눈이 지나간 길」.", "놈이 밤마다 오가는 길목이 이 표식을 따라 숲 안쪽으로 이어진다."], next:"eye_village", nextLabel:"표식을 따라간다"},
  eye_totem_track:{bg:"eyewood", fx:{flag:"trollTrail", xp:30}, lines:["표식 아래 땅이 깊게 패어 있다. 사람 발의 세 배는 되는 발자국이 늘 같은 길로만 오간 자국이다.", "놈이 다니는 길목을 알아냈다."], next:"eye_village", nextLabel:"발자국을 따라간다"},
  eye_totem_no:{bg:"eyewood", lines:["무슨 뜻인지 알 수 없다. 다만 새겨진 눈들이 일행을 따라 움직이는 것만 같아 등골이 서늘하다."], next:"eye_village", nextLabel:"걸음을 재촉한다"},
  eye_village:{bg:"eyewood", show:["woodcutter"], lines:[
    "나무꾼 마을 도끼골. 울타리가 통째로 뽑혀 나갔고, 오두막 두 채가 지붕째 주저앉아 있다.",
    "잿더미 사이에서 도끼를 든 여자가 일어선다. 눈 밑이 검게 꺼져 있다.",
    ["woodcutter","...사람이군요. 괴물이 아니라. 나는 도끼골의 촌장 헤일라예요."],
    ["woodcutter","외눈박이 트롤이에요. 해가 지면 숲 깊은 굴에서 나와서, 해가 뜨기 전에 돌아가요. 어젯밤에도 셋이 끌려갔어요."],
    ["woodcutter","놈의 눈구멍 하나에 초록 보석이 박혀 있어요. 밤이면 등불처럼 빛나죠. 그 빛을 똑바로 본 사람은... 다리가 굳어서 도망도 못 쳐요."],
    "진실의 눈이다. 오르나가 말한, 괴물이 삼켰다는 유물 — 그게 놈의 눈구멍에 박혀 있다."
  ], prompt:"헤일라에게 무엇을 할까?", choices:[
    {t:"check", label:"「우리가 놈을 잡겠다」며 마을 사람들의 힘을 모은다", stat:"cha", dc:12, pass:"eye_village_rally", fail:"eye_village_doubt"},
    {t:"go", label:"남은 식량과 금화를 나눠 준다", cost:15, to:"eye_village_give"},
    {t:"go", label:"놈에 대해 더 묻는다", to:"eye_village_ask"}
  ]},
  eye_village_rally:{bg:"eyewood", show:["woodcutter"], fx:{flag:"villagersHelp", xp:40}, lines:[["woodcutter","...좋아요. 밤에 싸운다면, 우리가 기름 단지와 횃불을 들고 숲가에 숨어 있을게요."], ["woodcutter","트롤은 불을 무서워해요. 불에 덴 상처는 쉽게 아물지 않거든요."]], next:"eye_marks", nextLabel:"숲 안쪽으로"},
  eye_village_doubt:{bg:"eyewood", show:["woodcutter"], lines:[["woodcutter","...다들 그렇게 말하고 굴에 들어갔어요. 아무도 안 돌아왔고요."], "마을 사람들은 고개를 돌린다. 믿음을 얻으려면 행동으로 보여 줘야 할 것 같다."], next:"eye_marks", nextLabel:"숲 안쪽으로"},
  eye_village_give:{bg:"eyewood", show:["woodcutter"], fx:{flag:"villagersHelp", luck:1, xp:30}, lines:["헤일라가 금화 주머니를 받아 들고 한참을 말이 없다.", ["woodcutter","...밤에 싸울 거라면 말해요. 우리도 횃불 정도는 던질 수 있어요."]], next:"eye_marks", nextLabel:"숲 안쪽으로"},
  eye_village_ask:{bg:"eyewood", show:["woodcutter"], fx:{flag:"trollLore", xp:20}, lines:[
    ["woodcutter","놈은 해가 무서운 게 아니라, 해 아래선 잠이 쏟아지는 거예요. 낮의 굴에선 곯아떨어져 있죠. 대신 작은 소리에도 깨요."],
    ["woodcutter","굴 안쪽엔 이끼 웅덩이가 있어요. 놈이 상처를 담그는 곳... 거기선 상처가 순식간에 아문대요."],
    ["woodcutter","밤의 놈은 달라요. 굶주려서 미쳐 날뛰죠. 그래도 숲이라면 우리가 도울 수 있어요."]
  ], next:"eye_marks", nextLabel:"숲 안쪽으로"},
  eye_marks:{bg:"eyewood", lines:["숲이 점점 어두워진다. 나무껍질에 깊은 발톱 자국, 바닥엔 뜯겨 나간 도끼 자루.", "길 한복판에 거대한 발자국이 이어지고, 그 위로 끈적한 초록 피가 점점이 떨어져 있다."], prompt:"흔적을 따라가 볼까?", choices:[
    {t:"go", label:"표식이 가리키던 길목을 확인한다", need:"trollTrail", to:"eye_marks_known"},
    {t:"check", label:"발자국과 핏자국을 끝까지 따라간다", stat:"wis", dc:12, hide:"trollTrail", pass:"eye_marks_ok", fail:"eye_marks_lost"},
    {t:"go", label:"흔적은 무시하고 숲 안쪽으로 간다", to:"eye_marks_lost"}
  ]},
  eye_marks_ok:{bg:"eyewood", fx:{flag:"trollTrail", xp:30}, lines:["핏자국은 숲 한가운데 바위 언덕의 굴로 이어진다. 굴 앞 땅이 반들반들하다 — 매일 밤 같은 길로 드나드는 것이다.", "매복하기 좋은 좁은 길목도 눈에 띈다."], next:"eye_choice", nextLabel:"굴 앞으로"},
  eye_marks_known:{bg:"eyewood", fx:{xp:20}, lines:["나무꾼들의 표식이 가리키던 그대로다. 굴 입구, 그리고 놈이 매일 밤 지나는 좁은 길목. 덫을 놓기엔 그만이다."], next:"eye_choice", nextLabel:"굴 앞으로"},
  eye_marks_lost:{bg:"eyewood", lines:["흔적이 이끼 사이로 끊겼다. 그래도 숲 안쪽에서 비릿한 냄새가 짙어진다. 놈의 굴이 가깝다."], next:"eye_choice", nextLabel:"굴 앞으로"},
  eye_choice:{bg:"eyewood", cardView:true, lines:[
    "숲의 심장. 바위 언덕 아래 시커먼 굴이 입을 벌리고 있다. 안에서 땅이 울리는 듯한 코골이가 들린다.",
    "해는 서쪽으로 기울기 시작했다. 지금 들어갈 것인가, 밤을 기다릴 것인가."
  ], prompt:"언제 칠까?", choices:[
    {t:"go", label:"낮: 지금 굴로 쳐들어간다", to:"tc_bones", desc:"장점 — 놈은 잠들어 있다. 들키지 않고 다가가면 기습으로 시작한다. 굴엔 놈이 모아 둔 보물도. 단점 — 뼈 무덤과 박쥐 떼를 지나야 하고, 소리를 두 번 내면 놈이 깬다. 이끼 웅덩이 곁이라 상처가 더 빨리 아문다.", img:{bg:"trollcave", u:[["eyetroll",120]], c:[40,46,132,99]}},
    {t:"go", label:"밤: 숲에 숨어 놈이 나오길 기다린다", to:"night_prep", desc:"장점 — 굴을 지날 필요가 없다. 길목에 덫을 놓을 수 있고, 마을 사람들이 도울 수도 있다. 단점 — 굶주린 밤의 트롤은 사납다(명중 +2, 체력 더 많음). 놈의 눈빛이 다리를 굳게 만든다.", img:{bg:"eyewood_n", u:[["eyetroll",120]], c:[40,46,132,99]}}
  ]},
  night_prep:{bg:"eyewood_n", lines:[
    "일행은 굴이 내려다보이는 덤불에 몸을 숨겼다. 해가 지고, 숲이 검게 가라앉는다.",
    S => S.flags.villagersHelp ? "숲가에서 헤일라와 나무꾼들이 기름 단지를 안고 숨을 죽인다. 횃불 신호만 기다리고 있다." : "숲은 쥐 죽은 듯 조용하다. 나무꾼들은 오지 않았다.",
    "놈이 나오기 전에, 할 수 있는 일은 하나뿐이다."
  ], prompt:"무엇을 준비할까?", choices:[
    {t:"check", label:"표식이 가리킨 길목에 사냥 덫을 묻는다", stat:"wis", dc:10, need:"trollTrail", pass:"night_trap", fail:"night_noise"},
    {t:"check", label:"놈이 지날 만한 곳을 짐작해 덫을 묻는다", stat:"wis", dc:14, hide:"trollTrail", pass:"night_trap", fail:"night_noise"},
    {t:"check", label:"기름 먹인 덤불로 불 함정을 만든다", stat:"int", dc:12, pass:"night_fire", fail:"night_noise"},
    {t:"go", label:"괜히 움직이지 말고 숨어서 기다린다", to:"night_wait"}
  ]},
  night_trap:{bg:"eyewood_n", fx:{flag:"nightTrap", xp:30}, lines:["쇠 이빨 덫을 낙엽 아래 묻었다. 놈의 발이 저기 닿기만 하면."], next:"night_troll", nextLabel:"기다린다"},
  night_fire:{bg:"eyewood_n", fx:{flag:"nightFire", xp:30}, lines:["기름 먹인 덤불을 길목에 둘렀다. 불씨 하나면 길목 전체가 타오를 것이다."], next:"night_troll", nextLabel:"기다린다"},
  night_noise:{bg:"eyewood_n", lines:["준비하다가 마른 가지를 부러뜨렸다. 굴 안의 코골이가 뚝 멎는다...", "...한참 뒤에야 다시 이어진다. 함정은 반쯤 만들다 말았다."], next:"night_troll", nextLabel:"기다린다"},
  night_wait:{bg:"eyewood_n", lines:["숨을 죽이고 기다린다. 풀벌레 소리마저 끊긴 숲. 심장 소리만 크게 들린다."], next:"night_troll", nextLabel:"기다린다"},
  night_troll:{bg:"eyewood_n", show:["eyetroll"], lines:[
    "자정. 굴 안에서 무언가 몸을 일으키는 소리. 땅이 울린다.",
    "어둠 속에 초록빛 외눈 하나가 떠오른다. 이끼와 뼈를 걸친 거대한 트롤 — 고르그가 킁킁거리며 바람 냄새를 맡는다.",
    S => S.flags.nightTrap ? "쩍! 고르그의 발이 덫을 밟았다! 쇠 이빨이 발목을 물고 놓지 않는다!" : null,
    S => S.flags.nightFire ? "기름 냄새에 고르그가 멈칫하는 순간, 불씨가 던져졌다! 길목이 화르륵 타오른다!" : null,
    S => S.flags.villagersHelp ? "「지금이야!」 숲가에서 횃불과 기름 단지가 날아든다. 고르그의 등이 불길에 휩싸인다!" : null,
    ["eyetroll","크르르... 고기... 냄새... 많다..."],
    "외눈이 일행을 향한다. 초록 빛이 닿자 다리가 돌처럼 무거워진다."
  ], prompt:"외눈의 빛이 일행을 붙잡는다!", choices:[
    {t:"check", label:"눈을 피하고 정신을 다잡는다", stat:"wis", dc:13, pass:"night_gaze_ok", fail:"night_gaze_bad"}
  ]},
  night_gaze_ok:{bg:"eyewood_n", show:["eyetroll"], lines:["고개를 숙이고 이를 악물었다. 굳어 가던 다리에 다시 피가 돈다!"], choices:[{t:"battle", label:"고르그와 싸운다", foe:"gorg_night", win:"troll_win_night"}]},
  night_gaze_bad:{bg:"eyewood_n", show:["eyetroll"], fx:{dmg:"2d6", who:"roller"}, lines:["눈빛에 붙잡힌 순간, 고르그의 주먹이 날아들었다!"], choices:[{t:"battle", label:"고르그와 싸운다", foe:"gorg_night", win:"troll_win_night"}]},
  troll_win_night:{bg:"eyewood_n", fx:{relic:"relic_eye", clear:true, xp:60, gold:30, potion:1}, art:{bg:"eyewood_n", u:P2, o:"sparkle", c:[60,40,200,112]}, lines:[
    "고르그가 비틀거리다 쓰러진다. 숲 전체가 울릴 만큼 무거운 소리.",
    "외눈 구멍에서 초록빛 보석이 굴러 나온다. 손에 쥐는 순간, 어둠 속 나뭇잎 하나하나가 대낮처럼 선명해진다.",
    "진실의 눈. 숨은 것과 거짓을 꿰뚫어 보는 유물이다.",
    S => S.flags.villagersHelp ? "횃불을 든 나무꾼들이 하나둘 숲에서 걸어 나온다. 누군가 울음을 터뜨린다. 헤일라가 일행의 손을 꽉 잡는다." : "멀리서 닭 우는 소리가 들린다. 도끼골에 처음으로 무사한 아침이 오고 있다.",
    ["woodcutter","...고마워요. 얼마 안 되지만, 마을이 모은 거예요."]
  ], next:"hub", nextLabel:"보석을 챙긴다"},

  /* ---------- 트롤 굴 (낮) ---------- */
  tc_bones:{bg:"trollcave", lines:["굴 입구부터 뼈가 발목까지 쌓여 있다. 사슴, 멧돼지... 그리고 사람의 것도.", "안쪽에서 땅을 울리는 코골이가 일정하게 들린다. 뼈를 밟아 소리를 내면 끝이다.", ["sys","소음 0/2 — 소리를 두 번 내면 트롤이 깬다."]], prompt:"뼈 무덤을 지나야 한다.", choices:[
    {t:"check", label:"뼈 사이 빈틈만 골라 디딘다", stat:"dex", dc:13, pass:"tc_bones_ok", fail:"tc_bones_noise"},
    {t:"check", label:"코골이 박자에 맞춰 한 걸음씩 옮긴다", stat:"wis", dc:12, pass:"tc_bones_ok", fail:"tc_bones_noise"}
  ]},
  tc_bones_ok:{bg:"trollcave", fx:{xp:30}, lines:["숨소리 하나 내지 않고 뼈 무덤을 건넜다. 코골이는 그대로다."], next:"tc_bats", nextLabel:"안쪽으로"},
  tc_bones_noise:{bg:"trollcave", fx:{inc:"noise", dmg:"1d4", who:"roller"}, lines:["와지끈! 갈비뼈 하나가 발밑에서 부러지며 날카로운 조각이 발목을 긁었다. 코골이가 뚝 멈춘다...", "...한참 뒤, 다시 코골이가 이어진다. 휴.", noiseLine], next:"tc_bats", nextLabel:"안쪽으로"},
  tc_bats:{bg:"trollcave", show:["bat","bat","bat"], lines:["천장이 낮아지는 곳. 수백 마리의 박쥐가 거꾸로 매달려 날개를 접고 있다.", "횃불 빛이 닿자 몇 마리가 꿈틀거린다. 한꺼번에 날아오르면, 그 소리에 놈이 깰지도 모른다."], prompt:"박쥐 둥지 아래를 지나야 한다.", choices:[
    {t:"check", label:"횃불을 낮추고 숨죽여 지나간다", stat:"dex", dc:13, pass:"tc_bats_ok", fail:"tc_bats_wake"},
    {t:"check", label:"횃불을 망토로 가리고 어둠 속을 더듬어 간다", stat:"int", dc:12, pass:"tc_bats_ok", fail:"tc_bats_wake"},
    {t:"battle", label:"박쥐 떼를 쳐서 쫓아낸다 (소음 +1)", foe:"bats", win:"tc_bats_win"}
  ]},
  tc_bats_ok:{bg:"trollcave", fx:{xp:40}, lines:["박쥐들은 날개를 한 번 떨었을 뿐, 다시 잠들었다."], next:"tc_pool", nextLabel:"안쪽으로"},
  tc_bats_wake:{bg:"trollcave", show:["bat","bat","bat"], fx:{inc:"noise"}, lines:["푸드드득! 박쥐 떼가 한꺼번에 날아오른다! 날카로운 울음소리가 굴을 가득 메운다.", noiseLine], choices:[{t:"battle", label:"쫓아낸다", foe:"bats", win:"tc_bats_done"}]},
  tc_bats_win:{bg:"trollcave", fx:{inc:"noise", gold:5}, lines:["박쥐들을 쫓아냈다. 하지만 날갯짓 소리가 굴 안쪽까지 울렸다.", noiseLine], next:"tc_pool", nextLabel:"안쪽으로"},
  tc_bats_done:{bg:"trollcave", lines:["마지막 박쥐가 어둠 속으로 사라졌다."], next:"tc_pool", nextLabel:"안쪽으로"},
  tc_pool:{bg:"trollcave", lines:[
    "굴 안쪽, 천장 틈으로 한 줄기 빛이 떨어지는 곳에 초록빛으로 빛나는 이끼 웅덩이가 있다.",
    S => S.flags.trollLore ? "헤일라가 말한 웅덩이다. 물 위에 트롤의 털과 핏자국이 떠 있다." : "물 위에 트롤의 털과 핏자국이 떠 있다. 이끼에서 비릿한 생명력이 느껴진다. 이 곁에선 무엇이든 빨리 아물 것 같다."
  ], prompt:"웅덩이를 어떻게 할까?", choices:[
    {t:"check", label:"돌과 흙을 밀어 넣어 웅덩이를 메운다", stat:"str", dc:13, pass:"tc_pool_fill", fail:"tc_pool_noise"},
    {t:"check", label:"이끼 뿌리를 긁어내 웅덩이의 힘을 끊는다", stat:"int", dc:13, pass:"tc_pool_fill", fail:"tc_pool_noise"},
    {t:"go", label:"건드리지 않고 지나간다", to:"tc_pool_skip"}
  ]},
  tc_pool_fill:{bg:"trollcave", fx:{flag:"poolSpoiled", xp:40}, lines:["이끼의 빛이 하나둘 꺼진다. 웅덩이는 이제 그저 흙탕물이다.", "놈의 상처가 예전처럼 빨리 아물지는 못할 것이다."], next:"tc_troll", nextLabel:"가장 깊은 곳으로"},
  tc_pool_noise:{bg:"trollcave", fx:{inc:"noise"}, lines:["첨벙! 돌덩이가 물에 떨어지며 큰 소리가 울렸다. 이끼는 여전히 빛난다.", noiseLine], next:"tc_troll", nextLabel:"가장 깊은 곳으로"},
  tc_pool_skip:{bg:"trollcave", lines:["웅덩이를 지나쳐 더 깊이 들어간다. 초록 빛이 등 뒤에서 일렁인다."], next:"tc_troll", nextLabel:"가장 깊은 곳으로"},
  tc_troll:{bg:"trollcave", show:["eyetroll"], lines:[
    "굴 가장 깊은 곳. 약탈품과 뼈 더미 위에 산만 한 트롤이 엎어져 자고 있다.",
    "눈구멍에 박힌 보석이 감긴 눈꺼풀 너머로 초록빛을 흘린다. 진실의 눈이다.",
    S => (+S.flags.noise || 0) >= 2 ? "...그런데 코골이가 들리지 않는다. 외눈이 번쩍 뜨인다!" : "코골이가 일정하다. 아직 깊이 잠들어 있다.",
    S => (+S.flags.noise || 0) >= 2 ? ["eyetroll","크르르... 시끄러운... 쥐새끼들..."] : null
  ], prompt:"고르그를 친다!", choices:[{t:"battle", label:"고르그에게 덤빈다", foe:"gorg_day", win:"troll_win_day"}]},
  troll_win_day:{bg:"trollcave", fx:{relic:"relic_eye", clear:true, xp:60, gold:60, loot:["foreman_blade","deep_cloak","lamp_staff","saint_mace","guard_ring","sage_amulet"]}, art:{bg:"trollcave", u:P2, o:"sparkle", c:[60,40,200,112]}, lines:[
    "고르그가 뼈 더미 위로 무너진다. 굴 전체가 흔들린다.",
    "외눈 구멍에서 초록빛 보석이 굴러 나온다. 손에 쥐는 순간, 어둠 속 돌멩이 하나하나가 대낮처럼 선명해진다.",
    "진실의 눈. 숨은 것과 거짓을 꿰뚫어 보는 유물이다.",
    "트롤이 깔고 자던 약탈품 더미에서 쓸 만한 물건들이 쏟아져 나왔다."
  ], next:"hub", nextLabel:"굴을 나선다"}
});

/* ---------- where things stand along each road ---------- */
Object.assign(STAGES, {
  swamp:[{node:"bog_enter", x:170, mark:"?"}, {node:"bog_pilgrim", x:330, mark:"?"}, {node:"bog_leech", x:470, spr:"leech", n:3, sil:1, mark:"!"}, {node:"bog_gate", x:"end", fork:"뿌리 굴 입구"}],
  roots:[{node:"root_maze", x:170, mark:"?"}, {node:"root_wraith", x:330, spr:"wraith", n:2, sil:1, mark:"!"}, {node:"root_spore", x:470, mark:"?"}, {node:"greta", x:590, spr:"witch", mark:"?"}],
  mine:[{node:"mine_road", x:170, mark:"?"}, {node:"mine_scouts", x:330, spr:"goblin", n:2, sil:1, mark:"!"}, {node:"mine_lift", x:480, mark:"?"}, {node:"mine_gate", x:"end", fork:"광산 대문"}],
  warren:[{node:"war_trap", x:170, mark:"?", spr:"trapjaw"}, {node:"war_cage", x:320, mark:"?"}, {node:"bron", x:470, spr:"dwarf", mark:"?"}],
  eyewood:[{node:"eye_totem", x:170, mark:"?"}, {node:"eye_village", x:330, spr:"woodcutter", mark:"?"}, {node:"eye_marks", x:480, mark:"?"}, {node:"eye_choice", x:"end", fork:"숲의 심장"}],
  trollcave:[{node:"tc_bones", x:170, mark:"?"}, {node:"tc_bats", x:320, spr:"bat", n:3, sil:1, mark:"!"}, {node:"tc_pool", x:470, mark:"?"}, {node:"tc_troll", x:556, spr:"eyetroll", sil:1, mark:"!"}]
});
// what the narrator says about an area while its task is still open
AREAS[AREA_I("warren")].hint = () => S.flags.bronMet && !S.flags.relic_sword ? (S.flags.tusk ? "용철 어금니를 손에 넣었다. 브론에게 가져가자." : "세 갈래 갱도 어딘가에 그라크가 숨어 있다. 갱도 입구 앞에서 귀를 기울여 보자.") : "";
const TUNNELS = {
  grak:{node:"tun_grak", done:"tusk", desc:"안쪽 깊은 곳에서 희미하게 쿵, 쿵, 쇠를 두드리는 소리가 울린다. 바닥에 굵은 발자국이 찍혀 있다."},
  nest:{node:"tun_nest", done:"nestDone", desc:"킥킥대는 소리와 코를 찌르는 지린내. 작은 발자국이 수십 개 찍혀 있다."},
  collapse:{node:"tun_col", done:"colDone", desc:"쥐 죽은 듯 조용하다. 버팀목이 삐걱거리고, 천장에서 모래가 흘러내린다."}
};
Object.assign(POI_AT, {
  greta:{x:590, name:"그레타의 오두막", spr:"witch", npc:1, desc:"오두막 앞에서 그레타가 솥을 젓는다. 「또 왔느냐? 거래가 남았나 보지?」"},
  bron:{x:470, name:"대장장이 브론", spr:"dwarf", npc:1, desc:"꺼진 화덕 앞에서 브론이 부러진 칼날을 닦고 있다."},
  tun0:{x:TUN_X[0], por:"den"}, tun1:{x:TUN_X[1], por:"den"}, tun2:{x:TUN_X[2], por:"den"},
  haila:{x:360, name:"도끼골 촌장 헤일라", spr:"woodcutter", npc:1, desc:"헤일라가 무너진 오두막을 다시 세우고 있다. 「당신들 덕에 처음으로 밤에 잠을 잤어요.」"}
});
regionHub.push((a, w, ch) => {
  if (a.id === "roots" && S.flags.relic_shield) ch.push({t:"go", to:"witch", poi:"greta", label:"그레타와 거래한다"});
  if (a.id === "warren" && S.flags.bronMet){
    if (S.flags.tusk && !S.flags.relic_sword) ch.push({t:"go", to:"bron_forge", poi:"bron", label:"그라크의 어금니를 건넨다"});
    else ch.push({t:"go", to:S.flags.relic_sword ? "bron_after" : "bron_talk", poi:"bron", label:"브론과 이야기한다", pd:S.flags.relic_sword ? "다시 불이 붙은 화덕 앞에서 브론이 콧노래를 흥얼거린다." : undefined});
    ((S.loot || {}).tunnels || []).forEach((kind, i) => { const T = TUNNELS[kind]; if (S.flags[T.done]) return;
      ch.push({t:"go", to:T.node, poi:"tun" + i, pn:`${["첫째","둘째","셋째"][i]} 갈림 갱도`, pd:T.desc + (kind === "collapse" && S.flags.mineMap ? " 토린이 준 지도에는 이 갱도에 「무너짐 — 위험」이라고 적혀 있다." : ""), label:"갱도로 들어간다"}); });
  }
  if (a.id === "eyewood" && S.flags.relic_eye) ch.push({t:"go", to:"haila_talk", poi:"haila", label:"헤일라와 이야기한다"});
});
NODES.haila_talk = {bg:"eyewood", show:["woodcutter"], noVote:true, lines:[["woodcutter","도끼골은 다시 일어설 거예요. 당신들 이름은 여기 나무마다 새길게요. 외눈 대신에."], ["woodcutter","탑으로 간다면... 그 보석이 길을 비춰 줄 거예요. 놈은 그걸로 밤을 봤으니까."]], next:"hub", nextLabel:"돌아간다"};
Object.assign(window.__dbg, {BGS, STAGES, AREAS, gainRelic, relicCount, scene, PixelScene, spr, walkInput:o => walkInput(o), startWalk:() => startWalk(), POI:() => buildPois(), fakeDice:null});
