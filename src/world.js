/* ================= WORLD: areas & travel, town, shops, skills, quests, dungeons ================= */

/* ---------- more gear (mid & late game) ---------- */
const NEW_ITEMS = {
  battle_axe:{name:"전투 도끼", slot:"weapon", type:"axe", r:1, cls:["fighter"], fx:{dmg:2}, desc:"그란이 두드린 묵직한 도끼."},
  silver_dagger:{name:"은빛 단검", slot:"weapon", type:"dagger", r:1, cls:["rogue"], fx:{atk:1, dmg:1}, pal:{m:"#a2a3ac", M:"#f4f2ea"}, desc:"달빛에 비추면 푸르게 빛난다."},
  oak_staff:{name:"참나무 지팡이", slot:"weapon", type:"staff", r:1, cls:["wizard"], fx:{dmg:2}, pal:{g:"#7aa35a", G:"#dfe6d6"}, desc:"오래된 참나무 가지에 녹색 수정을 박았다."},
  pilgrim_mace:{name:"순례자의 철퇴", slot:"weapon", type:"mace", r:1, cls:["cleric"], fx:{atk:1, heal:1}, pal:{m:"#dfe6d6", M:"#f4f2ea"}, desc:"성지 순례자들이 들고 다니던 철퇴."},
  healer_robe:{name:"치유사의 법의", slot:"armor", type:"cloak", r:1, cls:["cleric","wizard"], fx:{ac:1, heal:1}, pal:{c:"#b6cbc0", C:"#f4f2ea", g:"#7aa35a"}, desc:"약초 냄새가 은은하게 밴 법의."},
  guard_ring:{name:"수호의 반지", slot:"ring", type:"ring", r:2, fx:{ac:1, hp:4}, pal:{g:"#6e9198", G:"#dfe6d6"}, desc:"끼고 있으면 등 뒤가 든든하다."},
  sage_amulet:{name:"현자의 목걸이", slot:"amulet", type:"amulet", r:2, fx:{int:1, wis:1, check:1}, pal:{m:"#344e66", M:"#557887", g:"#8a62a0", G:"#dfe6d6"}, desc:"셀린의 스승이 남긴 목걸이."},
  wolfking_fang:{name:"잿송곳니 목걸이", slot:"amulet", type:"amulet", r:3, fx:{atk:2, dmg:1}, pal:{m:"#dfe6d6", M:"#f4f2ea", g:"#e04a3c", G:"#ffd678"}, desc:"늑대왕의 송곳니. 쥐면 사냥 본능이 깨어난다."},
  queen_ring:{name:"거머리 여왕의 반지", slot:"ring", type:"ring", r:3, fx:{hp:8, heal:2}, pal:{m:"#5c3f72", M:"#8a62a0", g:"#7aa35a", G:"#b6cbc0"}, desc:"맥박처럼 미세하게 고동친다."},
  foreman_blade:{name:"감독관의 대검", slot:"weapon", type:"sword", r:3, cls:["fighter"], fx:{atk:1, dmg:4}, pal:{m:"#6a6c78", M:"#a2a3ac", g:"#8fadaa"}, desc:"광산 감독관이 죽어서도 놓지 않던 대검."},
  lamp_staff:{name:"심층 등불 지팡이", slot:"weapon", type:"staff", r:3, cls:["wizard"], fx:{atk:2, dmg:3}, pal:{g:"#ffd678", G:"#fff0b0"}, desc:"광산 가장 깊은 곳을 밝히던 등불을 끼웠다."},
  deep_cloak:{name:"갱도의 망토", slot:"armor", type:"cloak", r:3, cls:["rogue","wizard"], fx:{ac:2, dex:1, hp:4}, pal:{c:"#283d55", C:"#426276", g:"#7fe3f0"}, desc:"어둠에 녹아드는 광부들의 비밀 망토."},
  saint_mace:{name:"성자의 철퇴", slot:"weapon", type:"mace", r:3, cls:["cleric"], fx:{atk:2, dmg:2, heal:3}, pal:{m:"#fbb954", M:"#fff0b0", g:"#ffd678"}, desc:"성자의 유골함을 녹여 만들었다는 철퇴."},
  orna_locket:{name:"오르나의 로켓", slot:"amulet", type:"amulet", r:2, fx:{check:2}, pal:{m:"#fbb954", M:"#fff0b0", g:"#8a62a0", G:"#dfe6d6"}, desc:"안에 빛바랜 초상화가 들어 있다."},
  alpha_mantle:{name:"잿불 우두머리 판금", slot:"armor", type:"plate", r:4, cls:["fighter","cleric"], fx:{ac:3, hp:10, fireRes:1}, pal:{m:"#a6441f", M:"#e2762d", g:"#fbb954"}, desc:"불에 타지 않는 우두머리의 가죽을 판금에 덧댔다."},
  ember_fang:{name:"잿불 송곳 단검", slot:"weapon", type:"dagger", r:4, cls:["rogue"], fx:{atk:3, dmg:3}, pal:{m:"#e2762d", M:"#ffd678", g:"#e04a3c"}, desc:"찌를 때마다 불씨가 튄다."},
  phoenix_wand:{name:"불새 완드", slot:"weapon", type:"wand", r:4, cls:["wizard"], fx:{atk:2, dmg:5}, pal:{g:"#e04a3c", G:"#ffd678"}, desc:"잿불 사냥개 우두머리가 지키던 보물."},
  flame_greatsword:{name:"불꽃 대검", slot:"weapon", type:"sword", r:4, cls:["fighter","cleric"], fx:{atk:2, dmg:5}, pal:{m:"#e2762d", M:"#ffd678", g:"#e04a3c"}, desc:"망루의 불길 속에서 벼려졌다."}
};
Object.assign(ITEMS, NEW_ITEMS);
Object.keys(NEW_ITEMS).forEach(k => { const it = ITEMS[k], ic = ICONS[it.type]; SPRITE_DEFS["it_" + k] = {p:{...ic.p, ...(it.pal || {})}, g:ic.g, em:it.r >= 2 ? ["g","G"] : []}; });
SPRITE_DEFS.skillbook = {p:{c:"#5c3f72", C:"#8a62a0", p:"#dfe6d6", g:"#ffd678", G:"#fff0b0"}, em:["g","G"], g:["....cccccc..","...cCCCCCCc.","..cCgGGgCCc.","..cCCgGCCCc.","..cCgGGgCCc.","..cCCCCCCCc.","..cCCCCCCCc.","..cCCCCCCCc.","..cppppppcc.","..cppppppc..","...cccccc...","............"]};
SPRITE_DEFS.bounty = {p:{w:"#dfe6d6", W:"#f4f2ea", r:"#e04a3c", b:"#61291a"}, g:["..bbbbbbbb..","..bWWWWWWb..","..bWrrrrWb..","..bWWWWWWb..","..bWwwwwWb..","..bWWWWWWb..","..bWwwwWWb..","..bWWWWWWb..","..bbbbbbbb..","....b..b....","....b..b....","............"]};
const PRICE = [12, 30, 70, 150, 300];
const priceOf = (key, shop) => { const p = PRICE[ITEMS[key].r]; return shop === "smith" && S.flags.smithDiscount ? Math.ceil(p*0.8) : p; };
const sellOf = key => Math.max(3, Math.floor(PRICE[ITEMS[key].r]*0.4));

// harder road: tougher foes, longer growth curve
Object.values(FOES).forEach(f => { if (f.key === undefined){ f.hp = Math.round(f.hp*1.25); f.atk += 1; } });
FOES.drake.hp = 130;
XP_T.push(1400, 1900, 2500);

/* ---------- appearance: gear recolors the hero sprite ---------- */
const LOOK_KEYS = {fighter:{armor:["A","a","H","h"], weapon:["W","w"]}, wizard:{armor:["O","o"], weapon:["C"]}, rogue:{armor:["G","g"], weapon:["D"]}, cleric:{armor:["W","w"], weapon:["M","m"]}};
const LOOK = {dwarf_plate:["#e2762d","#a6441f"], alpha_mantle:["#e04a3c","#82341c"], chainmail:["#dfe6d6","#8fadaa"]};
function lookCols(it, slot){ const p = it.pal || {}; const key = Object.keys(ITEMS).find(k => ITEMS[k] === it); if (LOOK[key]) return LOOK[key];
  if (slot === "armor") return [p.C || p.M || "#a2a3ac", p.c || p.m || "#6a6c78"];
  return [p.M || p.G || p.g || "#f4f2ea", p.m || p.g || p.G || "#a2a3ac"]; }
function heroKey(h){
  if (!h || !h.eq || !S.items) return h ? h.cls : "fighter";
  const it = sl => { const uid = h.eq[sl], o = uid && S.items[uid]; return o ? o.key : null; };
  const a = it("armor"), w = it("weapon");
  const plain = k => !k || ITEMS[k].r === 0;
  if (plain(a) && plain(w)) return h.cls;
  const key = `hero_${h.cls}_${a || "-"}_${w || "-"}`;
  if (!SPRITE_DEFS[key]){
    const base = SPRITE_DEFS[h.cls], K = LOOK_KEYS[h.cls], pal = {}, em = [...(base.em || [])];
    if (!plain(a)){ const [lt, dk] = lookCols(ITEMS[a], "armor"); K.armor.forEach((ch, n) => pal[ch] = n % 2 ? dk : lt); }
    if (!plain(w)){ const [lt, dk] = lookCols(ITEMS[w], "weapon"); K.weapon.forEach((ch, n) => pal[ch] = n % 2 ? dk : lt); if (ITEMS[w].r >= 2) em.push(...K.weapon); }
    SPRITE_DEFS[key] = {...base, p:{...base.p, ...pal}, em};
  }
  return key;
}
// rare rings/amulets give the wearer a faint aura
function heroAura(h){ let best = null;
  ["ring","amulet"].forEach(sl => { const uid = h.eq && h.eq[sl], o = uid && S.items[uid], it = o && ITEMS[o.key]; if (it && it.r >= 2 && (!best || it.r > best.r)) best = it; });
  if (!best) return null; const c = col((best.pal && (best.pal.g || best.pal.M)) || "#fbb954"); return [11, 10, 16 + best.r*3, [c[0]/255, c[1]/255, c[2]/255]]; }

/* ---------- skills (learned from books) ---------- */
const SKILLS = {
  whirl:{cls:"fighter", name:"회전베기", kind:"strike", extra:[6,6], hit:2, style:"heavy", uses:1, price:60, desc:"명중 +2 · 명중 시 피해 +2d6"},
  shieldwall:{cls:"fighter", name:"방패 진형", kind:"guard", val:3, turns:2, uses:1, price:70, desc:"2라운드 동안 파티 방어도 +3"},
  stunblow:{cls:"fighter", name:"기절의 일격", kind:"strike", extra:[6], stun:true, style:"heavy", uses:1, price:110, desc:"명중 시 피해 +1d6 · 적이 한 턴 쉰다"},
  twinstab:{cls:"rogue", name:"연속 찌르기", kind:"strike", extra:[4,4], adv:true, style:"stab", uses:2, price:60, desc:"d20 두 개 중 높은 눈 · 명중 시 +2d4"},
  poison:{cls:"rogue", name:"독 바르기", kind:"strike", extra:[], poison:3, style:"stab", uses:1, price:80, desc:"명중 시 3라운드 동안 매 턴 1d6 독 피해"},
  smoke:{cls:"rogue", name:"연막탄", kind:"guard", val:4, turns:1, uses:1, price:50, desc:"1라운드 동안 파티 방어도 +4"},
  icelance:{cls:"wizard", name:"얼음 창", kind:"auto", dice:[8,8], style:"missiles", uses:1, price:70, desc:"반드시 명중 · 2d8+피해 보정"},
  fireball:{cls:"wizard", name:"화염구", kind:"auto", dice:[6,6,6,6], style:"firebolt", uses:1, price:130, desc:"반드시 명중 · 4d6+피해 보정"},
  barrier:{cls:"wizard", name:"마력 방벽", kind:"guard", val:3, turns:2, uses:1, price:70, desc:"2라운드 동안 파티 방어도 +3"},
  bless:{cls:"cleric", name:"축복", kind:"bless", val:2, turns:3, uses:1, price:60, desc:"3라운드 동안 파티 명중 +2"},
  massheal:{cls:"cleric", name:"치유의 물결", kind:"heal", dice:[8], uses:1, price:110, desc:"파티 전원 1d8+지혜 회복 · 쓰러진 동료도 일으킨다"},
  smite:{cls:"cleric", name:"성스러운 일격", kind:"strike", extra:[8,8], style:"smash", uses:1, price:90, desc:"명중 시 피해 +2d8"}
};
const acOf = h => h.ac + (S.battle && S.battle.guard && S.battle.guard.t > 0 ? S.battle.guard.v : 0);
const blessOf = () => S.battle && S.battle.bless && S.battle.bless.t > 0 ? S.battle.bless.v : 0;

/* ---------- shops ---------- */
SPRITE_DEFS.smith = {...SPRITE_DEFS.dwarf, p:{...SPRITE_DEFS.dwarf.p, H:"#61291a", h:"#452017", B:"#344e66", b:"#283d55", A:"#82341c", a:"#61291a"}};
SPRITE_DEFS.selin = {...SPRITE_DEFS.orna, p:{...SPRITE_DEFS.orna.p, P:"#283d55", p:"#1f2f45", F:"#7fe3f0", R:"#344e66", r:"#1f2f45"}, em:["F"]};
Object.assign(SPEAKERS, {smith:{name:"대장장이 그란", spr:"smith"}, selin:{name:"마법상인 셀린", spr:"selin"}, board:{name:"현상금 게시판", spr:"bounty"}});
const SHOPS = {
  smith:{name:"대장장이 그란", spr:"smith", greet:"쇠는 거짓말을 안 하지. 골라 봐.", goods:["battle_axe","steel_sword","silver_dagger","pilgrim_mace","chainmail","leather","guard_ring","str_ring","dex_ring"], books:["whirl","shieldwall","stunblow","twinstab","poison","smoke"]},
  mage:{name:"마법상인 셀린", spr:"selin", greet:"주문은 책에서, 힘은 지팡이에서. 둘 다 여기 있어요.", goods:["oak_staff","star_staff","fire_wand","mage_robe","healer_robe","wis_ring","sage_amulet"], books:["icelance","fireball","barrier","bless","massheal","smite"]},
  inn:{name:"여관 카운터", spr:"orna", greet:"물약이랑 부적은 넉넉히 챙겨 가. 돌아오는 놈이 이기는 거야.", goods:[], supplies:true},
  moro:{name:"떠돌이 상인 모로", spr:"merchant", greet:"또 만났구려! 이번엔 귀한 물건도 좀 있소.", goods:["venom_dagger","shadow_cloak","luck_ring","fairy_amulet","flame_axe"], supplies:true}
};
const SUPPLIES = {potion:{name:"회복 물약", price:12, desc:"2d4+2 회복"}, luck:{name:"행운 토큰", price:30, desc:"실패한 굴림을 다시 던진다"}};
function shopHere(id){ const at = S.world && AREAS[S.world.at] && AREAS[S.world.at].id; return S.nodeId === "hub" && (at === "town" ? ["smith","mage","inn"].includes(id) : at === "forest" && id === "moro"); }

/* ---------- areas ---------- */
const AREAS = [
  {id:"town", name:"불씨골 마을", bg:"tavern", icon:"orna"},
  {id:"forest", name:"잿빛 숲길", bg:"forest", entry:"road", icon:"wolf"},
  {id:"bridge", name:"트롤의 다리", bg:"bridge", entry:"bridge", icon:"troll"},
  {id:"swamp", name:"안개 늪", bg:"swamp", entry:"swamp", icon:"leech"},
  {id:"cave", name:"버려진 광산", bg:"cave", entry:"cave", icon:"skeleton"},
  {id:"camp", name:"탑 아래 언덕", bg:"camp", entry:"camp", icon:"hound"},
  {id:"tower", name:"잿빛 탑", bg:"gate", entry:"gate", icon:"gargoyle"},
  {id:"lair", name:"잿날개의 둥지", bg:"lair", entry:"lair", icon:"drake"}
];
const AREA_BY_ENTRY = {}; AREAS.forEach((a, i) => { if (a.entry) AREA_BY_ENTRY[a.entry] = i; });
const AREA_I = id => AREAS.findIndex(a => a.id === id);
const newWorld = () => ({at:0, unlocked:0, entered:{0:true}, cleared:{}, stage:{}});
const SEARCH = {
  forest:{label:"덤불 속을 뒤진다", stat:"wis", dc:12, fx:{gold:20, item:"copper_ring"}, ok:"쓰러진 나무 밑동에서 사냥꾼이 숨겨 둔 주머니를 찾았다.", no:"가시에 긁히기만 하고 아무것도 찾지 못했다."},
  bridge:{label:"다리 밑 그늘을 살핀다", stat:"int", dc:13, fx:{gold:35, potion:1}, ok:"트롤이 모아 둔 통행료 상자가 바위 틈에 끼어 있다!", no:"이끼 낀 돌뿐이다."},
  swamp:{label:"썩은 통나무 속을 들여다본다", stat:"wis", dc:13, fx:{item:"sage_amulet"}, ok:"통나무 안에서 누군가 잃어버린 목걸이가 반짝인다.", no:"거머리 알만 잔뜩 붙어 있다. 으."},
  cave:{label:"무너진 갱도 틈을 비춘다", stat:"int", dc:14, fx:{gold:60, luck:1}, ok:"광부들이 숨겨 둔 금화 주머니와 네잎 부적!", no:"돌가루만 쏟아진다."},
  camp:{label:"타다 남은 짐더미를 뒤진다", stat:"wis", dc:14, fx:{item:"guard_ring", potion:1}, ok:"불에 그을린 상자 안에 반지 하나와 물약이 남아 있다.", no:"재와 숯뿐이다."},
  tower:{label:"탑 외벽의 균열을 살핀다", stat:"int", dc:15, fx:{gold:80, luck:1}, ok:"벽돌 하나가 빠지며 오래된 금고가 드러난다!", no:"벽돌은 꿈쩍도 하지 않는다."}
};
Object.entries(SEARCH).forEach(([id, s]) => {
  const bg = AREAS[AREA_I(id)].bg;
  NODES["srch_" + id + "_ok"] = {bg, fx:{...s.fx, flag:"srch_" + id, xp:25}, art:{bg, u:P2, o:"chest", c:[60,40,200,112], cap:"숨겨진 물건"}, lines:[s.ok], next:"hub", nextLabel:"돌아간다"};
  NODES["srch_" + id + "_no"] = {bg, fx:{flag:"srch_" + id}, lines:[s.no, "이곳에서 더 찾을 건 없어 보인다."], next:"hub", nextLabel:"돌아간다"};
});
const HUB_TEXT = {
  town:["불씨골 마을 광장. 여관 「꺼진 화로」 굴뚝에서 장작 연기가 오른다.", "대장간 망치 소리와 마법상점의 풍경 소리가 섞여 들린다."],
  forest:["잿빛 숲길. 늑대 울음은 멀어졌고 바람에 나뭇잎이 바스락거린다."],
  bridge:["트롤의 다리. 강물 소리가 낮게 깔린다. 그룸의 몽둥이 자국이 난간에 남아 있다."],
  swamp:["안개 늪. 널빤지 길이 안개 속으로 끝없이 이어진다."],
  cave:["버려진 광산 입구. 갱도 안쪽에서 찬바람이 불어 나온다."],
  camp:["탑 아래 언덕. 꺼진 모닥불 자리 너머로 잿빛 탑이 우뚝 서 있다."],
  tower:["잿빛 탑 1층. 계단 위에서 뜨거운 바람이 내려온다."],
  lair:["잿날개의 둥지."]
};
const PROGRESS_TEXT = ["", "숲길이 열렸다. 준비가 되면 오른쪽으로 출발하자.", "마을 사람들이 일행을 알아보고 손을 흔든다. 「다리를 넘었다며?」", "아이들이 일행의 무용담을 흉내 내며 뛰어논다.", "대장간 앞에 일행의 이름을 새긴 나무판이 걸렸다.", "마을 전체가 숨을 죽이고 탑 쪽을 바라본다. 모두 일행에게 기대를 건다.", "여관 주인이 일행 자리를 비워 두었다. 「돌아올 거지?」", "마지막 싸움이 남았다."];

/* ---------- quests: bounties & favors ---------- */
const QUESTS = {
  wolfking:{kind:"bounty", name:"늑대왕 잿송곳니", area:"forest", after:"forest", gold:90, xp:160, dungeon:{label:"늑대 굴로 들어간다 (현상금)", to:"den_1"}, desc:"숲 북쪽 굴에 사는 흰 늑대. 가축 스무 마리를 물어 갔다."},
  queen:{kind:"bounty", name:"늪의 거머리 여왕", area:"swamp", after:"swamp", gold:130, xp:220, dungeon:{label:"가라앉은 사원으로 (현상금)", to:"temple_1"}, desc:"늪 한가운데 가라앉은 사원에 사람만 한 거머리가 산다."},
  foreman:{kind:"bounty", name:"해골 감독관 모르그", area:"cave", after:"cave", gold:170, xp:280, dungeon:{label:"깊은 갱도로 내려간다 (현상금)", to:"deep_1"}, desc:"광산 가장 깊은 곳에서 죽은 광부들을 부리는 감독관."},
  alpha:{kind:"bounty", name:"잿불 우두머리", area:"camp", after:"camp", gold:220, xp:340, dungeon:{label:"불탄 망루에 오른다 (현상금)", to:"watch_1"}, desc:"탑 아래 망루에 둥지를 튼 거대한 잿불 사냥개."},
  ring:{kind:"favor", giver:"orna", name:"오르나의 반지", area:"bridge", after:"forest", desc:"오르나가 젊은 시절 트롤의 다리에서 잃어버린 결혼반지."},
  herb:{kind:"favor", giver:"selin", name:"셀린의 달빛 약초", area:"swamp", after:"bridge", desc:"안개 늪에서만 자라는 달빛 약초가 필요하다."},
  hammer:{kind:"favor", giver:"smith", name:"그란의 망치", area:"cave", after:"swamp", desc:"광산이 무너질 때 두고 온 그란 아버지의 망치."}
};
const qState = q => (S.quests || {})[q];
const qOpen = q => { const Q = QUESTS[q]; return S.world && S.world.cleared[AREA_I(Q.after)]; };

/* ---------- dungeon & quest content ---------- */
SPRITE_DEFS.alphawolf = {p:{...SPRITE_DEFS.wolf.p, g:"#dfe6d6", G:"#8fadaa", w:"#f4f2ea", e:"#e04a3c"}, em:["e"], flat:["n"], g:SPRITE_DEFS.wolf.g};
SPRITE_DEFS.queen = {p:{...SPRITE_DEFS.leech.p, G:"#5c3f72", g:"#8a62a0", d:"#3a2850", y:"#e04a3c"}, em:["e","y"], g:SPRITE_DEFS.leech.g};
SPRITE_DEFS.foreman = {p:{...SPRITE_DEFS.skeleton.p, W:"#b6cbc0", w:"#6a6c78", e:"#e04a3c", M:"#344e66", P:"#a2a3ac"}, em:["e","F"], flat:["k"], g:SPRITE_DEFS.skeleton.g};
SPRITE_DEFS.alphahound = {p:{...SPRITE_DEFS.hound.p, g:"#3a2850", G:"#241a33", w:"#e04a3c", e:"#ffd678"}, em:["e","w"], flat:["n"], g:SPRITE_DEFS.wolf.g};
Object.assign(SPR_SCALE, {alphawolf:2, queen:2, foreman:2, alphahound:2});
Object.assign(FOES, {
  pack:{name:"굴의 늑대 떼", sprite:"wolf", count:3, hp:34, ac:13, atk:5, dmg:[6], dmgB:2, verb:"물어뜯기", xp:90, loot:["wolf_fang","leather","silver_dagger"], intro:"어둠 속에서 늑대 세 마리가 동시에 달려든다!"},
  wolfking:{name:"늑대왕 잿송곳니", sprite:"alphawolf", count:1, hp:66, ac:14, atk:6, dmg:[8,6], dmgB:2, verb:"송곳니 찢기", xp:200, intro:"흰 늑대가 몸을 일으킨다. 굴 전체가 낮은 울림으로 떨린다!"},
  leech_elite:{name:"사원 거머리", sprite:"leech", count:3, hp:36, ac:12, atk:5, dmg:[6], dmgB:2, verb:"달라붙어 빨기", xp:100, loot:["wis_ring","healer_robe"], intro:"제단 아래 검은 물에서 굵은 거머리들이 솟아오른다!"},
  queen:{name:"거머리 여왕", sprite:"queen", count:1, hp:78, ac:13, atk:6, dmg:[6,6], dmgB:2, verb:"빨대 촉수", xp:240, regen:4, intro:"제단이 무너지며 사람만 한 거머리가 몸을 일으킨다!"},
  skel_elite:{name:"해골 광부 정예", sprite:"skeleton", count:3, hp:44, ac:14, atk:5, dmg:[8], dmgB:2, verb:"곡괭이 내려찍기", xp:120, loot:["steel_sword","chainmail","star_staff"], intro:"녹슨 투구를 쓴 해골들이 대열을 맞춰 다가온다!"},
  foreman:{name:"해골 감독관 모르그", sprite:"foreman", count:1, hp:92, ac:16, atk:7, dmg:[8,8], dmgB:3, verb:"채찍 곡괭이", xp:300, intro:"「일해라... 영원히...」 감독관의 눈구멍에서 붉은 빛이 타오른다!"},
  hounds_elite:{name:"망루의 사냥개", sprite:"hound", count:3, hp:44, ac:13, atk:6, dmg:[8], dmgB:2, verb:"불꽃 이빨", xp:130, loot:["fire_wand","flame_axe"], intro:"불붙은 계단 위에서 사냥개들이 짖어 댄다!"},
  alphahound:{name:"잿불 우두머리", sprite:"alphahound", count:1, hp:110, ac:16, atk:7, dmg:[8,8], dmgB:3, verb:"용암 송곳니", xp:360, breath:true, intro:"우두머리가 아가리를 벌리자 망루 전체가 붉게 물든다!"}
});
// regeneration is gentler, and fire stops it (D&D trolls)
FOES.troll.regen = [6]; FOES.queen.regen = [8];
const FIRE_GEAR = new Set(["flame_axe", "fire_wand", "flame_greatsword", "phoenix_wand", "ember_fang"]);
const fireHit = (h, style) => style === "firebolt" || !!(h.eq && h.eq.weapon && S.items[h.eq.weapon] && FIRE_GEAR.has(S.items[h.eq.weapon].key));
Object.assign(FOE_STYLE, {pack:"bite", wolfking:"bite", leech_elite:"drain", queen:"drain", skel_elite:"smash", foreman:"smash", hounds_elite:"bite", alphahound:"claw"});
Object.assign(NODES, {
  inn_rest:{bg:"tavern", show:["orna"], fx:{heal:"full"}, lines:["따뜻한 수프와 푹신한 짚 침대. 일행은 오랜만에 깊이 잠들었다.", ["orna","잘 잤나? 얼굴이 좀 펴졌구먼."]], next:"hub", nextLabel:"광장으로 나간다"},
  // 늑대 굴
  den_1:{bg:"forest", art:{bg:"forest", u:[["alphawolf",200]], o:"eyes2", c:[120,50,200,112], cap:"굴 안쪽의 흰 그림자"}, lines:["숲 북쪽, 뿌리 사이로 뚫린 커다란 굴. 입구에 짐승 뼈가 수북하다.", "안쪽 어둠에서 여러 쌍의 눈이 번뜩인다."], prompt:"어떻게 들어갈까?", choices:[
    {t:"check", label:"바람을 등지고 몰래 접근한다", stat:"dex", dc:14, pass:"den_2", fail:"den_pack"},
    {t:"battle", label:"횃불을 들고 정면으로 쳐들어간다", foe:"pack", win:"den_2"},
    {t:"go", label:"오늘은 물러난다", to:"hub"}]},
  den_pack:{bg:"forest", show:["wolf","wolf","wolf"], lines:["마른 가지가 발밑에서 부러졌다! 늑대 떼가 한꺼번에 몸을 일으킨다."], choices:[{t:"battle", label:"싸운다", foe:"pack", win:"den_2"}]},
  den_2:{bg:"forest", show:["alphawolf"], lines:["굴 가장 안쪽. 달빛이 새어 드는 바위 위에 흰 늑대가 앉아 있다.", "잿송곳니. 다른 늑대보다 두 배는 크다. 금빛 눈이 일행을 하나하나 훑는다."], prompt:"늑대왕이 일어선다.", choices:[
    {t:"battle", label:"현상금을 받으러 왔다!", foe:"wolfking", win:"den_win"}, {t:"go", label:"뒷걸음질로 빠져나간다", to:"hub"}]},
  den_win:{bg:"forest", fx:{gold:40, item:"wolfking_fang", qdone:"wolfking"}, art:{bg:"forest", u:P2, o:"chest", c:[60,40,200,112], cap:"늑대왕의 보물"}, lines:["잿송곳니가 길게 울부짖고 쓰러졌다.", "바위 틈에서 늑대왕이 모아 둔 반짝이는 것들을 찾았다."], next:"hub", nextLabel:"굴을 나선다"},
  // 가라앉은 사원
  temple_1:{bg:"swamp", art:{bg:"swamp", u:P2, o:"riddle", c:[60,40,200,112], cap:"반쯤 가라앉은 사원"}, lines:["안개를 헤치자 반쯤 물에 잠긴 사원이 나타난다. 문틀에 오래된 문자가 새겨져 있다."], prompt:"문자를 읽어 볼까?", choices:[
    {t:"check", label:"고대 문자를 해독한다", stat:"int", dc:13, pass:"temple_2", fail:"temple_trap"},
    {t:"go", label:"그냥 들어간다", to:"temple_trap"}, {t:"go", label:"돌아간다", to:"hub"}]},
  temple_trap:{bg:"swamp", fx:{dmg:"2d6", who:"all"}, art:{bg:"swamp", u:P2, o:"spikes", c:[60,40,200,112], cap:"가시 함정"}, lines:["바닥 돌판이 꺼지며 녹슨 가시가 튀어나온다!"], next:"temple_2", nextLabel:"이를 악물고 나아간다"},
  temple_2:{bg:"swamp", show:["leech","leech","leech"], lines:["제단으로 이어지는 복도. 검은 물이 출렁이더니 굵은 거머리들이 기어오른다."], choices:[{t:"battle", label:"싸운다", foe:"leech_elite", win:"temple_3"}]},
  temple_3:{bg:"swamp", show:["queen"], lines:["무너진 제단 위, 사람만 한 거머리가 숨 쉬듯 부풀었다 줄어든다.", "여왕이다. 상처를 입어도 금세 아문다고 한다. 빠르게 끝내야 한다."], choices:[{t:"battle", label:"여왕을 친다!", foe:"queen", win:"temple_win"}, {t:"go", label:"물러난다", to:"hub"}]},
  temple_win:{bg:"swamp", fx:{gold:60, item:"queen_ring", qdone:"queen"}, lines:["여왕이 터지듯 쪼그라들자 사원 안의 물이 맑아진다.", "제단 밑에서 여왕이 삼켰던 반지가 굴러 나왔다."], next:"hub", nextLabel:"사원을 나선다"},
  // 깊은 갱도
  deep_1:{bg:"cave", art:{bg:"cave", u:P2, o:"rubble", c:[60,40,200,112], cap:"무너진 갱도"}, lines:["광산 가장 깊은 곳으로 이어지는 갱도가 바위에 막혀 있다."], prompt:"어떻게 지나갈까?", choices:[
    {t:"check", label:"바위를 들어 옮긴다", stat:"str", dc:14, pass:"deep_2", fail:"deep_rocks"},
    {t:"check", label:"버팀목 구조를 살펴 빈틈을 찾는다", stat:"int", dc:14, pass:"deep_2", fail:"deep_rocks"},
    {t:"go", label:"돌아간다", to:"hub"}]},
  deep_rocks:{bg:"cave", fx:{dmg:"2d6", who:"roller"}, lines:["바위가 미끄러지며 돌무더기가 쏟아졌다! 겨우 길은 났다."], next:"deep_2", nextLabel:"먼지를 털고 나아간다"},
  deep_2:{bg:"cave", show:["skeleton","skeleton","skeleton"], lines:["넓은 채굴장. 녹슨 투구를 쓴 해골들이 곡괭이를 멈추고 일제히 고개를 돌린다."], choices:[{t:"battle", label:"싸운다", foe:"skel_elite", win:"deep_3"}]},
  deep_3:{bg:"cave", show:["foreman"], fx:{flag:"hammerFound"}, lines:["채굴장 끝, 거대한 해골이 녹슨 망치 하나를 깔고 앉아 있다. 손잡이에 「그란」이라고 새겨져 있다.", "「일해라... 영원히...」"], choices:[{t:"battle", label:"감독관을 쓰러뜨린다!", foe:"foreman", win:"deep_win"}, {t:"go", label:"망치만 챙겨 도망친다", to:"hub"}]},
  deep_win:{bg:"cave", fx:{gold:80, qdone:"foreman", loot:["foreman_blade","lamp_staff","deep_cloak","saint_mace"]}, art:{bg:"cave", u:P2, o:"chest", c:[60,40,200,112], cap:"감독관의 금고"}, lines:["감독관이 무너지자 해골들도 하나둘 흙으로 돌아간다.", "감독관이 지키던 금고 안에 광산 최고의 장비가 잠들어 있었다."], next:"hub", nextLabel:"광산을 나선다"},
  // 불탄 망루
  watch_1:{bg:"camp", art:{bg:"camp", u:P2, o:"fire", c:[60,40,200,112], cap:"불타는 망루 계단"}, lines:["탑 아래 낡은 망루. 계단 곳곳에서 아직도 불길이 타오른다."], prompt:"불길을 어떻게 지날까?", choices:[
    {t:"check", label:"불길 사이를 재빨리 뛰어오른다", stat:"dex", dc:14, pass:"watch_2", fail:"watch_burn"},
    {t:"check", label:"젖은 망토를 덮고 버틴다", stat:"con", dc:14, pass:"watch_2", fail:"watch_burn"},
    {t:"go", label:"돌아간다", to:"hub"}]},
  watch_burn:{bg:"camp", fx:{dmg:"2d6", who:"all", fire:true}, lines:["불길이 옷자락을 핥았다! 모두 화상을 입었다."], next:"watch_2", nextLabel:"계속 오른다"},
  watch_2:{bg:"camp", show:["hound","hound","hound"], lines:["망루 중간층. 사냥개들이 불붙은 꼬리를 흔들며 길을 막는다."], choices:[{t:"battle", label:"싸운다", foe:"hounds_elite", win:"watch_3"}]},
  watch_3:{bg:"camp", show:["alphahound"], lines:["꼭대기. 검붉은 털의 거대한 사냥개가 숨을 몰아쉰다. 콧김마다 불꽃이 튄다.", "세 번에 한 번은 불을 뿜는다고 했다. 대비하자."], choices:[{t:"battle", label:"우두머리를 쓰러뜨린다!", foe:"alphahound", win:"watch_win"}, {t:"go", label:"물러난다", to:"hub"}]},
  watch_win:{bg:"camp", fx:{gold:100, qdone:"alpha", loot:["alpha_mantle","ember_fang","phoenix_wand","flame_greatsword"]}, art:{bg:"camp", u:P2, o:"chest", c:[60,40,200,112], cap:"우두머리의 보물"}, lines:["우두머리가 쓰러지자 망루의 불길이 한꺼번에 사그라든다.", "잿더미 속에서 불에도 녹지 않은 장비가 모습을 드러냈다."], next:"hub", nextLabel:"망루를 내려간다"},
  // favors
  ring_search:{bg:"bridge", art:{bg:"bridge", u:P2, o:"glint", c:[60,40,200,112], cap:"진흙 속 반짝임"}, lines:["오르나가 말한 둘째 교각 아래. 진흙 속 어딘가에 반지가 있을 것이다."], choices:[
    {t:"check", label:"손으로 진흙을 더듬는다", stat:"dex", dc:12, pass:"ring_found", fail:"ring_leech"}, {t:"go", label:"나중에 찾는다", to:"hub"}]},
  ring_leech:{bg:"bridge", fx:{dmg:"1d6", who:"roller"}, lines:["진흙 속에서 무언가가 손가락을 물었다! 하지만 손끝에 둥근 것이 걸렸다."], next:"ring_found", nextLabel:"끌어올린다"},
  ring_found:{bg:"bridge", fx:{flag:"ringFound", xp:30}, lines:["진흙을 닦아 내자 작은 금반지가 나온다. 안쪽에 「오르나에게」라고 새겨져 있다."], next:"hub", nextLabel:"반지를 챙긴다"},
  herb_search:{bg:"swamp", art:{bg:"swamp", u:P2, o:"sparkle", c:[60,40,200,112], cap:"달빛 약초"}, lines:["안개가 걷힌 웅덩이 가장자리에 은빛으로 빛나는 풀이 보인다. 달빛 약초다."], choices:[
    {t:"check", label:"뿌리째 조심스럽게 캔다", stat:"wis", dc:13, pass:"herb_found", fail:"herb_fight"}, {t:"go", label:"나중에 온다", to:"hub"}]},
  herb_fight:{bg:"swamp", show:["leech","leech","leech"], lines:["뿌리를 잡아당기자 웅덩이 속 거머리들이 깨어났다!"], choices:[{t:"battle", label:"싸운다", foe:"leeches", win:"herb_found"}]},
  herb_found:{bg:"swamp", fx:{flag:"herbFound", xp:30}, lines:["달빛 약초를 무사히 캤다. 셀린에게 가져가자."], next:"hub", nextLabel:"약초를 챙긴다"}
});

/* ---------- dynamic places: area hub, bounty board, town talks ---------- */
function dyn(id, fn){ Object.defineProperty(NODES, id, {get:fn, enumerable:false, configurable:true}); }
function travelChoices(ch){
  const w = S.world, at = w.at;
  if (at > 0) ch.push({t:"travel", to:at - 1, poi:"exitL", label:`${ro(AREAS[at-1].name)} 돌아간다`});
  if (at > 1) ch.push({t:"travel", to:0, poi:"exitL", label:"마을로 곧장 귀환한다"});
  if (at < w.unlocked) ch.push({t:"travel", to:at + 1, poi:"exitR", label:`${ro(AREAS[at+1].name)} 나아간다`});
}
const DEN_NAME = {wolfking:"늑대 굴 입구", queen:"가라앉은 사원", foreman:"깊은 갱도 입구", alpha:"불탄 망루"};
// the area itself: the party walks it (walk.js); every choice here is tied to a spot on the street (poi)
dyn("hub", () => {
  const w = S.world || newWorld(), a = AREAS[w.at], ch = [];
  if (a.id === "town"){
    const herb = qState("herb") || qOpen("herb"), hammer = qState("hammer") || qOpen("hammer");
    ch.push({t:"shop", shop:"smith", poi:"smith", label:"장비 · 전투 기술서 거래"});
    if (hammer && qState("hammer") !== "claimed") ch.push({t:"go", to:"talk_town", poi:"smith", label:"그란의 부탁"});
    ch.push({t:"go", to:"board", poi:"board", label:"현상금 쪽지를 본다"});
    ch.push({t:"shop", shop:"mage", poi:"selin", label:"지팡이 · 마법 기술서 거래"});
    if (herb && qState("herb") !== "claimed") ch.push({t:"go", to:"talk_town", poi:"selin", label:"셀린의 부탁"});
    ch.push({t:"go", to:"talk_orna", poi:"inn", label:"오르나와 이야기한다"}, {t:"shop", shop:"inn", poi:"inn", label:"물약 · 행운 토큰 사기"},
      {t:"go", to:"inn_rest", cost:10, poi:"inn", label:"하룻밤 쉰다 (HP 회복)"});
  } else {
    if (a.id === "forest" && (S.flags.seenMerchant || w.cleared[w.at])) ch.push({t:"shop", shop:"moro", poi:"moro", label:"수레의 물건을 본다"});
    if (a.id === "swamp" && w.cleared[w.at]) ch.push({t:"go", to:"witch", poi:"witch", label:"그레타와 거래한다"});
    Object.entries(QUESTS).forEach(([q, Q]) => { if (Q.area === a.id && Q.kind === "bounty" && qState(q) === "active") ch.push({t:"go", to:Q.dungeon.to, poi:"dungeon", pn:DEN_NAME[q], pd:`${Q.desc} 들어가면 쉽게 돌아 나올 수 없다.`, label:Q.dungeon.label}); });
    if (a.id === "bridge" && qState("ring") === "active" && !S.flags.ringFound) ch.push({t:"go", to:"ring_search", poi:"spot", pn:"둘째 교각 아래", pd:"오르나가 반지를 잃어버렸다는 자리다. 진흙 속에서 무언가 반짝인다.", label:"진흙을 뒤진다 (오르나의 반지)"});
    if (a.id === "swamp" && qState("herb") === "active" && !S.flags.herbFound) ch.push({t:"go", to:"herb_search", poi:"spot", pn:"은빛 웅덩이", pd:"안개 사이로 은빛으로 빛나는 풀이 보인다. 셀린이 말한 달빛 약초다.", label:"달빛 약초를 캔다 (셀린의 부탁)"});
  }
  // random finds on the road (rolled per game)
  ((S.loot || {})[a.id] || []).forEach(o => { if (o.taken) return;
    if (o.kind === "glint") ch.push({t:"go", to:"loot_get", poi:"loot:" + o.k, pn:o.name, pd:"길바닥에서 무언가 반짝인다. 주워 볼까?", label:"주워 본다"});
    else ch.push({t:"check", stat:o.stat, dc:o.dc, pass:"loot_ok", fail:"loot_no", poi:"loot:" + o.k, pn:o.name, pd:"무언가 숨겨져 있을 것 같다. 잘못 건드리면 다칠 수도 있다.", label:LOOT_TRY[o.stat]}); });
  travelChoices(ch);
  return {bg:areaBg(w.at), show:[], noVote:true, walk:true, local:true, lines:[], prompt:a.name, choices:ch};
});
dyn("board", () => {
  const ch = [], lines = ["낡은 나무 게시판에 현상금 쪽지가 빼곡하다."];
  Object.entries(QUESTS).forEach(([q, Q]) => { if (Q.kind !== "bounty") return; const st = qState(q);
    if (!st && qOpen(q)) ch.push({t:"quest", q, label:`[수락] ${Q.name} — 금화 ${Q.gold}`, desc:Q.desc});
    else if (st === "active") ch.push({t:"noop", q, dis:true, label:`[진행 중] ${Q.name} — ${AREAS[AREA_I(Q.area)].name}`});
    else if (st === "done") ch.push({t:"claim", q, label:`[보상 받기] ${Q.name} — 금화 ${Q.gold} · 경험치 ${Q.xp}`}); });
  if (!ch.length) lines.push("지금 붙어 있는 현상금은 없다. 더 먼 곳까지 가 보면 새 쪽지가 붙을 것이다.");
  ch.push({t:"go", to:"hub", label:"게시판을 떠난다"});
  return {bg:"tavern", show:["orna"], noVote:true, lines, again:lines, prompt:"현상금 게시판", choices:ch};
});
const ORNA_TALK = [
  ["준비는 단단히 하고 가. 늑대한테 물리면 약도 없어."],
  ["숲을 지났다고? 허, 처음 봤을 땐 칼도 제대로 못 쥘 것 같더니.", "다리의 트롤 그룸은 배가 고프면 사납고, 배가 부르면 순해. 기억해."],
  ["트롤을 넘었구먼! 마을에 소문이 벌써 쫙 퍼졌어.", "늪의 마녀 그레타는... 내 오랜 친구야. 겁먹지 말고 예의만 지켜."],
  ["그레타를 만났다니. 그 노인네, 아직 살아 있었구먼.", "광산의 해골들은 원래 우리 마을 광부들이었어. 편히 쉬게 해 줘."],
  ["너희 눈빛이 달라졌어. 처음 여관 문을 열고 들어올 때랑은 딴사람이야.", "탑 아래 언덕에서 하룻밤 묵게 될 거야. 불씨를 꺼뜨리지 마."],
  ["탑이 코앞이야. 탑 문지기는 수수께끼를 좋아한다더군.", "올라가기 전에 그란한테 장비를 손봐 달라고 해."],
  ["...이제 꼭대기만 남았구먼.", "살아서 돌아와. 금화 백 닢보다 그게 더 중요해."],
  ["가거라. 불씨골이 너희를 기다린다."]
];
dyn("talk_orna", () => {
  const w = S.world || newWorld(), ch = [], lines = ORNA_TALK[Math.min(ORNA_TALK.length - 1, w.unlocked)].map(t => ["orna", t]);
  const st = qState("ring");
  if (!st && qOpen("ring")){ lines.push(["orna","...그리고 부탁이 하나 있어. 젊을 적 트롤의 다리에서 결혼반지를 잃어버렸어. 둘째 교각 아래였지."]); ch.push({t:"quest", q:"ring", label:"[부탁] 반지를 찾아 드리겠다"}); }
  if (st === "active") ch.push(S.flags.ringFound ? {t:"claim", q:"ring", label:"[반지를 돌려준다]"} : {t:"noop", dis:true, label:"[진행 중] 트롤의 다리에서 반지 찾기"});
  ch.push({t:"go", to:"hub", label:"광장으로 돌아간다"});
  return {bg:"tavern", show:["orna"], noVote:true, lines, again:lines.slice(0, 1), prompt:"오르나", choices:ch};
});
dyn("talk_town", () => {
  const ch = [], lines = [];
  const herb = qState("herb"), hammer = qState("hammer");
  if (!herb && qOpen("herb")){ lines.push(["selin","안개 늪의 달빛 약초 좀 구해 줄래요? 대신 기술서 한 권을 공짜로 드릴게요."]); ch.push({t:"quest", q:"herb", label:"[셀린의 부탁] 달빛 약초 구하기"}); }
  if (herb === "active") ch.push(S.flags.herbFound ? {t:"claim", q:"herb", label:"[셀린에게 약초를 건넨다]"} : {t:"noop", dis:true, label:"[진행 중] 안개 늪에서 달빛 약초 찾기"});
  if (!hammer && qOpen("hammer")){ lines.push(["smith","광산 깊은 곳에 아버지 망치가 있어. 찾아오면 내 물건은 앞으로 2할 깎아 주지."]); ch.push({t:"quest", q:"hammer", label:"[그란의 부탁] 아버지의 망치 찾기"}); }
  if (hammer === "active") ch.push(S.flags.hammerFound ? {t:"claim", q:"hammer", label:"[그란에게 망치를 건넨다]"} : {t:"noop", dis:true, label:"[진행 중] 버려진 광산 깊은 갱도에서 망치 찾기"});
  if (!lines.length) lines.push(["selin","오늘은 부탁할 게 없네요. 또 들러요."]);
  ch.push({t:"go", to:"hub", label:"광장으로 돌아간다"});
  return {bg:"tavern", show:["smith","selin"], noVote:true, lines, again:lines, prompt:"상인들의 부탁", choices:ch};
});

/* ---------- quest actions ---------- */
function acceptQuest(q){ const Q = QUESTS[q]; if (!Q || qState(q) || !qOpen(q)) return; S.quests[q] = "active"; sfx("good");
  if (q === "hammer" && S.flags.hammerFound) S.flags.hammerFound = true;
  enterNode(S.nodeId, [["sys", `퀘스트 수락: ${Q.name}${Q.kind === "bounty" ? ` — ${AREAS[AREA_I(Q.area)].name}에 입구가 생겼다` : ""}`]]); }
function claimQuest(q){
  const Q = QUESTS[q], st = qState(q); if (!Q) return;
  const ok = Q.kind === "bounty" ? st === "done" : st === "active" && (q === "ring" ? S.flags.ringFound : q === "herb" ? S.flags.herbFound : S.flags.hammerFound);
  if (!ok) return; S.quests[q] = "claimed"; const out = [];
  if (Q.kind === "bounty"){ out.push(["sys", `현상금 수령: ${Q.name}`]); out.push(...applyFx({gold:Q.gold, xp:Q.xp})); }
  if (q === "ring"){ out.push(["orna","...이걸 정말 찾아왔어? 고마워. 정말로."], ["orna","이 로켓을 가져가. 남편이 내게 준 거야. 이제 너희를 지켜 줄 거다."]); out.push(...applyFx({item:"orna_locket", luck:2, xp:80})); }
  if (q === "herb"){ S.freeBooks = (S.freeBooks || 0) + 1; out.push(["selin","완벽해요! 약속대로 기술서 한 권은 공짜예요. 상점에서 골라요."], ["sys","무료 기술서 교환권 +1 (셀린의 상점)"]); out.push(...applyFx({gold:40, xp:80})); }
  if (q === "hammer"){ out.push(["smith","...아버지 망치. 손잡이가 아직 따뜻한 것 같군."], ["smith","약속대로 내 물건은 이제 2할 싸게 주지. 그리고 이건 덤이야."]); out.push(...applyFx({flag:"smithDiscount", gold:80, xp:100})); }
  sfx("levelup"); banner("퀘스트 완료!", "gold");
  enterNode(S.nodeId, out);
}

function renderWorldBar(){
  const el = $("#worldBar"); if (!el) return; const w = S.world;
  if (!w || S.screen !== "game" || S.battle){ el.hidden = true; return; }
  const gathered = allGathered(), can = S.nodeId === "hub" && S.mode === "walk" && !busy && !(S.walk && S.walk.auto) && gathered;
  const n = Math.min(AREAS.length, w.unlocked + 2);
  el.hidden = false;
  el.innerHTML = AREAS.slice(0, n).map((a, i) => { const locked = i > w.unlocked, here = i === w.at;
    return `${i ? `<i class="wb-road ${locked ? "lock" : ""}"></i>` : ""}<button class="wb-node ${here ? "here" : ""} ${locked ? "lock" : ""} ${w.cleared[i] ? "done" : ""}" data-act="travel" data-i="${i}" ${!can || locked || here ? "disabled" : ""} title="${esc(a.name)}"><canvas class="px" data-spr="${locked ? "bounty" : a.icon}"></canvas><span>${locked ? "???" : esc(a.name)}</span></button>`; }).join("")
    + `<span class="wb-tip">${can ? "누르면 빠른 이동" : S.nodeId === "hub" && !gathered ? "모두 이정표에 모이면 이동" : S.nodeId === "hub" ? "" : "이 지역의 사건을 마치면 이동할 수 있어요"}</span>`;
  paintAll(el);
}

/* ---------- shop window ---------- */
let SHOP = {id:null, tab:"buy"};
function openShop(id){ if (!SHOPS[id] || !shopHere(id)) return; SHOP = {id, tab:"buy"}; $("#shop").hidden = false; renderShop(); sfx("select"); }
function closeShop(){ SHOP.id = null; $("#shop").hidden = true; sfx("select"); }
function itemCard(key, price, act, extra){ const it = ITEMS[key];
  return `<div class="sh-card" style="--rc:${RARITY[it.r].c}"><canvas class="px" data-spr="it_${key}"></canvas><div class="sh-info"><b style="color:${RARITY[it.r].c}">${esc(it.name)}</b>
    <span>${RARITY[it.r].ko} · ${SLOT_KO[it.slot]}${it.cls ? " · " + it.cls.map(c => CLASSES[c].ko).join("/") : ""}</span><em>${fxLines(it.fx).join(" · ") || "&nbsp;"}</em></div>
    <div class="sh-buy">${extra || ""}<button class="btn small primary" ${act}>${price}<canvas class="px coin" data-spr="coin"></canvas></button></div></div>`; }
function renderShop(){
  if (!SHOP.id || $("#shop").hidden) return; const sh = SHOPS[SHOP.id];
  if (!shopHere(SHOP.id)){ closeShop(); return; }
  paintSpriteCanvas($("#shopPortrait"), sh.spr); $("#shopName").textContent = sh.name; $("#shopGreet").textContent = sh.greet;
  $("#shopGold").innerHTML = `<canvas class="px" data-spr="coin"></canvas>${S.gold}${S.freeBooks ? ` <small>무료 기술서 ${S.freeBooks}</small>` : ""}`;
  document.querySelectorAll("#shop .sh-tab").forEach(b => b.classList.toggle("on", b.dataset.t === SHOP.tab));
  let html = "";
  if (SHOP.tab === "buy"){
    if (sh.supplies) html += `<h4>소모품</h4><div class="sh-grid">` + Object.entries(SUPPLIES).map(([k, s]) => `<div class="sh-card"><canvas class="px" data-spr="${k === "potion" ? "potion" : "coin"}"></canvas><div class="sh-info"><b>${s.name}</b><span>${s.desc}</span><em>보유 ${k === "potion" ? S.potions : S.luck}</em></div><div class="sh-buy"><button class="btn small primary" data-act="shopSupply" data-k="${k}" ${S.gold < s.price ? "disabled" : ""}>${s.price}<canvas class="px coin" data-spr="coin"></canvas></button></div></div>`).join("") + `</div>`;
    const booksHTML = !sh.books ? "" : `<h4>기술서 <small>배운 기술은 전투마다 정해진 횟수만큼 쓸 수 있어요</small></h4><div class="sh-grid">` + sh.books.map(k => { const sk = SKILLS[k], free = (S.freeBooks || 0) > 0 && SHOP.id === "mage";
      const who = S.party.map((h, m) => h.cls !== sk.cls ? "" : (h.skills || []).includes(k) ? `<span class="sh-learned">${esc(h.name)} 습득</span>` :
        `<button class="btn small ${free ? "primary" : "ghost"}" data-act="shopLearn" data-k="${k}" data-i="${m}" ${!mine(m) || (!free && S.gold < sk.price) ? "disabled" : ""}>${esc(h.name)} ${free ? "무료" : sk.price}</button>`).join("");
      return `<div class="sh-card book"><canvas class="px" data-spr="skillbook"></canvas><div class="sh-info"><b>${sk.name}</b><span>${CLASSES[sk.cls].ko} 전용 · 전투당 ${sk.uses}회</span><em>${sk.desc}</em></div><div class="sh-buy">${who || `<span class="sh-learned">배울 수 있는 동료가 없어요</span>`}</div></div>`; }).join("") + `</div>`;
    html += booksHTML;
    if (sh.goods.length) html += `<h4>장비 ${SHOP.id === "smith" && S.flags.smithDiscount ? "<small>그란의 2할 할인 적용</small>" : ""}</h4><div class="sh-grid">` + sh.goods.map(k => itemCard(k, priceOf(k, SHOP.id), `data-act="shopBuy" data-k="${k}" ${S.gold < priceOf(k, SHOP.id) ? "disabled" : ""}`)).join("") + `</div>`;
  } else {
    const list = S.inv.filter(u => S.items[u]);
    html += list.length ? `<h4>가방 속 장비 <small>착용 중인 장비는 팔 수 없어요</small></h4><div class="sh-grid">` + list.map(u => itemCard(S.items[u].key, sellOf(S.items[u].key), `data-act="shopSell" data-u="${u}"`, `<span class="sh-sell">판매</span>`)).join("") + `</div>` : `<p class="sh-empty">팔 수 있는 물건이 없어요.</p>`;
  }
  $("#shopBody").innerHTML = html; paintAll($("#shop"));
}
function shopAct(peer, a, d){
  const sh = SHOPS[d.s]; if (!sh || !shopHere(d.s) || busy || S.battle) return false;
  if (a === "shopSupply"){ const s = SUPPLIES[d.k]; if (!s || !sh.supplies || S.gold < s.price) return false; S.gold -= s.price; if (d.k === "potion") S.potions++; else S.luck++; sfx("good"); }
  else if (a === "shopBuy"){ if (!sh.goods.includes(d.k)) return false; const p = priceOf(d.k, d.s); if (S.gold < p) return false; S.gold -= p; giveItem(d.k); sfx("good"); itemToast(d.k); }
  else if (a === "shopSell"){ const u = d.u, o = S.items[u]; if (!o || !S.inv.includes(u)) return false; S.inv = S.inv.filter(x => x !== u); delete S.items[u]; S.gold += sellOf(o.key); sfx("good"); }
  else if (a === "shopLearn"){ const sk = SKILLS[d.k], h = S.party[d.m]; if (!sk || !sh.books || !sh.books.includes(d.k) || !h || h.cls !== sk.cls || ownerPeer(d.m) !== peer && online()) return false;
    h.skills = h.skills || []; if (h.skills.includes(d.k)) return false;
    if ((S.freeBooks || 0) > 0 && d.s === "mage") S.freeBooks--; else { if (S.gold < sk.price) return false; S.gold -= sk.price; }
    h.skills.push(d.k); sfx("levelup"); banner(`${h.name}: ${sk.name} 습득!`, "gold"); }
  else return false;
  save(); refreshStatus(); renderShop(); if (invOpen()) renderInv(); return true;
}

/* ---------- skills in battle ---------- */
async function useSkill(k){
  const b = S.battle; if (!b || busy || b.phase !== "hero") return; const i = b.cur, h = S.party[i], sk = SKILLS[k], f = FOES[b.key];
  if (!sk || !(h.skills || []).includes(k) || !b.suses || !b.suses[i] || !(b.suses[i][k] > 0)) return;
  b.suses[i][k]--; busy = true; S.mode = "battle";
  if (sk.kind === "guard" || sk.kind === "bless"){
    if (sk.kind === "guard") b.guard = {v:sk.val, t:sk.turns}; else b.bless = {v:sk.val, t:sk.turns};
    FX.aura(sk.kind === "guard" ? "#6e9198" : "#ffd678"); banner(sk.name, "gold");
    bmsg(`${h.name}의 ${sk.name}! ${sk.kind === "guard" ? `${sk.turns}라운드 동안 파티 방어도 +${sk.val}` : `${sk.turns}라운드 동안 파티 명중 +${sk.val}`}.`);
    refreshStatus(); await sleep(700); busy = false; return endHeroTurn();
  }
  if (sk.kind === "heal"){
    const w = mod(statOf(h, "wis")) + bonus(h, "heal");
    trayOpen({who:h.cls, seat:i, title:`${h.name} — ${sk.name}`, sub:`파티 전원 1d8${sgn(w)} 회복`});
    const vals = await throwDice(dice(8, 1, h.cls)); showLabels(vals, ["keep"]);
    const r = sumRoll(vals, w); const lines = S.party.map((p, j) => { const was = p.hp; p.hp = Math.min(p.maxHp, p.hp + r.t); if (p.hp > was) FX.heal(j, p.hp - was); return `${esc(p.name)} +${p.hp - was}`; });
    bmsg(`${h.name}의 ${sk.name}! 모두 HP +${r.t}.`); trayResult(verdictHTML(r.calc, lines.join(" · "), "good")); refreshStatus();
    await trayWait("계속"); trayClose(); busy = false; return endHeroTurn();
  }
  if (sk.kind === "auto"){
    const db = dmgMod(h);
    trayOpen({who:h.cls, seat:i, title:`${h.name} — ${sk.name}`, sub:`${esc(f.name)}에게 · 반드시 명중 · ${sk.dice.map(d => "d" + d).join("+")}${sgn(db)}`});
    const vals = await throwDice(sk.dice.map(s => ({sides:s, scheme:h.cls}))); showLabels(vals, vals.map(() => "keep"));
    const r = sumRoll(vals, db); dmgFoe(r.t); if (fireHit(h, sk.style)) S.battle.burn = true; FX.strike(i, sk.style, r.t, false, false); bmsg(`${h.name}의 ${sk.name}! 피해 ${r.t}.`);
    trayResult(verdictHTML(r.calc, `피해 ${r.t}!`, "good")); refreshStatus();
    await trayWait("계속"); trayClose(); busy = false; return endHeroTurn();
  }
  // strike: attack roll, extra damage dice, rider effects
  const am = atkMod(h) + (sk.hit || 0), adv = !!sk.adv;
  trayOpen({who:h.cls, seat:i, title:`${h.name} — ${sk.name}`, sub:`${esc(f.name)} · 방어도 <b>${b.ac}</b> · 명중 <b>${sgn(am)}</b>${adv ? " · d20 두 개 중 높은 눈" : ""}`});
  setTarget({lead:"d20에서", target:b.ac, mod:am, word:"나오면 명중", adv});
  let vals, raw, crit, miss, calc, skipWait = false;
  for (;;){
    vals = await throwDice(dice(20, adv ? 2 : 1, h.cls), {outPolicy:"fail"});
    if (vals.out){ showLabels(vals); trayResult(verdictHTML("주사위가 트레이를 넘어갔다", "장외 — 빗나감!", "bad")); sfx("bad"); miss = true; raw = 0; }
    else { markTarget(vals); raw = Math.max(...vals); const keepI = vals.indexOf(raw); crit = raw === 20; miss = raw === 1 || (!crit && raw + am < b.ac);
      showLabels(vals, vals.map((v, j) => j !== keepI ? "drop" : crit ? "crit" : raw === 1 ? "fumble" : "keep"));
      calc = `${raw} ${sgn(am)} = <strong>${raw + am}</strong> <em>vs AC ${b.ac}</em>`;
      if (miss){ trayResult(verdictHTML(calc, "빗나갔다!", "bad")); sfx("bad"); } }
    if (!miss) break; const a = await askLuck(); if (a === "luck"){ trayResult(""); continue; } skipWait = a === "skip"; break;
  }
  const style = sk.style || HERO_STYLE[h.cls][0];
  if (miss){ FX.strike(i, style, 0, false, true); bmsg(`${h.name}의 ${sk.name}! 빗나갔다.`); bark(i, pickLine(BARK.miss)); if (!skipWait) await trayWait("계속"); trayClose(); busy = false; return endHeroTurn(); }
  if (crit){ banner("CRITICAL!", "gold"); sfx("crit"); } else sfx("good");
  trayResult(verdictHTML(calc, crit ? "치명타! 피해 주사위가 두 배" : "명중!", crit ? "crit" : "good"));
  const dl = [...CLASSES[h.cls].dmg, ...sk.extra], all = crit ? dl.concat(dl) : dl;
  await trayWait("피해 굴리기"); setTarget(null);
  const dv = await throwDice(all.map(s => ({sides:s, scheme:h.cls})), {hint:"피해 주사위를 던지세요"}); showLabels(dv, dv.map(() => "keep"));
  const r = sumRoll(dv, dmgMod(h)); dmgFoe(r.t); if (fireHit(h, style)) S.battle.burn = true; FX.strike(i, style, r.t, crit, false);
  let rider = ""; if (sk.stun && b.hp > 0){ b.stun = true; rider = " 적이 기절했다!"; } if (sk.poison && b.hp > 0){ b.poison = {t:sk.poison}; rider = ` 독이 퍼진다! (${sk.poison}라운드)`; }
  bmsg(`${h.name}의 ${sk.name}! ${crit ? "치명타! " : ""}피해 ${r.t}.${rider}`);
  trayResult(verdictHTML(r.calc, `피해 ${r.t}!${rider}`, crit ? "crit" : "good")); refreshStatus();
  await trayWait("계속"); trayClose(); busy = false; endHeroTurn();
}
// start of the foe's turn: poison ticks, stun skips the attack
async function foeStatus(){
  const b = S.battle, f = FOES[b.key];
  if (b.poison && b.poison.t > 0 && b.hp > 0){ const d = rnd(6); b.hp = Math.max(0, b.hp - d); b.poison.t--; floatFoe("-" + d, "#7aa35a"); bmsg(`독이 퍼진다! ${f.name} −${d}.`); refreshStatus(); renderBattle(); await sleep(600);
    if (b.hp <= 0){ busy = false; winBattle(); return true; } }
  if (b.stun){ b.stun = false; floatFoe("기절", "#ffd678"); bmsg(`${f.name}${hasB(f.name) ? "이" : "가"} 기절해서 움직이지 못한다!`); refreshStatus(); renderBattle(); await sleep(900); busy = false; endFoeTurn(); return true; }
  return false;
}
function tickBuffs(){ const b = S.battle; if (!b) return; ["guard","bless"].forEach(k => { if (b[k]){ b[k].t--; if (b[k].t <= 0) delete b[k]; } }); }

/* ---------- party chat ---------- */
function pushChat(nick, text, seat){ const t = String(text || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120); if (!t) return;
  S.chat = (S.chat || []).concat([{n:cleanNick(nick), t, k:seat ?? -1}]).slice(-40); renderChat(true); netDirty(); }
function sendChat(){ const el = $("#chatIn"), v = el.value.trim(); if (!v) return; el.value = "";
  if (isGuest()) sendInput("chat", {v: v.slice(0, 120)}); else pushChat(NET.nick || "방장", v, 0); }
let chatSeen = 0;
function renderChat(bump){
  const win = $("#chatWin"); if (!win) return; const on = online() && (S.screen === "game" || S.screen === "setup");
  win.hidden = !on; if (!on) return;
  const list = S.chat || [], box = $("#chatLog"), atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 8;
  box.innerHTML = list.map(m => `<p class="${m.k >= 0 && mine(m.k) && m.n === cleanNick(NET.nick) ? "me" : ""}"><b>${esc(m.n)}</b>${esc(m.t)}</p>`).join("") || `<p class="sys">파티원과 대화해 보세요. <span class="key">/</span> 키로 바로 입력할 수 있어요.</p>`;
  if (atEnd || bump) box.scrollTop = box.scrollHeight;
  const unread = win.classList.contains("min") ? list.length - chatSeen : 0; $("#chatBadge").hidden = unread <= 0; $("#chatBadge").textContent = unread;
  if (!win.classList.contains("min")) chatSeen = list.length;
}

/* ---------- inventory: who wears what ---------- */
function wornList(){ const out = []; S.party.forEach((h, m) => SLOTS.forEach(sl => { const uid = h.eq && h.eq[sl]; if (uid && S.items[uid]) out.push({uid, m}); })); return out; }
FX.aura = function(color){ S.party.forEach((h, i) => { if (h.hp <= 0) return; const [x, y] = FX.heroCenter(i); scene.burst(x, y + 6, 14, [color, "#f4f2ea"], 30, {up:24}); }); scene.light(70, 140, 90, [0.8, 0.95, 1.1], 0.6); sfx("magic"); };
window.__dbg.W = {travel:i => travel(i), openShop:id => openShop(id), shopAct:(a, d) => shopAct(NET.me, a, d), useSkill:k => useSkill(k), SKILLS, AREAS, QUESTS, heroKey:h => heroKey(h)};
