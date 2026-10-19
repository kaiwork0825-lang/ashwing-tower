/* ================= WALKING (Darkest Dungeon style side-scrolling) =================
   In every area the party walks a long strip left and right. Things to do stand along the way (POIs):
   merchants, the bounty board, search spots, dungeon doors and the exits at both ends.
   Walking up to one shows its actions in the dialog box. An area's story event waits ahead as a
   dark silhouette — reaching it starts the event, and the path beyond opens only once it is done.
   Online: the host owns the position. Anyone may walk the party; guests send their input and
   predict the movement locally so it stays smooth. */

/* ---------- props ---------- */
Object.assign(SPRITE_DEFS, {
  cache:{p:{b:"#61291a", B:"#82341c", d:"#2e1712", s:"#a2a3ac", y:"#fff0b0", g:"#2f5e3e"}, em:["y"], g:[
    "........y.....",
    ".......yyy....",
    "........y.....",
    "..dddddddddd..",
    "..dBBBBBBBBd..",
    "..dBbbbbbbBd..",
    "..ddddsddddd..",
    "..dBBBsBBBBd..",
    "..dBbbbbbbBd..",
    "..dBBBBBBBBd..",
    "gddddddddddddg"]},
  den:{p:{s:"#6a6c78", S:"#3d3f4a", k:"#07090f", m:"#2f5e3e", e:"#e04a3c"}, em:["e"], flat:["k"], g:[
    "......ssssssss......",
    "....ssSSSSSSSSss....",
    "...sSSkkkkkkkkSSs...",
    "..sSSkkkkkkkkkkSSs..",
    "..sSkkkkkkkkkkkkSs..",
    ".sSSkkkkkkkkkkkkSSs.",
    ".sSkkkkkkkkkkkkkkSs.",
    ".sSkkkkekkkkekkkkSs.",
    ".sSkkkkkkkkkkkkkkSs.",
    ".sSkkkkkkkkkkkkkkSs.",
    ".sSkkkkkkkkkkkkkkSs.",
    ".sSkkkkkkkkkkkkkkSs.",
    "ssSkkkkkkkkkkkkkkSss",
    "sSSkkkkkkkkkkkkkkSSs",
    "mmSSmkkkkkkkkkkmSSmm"]},
  sign:{p:{w:"#61291a", W:"#82341c", d:"#452017", t:"#dfe6d6"}, g:[
    ".wwwwwwwww...",
    "wWWWWWWWWWw..",
    "wWtttttttWWw.",
    "wWWWWWWWWWWWw",
    "wWtttttWWWWw.",
    "wWWWWWWWWWw..",
    ".wwwwwwwww...",
    ".....dd......",
    ".....dd......",
    ".....dd......",
    ".....dd......",
    ".....dd......",
    "....dddd....."]}
});

SPR_SCALE.den = 2;
/* ---------- the village street (one 960px picture, no tiling) ---------- */
BGS.village = {w:960, ground:156, amb:[0.3,0.38,0.56], shadowFrom:1,
  lights:[{x:120,y:40,r:170,c:[0.2,0.28,0.42],f:0}, {x:211,y:138,r:96,c:[1.5,0.72,0.32],f:0.3}, {x:338,y:128,r:36,c:[1.1,0.75,0.4],f:0.1},
    {x:552,y:112,r:84,c:[0.55,0.62,1.15],f:0.12}, {x:604,y:104,r:46,c:[0.55,1.1,1.1],f:0.3},
    {x:737,y:120,r:62,c:[1.35,0.78,0.38],f:0.16}, {x:779,y:120,r:62,c:[1.35,0.78,0.38],f:0.16}, {x:812,y:96,r:72,c:[1.1,0.72,0.4],f:0.06},
    {x:921,y:116,r:54,c:[1.3,0.8,0.4],f:0.14}, {x:110,y:126,r:30,c:[1.1,0.75,0.4],f:0.08}],
  draw(fb, r){
    const W = fb.w, B = 148;
    fb.vgrad(0, 132, ["#07090f","#0c111c","#121a29","#1f2f45","#283d55"]);
    for (let i=0;i<190;i++) fb.px(Math.floor(r()*W), Math.floor(r()*96), r() < 0.2 ? "#dfe6d6" : "#557887", r() < 0.3 ? 1 : 0);
    for (let y=-9;y<=9;y++){ const w = Math.floor(Math.sqrt(81-y*y)); fb.rect(120-w, 40+y, w*2, 1, "#dfe6d6", 1, 1); }
    fb.rect(116,36,4,3,"#b6cbc0",1,1); fb.rect(123,44,3,2,"#b6cbc0",1,1);
    // far hills, and the ash tower on the horizon — where the road leads
    for (let x=0;x<W;x++){ const h = 16 + Math.round(Math.sin(x/61)*7 + Math.sin(x/19 + 1)*3); fb.rect(x, 126 - h, 1, h + 6, "#121a29"); }
    fb.rect(893,58,12,52,"#0c111c"); fb.rect(889,54,20,5,"#0c111c"); for (let k=0;k<4;k++) fb.rect(889 + k*6, 50, 3, 4, "#0c111c"); fb.rect(897,64,4,5,"#e04a3c",1,1);
    for (let x=-8;x<W+8;x+=15) pine(fb, x + Math.floor(r()*7), 136, 18 + Math.floor(r()*16), "#0c111c");
    // cobbled street
    fb.rect(0, B - 2, W, SH - B + 2, "#1f2f45"); fb.rect(0, B - 2, W, 1, "#344e66");
    for (let y=B; y<SH; y+=6) for (let x = ((y/6)%2)*6 - 6; x < W; x += 12) fb.rect(x, y, 11, 5, r() < 0.5 ? "#283d55" : "#182337");
    const roof = (cx, top, hw, h, c1, c2) => { for (let y=0;y<h;y++){ const w = Math.round(hw*(y+1)/h); fb.rect(cx - w, top - h + y, w*2, 1, y % 3 === 2 ? c2 : c1); } };
    const win = (x, y, lit) => { fb.rect(x-1, y-1, 10, 11, "#1c0f0c"); fb.rect(x, y, 8, 9, lit ? "#ffd678" : "#182337", 1, lit ? 1 : 0); if (lit) fb.rect(x, y+6, 8, 3, "#fbb954", 1, 1); fb.rect(x+3, y, 2, 9, "#452017"); fb.rect(x, y+4, 8, 1, "#452017"); };
    const timber = (x, y, w, h, wall, beam) => { fb.rect(x, y, w, h, wall); fb.rect(x, y, w, 2, beam); fb.rect(x, y + h - 2, w, 2, beam); for (let k=x; k<x+w; k+=14) fb.rect(k, y, 2, h, beam); fb.rect(x+w-2, y, 2, h, beam); };
    const door = (x, w, h, c) => { fb.rect(x-1, B - h - 1, w + 2, h + 1, "#1c0f0c"); fb.rect(x, B - h, w, h, c || "#452017"); fb.rect(x + Math.floor(w/2), B - h, 1, h, "#2e1712"); fb.px(x + w - 3, B - Math.floor(h/2), "#fbb954"); };
    // west palisade
    for (let x=0;x<58;x+=6){ const h = 40 + (x % 12 ? 0 : 4); fb.rect(x, B - h, 5, h, "#2e1712"); fb.rect(x+1, B - h, 1, h, "#452017"); fb.rect(x+1, B - h - 2, 3, 2, "#2e1712"); }
    fb.rect(0, B - 30, 58, 3, "#1c0f0c");
    // cottage
    timber(66, 112, 60, 36, "#344e66", "#2e1712"); roof(96, 112, 38, 22, "#4a1420", "#2e1712"); win(76, 122, false); win(106, 122, true); door(92, 10, 16);
    // smithy: stone, forge mouth, anvil, chimney
    bricks(fb, 150, 104, 150, 44, 10, 5, "#3d3f4a", "#283d55", r);
    roof(225, 104, 84, 22, "#283d55", "#182337");
    fb.rect(170, 62, 14, 30, "#3d3f4a"); fb.rect(168, 60, 18, 4, "#283d55");
    for (let y=112; y<B; y++){ const tt = y < 124 ? Math.sqrt(Math.max(0, 1 - ((124 - y)/12)**2)) : 1; const w = Math.round(22*tt); fb.rect(211 - w, y, w*2, 1, "#0c111c"); }
    fb.rect(192, 140, 38, 8, "#2e1712"); fb.rect(194, 138, 34, 2, "#452017");
    fb.rect(256, 140, 22, 4, "#6a6c78"); fb.rect(256, 140, 22, 1, "#a2a3ac"); fb.rect(252, 140, 5, 2, "#6a6c78"); fb.rect(262, 144, 10, 4, "#3d3f4a"); fb.rect(258, 148, 18, 3, "#3d3f4a");
    win(160, 118, true); win(276, 114, false);
    fb.rect(286, 98, 18, 2, "#2e1712"); fb.rect(302, 98, 2, 6, "#2e1712"); fb.rect(292, 104, 18, 14, "#61291a"); fb.rect(292, 104, 18, 1, "#82341c");
    fb.rect(296, 107, 10, 3, "#a2a3ac"); fb.rect(300, 110, 2, 6, "#82341c");
    // small house
    timber(316, 116, 48, 32, "#283d55", "#1c0f0c"); roof(340, 116, 30, 18, "#61291a", "#2e1712"); win(334, 124, true); door(320, 9, 15);
    // bounty board
    fb.rect(388, 114, 3, 34, "#2e1712"); fb.rect(409, 114, 3, 34, "#2e1712");
    fb.rect(382, 110, 36, 3, "#452017"); fb.rect(380, 108, 40, 2, "#61291a");
    fb.rect(384, 114, 32, 20, "#61291a"); fb.rect(384, 114, 32, 1, "#82341c");
    [[387,117,7,6,"#dfe6d6"],[396,116,8,7,"#b6cbc0"],[406,118,7,5,"#dfe6d6"],[389,125,9,6,"#e04a3c"],[401,125,8,6,"#dfe6d6"]].forEach(([x,y,w,h,c]) => { fb.rect(x,y,w,h,c); fb.px(x + (w>>1), y, "#a6441f"); });
    // well
    fb.rect(442, 136, 22, 12, "#3d3f4a"); fb.rect(442, 136, 22, 2, "#6a6c78"); for (let x=444;x<462;x+=5) fb.rect(x, 140, 1, 8, "#283d55");
    fb.rect(443, 114, 2, 22, "#452017"); fb.rect(461, 114, 2, 22, "#452017"); roof(453, 114, 14, 6, "#61291a", "#2e1712");
    fb.rect(452, 116, 1, 10, "#a2a3ac"); fb.rect(450, 126, 5, 4, "#61291a");
    // magic shop: violet walls, tall roof, round window, banners
    fb.rect(486, 98, 132, 50, "#3a2850"); for (let y=101;y<B;y+=6) fb.rect(486, y, 132, 1, "#241a33"); fb.rect(486, 98, 132, 3, "#241a33");
    roof(552, 98, 74, 30, "#5c3f72", "#3a2850"); fb.rect(550, 56, 4, 14, "#5c3f72"); fb.px(551, 54, "#b6cbc0", 1);
    for (let y=-6;y<=6;y++){ const w = Math.floor(Math.sqrt(36-y*y)); fb.rect(552-w, 108+y, w*2, 1, "#b6cbc0", 1, 1); } fb.rect(551, 102, 2, 13, "#5c3f72"); fb.rect(546, 108, 13, 1, "#5c3f72");
    door(545, 14, 22, "#241a33");
    [500, 588].forEach(x => { fb.rect(x-1, 113, 12, 18, "#241a33"); fb.rect(x, 114, 10, 16, "#6e9198", 1, 1); fb.rect(x+4, 114, 2, 16, "#3a2850"); fb.rect(x, 121, 10, 1, "#3a2850"); });
    [520, 574].forEach(x => { fb.rect(x, 100, 9, 22, "#283d55"); for (let k=0;k<3;k++) fb.px(x + 2 + k*2, 106 + k*4, "#ffd678", 1); fb.rect(x, 122, 3, 3, "#283d55"); fb.rect(x + 6, 122, 3, 3, "#283d55"); });
    fb.rect(596, 94, 20, 2, "#2e1712"); fb.rect(604, 96, 1, 4, "#6a6c78");
    // cottage
    timber(628, 114, 48, 34, "#344e66", "#2e1712"); roof(652, 114, 30, 18, "#4a1420", "#2e1712"); win(646, 124, false);
    // the inn 「꺼진 화로」: two storeys, warm windows, lanterns, chimney
    timber(688, 82, 178, 66, "#61291a", "#2e1712"); fb.rect(688, 114, 178, 3, "#2e1712");
    roof(777, 82, 100, 26, "#7a1f2a", "#4a1420");
    fb.rect(830, 40, 14, 30, "#3d3f4a"); fb.rect(828, 38, 18, 4, "#283d55");
    [700, 724, 798, 822, 846].forEach(x => win(x, 90, true)); win(760, 90, false);
    [704, 806, 832].forEach(x => { fb.rect(x-1, 121, 18, 15, "#1c0f0c"); fb.rect(x, 122, 16, 13, "#ffd678", 1, 1); fb.rect(x, 131, 16, 4, "#fbb954", 1, 1); fb.rect(x+7, 122, 2, 13, "#452017"); fb.rect(x, 128, 16, 1, "#452017"); });
    door(750, 14, 24, "#452017"); fb.rect(748, B - 26, 18, 2, "#2e1712");
    fb.rect(742, 100, 30, 10, "#452017"); fb.rect(742, 100, 30, 1, "#82341c"); fb.rect(755, 102, 4, 6, "#e2762d", 1, 1); fb.rect(756, 101, 2, 2, "#fbb954", 1, 1);
    [737, 779].forEach(x => { fb.rect(x - 4, 112, 6, 1, "#2e1712"); fb.rect(x, 113, 1, 3, "#6a6c78"); fb.rect(x - 2, 116, 6, 2, "#2e1712"); fb.rect(x - 1, 118, 4, 5, "#452017"); fb.rect(x - 2, 123, 6, 1, "#2e1712"); });
    [846, 858].forEach(x => { fb.rect(x, 136, 11, 12, "#61291a"); fb.rect(x, 139, 11, 1, "#2e1712"); fb.rect(x, 144, 11, 1, "#2e1712"); fb.rect(x, 136, 11, 1, "#82341c"); });
    // east road: fence and signpost to the forest
    for (let x=874; x<W; x+=8) fb.rect(x, 134, 2, 14, "#452017"); fb.rect(874, 137, W - 874, 2, "#61291a"); fb.rect(874, 143, W - 874, 2, "#61291a");
    fb.rect(929, 104, 3, 44, "#452017"); fb.rect(918, 104, 26, 8, "#61291a"); fb.rect(918, 104, 26, 1, "#82341c"); fb.rect(944, 105, 2, 6, "#61291a"); fb.px(946, 107, "#61291a"); fb.rect(922, 107, 16, 1, "#2e1712");
    fb.rect(921, 112, 1, 3, "#6a6c78"); fb.rect(919, 115, 5, 6, "#452017");
  },
  anim(fb, t, ox){
    const X = x => x - ox, vis = (x, m) => X(x) > -m && X(x) < SW + m;
    if (vis(211, 30)) flame(fb, X(199), 146, 24, 13, t, 2);
    [737, 779].forEach((x, i) => { if (!vis(x, 8)) return; const on = Math.sin(t/110 + i*2) > -0.4; fb.rect(X(x), 119, 2, 3, on ? FIRE1 : FIRE2, 1, 1); fb.px(X(x), 118, GLOW, 1); });
    if (vis(604, 12)){ const p = 0.5 + 0.5*Math.sin(t/330); fb.rect(X(604) - 3, 100, 7, 8, p > 0.5 ? "#b6cbc0" : "#6e9198", 1, 1); fb.rect(X(604) - 1, 98, 3, 12, "#dfe6d6", 1, 1); }
    if (vis(921, 6)){ fb.rect(X(920), 116, 3, 4, Math.sin(t/140) > -0.3 ? FIRE1 : FIRE2, 1, 1); fb.px(X(921), 115, GLOW, 1); }
  },
  emit(t, sc, ox){
    if (Math.random() < 0.3) sc.spawn({x:Math.random()*SW, y:-2, vx:3 + Math.random()*4, vy:8 + Math.random()*6, life:14, c:"#8fadaa", em:0, ash:1});
    const fx = 211 - ox; if (fx > -20 && fx < SW + 20 && Math.random() < 0.4) sc.spawn({x:fx - 8 + Math.random()*16, y:134, vx:(Math.random()-0.5)*14, vy:-18 - Math.random()*14, life:0.9, c:Math.random() < 0.5 ? FIRE1 : FIRE2, em:1, g:30});
    [[177, 60], [837, 38]].forEach(([x, y]) => { const sx = x - ox; if (sx > -20 && sx < SW + 20 && Math.random() < 0.12) sc.spawn({x:sx + Math.random()*6 - 3, y, vx:2 + Math.random()*3, vy:-5 - Math.random()*3, life:4, c:"#344e66", em:0}); });
  }
};
MUSIC.village = "tavern";
// landmarks that must not repeat when an area's 320px picture tiles along the strip: [x, y, w, h, copy-from dx]
BGS.forest.uniq = [[182, 58, 30, 28, -64]];
BGS.bridge.uniq = [[178, 46, 26, 66, -40]];
BGS.camp.uniq = [[252, 42, 34, 74, -64]];
const ro = s => { const c = s.charCodeAt(s.length - 1), b = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0; return s + (b && b !== 8 ? "으로" : "로"); };
AREAS[0].bg = "village";
// town talks happen out on the street now; area-side quest scenes stay where the party stands
["board", "talk_orna", "talk_town"].forEach(id => { const d = Object.getOwnPropertyDescriptor(NODES, id); const get = d.get;
  Object.defineProperty(NODES, id, {get:() => ({...get(), bg:"village", local:true}), enumerable:false, configurable:true}); });
Object.keys(NODES).forEach(id => { if (/^srch_|^ring_|^herb_(search|found)$/.test(id)) NODES[id].local = true; });

SPRITE_DEFS.trapjaw = {p:{m:"#6a6c78", M:"#a2a3ac", r:"#61291a"}, g:["M.M.M.M.M.M", "mMmMmMmMmMm", "mmmmmmmmmmm", "r.........r"]};

/* ---------- area layout: length, story events placed along the road, the tower's two faces ---------- */
const AREA_LEN = {town:960, tower:800, warren:800};
const areaLen = ai => AREA_LEN[AREAS[ai] && AREAS[ai].id] || 640;
// each area's story is cut into encounters that wait at points on the road (x = where the party's front must reach).
// "end" = the far right edge: forks appear only when the party walks there.
const STAGES = {
  forest:[{node:"road", x:200, mark:"?", spr:"trapjaw"}, {node:"wolves", x:380, spr:"wolf", n:2, sil:1, mark:"!"}, {node:"fork_forest", x:"end", fork:"갈림길"}],
  camp:[{node:"camp", x:300, mark:"?"}],
  tower:[{node:"gate", x:190, mark:"?"}, {node:"hall", x:330, spr:"goblin", n:3, sil:1, mark:"!"}, {node:"mirror", x:470, spr:"shadow", sil:1, mark:"!"}, {node:"corridor", x:610, mark:"?", spr:"trapjaw"}, {node:"cross", x:"end", fork:"나선 계단"}],
  lair:[{node:"lair", x:330, spr:"drake", sil:1, mark:"!"}]
};
// the tower is walked outside until the gate opens, then inside
AREAS[AREA_I("tower")].bgAt = () => { const ai = AREA_I("tower"), w = S.world; return w && (((w.stage || {})[ai] || 0) > 0 || w.cleared[ai]) ? "hall" : "gate"; };
const areaBg = ai => { const a = AREAS[ai]; return a.bgAt ? a.bgAt() : a.bg; };
const stageList = ai => (AREAS[ai] && STAGES[AREAS[ai].id]) || null;
const stageX = (st, ai) => st.x === "end" ? areaLen(ai) - 4 : st.x;
function remainingStages(ai){ const w = S.world, L = stageList(ai); if (!w || !L || w.cleared[ai]) return [];
  const i0 = (w.stage || {})[ai] || 0; return L.slice(i0).map((s, j) => ({...s, i:i0 + j, sx:stageX(s, ai)})); }
const pendingStage = ai => remainingStages(ai)[0] || null;
// called from enterNode: the story reached the next encounter's first scene → back to walking; it waits on the road
function stageBreak(id, extra){
  const w = S.world, L = w && stageList(w.at); if (!L) return false;
  const j = L.findIndex(s => s.node === id); if (j < 0) return false;
  if (S.stageGo === id){ S.stageGo = null; return false; }
  w.stage = w.stage || {}; if (j <= (w.stage[w.at] || 0)) return false;
  w.stage[w.at] = j; enterNode("hub", extra); return true;
}

/* ---------- random finds: rolled once per new game ---------- */
const LOOT_NAMES = {
  town:{glint:["돌바닥 틈의 반짝임", "우물가에 떨어진 동전"]},
  forest:{glint:["덤불 속 반짝임", "풀숲에 떨어진 주머니"], cache:["쓰러진 나무 밑동", "사냥꾼의 은닉처", "속이 빈 고목"]},
  swamp:{glint:["물웅덩이 속 반짝임", "널빤지 위 꾸러미"], cache:["썩은 통나무", "반쯤 가라앉은 상자"]},
  roots:{glint:["뿌리에 걸린 반짝임", "검은 물속의 동전"], cache:["뿌리에 휘감긴 궤짝", "망자의 배낭"]},
  mine:{glint:["레일 위의 반짝임", "광석 부스러기 더미"], cache:["버려진 광부 상자", "무너진 돌집의 찬장"]},
  warren:{glint:["고블린이 흘린 동전", "뼈다귀 더미 속 반짝임"], cache:["고블린의 보물 단지", "약탈품 자루"]},
  eyewood:{glint:["낙엽 속 반짝임", "부서진 도끼 옆 주머니"], cache:["무너진 오두막의 궤짝", "속이 빈 고목"]},
  trollcave:{glint:["뼈 더미 속 반짝임"], cache:["트롤이 숨긴 자루"]},
  camp:{glint:["재 속의 반짝임", "천막 옆 꾸러미"], cache:["타다 남은 짐더미", "망가진 보급 상자"]},
  tower:{glint:["바닥 돌 틈의 반짝임", "떨어진 금속 조각"], cache:["벽감 속 상자", "고블린의 보물 단지"]}
};
const LOOT_TRY = {wis:"주의 깊게 살핀다", int:"구조를 따져 보고 연다", dex:"조심스럽게 손을 넣는다", str:"힘으로 뜯어 연다"};
const LOOT_UNIQUE = new Set(["fairy_amulet","witch_charm","dwarf_plate","ember_scale","archmage_staff","wolfking_fang","queen_ring","foreman_blade","lamp_staff","deep_cloak","saint_mace","orna_locket","alpha_mantle","ember_fang","phoenix_wand","flame_greatsword"]);
const FIXED_X = {town:[240, 400, 452, 552, 752], forest:[300, 548, 200, 380], swamp:[170, 330, 470, 548, 300], roots:[170, 330, 470, 590], mine:[170, 330, 480, 548], warren:[170, 320, 470, 570, 660, 750],
  eyewood:[170, 330, 480, 300], trollcave:[170, 320, 470, 560], camp:[548, 300], tower:[190, 330, 470, 610]};
const pick = a => a[Math.floor(Math.random()*a.length)], rint = (a, b) => a + Math.floor(Math.random()*(b - a + 1));
function lootItem(maxR){
  const cls = S.party.map(h => h.cls), pool = Object.keys(ITEMS).filter(k => { const it = ITEMS[k]; return it.r >= 1 && it.r <= maxR && !LOOT_UNIQUE.has(k) && (!it.cls || it.cls.some(c => cls.includes(c))); });
  if (!pool.length) return null; const tot = pool.reduce((a, k) => a + RARITY[ITEMS[k].r].w, 0); let r = Math.random()*tot;
  for (const k of pool){ r -= RARITY[ITEMS[k].r].w; if (r <= 0) return k; } return pool[0]; }
function genLoot(){
  const out = {};
  AREAS.forEach((a, ai) => { const names = LOOT_NAMES[a.id]; if (!names) return;
    const L = areaLen(ai), tier = Math.max(1, a.tier ?? ai), list = [], n = a.id === "town" ? 1 : rint(2, 3), taken = (FIXED_X[a.id] || []).slice();
    for (let k = 0; k < n; k++){
      let x = 0; for (let t = 0; t < 60; t++){ x = rint(90, L - 90); if (taken.every(f => Math.abs(f - x) > 44)) break; } taken.push(x);
      const kind = !names.cache || (k > 0 && Math.random() < 0.4) ? "glint" : "cache", fx = {};
      if (kind === "glint"){ const r = Math.random();
        if (r < 0.55) fx.gold = rint(4 + tier*3, 10 + tier*6); else if (r < 0.8) fx.potion = 1; else { const it = lootItem(Math.min(2, 1 + Math.floor(tier/3))); if (it) fx.item = it; else fx.gold = rint(8, 20); } }
      else { fx.gold = rint(12 + tier*8, 25 + tier*15); const r = Math.random();
        if (r < 0.55){ const it = lootItem(Math.min(3, 1 + Math.floor(tier/2))); if (it) fx.item = it; } else if (r < 0.75) fx.luck = 1; else fx.potion = rint(1, 2); }
      const stat = pick(["wis","int","dex","str"]);
      list.push({k:`${a.id}${k}`, x, kind, name:pick(names[kind]), stat, dc:10 + Math.floor(tier/2) + rint(0, 2), fx, trap:kind === "cache" && Math.random() < 0.4 ? (tier <= 3 ? "1d6" : "2d6") : null, taken:false});
    }
    out[a.id] = list; });
  // the goblin chief hides in one of three side tunnels — a different one every game
  out.tunnels = ["grak", "nest", "collapse"].sort(() => Math.random() - 0.5);
  return out;
}
const curLoot = () => { const id = AREAS[S.world.at].id; return ((S.loot || {})[id] || []).find(o => o.k === S.lootCur) || null; };
function lootFx(base){ const o = curLoot(); return o ? {...base, take:o.k} : base; }
dyn("loot_get", () => { const o = curLoot(), bg = areaBg(S.world.at);
  return {bg, local:true, fx:o ? {...o.fx, take:o.k, xp:10} : {}, lines:[o ? `${o.name} — 쓸 만한 걸 주웠다!` : "아무것도 없었다."], next:"hub", nextLabel:"챙긴다"}; });
dyn("loot_ok", () => { const o = curLoot(), bg = areaBg(S.world.at);
  return {bg, local:true, fx:o ? {...o.fx, take:o.k, xp:25} : {}, art:{bg, u:P2, o:"chest", c:[60,40,200,112], cap:"숨겨진 물건"}, lines:[o ? `${o.name}에서 숨겨진 물건을 찾아냈다!` : "아무것도 없었다."], next:"hub", nextLabel:"챙긴다"}; });
dyn("loot_no", () => { const o = curLoot(), bg = areaBg(S.world.at);
  return {bg, local:true, fx:o ? (o.trap ? {take:o.k, dmg:o.trap, who:"roller"} : {take:o.k}) : {},
    lines:o && o.trap ? ["딸깍! 숨겨진 함정이 튀어 올랐다!", "허탕이다. 이곳에서 더 찾을 건 없어 보인다."] : ["샅샅이 뒤졌지만 아무것도 찾지 못했다.", "이곳에서 더 찾을 건 없어 보인다."], next:"hub", nextLabel:"돌아간다"}; });

/* ---------- walking state ---------- */
const GAP = 26, WALK_SPEED = 66, HW = 22;
const partyW = () => Math.max(0, S.party.length - 1)*GAP + HW;
const evPending = ai => !!pendingStage(ai);
const defaultWalk = ai => ({area:ai, x:AREAS[ai].id === "town" ? 690 : 40, dir:0, tx:null, auto:0, face:1});
const WV = {x:0, hx:[], hmov:[], cam:0, snap:true, pois:[], moving:false, sentT:0, wasMoving:false, area:-1, held:{"-1":false, "1":false}, tagKey:"", allIn:false};
const WUI = {key:""};
// in town, online, everyone walks their own hero; elsewhere (and offline) the party walks as one, Darkest Dungeon style
const indMode = () => !!(S.walk && S.walk.ind && S.walk.h);
const wantInd = () => !!(S.world && AREAS[S.world.at].id === "town" && online() && new Set(S.party.map((_, k) => ownerPeer(k))).size > 1);
function syncInd(){
  const W = S.walk; if (!W || isGuest() || W.auto || W.area !== S.world.at) return; const want = wantInd();
  if (want && !W.ind){ W.h = S.party.map((_, k) => ({x:W.x + k*GAP, dir:0, tx:null, face:W.face || 1})); W.ind = true; netDirty(); }
  else if (!want && W.ind){ W.x = Math.min(...W.h.map(h => h.x)); W.ind = false; delete W.h; W.dir = 0; W.tx = null; netDirty(); }
}
function walkBounds(){ const ai = S.world.at, L = areaLen(ai), pw = partyW(); let hi = L - pw - 2; const st = pendingStage(ai); if (st) hi = Math.min(hi, st.sx - pw); return [2, hi]; }
function stepMover(o, dt, lo, hi, auto){
  let v = 0;
  if (o.tx != null){ const d = o.tx - o.x; if (Math.abs(d) < 0.5){ o.x = o.tx; o.tx = null; return false; } v = Math.sign(d); }
  else v = o.dir || 0;
  if (!v) return false;
  o.face = v;
  let nx = o.x + v*WALK_SPEED*(auto ? 1.25 : 1)*dt;
  if (o.tx != null && (v > 0 ? nx > o.tx : nx < o.tx)) nx = o.tx;
  if (!auto){ nx = Math.max(lo, Math.min(hi, nx)); if (Math.abs(nx - o.x) < 1e-3){ o.tx = null; return false; } }
  o.x = nx; return true;
}
// advance S.walk by dt; returns true if anyone moved
function walkStep(dt){
  const W = S.walk; if (!W || !S.world || W.area !== S.world.at) return false;
  if (W.ind && W.h){ const L = areaLen(S.world.at); let any = false;
    W.h.forEach((h, k) => { const m = stepMover(h, dt, 2, L - HW - 2, W.auto); WV.hmov[k] = m; if (m) any = true; });
    if (W.auto && W.h.every(h => h.tx == null)) W.auto = 0;
    return any; }
  const [lo, hi] = walkBounds(), m = stepMover(W, dt, lo, hi, W.auto);
  if (W.auto && W.tx == null) W.auto = 0;
  return m;
}
const heroX = k => indMode() ? (WV.hx[k] ?? S.walk.h[k].x) : WV.x + k*GAP;
const myHeroes = () => S.party.map((_, k) => k).filter(k => mine(k));
function spanOf(ks){ if (!indMode()) return [WV.x, WV.x + partyW()]; const xs = ks.map(heroX); return xs.length ? [Math.min(...xs), Math.max(...xs) + HW] : [0, 0]; }
// host-side check uses the authoritative positions of that player's heroes
function peerSpan(peer){ const W = S.walk; if (!W.ind || !W.h) return [W.x, W.x + partyW()];
  const ks = S.party.map((_, k) => k).filter(k => ownerPeer(k) === peer), xs = (ks.length ? ks : S.party.map((_, k) => k)).map(k => W.h[k].x); return [Math.min(...xs), Math.max(...xs) + HW]; }
const exitZone = (p, x) => p.id === "exitR" ? x + HW >= areaLen(S.world.at) - 70 : x <= 48;
function gatherCount(id){ const W = S.walk; if (!W || !W.ind || !W.h) return S.party.length; const p = {id}; return W.h.filter(h => exitZone(p, h.x)).length; }

/* ---------- points of interest: built from the hub's choices ---------- */
const POI_AT = {
  smith:{x:240, name:"대장간 · 그란", spr:"smith", npc:1, desc:"모루 위에서 벌건 쇠가 식어 간다. 그란이 망치를 내려놓고 고개를 든다."},
  board:{x:400, name:"현상금 게시판", por:"bounty", desc:"마을 사람들이 붙인 현상금 쪽지가 밤바람에 펄럭인다."},
  selin:{x:552, name:"마법상점 · 셀린", spr:"selin", npc:1, desc:"문틈으로 향 냄새와 푸른 빛이 새어 나온다. 셀린이 손짓한다."},
  inn:{x:752, name:"여관 「꺼진 화로」", spr:"orna", npc:1, desc:"문 앞에서 오르나가 지팡이에 기대어 일행을 기다린다. 안에서 수프 냄새가 난다."},
  moro:{x:300, name:"떠돌이 상인 모로", spr:"merchant", npc:1, desc:"진흙을 털어 낸 수레 옆에서 모로가 손을 흔든다. 「또 만났구려!」"},
  witch:{x:470, name:"늪의 마녀 그레타", spr:"witch", npc:1, desc:"오두막 앞에서 그레타가 솥을 젓는다. 「또 왔느냐? 거래가 남았나 보지?」"},
  spot:{x:300, name:"부탁받은 물건", por:"skillbook", desc:""},
  dungeon:{x:548, name:"현상금 표적의 은신처", spr:"den", por:"bounty", desc:"어둠 속에서 무언가 숨 쉬는 소리가 들린다."},
  exitL:{x:8, sign:1, desc:"지나온 길로 돌아간다."},
  exitR:{x:-8, sign:1, desc:"이 길을 따라 더 나아간다."}
};
function buildPois(){
  const w = S.world, n = NODES.hub; if (!w || !n) return [];
  const L = areaLen(w.at), P = {}, loots = (S.loot || {})[AREAS[w.at].id] || [];
  visibleChoices(n).forEach(([c, i]) => { if (!c.poi) return; let def = POI_AT[c.poi];
    if (c.poi.startsWith("loot:")){ const o = loots.find(q => q.k === c.poi.slice(5)); if (!o) return; def = {x:o.x, spr:o.kind === "cache" ? "cache" : null, glint:o.kind === "glint", front:1, por:o.kind === "cache" ? "cache" : "coin"}; }
    def = def || {};
    const p = P[c.poi] || (P[c.poi] = {id:c.poi, ...def, x:def.x < 0 ? L + def.x : def.x, acts:[]});
    if (c.pn) p.name = c.pn; if (c.pd) p.desc = c.pd; if (c.pp) p.por = c.pp;
    p.acts.push([c, i]); });
  const out = Object.values(P);
  out.forEach(p => { if (p.id === "exitL"){ const pa = parentOf(w.at); p.name = `◀ ${AREAS[pa].name}`; p.por = AREAS[pa].icon; }
    if (p.id === "exitR"){ const kids = p.acts.map(([c]) => c.to), one = kids.length === 1 ? kids[0] : -1;
      if (one >= 0){ p.name = `${AREAS[one].name} ▶`; p.por = w.entered[one] ? AREAS[one].icon : "sign"; if (!w.entered[one]) p.desc = "아직 가 보지 않은 길이다. 준비가 되었다면 나아가자."; }
      else { p.name = "갈림길 이정표 ▶"; p.por = "sign"; p.desc = "이정표 화살표가 여러 방향을 가리킨다. " + kids.map(k => `${AREAS[k].name}${w.cleared[k] ? " (다녀옴)" : ""}`).join(" · "); } }
    if (p.sign && indMode()){ const g = gatherCount(p.id), n = S.party.length; p.gather = g; p.desc = g >= n ? "모두 모였다! 함께 출발할 수 있다." : `모두 여기 모이면 함께 출발할 수 있다. (지금 ${g}/${n}명)`; } });
  return out;
}
function nearPoi(){ const [a, b] = spanOf(myHeroes()), x0 = a - 14, x1 = b + 14, pc = (a + b)/2; let best = null, bd = 1e9;
  for (const p of WV.pois){ if ((p.x < x0 || p.x > x1) && !(p.sign && indMode() && myHeroes().some(k => exitZone(p, heroX(k))))) continue; const d = Math.abs(p.x - pc); if (d < bd){ bd = d; best = p; } }
  return best; }
function areaDesc(){ const w = S.world, a = AREAS[w.at], out = [...(HUB_TEXT[a.id] || [])];
  if (a.id === "town" && PROGRESS_TEXT[relicCount()]) out.push(PROGRESS_TEXT[relicCount()]);
  const st = pendingStage(w.at);
  const fresh = a.id === "town" ? [] : childrenOf(w.at).filter(c => isOpen(c) && !w.entered[c]);
  if (st) out.push(st.fork ? `오른쪽 끝에 「${st.fork}」 표식이 보인다. 끝까지 걸어가 보자.` : "앞쪽에서 무언가 기다리고 있다.");
  else if (fresh.length) out.push(`길이 열렸다 — 오른쪽 끝 이정표에서 갈 수 있다: ${fresh.map(c => AREAS[c].name).join(", ")}.`);
  else if (a.hint && a.hint()) out.push(a.hint());
  else if (a.id !== "town") out.push("이곳의 사건은 모두 끝났다. 자유롭게 오갈 수 있다.");
  if (indMode()) out.push("마을에서는 각자 자기 캐릭터로 돌아다녀요. 떠날 때는 모두 오른쪽 끝 이정표에 모이세요.");
  return out.join(" "); }

/* ---------- entering / leaving walk mode ---------- */
function startWalk(){
  const w = S.world; if (!w || S.nodeId !== "hub") return;
  if (!S.walk || S.walk.area !== w.at) S.walk = defaultWalk(w.at);
  S.mode = "walk"; S.lines = []; S.li = 0; S.pick = null; vote = null;
  clearInterval(tw.t); tw.done = true; hideCards(); WUI.key = ""; syncInd(); WV.pois = buildPois();
  renderWalkUI(true); refreshStatus(); save();
  // a fork at the road's end was answered with "onward": keep walking into the next area
  if (S.walk.go != null && !isGuest()){ const g = S.walk.go; S.walk.go = null; setTimeout(() => travel(g, true), 450); }
}
function renderWalkUI(force){
  if (S.mode !== "walk" || S.screen !== "game" || !S.world) return;
  const p = VW_ready() ? nearPoi() : null, a = AREAS[S.world.at], auto = !!(S.walk && S.walk.auto);
  const key = [p ? p.id : "", p ? p.acts.map(x => x[1]).join(",") : "", p ? p.gather : "", S.gold, busy ? 1 : 0, auto ? 1 : 0, S.world.at, Object.keys(S.world.open || {}).length, p ? p.desc : "", indMode() ? 1 : 0].join("|");
  if (!force && key === WUI.key) return; WUI.key = key;
  $("#speaker").textContent = p ? (p.name || a.name) : SPEAKERS.narr.name; paintSpriteCanvas($("#portrait"), p ? (p.por || p.spr || a.icon) : SPEAKERS.narr.spr);
  $("#dlgPos").textContent = ""; $("#dlgMore").hidden = true;
  const el = $("#dlgText"); el.className = "dlg-text walkt"; el.textContent = p ? p.desc : areaDesc();
  let html = `<div class="walkpad ${auto ? "busy" : ""}"><button class="wbtn" data-walk="-1" aria-label="왼쪽으로 걷기"></button><button class="wbtn" data-walk="1" aria-label="오른쪽으로 걷기"></button><span class="wlab"><b>${auto ? "이동 중" : "이동"}</b><small>A D · ← →</small></span></div>`;
  if (p && !auto) p.acts.forEach(([c, i], k) => { let {tag, dis} = choiceTag(c);
    if (c.t === "travel" && indMode() && p.gather < S.party.length){ dis = true; tag += `<span class="tag">${p.gather}/${S.party.length} 모임</span>`; }
    html += `<button class="choice" data-act="poi" data-i="${i}" ${dis || busy ? "disabled" : ""}><span>${esc(c.label)}</span>${tag}${k === 0 && !dis ? '<span class="key">E</span>' : ""}</button>`; });

  $("#choices").innerHTML = html; $("#choices").classList.remove("dense", "dense2");
  netDirty();
}
// a player may act on a point only when their hero stands there (a little slack for guests' lag)
function poiAct(i, peer){
  if (S.mode !== "walk" || busy || !S.walk || S.walk.auto) return;
  peer = peer || NET.me;
  const p = buildPois().find(q => q.acts.some(x => x[1] === i)); if (!p) return;
  const [a, b] = peerSpan(peer), slack = peer !== NET.me ? 48 : 16;
  if ((p.x < a - slack || p.x > b + slack) && !(p.sign && indMode() && S.walk.h.some((h, k) => ownerPeer(k) === peer && exitZone(p, h.x - (peer !== NET.me ? 24 : 0))))) return;
  const c = nodeChoices(NODES.hub)[i]; if (!c) return;
  if (c.t === "travel" && indMode() && gatherCount(p.id) < S.party.length){ netMsg("모두 이정표 앞에 모여야 출발할 수 있어요"); return; }
  if (c.t === "shop"){ if (peer === NET.me) openShop(c.shop); return; }
  if (S.walk.ind && S.walk.h) S.walk.h.forEach(h => { h.dir = 0; h.tx = null; }); else { S.walk.dir = 0; S.walk.tx = null; }
  if (p.id.startsWith("loot:")) S.lootCur = p.id.slice(5);
  doChoice(i);
}
function triggerStage(st){
  const W = S.walk; W.dir = 0; W.tx = null; WV.held = {"-1":false, "1":false};
  S.stageGo = st.node; sfx(st.mark === "!" ? "hit" : "select"); enterNode(st.node);
}
// input → walking. Guests also predict it locally so their screen moves at once.
function applyWalk(peer, o){
  const W = S.walk;
  if (W.ind && W.h){ const own = S.party.map((_, k) => k).filter(k => ownerPeer(k) === peer);
    own.forEach((k, j) => { const h = W.h[k]; if (o.tx != null){ h.tx = Math.round(o.tx + j*GAP); h.dir = 0; } else { h.dir = o.d; h.tx = null; } }); return; }
  if (o.tx != null){ W.tx = Math.round(o.tx); W.dir = 0; } else { W.dir = o.d; W.tx = null; }
}
function walkInput(o){
  if (S.mode !== "walk" || busy || !S.walk || S.walk.auto) return;
  applyWalk(NET.me, o);
  if (isGuest()) sendInput("walk", o.tx != null ? {tx:Math.round(o.tx)} : {d:o.d}); else netDirty();
}
function heldDir(){ return (WV.held["1"] ? 1 : 0) - (WV.held["-1"] ? 1 : 0); }
function setHeld(d, on){ if (WV.held[String(d)] === on) return; WV.held[String(d)] = on; walkInput({d:heldDir()}); }
function hostWalkInput(peer, m){
  if (S.mode !== "walk" || busy || !S.walk || S.walk.auto) return;
  if (typeof m.tx === "number" && isFinite(m.tx)) applyWalk(peer, {tx:Math.max(-50, Math.min(1100, m.tx))});
  else applyWalk(peer, {d:m.d > 0 ? 1 : m.d < 0 ? -1 : 0});
  netDirty();
}

/* ---------- travel: walk off the edge, fade, walk in on the other side ---------- */
const until = (f, ms) => new Promise(res => { const t0 = performance.now(), iv = setInterval(() => { if (f() || performance.now() - t0 > ms){ clearInterval(iv); res(); } }, 40); });
const allGathered = () => !indMode() || gatherCount("exitR") >= S.party.length || gatherCount("exitL") >= S.party.length;
async function travel(ai, force){
  const w = S.world; if (busy || !w || S.nodeId !== "hub" || S.mode !== "walk" || ai < 0 || !isOpen(ai) || ai === w.at) return;
  if (!force && !allGathered()){ netMsg("모두 이정표 앞에 모여야 출발할 수 있어요"); return; }
  busy = true; S.mode = "busy"; closeShopQuiet(); renderWalkUI(true); $("#choices").innerHTML = ""; refreshStatus();
  const dir = ai === parentOf(w.at) || ai === 0 ? -1 : 1, W = S.walk, L = areaLen(w.at), pw = partyW();
  W.auto = 1;
  if (W.ind && W.h) W.h.forEach((h, k) => { h.dir = 0; h.tx = dir > 0 ? L + 16 + k*GAP : -HW - 16 - k*GAP; });
  else { W.dir = 0; W.tx = dir > 0 ? L + 16 : -pw - 16; }
  netDirty(); sfx("door");
  await until(() => !S.walk.auto, 1300);
  scene.fadeTo = 1; await sleep(REDUCED ? 80 : 380);
  w.at = ai; w.entered[ai] = true; const L2 = areaLen(ai);
  S.walk = {area:ai, x:dir > 0 ? -pw - 6 : L2 + 6, dir:0, tx:dir > 0 ? 40 : L2 - pw - 40, auto:1, face:dir}; WV.snap = true; WV.hx = [];
  busy = false; enterNode("hub");
}
function closeShopQuiet(){ if (SHOP.id){ SHOP.id = null; $("#shop").hidden = true; } }
function arriveFrontier(ai, extra){
  const w = S.world, L = stageList(w.at), cur = L && L[(w.stage || {})[w.at] || 0], atEnd = !!(cur && cur.x === "end");
  w.cleared[w.at] = true; w.open[ai] = true; openFrom(w.at); w.stage = w.stage || {}; if (L) w.stage[w.at] = L.length;
  S.objective = `오른쪽 끝까지 걸어가 ${ro(AREAS[ai].name)}`;
  sfx("good"); banner(`길이 열렸다: ${AREAS[ai].name}`, "gold");
  if (atEnd && S.walk && S.walk.area === w.at) S.walk.go = ai;
  return enterNode("hub", (extra || []).concat([["sys", atEnd ? `${AREAS[w.at].name}을 지나 ${ro(AREAS[ai].name)} 향한다.` : `${AREAS[w.at].name}의 사건을 마쳤다. 이제 좌우로 걸어 자유롭게 오갈 수 있다.`]]));
}

/* ---------- per-frame: movement, camera, view switch, labels ---------- */
// world view = the scrolling road with points of interest; classic view = the fixed stage (story scenes, dungeons, battles)
function wantWorld(){
  if (S.screen !== "game" || S.battle || !S.walk || !S.world || S.walk.area !== S.world.at) return false;
  const n = NODES[S.nodeId]; if (!n || !n.local) return false;
  if (scene.bgKey !== areaBg(S.world.at)) return null;   // a background change is fading: hold the current view
  return true;
}
const VW = {world:false, sw:0};
const VW_ready = () => VW.world && !VW.sw;
function viewTick(t){
  if (S.screen !== "game"){ VW.world = false; VW.sw = 0; return; }
  const want = wantWorld();
  if (want !== null && want !== VW.world){
    if (!VW.sw){ VW.sw = t; scene.fadeTo = 1; }
    else if (t - VW.sw > (REDUCED ? 60 : 300)){ VW.world = want; VW.sw = 0; scene.fadeTo = 0; WV.snap = true; WUI.key = ""; if (want && S.mode === "walk") renderWalkUI(true); }
  } else if (VW.sw && want === VW.world){ VW.sw = 0; scene.fadeTo = 0; }
}
// the host's simulation: movement, network updates, encounters, the town gathering
function hostWalkTick(dt, t){
  if (S.screen !== "game" || !S.walk || !S.world) return;
  if (S.mode === "walk" && !busy) syncInd();
  const moved = walkStep(dt), W = S.walk;
  WV.hostMoving = moved;
  if (isHost() && NET.room){ if (moved && t - WV.sentT > 220){ WV.sentT = t; netDirty(); } if (!moved && WV.wasMoving) netDirty(); }
  if (!moved && WV.wasMoving) save();
  WV.wasMoving = moved;
  if (!!W.auto !== WV.autoWas){ WV.autoWas = !!W.auto; renderWorldBar(); }
  // an encounter waits ahead: walking into it starts it
  const st = !W.ind && pendingStage(S.world.at);
  if (st && S.mode === "walk" && !busy && !W.auto && W.x + partyW() >= st.sx - 0.5 && VW_ready()) triggerStage(st);
  // everyone gathered at the town's exit
  if (W.ind && W.h){ const all = allGathered(); if (all !== WV.allIn){ WV.allIn = all; renderWorldBar(); if (all && S.mode === "walk"){ banner("모두 모였다!", "gold"); sfx("good"); } } }
}
let simT = performance.now();
setInterval(() => { const t = performance.now(), dt = Math.min(1, (t - simT)/1000); simT = t; viewTick(t); if (!isGuest()) hostWalkTick(dt, t); }, 33);
// per frame: guests' prediction, smoothing, camera, labels
function worldTick(dt, t){
  if (S.screen !== "game"){ scene.camX = 0; hideTags(); return; }
  if (!S.walk || !S.world){ scene.camX = 0; hideTags(); return; }
  const W = S.walk, guest = isGuest(), moved = guest ? walkStep(dt) : WV.hostMoving, ease = (cur, tgt) => cur == null || Math.abs(tgt - cur) > 90 || WV.snap ? tgt : cur + (tgt - cur)*Math.min(1, dt*12);
  WV.x = guest ? ease(WV.x, W.x) : W.x;
  if (W.ind && W.h) W.h.forEach((h, k) => { WV.hx[k] = guest ? ease(WV.hx[k], h.x) : h.x; });
  WV.moving = moved || (!W.ind && Math.abs(W.x - WV.x) > 0.6);
  if (guest && !!W.auto !== WV.autoWas){ WV.autoWas = !!W.auto; renderWorldBar(); }
  // camera follows my own hero in town, the party elsewhere
  const L = areaLen(S.world.at), [s0, s1] = spanOf(myHeroes()), face = (W.ind && W.h ? (W.h[myHeroes()[0] ?? 0] || {}).face : W.face) || 1, target = Math.max(0, Math.min(L - SW, (s0 + s1)/2 - SW*(face > 0 ? 0.33 : 0.67)));
  if (WV.snap || WV.area !== S.world.at){ WV.cam = target; WV.snap = false; WV.area = S.world.at; }
  else WV.cam += (target - WV.cam)*Math.min(1, dt*3);
  // story scenes on a wide background keep the camera where the party stood, so the event happens on that spot
  const wide = BGS[scene.bgKey] && BGS[scene.bgKey].w && scene.bgKey === areaBg(S.world.at) && S.world.at !== 0;
  scene.camX = VW.world || wide ? Math.round(WV.cam) : ((BGS[scene.bgKey] || {}).camAt || 0);
  if (VW.world){ WV.pois = buildPois(); if (S.mode === "walk") renderWalkUI(); renderTags(); } else hideTags();
}
const poiSprite = p => p.spr || (p.sign && !BGS[scene.bgKey].w ? "sign" : null);
function worldUnits(t){
  const bg = BGS[scene.bgKey], G = bg.ground, cam = scene.camX, units = [], front = [], W = S.walk, [s0, s1] = spanOf(myHeroes()), pc = (s0 + s1)/2;
  for (const p of WV.pois){ const k = poiSprite(p); if (!k) continue; const sp = spr(k);
    const x = p.sign ? (p.id === "exitL" ? 10 : areaLen(S.world.at) - 10 - sp.w) : p.x - sp.w/2, sx = Math.round(x - cam); if (sx > SW + 4 || sx + sp.w < -4) continue;
    const flip = p.npc ? pc > p.x : p.id === "exitL", bob = p.npc && !REDUCED ? Math.floor(t/620 + p.x*0.37) % 2 : 0;
    const u = {sp, x:sx, y:G - sp.h - bob - (p.npc || p.sign ? 4 : 0), flip}; if (p.front){ u.y = G - sp.h + 4; front.push(u); } else units.push(u); }
  // encounters still waiting on this road
  for (const st of remainingStages(S.world.at)){ if (!st.spr) continue; const sp = spr(st.spr), n = st.n || 1;
    for (let j = 0; j < n; j++){ const sx = Math.round(st.sx + 6 + j*(sp.w - 4) - cam); if (sx > SW + 4 || sx + sp.w < -4) continue;
      if (st.spr === "trapjaw") front.push({sp, x:sx, y:G - sp.h + 3, alpha:0.85});
      else units.push({sp, x:sx, y:G - sp.h - (j % 2 ? 2 : 0), flash:st.sil ? "#241a33" : null, alpha:st.sil ? 0.92 : 1}); } }
  LAST.heroes = []; LAST.foe = null;
  S.party.forEach((h, i) => { const hk = heroKey(h), down = h.hp <= 0, sp = down ? sprLying(hk) : spr(hk), mov = W.ind ? WV.hmov[i] : WV.moving;
    const bob = down || REDUCED ? 0 : Math.floor(t/(mov ? 140 : 460) + i*0.5) % 2;
    const px = Math.round(heroX(i) - cam), py = G - sp.h - bob - (mov && !REDUCED && Math.floor(t/140 + i) % 2 ? 1 : 0);
    const u = {sp, x:px, y:py, flip:(W.ind && W.h ? W.h[i].face : W.face) < 0, alpha:down ? 0.65 : 1};
    if (h.cls === "wizard" && !down) u.glow = [20, 2, 26, [0.3,0.6,0.6]];
    if (h.cls === "cleric" && !down) u.glow = [11, 9, 18, [0.6,0.5,0.25]];
    const aura = !down && heroAura(h); if (aura) u.glow = aura;
    units.push(u); LAST.heroes[i] = {x:px, y:py, w:sp.w, h:sp.h}; });
  const pl = scene.dyn.find(l => l.party); if (pl) pl.x = pc - cam;
  return units.concat(front);
}
function worldOverlay(fb, t){
  const cam = scene.camX, G = BGS[scene.bgKey].ground;
  for (const st of remainingStages(S.world.at)){ if (!st.mark) continue; const h = st.spr ? spr(st.spr).h : 0, w = st.spr ? spr(st.spr).w*(st.n || 1) : 12;
    const x = Math.round(st.sx + 6 + w/2 - cam), y = G - Math.max(h, 10) - 18 - (REDUCED ? 0 : Math.round(Math.abs(Math.sin(t/300 + st.sx))*3)); if (x < -10 || x > SW + 10) continue;
    fb.textOutlined(st.mark, x, y, st.mark === "!" ? (Math.floor(t/400) % 2 ? "#ffd678" : "#fbb954") : "#b6cbc0", st.mark === "!" ? 4 : 3); }
  for (const p of WV.pois){ if (p.id !== "spot" && !p.glint && p.spr !== "cache") continue; const x = Math.round(p.x - cam); if (x < -10 || x > SW + 10) continue;
    for (let k=0;k<3;k++){ const ph = (t/500 + k*0.33 + p.x*0.01) % 1; if (ph > 0.5) continue; const a = ph*2*Math.PI;
      fb.px(x - 6 + k*6, G - (p.glint ? 4 : 14) - k*3 - Math.round(Math.sin(a)*3), k % 2 ? "#ffd678" : "#f4f2ea", 1); } }
}
/* name tags over the scene (DOM, crisp text): places, the fork ahead, and in town every player's name */
function hideTags(){ const el = $("#poiTags"); if (el && !el.hidden){ el.hidden = true; WV.tagKey = ""; } }
function renderTags(){
  const el = $("#poiTags"); if (!el) return;
  if (S.mode !== "walk" || VW.sw || (S.walk && S.walk.auto && busy)){ hideTags(); return; }
  const near = nearPoi(), G = BGS[scene.bgKey].ground, cam = scene.camX, L = areaLen(S.world.at), list = [];
  WV.pois.forEach(p => { const k = poiSprite(p), h = (k ? spr(k).h : 10) + (p.npc || p.sign ? 4 : 0);
    const x = p.sign ? (p.id === "exitL" ? 22 : L - 22) : p.x, nm = (p.name || "") + (p.sign && indMode() ? ` (${p.gather}/${S.party.length})` : "");
    list.push({id:p.id, x, y:G - h - 7, nm, cls:(near === p ? "on " : "") + (p.sign ? "exit" : "")}); });
  remainingStages(S.world.at).forEach(st => { if (st.fork) list.push({id:"fork", x:L - 22, y:G - 30, nm:st.fork + " ▶", cls:"exit"}); });
  if (indMode()) S.party.forEach((h, k) => { const sp = spr(heroKey(h)); list.push({id:"h" + k, x:heroX(k) + sp.w/2, y:G - sp.h - 5, nm:seatNick(k), cls:"who " + (mine(k) ? "me" : "")}); });
  const key = list.map(o => o.id + o.nm + o.cls).join("|");
  if (key !== WV.tagKey){ WV.tagKey = key; el.innerHTML = list.map(o => `<div class="poi-tag ${o.cls}" data-p="${o.id}">${o.cls.startsWith("on") ? '<span class="key">E</span>' : ""}${esc(o.nm)}</div>`).join(""); }
  el.hidden = false;
  const tags = el.children; list.forEach((o, j) => { const d = tags[j]; if (!d) return; const sx = (o.x - cam)*6, sy = o.y*6 - 192;
    d.style.transform = `translate(${Math.round(sx)}px,${Math.round(sy)}px) translate(-50%,-100%)`; d.style.visibility = sx < -200 || sx > 2120 ? "hidden" : "visible"; });
}
/* pointer: tap the street to walk there; hold the pad buttons to walk */
function stagePoint(e){ const r = $("#stage").getBoundingClientRect(); return [(e.clientX - r.left)/r.width*1920/6, ((e.clientY - r.top)/r.height*1080 + 192)/6]; }
document.addEventListener("pointerdown", e => {
  const b = e.target.closest && e.target.closest("[data-walk]");
  if (b){ e.preventDefault(); const d = +b.dataset.walk; setHeld(d, true); const up = () => { setHeld(d, false); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); }; window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up); return; }
  if (S.screen !== "game" || S.mode !== "walk" || !VW_ready()) return;
  const g = $("#sGame"); if (e.target !== g && !(e.target.classList && e.target.classList.contains("hud-shade")) && e.target.id !== "poiTags" && !(e.target.closest && e.target.closest(".poi-tag"))) return;
  const [sx, sy] = stagePoint(e); if (sy > 170) return;
  walkInput({tx:sx + scene.camX - (indMode() ? HW/2 : partyW()/2)});
});
window.addEventListener("blur", () => { if (WV.held["1"] || WV.held["-1"]){ WV.held = {"-1":false, "1":false}; walkInput({d:0}); } });
document.addEventListener("keyup", e => { const k = e.key;
  if (k === "ArrowLeft" || k === "a" || k === "A") setHeld(-1, false);
  if (k === "ArrowRight" || k === "d" || k === "D") setHeld(1, false); });
// keydown part, called from the main handler; returns true when the key was used for walking
function walkKey(e){
  if (S.mode !== "walk" || !VW_ready()) return false; const k = e.key;
  if (k === "ArrowLeft" || k === "a" || k === "A"){ e.preventDefault(); if (!e.repeat) setHeld(-1, true); return true; }
  if (k === "ArrowRight" || k === "d" || k === "D"){ e.preventDefault(); if (!e.repeat) setHeld(1, true); return true; }
  if (k === "e" || k === "E" || k === " " || k === "Enter"){ e.preventDefault(); const b = document.querySelector('#choices .choice[data-act="poi"]:not(:disabled)'); if (b) b.click(); return true; }
  return false;
}
