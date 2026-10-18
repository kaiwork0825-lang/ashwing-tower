/* ===================== GAME ===================== */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rnd = n => 1 + Math.floor(Math.random() * n);
const mod = v => Math.floor((v - 10) / 2);
const sgn = n => (n >= 0 ? "+" : "−") + Math.abs(n);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hasB = w => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; };
const iga = w => w + (hasB(w) ? "이" : "가");
const eun = w => w + (hasB(w) ? "은" : "는");
let sfx = (n, a) => Audio8.sfx(n, a);
const stageEl = $("#stage"), vpEl = $("#vp");
function fitStage(){ const cs = getComputedStyle(vpEl); const pl = parseFloat(cs.paddingLeft)||0, pr = parseFloat(cs.paddingRight)||0, pt = parseFloat(cs.paddingTop)||0, pb = parseFloat(cs.paddingBottom)||0;
  const W = vpEl.clientWidth - pl - pr, H = vpEl.clientHeight - pt - pb, k = Math.min(W/1920, H/1080);
  stageEl.style.transform = `translate(${pl + (W - 1920*k)/2}px,${pt + (H - 1080*k)/2}px) scale(${k})`; }
window.addEventListener("resize", fitStage); document.addEventListener("fullscreenchange", fitStage); fitStage();
function toggleFull(){ try { if (!document.fullscreenElement){ const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); r && r.catch && r.catch(() => {}); } else { const r = document.exitFullscreen && document.exitFullscreen(); r && r.catch && r.catch(() => {}); } } catch (e) {} }

/* ================= RULES ================= */
const STATS = ["str","dex","con","int","wis","cha"];
const STAT_KO = {str:"힘",dex:"민첩",con:"건강",int:"지능",wis:"지혜",cha:"매력"};
const CLASSES = {
  fighter:{ko:"전사", hd:10, ac:16, dexCap:0, prio:["str","con","dex","wis","cha","int"], prof:["str","con"], atkStat:"str", atkName:"장검 베기", dmg:[8], uses:1,
    special:{name:"강타", desc:"명중 시 피해 +1d8"}, blurb:"두꺼운 갑옷과 장검으로 맨 앞에서 버팁니다."},
  wizard:{ko:"마법사", hd:6, ac:11, dexCap:9, prio:["int","dex","con","wis","cha","str"], prof:["int","wis"], atkStat:"int", atkName:"화염 화살", dmg:[10], uses:1,
    special:{name:"마법 화살", desc:"반드시 명중 · 3d4+3"}, blurb:"몸은 약하지만 강력한 주문을 다룹니다."},
  rogue:{ko:"도적", hd:8, ac:12, dexCap:9, prio:["dex","int","con","cha","wis","str"], prof:["dex","cha"], atkStat:"dex", atkName:"단검 찌르기", dmg:[6], uses:1,
    special:{name:"급소 찌르기", desc:"d20 두 개 중 높은 눈 · 명중 시 +2d6"}, blurb:"덫과 자물쇠, 말솜씨와 기습의 달인."},
  cleric:{ko:"성직자", hd:8, ac:14, dexCap:2, prio:["wis","con","str","cha","dex","int"], prof:["wis","cha"], atkStat:"str", atkName:"철퇴 내려치기", dmg:[6], uses:2,
    special:{name:"치유의 빛", desc:"가장 다친 동료 1d8+지혜+3 회복"}, blurb:"동료를 치유하고 쓰러진 이를 일으킵니다."}
};
const XP_T = [0, 100, 250, 450, 700, 1000];

/* ================= ITEMS ================= */
const SLOTS = ["weapon","armor","ring","amulet"];
const SLOT_KO = {weapon:"무기", armor:"갑옷", ring:"반지", amulet:"목걸이"};
const RARITY = [{ko:"일반", c:"#b6cbc0", w:6}, {ko:"고급", c:"#7aa35a", w:5}, {ko:"희귀", c:"#6e9198", w:3}, {ko:"영웅", c:"#8a62a0", w:2}, {ko:"전설", c:"#fbb954", w:1}];
const FX_KO = {atk:"명중", dmg:"피해", ac:"방어도", hp:"최대 HP", check:"모든 판정", heal:"치유량", str:"힘", dex:"민첩", con:"건강", int:"지능", wis:"지혜", cha:"매력"};
const ITEMS = {
  // starter gear (no bonuses — the class base already includes it)
  rusty_sword:{name:"견습 장검", slot:"weapon", type:"sword", r:0, cls:["fighter"], fx:{}, desc:"훈련소에서 받은 평범한 검. 이가 조금 빠졌다."},
  old_mace:{name:"낡은 철퇴", slot:"weapon", type:"mace", r:0, cls:["cleric"], fx:{}, desc:"수도원 창고에서 꺼내 온 철퇴."},
  old_dagger:{name:"견습 단검", slot:"weapon", type:"dagger", r:0, cls:["rogue"], fx:{}, desc:"손에 익은 작은 단검."},
  old_staff:{name:"견습 지팡이", slot:"weapon", type:"staff", r:0, cls:["wizard"], fx:{}, desc:"마법 학원 졸업 기념품."},
  start_mail:{name:"견습 사슬 갑옷", slot:"armor", type:"plate", r:0, cls:["fighter"], fx:{}, desc:"무겁지만 든든하다."},
  start_vest:{name:"수련 사제복", slot:"armor", type:"plate", r:0, cls:["cleric"], fx:{}, pal:{m:"#b6cbc0", M:"#f4f2ea"}, desc:"안에 얇은 쇠사슬을 덧댔다."},
  start_leather:{name:"낡은 가죽옷", slot:"armor", type:"cloak", r:0, cls:["rogue"], fx:{}, pal:{c:"#452017", C:"#61291a"}, desc:"소리 없이 움직이기 좋다."},
  start_robe:{name:"견습 로브", slot:"armor", type:"cloak", r:0, cls:["wizard"], fx:{}, pal:{c:"#3a2850", C:"#5c3f72"}, desc:"소매에 잉크 얼룩이 남아 있다."},
  // weapons
  steel_sword:{name:"강철 장검", slot:"weapon", type:"sword", r:1, cls:["fighter","cleric"], fx:{atk:1}, desc:"잘 벼린 강철. 손잡이 균형이 좋다."},
  flame_axe:{name:"불꽃 도끼", slot:"weapon", type:"axe", r:2, cls:["fighter"], fx:{dmg:2}, pal:{m:"#c95a24", M:"#fbb954", g:"#e04a3c"}, desc:"날에서 잿불이 피어오른다."},
  frost_blade:{name:"서리 장검", slot:"weapon", type:"sword", r:3, cls:["fighter","cleric"], fx:{atk:1, dmg:3}, pal:{m:"#6e9198", M:"#dfe6d6", g:"#b6cbc0"}, desc:"용의 불길에도 녹지 않는다는 북쪽의 검."},
  holy_mace:{name:"성광 철퇴", slot:"weapon", type:"mace", r:2, cls:["cleric"], fx:{atk:1, heal:2}, pal:{m:"#fbb954", M:"#fff0b0", g:"#dfe6d6"}, desc:"휘두를 때마다 은은한 빛이 남는다."},
  venom_dagger:{name:"독니 단검", slot:"weapon", type:"dagger", r:1, cls:["rogue"], fx:{dmg:2}, pal:{m:"#4a7f48", M:"#7aa35a", g:"#2f5e3e"}, desc:"거미 독이 칼날에 배어 있다."},
  shadow_dagger:{name:"그림자 단검", slot:"weapon", type:"dagger", r:2, cls:["rogue"], fx:{atk:2, dmg:1}, pal:{m:"#5c3f72", M:"#8a62a0", g:"#b6cbc0"}, desc:"빛을 반사하지 않는 칼날."},
  star_staff:{name:"별빛 지팡이", slot:"weapon", type:"staff", r:1, cls:["wizard"], fx:{atk:1, dmg:1}, pal:{g:"#b6cbc0", G:"#f4f2ea"}, desc:"끝에 박힌 수정이 밤하늘처럼 반짝인다."},
  fire_wand:{name:"화염 완드", slot:"weapon", type:"wand", r:2, cls:["wizard"], fx:{dmg:3}, pal:{g:"#e2762d", G:"#ffd678"}, desc:"쥐고만 있어도 손바닥이 따뜻하다."},
  archmage_staff:{name:"잿빛 현자의 지팡이", slot:"weapon", type:"staff", r:3, cls:["wizard"], fx:{atk:2, dmg:2, int:2}, pal:{h:"#6a6c78", g:"#8a62a0", G:"#dfe6d6"}, desc:"탑을 처음 세운 마법사의 유품."},
  // armor
  leather:{name:"질긴 가죽 갑옷", slot:"armor", type:"cloak", r:1, cls:["rogue","wizard","cleric"], fx:{ac:1}, pal:{c:"#61291a", C:"#82341c"}, desc:"늑대 가죽을 두 겹으로 덧댔다."},
  chainmail:{name:"사슬 갑옷", slot:"armor", type:"plate", r:1, cls:["fighter","cleric"], fx:{ac:1, hp:3}, desc:"촘촘하게 엮은 쇠고리."},
  dwarf_plate:{name:"브론의 판금 갑옷", slot:"armor", type:"plate", r:3, cls:["fighter","cleric"], fx:{ac:2, hp:6}, pal:{m:"#c95a24", M:"#fbb954", g:"#7fe3f0"}, desc:"드워프 장인이 직접 두드린 갑옷. 이음매 하나 없다."},
  mage_robe:{name:"별수 로브", slot:"armor", type:"cloak", r:1, cls:["wizard"], fx:{ac:1, int:1}, pal:{c:"#283d55", C:"#426276", g:"#fbb954"}, desc:"금실로 별자리를 수놓았다."},
  shadow_cloak:{name:"그림자 망토", slot:"armor", type:"cloak", r:2, cls:["rogue","wizard"], fx:{ac:1, dex:2}, pal:{c:"#5c3f72", C:"#8a62a0", g:"#b6cbc0"}, desc:"입으면 윤곽이 흐릿해진다."},
  // rings
  copper_ring:{name:"구리 반지", slot:"ring", type:"ring", r:0, fx:{hp:3}, pal:{m:"#a6441f", M:"#e2762d"}, desc:"광부들이 행운을 빌며 끼던 반지."},
  str_ring:{name:"힘의 반지", slot:"ring", type:"ring", r:1, fx:{str:2}, pal:{g:"#e04a3c"}, desc:"끼는 순간 팔에 힘줄이 선다."},
  dex_ring:{name:"바람의 반지", slot:"ring", type:"ring", r:1, fx:{dex:2}, pal:{g:"#7aa35a"}, desc:"손끝이 가벼워진다."},
  wis_ring:{name:"혜안의 반지", slot:"ring", type:"ring", r:1, fx:{wis:2}, pal:{g:"#6e9198"}, desc:"보이지 않던 것이 보인다."},
  luck_ring:{name:"네잎 반지", slot:"ring", type:"ring", r:2, fx:{check:1, hp:3}, pal:{m:"#fbb954", M:"#fff0b0", g:"#7aa35a"}, desc:"네잎클로버를 금속으로 떠냈다."},
  // amulets
  wolf_fang:{name:"늑대 이빨 목걸이", slot:"amulet", type:"amulet", r:0, fx:{atk:1}, pal:{m:"#61291a", M:"#82341c", g:"#dfe6d6", G:"#f4f2ea"}, desc:"사냥꾼들의 부적."},
  fairy_amulet:{name:"피피의 꽃목걸이", slot:"amulet", type:"amulet", r:2, fx:{check:1, hp:4}, pal:{m:"#7aa35a", M:"#b6cbc0", g:"#8a62a0", G:"#dfe6d6"}, desc:"시들지 않는 요정의 꽃을 엮었다."},
  witch_charm:{name:"그레타의 부적", slot:"amulet", type:"amulet", r:2, fx:{int:1, wis:1, heal:2}, pal:{m:"#452017", M:"#61291a", g:"#7aa35a", G:"#b6cbc0"}, desc:"뼈와 마른 풀로 엮었다. 묘하게 따뜻하다."},
  ember_scale:{name:"잿비늘 목걸이", slot:"amulet", type:"amulet", r:3, fx:{ac:1, fireRes:1}, pal:{m:"#a6441f", M:"#e2762d", g:"#e04a3c", G:"#fbb954"}, desc:"용의 비늘 한 장. 용의 숨결 피해를 절반으로 줄인다."}
};
const STARTER = {fighter:["rusty_sword","start_mail"], cleric:["old_mace","start_vest"], rogue:["old_dagger","start_leather"], wizard:["old_staff","start_robe"]};
const ICONS = {
  sword:{p:{m:"#a2a3ac", M:"#dfe6d6", h:"#61291a", g:"#e04a3c"}, g:["..........MM",".........MmM","........MmM.",".......MmM..","......MmM...",".....MmM....","..g.MmM.....","..ggmM......","...hgg......","..h..gg.....",".h..........","h..........."]},
  axe:{p:{m:"#a2a3ac", M:"#dfe6d6", h:"#61291a", g:"#e04a3c"}, g:["......mmm...",".....mMMmm..","....mMMMMm..","....mMMMmm..",".....mmmh...",".......h....","......h.....",".....h......","....h.......","...h........","..h.........",".gg........."]},
  mace:{p:{m:"#a2a3ac", M:"#dfe6d6", h:"#61291a", g:"#e04a3c"}, g:[".......m.m..","......mMMMm.",".....mMMMMm.","......mMMMm.",".......mhm..","......h.....",".....h......","....h.......","...h........","..h.........",".gg.........","............"]},
  dagger:{p:{m:"#a2a3ac", M:"#dfe6d6", h:"#61291a", g:"#e04a3c"}, g:["............","..........M.",".........Mm.","........Mm..",".......Mm...","......Mm....","....g.m.....",".....gg.....","....hgg.....","...h........","..h.........","............"]},
  staff:{p:{m:"#c95a24", h:"#61291a", g:"#6e9198", G:"#dfe6d6"}, g:[".........g..","........gGg.",".......mgggm","........mgm.",".......h.m..","......h.....",".....h......","....h.......","...h........","..h.........",".h..........","h..........."]},
  wand:{p:{m:"#fbb954", h:"#a6441f", g:"#e2762d", G:"#ffd678"}, g:["............",".........g..","........gGg.",".........g..","........m...",".......h....","......h.....",".....h......","....h.......","...h........","............","............"]},
  plate:{p:{m:"#6a6c78", M:"#a2a3ac", g:"#e04a3c"}, g:["..mm....mm..",".mMMm..mMMm.",".mMMMmmMMMm.","mMMMMMMMMMMm","mmMMMMMMMMmm","..mMMggMMm..","..mMMMMMMm..","..mMMMMMMm..","..mmMMMMmm..","..mMMMMMMm..","...mmmmmm...","............"]},
  cloak:{p:{c:"#344e66", C:"#557887", g:"#fbb954"}, g:["....cccc....","...cCCCCc...","..cCCggCCc..","..cCCCCCCc..",".cCCCCCCCCc.",".cCCCCCCCCc.",".cCCCCCCCCc.","cCCCCCCCCCCc","cCCCCCCCCCCc","cCCcCCCCcCCc","ccc.cccc.ccc","............"]},
  ring:{p:{m:"#c95a24", M:"#fbb954", g:"#e04a3c", G:"#f4f2ea"}, g:["............","....ggg.....","...gGGGg....","....ggg.....","...mmmmm....","..mM...mm...",".mM.....mm..",".m.......m..",".m.......m..","..m.....m...","...mmmmm....","............"]},
  amulet:{p:{m:"#c95a24", M:"#fbb954", g:"#e04a3c", G:"#f4f2ea"}, g:["..m......m..","...m....m...","...m....m...","....m..m....","....m..m....",".....MM.....","....mggm....","...mgGGgm...","...mgGGgm...","....mggm....",".....mm.....","............"]}
};
Object.entries(ITEMS).forEach(([k, it]) => { const ic = ICONS[it.type]; SPRITE_DEFS["it_" + k] = {p:{...ic.p, ...(it.pal || {})}, g:ic.g, em:it.r >= 2 ? ["g","G"] : []}; });
const rarTag = it => `<span class="rar" style="color:${RARITY[it.r].c}">[${RARITY[it.r].ko}]</span>`;
const itemName = key => `[${RARITY[ITEMS[key].r].ko}] ${ITEMS[key].name}`;
function fxLines(fx){ const out = []; for (const [k, v] of Object.entries(fx || {})){ if (k === "fireRes") out.push("용의 숨결 피해 절반"); else out.push(`${FX_KO[k]} ${sgn(v)}`); } return out; }
const eqItems = h => SLOTS.map(s => h.eq && h.eq[s]).filter(Boolean).map(uid => S.items[uid]).filter(Boolean).map(o => ITEMS[o.key]);
const bonus = (h, k) => eqItems(h).reduce((a, it) => a + ((it.fx && it.fx[k]) || 0), 0);
const statOf = (h, st) => h.stats[st] + bonus(h, st);

const calcHp = h => { const C = CLASSES[h.cls]; return Math.max(10, C.hd + 2 * (C.hd / 2 + 1) + 3 * mod(h.stats.con)); };
const calcAc = h => { const C = CLASSES[h.cls]; return C.ac + Math.min(C.dexCap, mod(h.eq ? statOf(h, "dex") : h.stats.dex)) + (h.eq ? bonus(h, "ac") : 0); };
const checkMod = (h, st) => mod(statOf(h, st)) + (CLASSES[h.cls].prof.includes(st) ? 2 : 0) + bonus(h, "check");
const atkMod = h => mod(statOf(h, CLASSES[h.cls].atkStat)) + 2 + Math.floor((S.level || 1) / 2) + bonus(h, "atk") + (S.battle && S.battle.key === "drake" && S.flags.spear ? 2 : 0) + blessOf();
const dmgMod = h => mod(statOf(h, CLASSES[h.cls].atkStat)) + bonus(h, "dmg");
// recompute AC and max HP after gear or level changes
function refreshHero(h){ if (h.hpBase == null) h.hpBase = h.maxHp; h.eq = h.eq || {}; const was = h.maxHp; h.ac = calcAc(h); h.maxHp = h.hpBase + bonus(h, "hp"); if (h.maxHp > was) h.hp += h.maxHp - was; h.hp = Math.min(h.hp, h.maxHp); }
function newItem(key){ S.itemSeq = (S.itemSeq || 0) + 1; const uid = "i" + S.itemSeq; S.items[uid] = {key}; return uid; }
function giveItem(key){ const uid = newItem(key); S.inv.push(uid); S.newItems = (S.newItems || 0) + 1; return uid; }
const ownsKey = key => Object.values(S.items).some(o => o.key === key);
function rollLoot(table, n){
  const pool = table.filter(k => !ownsKey(k)), src = pool.length ? pool : table, out = [];
  for (let k=0; k<n && src.length; k++){
    const left = src.filter(x => !out.includes(x)); if (!left.length) break;
    const tot = left.reduce((a, x) => a + RARITY[ITEMS[x].r].w, 0); let r = Math.random()*tot;
    for (const x of left){ r -= RARITY[ITEMS[x].r].w; if (r <= 0){ out.push(x); break; } }
  }
  return out;
}
const dice = (sides, n, scheme) => Array.from({length:n}, () => ({sides, scheme}));

const FOES = {
  wolves:{name:"잿털 늑대 무리", sprite:"wolf", count:2, hp:20, ac:12, atk:3, dmg:[6], dmgB:1, verb:"물어뜯기", xp:60, loot:["wolf_fang","copper_ring","leather"], intro:"굶주린 늑대 두 마리가 이를 드러내며 원을 그린다!"},
  spider:{name:"숲거미", sprite:"spider", count:1, hp:22, ac:13, atk:4, dmg:[6], dmgB:1, verb:"독니 물기", xp:70, loot:["venom_dagger","dex_ring","copper_ring"], intro:"거미가 여덟 개의 눈을 번뜩이며 실을 뿜는다!"},
  troll:{name:"다리 트롤 그룸", sprite:"troll", count:1, hp:34, ac:12, atk:5, dmg:[6,6], dmgB:0, verb:"몽둥이 휘두르기", xp:100, loot:["str_ring","chainmail","steel_sword"], intro:"그룸이 다리 난간을 뜯어 몽둥이처럼 움켜쥔다!", regen:3},
  leeches:{name:"늪 거머리 떼", sprite:"leech", count:3, hp:24, ac:11, atk:4, dmg:[4,4], dmgB:0, verb:"달라붙어 빨기", xp:70, loot:["wis_ring","copper_ring","mage_robe"], intro:"물컹한 거머리들이 널빤지 위로 꿈틀꿈틀 기어오른다!"},
  skeletons:{name:"해골 광부", sprite:"skeleton", count:2, hp:30, ac:13, atk:4, dmg:[6], dmgB:2, verb:"곡괭이 내려찍기", xp:90, loot:["steel_sword","chainmail","star_staff","holy_mace"], intro:"해골들이 곡괭이를 치켜들고 덜그럭거리며 다가온다!"},
  hounds:{name:"잿불 사냥개", sprite:"hound", count:2, hp:26, ac:12, atk:4, dmg:[6], dmgB:2, verb:"불꽃 이빨", xp:80, loot:["flame_axe","fire_wand","shadow_cloak"], intro:"이글거리는 잿불 사냥개들이 모닥불을 뛰어넘는다!"},
  goblins:{name:"고블린 광신도", sprite:"goblin", count:3, hp:28, ac:13, atk:4, dmg:[8], dmgB:1, verb:"녹슨 칼 휘두르기", xp:100, loot:["shadow_dagger","venom_dagger","mage_robe","luck_ring"], intro:"붉은 두건의 고블린들이 괴성을 지르며 달려든다!"},
  shadow:{name:"그림자 분신", sprite:"shadow", count:1, hp:30, ac:13, atk:5, dmg:[8], dmgB:1, verb:"그림자 베기", xp:90, loot:["shadow_cloak","shadow_dagger","luck_ring"], intro:"그림자가 일행의 몸짓을 그대로 흉내 내며 검을 든다!"},
  gargoyle:{name:"돌 가고일", sprite:"gargoyle", count:1, hp:46, ac:15, atk:5, dmg:[8,8], dmgB:1, verb:"돌 발톱", xp:140, drops:2, loot:["frost_blade","archmage_staff","ember_scale","dwarf_plate"], intro:"가고일이 받침대를 박차고 날개를 펼친다! 돌가루가 비처럼 쏟아진다!"},
  drake:{name:"잿날개 바르쿠스", sprite:"drake", count:1, hp:96, ac:16, atk:6, dmg:[6,6], dmgB:3, verb:"발톱 내려치기", xp:0, intro:"바르쿠스가 날개를 펼치자 방 안의 횃불이 일제히 눕는다!", breath:true}
};
const HP_SCALE = [0.5, 1, 1.35, 1.7];
// chapter cards appear once, when the story first reaches these places
const CHAPTERS = {tavern:["프롤로그","꺼진 화로"], forest:["1장","잿빛 숲길"], bridge:["2장","트롤의 다리"], cave:["3장","버려진 광산"], camp:["4장","잿빛 탑 아래"], hall:["5장","탑의 심장"], lair:["6장","잿날개"], dawn:["에필로그","새벽"]};
const OBJECTIVES = {tavern:"오르나의 이야기를 듣고 길을 나서자", forest:"숲을 지나 강가의 다리로", bridge:"다리를 건너 늪을 지나자", cave:"폐광을 지나 탑으로 가는 지름길을 찾자", camp:"탑 아래에서 하룻밤을 버티자", hall:"탑 꼭대기로 오르자", lair:"잿날개 바르쿠스를 쓰러뜨려라", dawn:"모험 완료!"};
const MUSIC = {tavern:"tavern", forest:"ashen", glade:"ashen", bridge:"ashen", swamp:"ashen", cave:"ashen", camp:"tavern", gate:"ashen", hall:"ashen", mirror:"ashen", library:"ashen", shrine:"ashen", lair:"ashen", dawn:"dawn"};

/* ================= STORY ================= */
const FLAG_TXT = {
  weakness:"단서: 잿날개의 약점 — 용의 방어도 −2",
  spear:"획득: 은빛 창 — 용에게 명중 +2",
  ambush:"선제 공격 — 용이 피해 10을 입은 채로 싸움을 시작한다",
  discount:"모로의 단골 — 상점 가격 30% 할인",
  secret:"단서: 탑 아래층 드워프 비밀 통로",
  fairyHint:"단서: 탑의 문지기는 칭찬에 약하다"
};
const CLUES = ["weakness","spear","secret","fairyHint","discount"];
// event pictures: bg = scene, u = [sprite, centerX, flip], o = overlay effect, c = crop [x,y,w,h] in scene pixels
const P2 = [["fighter",96],["wizard",118]];
const NODES = {
  // ---------------- 프롤로그 ----------------
  start:{bg:"tavern", show:["orna"], lines:[
    "불씨골 마을의 여관 「꺼진 화로」. 장작 연기와 젖은 망토 냄새가 뒤섞여 있다.",
    "벽난로 옆 구석에서 보라색 두건을 쓴 노파가 지팡이로 바닥을 두 번 두드린다.",
    ["orna","왔구먼, 젊은 것들. 앉아. 시간이 없으니 짧게 말하지."],
    ["orna","북쪽 잿빛 탑에 잠들어 있던 용이 깨어났어. 이름은 바르쿠스. 사람들은 「잿날개」라고 부르지."],
    ["orna","그 뒤로 밤마다 재가 비처럼 내려. 우물이 탁해지고 아이들이 기침을 해. 탑 꼭대기의 불씨를 꺼야 해."],
    ["orna","가는 길은 멀어. 숲과 강, 늪과 폐광을 지나야 탑이 나와. 마을이 모은 금화 백 닢이 보수야."]
  ], prompt:"일행은 무엇을 할까?", choices:[
    {t:"check", label:"잿날개에 대해 더 캐묻는다", stat:"int", dc:10, pass:"lore_pass", fail:"lore_fail"},
    {t:"go", label:"여관 주인에게 회복 물약을 산다", cost:10, to:"buy"},
    {t:"go", label:"곧장 탑으로 출발한다", to:"road"}
  ]},
  lore_pass:{bg:"tavern", show:["orna"], fx:{flag:"weakness"}, lines:[
    ["orna","눈썰미가 있구먼. 잘 들어."],
    ["orna","백 년 전, 한 기사가 은빛 창으로 잿날개의 왼쪽 가슴을 찔렀어. 그 자리엔 아직도 비늘이 없지. 싸우게 되거든 거길 노려."],
    ["orna","하나 더. 탑 문은 수수께끼로 잠겨 있다더군. 답은... 이 벽난로 안에 있는 것과 닮았다고 들었어."]
  ], next:"road", nextLabel:"길을 나선다"},
  lore_fail:{bg:"tavern", show:["orna"], lines:[
    "오르나는 한참을 중얼거렸지만, 절반은 옛날이야기고 절반은 잠꼬대였다.",
    ["orna","...용은 노래를 싫어하고... 트롤은 칭찬에 약하고... 어디까지 말했더라?"],
    "별 도움은 안 될 것 같다. 그래도 트롤 이야기는 기억해 두자."
  ], next:"road", nextLabel:"길을 나선다"},
  buy:{bg:"tavern", show:["orna"], fx:{potion:1}, lines:["여관 주인이 먼지 쌓인 붉은 병을 건넨다. 「유통기한은... 아마 괜찮을 거요.」"], next:"road", nextLabel:"길을 나선다"},

  // ---------------- 1장 잿빛 숲길 ----------------
  road:{bg:"forest", art:{bg:"forest", u:P2, o:"trapset", c:[40,60,200,112], cap:"발밑에서 들린 쇳소리"}, lines:[
    "마을을 벗어나 검은 숲길로 들어선다. 나뭇가지마다 재가 눈처럼 쌓여 있다.",
    "그때, 앞서 걷던 발밑에서 「딸깍」 하는 쇳소리가 난다!"
  ], prompt:"어떻게 할까?", choices:[
    {t:"check", label:"몸을 날려 피한다", stat:"dex", dc:12, pass:"trap_dodge", fail:"trap_fail"},
    {t:"check", label:"움직이지 말고 덫의 구조를 살핀다", stat:"wis", dc:13, pass:"trap_disarm", fail:"trap_fail"}
  ]},
  trap_dodge:{bg:"forest", lines:["아슬아슬하게 굴러 피했다! 녹슨 사냥꾼의 덫이 허공을 꽉 문다.", "...하지만 쇳소리가 숲 전체에 울려 퍼졌다."], next:"wolves", nextLabel:"계속"},
  trap_disarm:{bg:"forest", fx:{gold:15, xp:20}, art:{bg:"forest", u:P2, o:"coins", c:[40,60,200,112], cap:"덤불 속 가죽 주머니"}, lines:["방아쇠 판을 찾아 나뭇가지로 꾹 눌러 덫을 풀었다.", "근처 덤불에서 사냥꾼이 떨어뜨린 가죽 주머니를 발견했다."], next:"wolves", nextLabel:"계속"},
  trap_fail:{bg:"forest", fx:{dmg:"1d6", who:"roller"}, art:{bg:"forest", u:P2, o:"trap", c:[40,60,200,112], cap:"덫이 다리를 물었다!"}, lines:["쇠 이빨이 다리를 문다! 겨우 덫을 벌려 빠져나왔지만 피가 흐른다."], next:"wolves", nextLabel:"계속"},
  wolves:{bg:"forest", show:["wolf","wolf"], art:{bg:"forest", u:[["wolf",170],["wolf",200]], o:"eyes", c:[100,60,200,112], cap:"덤불 속 붉은 눈"}, lines:["덤불 사이에서 붉은 눈 네 개가 번뜩인다.", "털이 재에 그을린 늑대들이다. 배가 몹시 고파 보인다."], prompt:"늑대가 다가온다!", choices:[
    {t:"battle", label:"무기를 뽑는다", foe:"wolves", win:"wolves_win"},
    {t:"check", label:"낮게 읊조리며 늑대를 달랜다", stat:"wis", dc:14, pass:"wolves_calm", fail:"wolves_angry"}
  ]},
  wolves_angry:{bg:"forest", show:["wolf","wolf"], lines:["늑대들이 으르렁거리며 털을 곤두세운다. 말이 통하지 않는다!"], choices:[{t:"battle", label:"싸운다", foe:"wolves", win:"wolves_win"}]},
  wolves_calm:{bg:"forest", fx:{xp:40}, lines:["손바닥을 펴고 천천히 숨을 고르자, 늑대들이 머뭇거리다 꼬리를 내리고 숲으로 사라진다.", "어디선가 길게 우는 소리. 고맙다는 인사였을까."], next:"fork_forest", nextLabel:"계속 걷는다"},
  wolves_win:{bg:"forest", fx:{gold:8}, lines:["늑대들이 깨갱거리며 달아났다. 쓰러진 덤불 사이에서 무언가 반짝인다."], next:"fork_forest", nextLabel:"계속 걷는다"},
  fork_forest:{bg:"forest", cardView:true, lines:["숲 한가운데에서 길이 셋으로 갈라진다.", "왼쪽 오솔길 너머로 청록빛이 일렁이고, 오른쪽 큰길에서는 짐수레 바퀴 삐걱대는 소리가 들린다. 곧게 뻗은 길은 강으로 이어진다."],
    again:["다시 숲의 갈림길이다. 강 쪽에서 물소리가 들린다."], prompt:"어느 길로 갈까?", choices:[
    {t:"go", label:"빛이 새어 나오는 오솔길", to:"glade", hide:"seenGlade", desc:"버섯이 빛나는 숲속 빈터. 누군가 도움을 청하는 소리가 들린다.", img:{bg:"glade", u:[["fairy",176]], c:[110,70,132,99]}},
    {t:"go", label:"수레 소리가 나는 큰길", to:"merchant", hide:"seenMerchant", desc:"떠돌이 상인이 있을지도. 금화로 물건을 살 수 있다.", img:{bg:"forest", u:[["merchant",220]], c:[160,70,132,99]}},
    {t:"go", label:"곧장 강가로 서두른다", to:"bridge", desc:"시간을 아낀다. 다리 위로 커다란 그림자가 보인다.", img:{bg:"bridge", u:[["troll",250]], c:[180,60,132,99]}}
  ]},
  glade:{bg:"glade", show:["fairy"], fx:{flag:"seenGlade"}, art:{bg:"glade", u:[["fairy",60]], o:"web", c:[10,40,200,112], cap:"거미줄에 걸린 요정"}, lines:[
    "숲속 빈터 한가운데, 버섯들이 둥글게 고리를 이루며 은은하게 빛난다.",
    "고리 너머 나뭇가지에 끈적한 거미줄이 쳐져 있고, 손가락만 한 요정 하나가 날개가 엉킨 채 버둥거린다.",
    ["fairy","거기 큰 사람들! 제발 좀 꺼내줘! 거미가 곧 돌아온단 말이야!"]
  ], prompt:"요정을 어떻게 구할까?", choices:[
    {t:"check", label:"거미줄을 조심스럽게 끊는다", stat:"dex", dc:12, pass:"glade_free", fail:"glade_spider"},
    {t:"check", label:"작은 불꽃으로 거미줄만 태운다", stat:"int", dc:13, pass:"glade_free", fail:"glade_spider"},
    {t:"go", label:"못 본 척 지나간다", to:"glade_leave"}
  ]},
  glade_free:{bg:"glade", show:["fairy"], fx:{luck:2, item:"fairy_amulet", flag:"fairyHint", xp:40}, art:{bg:"glade", u:[["fairy",176]], o:"sparkle", c:[76,50,200,112], cap:"요정 피피의 선물"}, lines:[
    "거미줄이 툭 끊어지고, 요정이 반짝이는 가루를 흩뿌리며 날아오른다.",
    ["fairy","나는 피피! 은혜는 꼭 갚는 게 요정의 법이야. 자, 이건 행운이고... 이건 내 보물!"],
    ["fairy","탑에 간다고? 꼭대기 앞 돌덩이 문지기는 칭찬을 엄청 좋아한대. 기억해 둬!"]
  ], next:"fork_forest", nextLabel:"갈림길로 돌아간다"},
  glade_spider:{bg:"glade", show:["fairy","spider"], art:{bg:"glade", u:[["spider",200],["fairy",250]], o:"web", c:[110,40,200,112], cap:"숲거미가 내려온다!"}, lines:["거미줄이 크게 출렁이자, 나무 위에서 털이 숭숭한 거대한 거미가 미끄러져 내려온다!", ["fairy","으아악, 왔다! 왔어!"]], choices:[{t:"battle", label:"싸운다", foe:"spider", win:"glade_spider_win"}]},
  glade_spider_win:{bg:"glade", show:["fairy"], fx:{luck:1, flag:"fairyHint"}, lines:["거미가 다리를 오그리며 쓰러지자, 끊어진 거미줄 사이로 요정이 빠져나온다.", ["fairy","휴우, 무서웠다! 나는 피피야. 이거라도 받아, 행운이 깃들 거야."], ["fairy","아, 그리고 탑 꼭대기 앞 돌덩이 문지기는 칭찬에 약하대!"]], next:"fork_forest", nextLabel:"갈림길로 돌아간다"},
  glade_leave:{bg:"glade", fx:{flag:"seenGlade"}, lines:["등 뒤에서 작은 울음소리가 들렸지만, 일행은 발걸음을 돌렸다.", "왠지 마음 한구석이 찜찜하다."], next:"fork_forest", nextLabel:"갈림길로"},
  merchant:{bg:"forest", show:["merchant"], fx:{flag:"seenMerchant"}, art:{bg:"forest", u:[["merchant",200]], o:"mud", c:[110,60,200,112], cap:"진흙에 빠진 짐수레"}, lines:[
    "바퀴가 진흙에 빠진 짐수레 옆에서, 커다란 봇짐을 멘 사내가 땀을 닦고 있다.",
    ["merchant","어이쿠, 손님들! 떠돌이 상인 모로올시다. 마침 잘 왔소, 이 바퀴 좀..."]
  ], prompt:"상인을 도와줄까?", choices:[
    {t:"check", label:"수레를 힘껏 밀어 올린다", stat:"str", dc:12, pass:"merchant_help", fail:"merchant_fail"},
    {t:"go", label:"거래만 하고 간다", to:"shop"}
  ]},
  merchant_help:{bg:"forest", show:["merchant"], fx:{xp:30, gold:10, flag:"discount"}, lines:["끄응! 수레바퀴가 진흙에서 쑥 빠져나온다.", ["merchant","허허, 장사꾼은 빚을 오래 두지 않소. 수고비요. 그리고 물건값은 깎아 드리리다!"]], next:"shop", nextLabel:"물건을 둘러본다"},
  merchant_fail:{bg:"forest", show:["merchant"], lines:["수레는 꿈쩍도 하지 않는다. 오히려 진흙이 튀어 온몸이 엉망이 됐다.", ["merchant","허허, 마음만은 고맙소. 구경이나 하고 가시오."]], next:"shop", nextLabel:"물건을 둘러본다"},
  shop:{bg:"forest", show:["merchant"], noVote:true, lines:[["merchant","자자, 골라 보시오! 잿빛 탑 근처에선 구할 수 없는 물건들이오."]], again:[["merchant","또 뭐 필요한 거 있소?"]], prompt:"모로의 상점", choices:[
    {t:"go", label:"회복 물약", cost:10, to:"shop_potion"},
    {t:"go", label:"행운의 부적 (행운 토큰 +1)", cost:20, to:"shop_luck"},
    {t:"go", label:"[고급] 질긴 가죽 갑옷 (방어도 +1)", cost:24, to:"shop_leather", hide:"boughtLeather"},
    {t:"go", label:"[고급] 힘의 반지 (힘 +2)", cost:28, to:"shop_ring", hide:"boughtRing"},
    {t:"go", label:"[고급] 별빛 지팡이 (마법사용)", cost:28, to:"shop_staff", hide:"boughtStaff"},
    {t:"go", label:"상점을 떠난다", to:"fork_forest"}
  ]},
  shop_potion:{bg:"forest", show:["merchant"], fx:{potion:1}, lines:[["merchant","좋은 선택이오! 탑 근처에선 물 한 모금도 귀하지."]], next:"shop", nextLabel:"계속 둘러본다"},
  shop_luck:{bg:"forest", show:["merchant"], fx:{luck:1}, lines:[["merchant","네잎클로버를 말려 넣은 부적이오. 주사위가 미울 때 한 번 쥐어 보시오."]], next:"shop", nextLabel:"계속 둘러본다"},
  shop_leather:{bg:"forest", show:["merchant"], fx:{item:"leather", flag:"boughtLeather"}, lines:[["merchant","늑대 가죽을 두 겹 덧댄 물건이오. 가방에서 꺼내 입으시오."]], next:"shop", nextLabel:"계속 둘러본다"},
  shop_ring:{bg:"forest", show:["merchant"], fx:{item:"str_ring", flag:"boughtRing"}, lines:[["merchant","트롤도 팔씨름에서 진다는 반지요. 아마도."]], next:"shop", nextLabel:"계속 둘러본다"},
  shop_staff:{bg:"forest", show:["merchant"], fx:{item:"star_staff", flag:"boughtStaff"}, lines:[["merchant","마법 학원 교수가 쓰던 거요. 진짜요."]], next:"shop", nextLabel:"계속 둘러본다"},

  // ---------------- 2장 트롤의 다리 ----------------
  bridge:{bg:"bridge", show:["troll"], art:{bg:"bridge", u:[["troll",250]], c:[150,50,200,112], cap:"다리를 막아선 트롤"}, lines:[
    "숲이 끝나는 곳에 낡은 돌다리가 강을 가로지른다. 멀리 탑 꼭대기의 붉은 불빛이 보인다.",
    "다리 위로 이끼 낀 거대한 그림자가 몸을 일으킨다.",
    ["troll","크허허! 이 다리는 그룸 거다! 지나가려면 금화 스무 닢!"]
  ], prompt:"트롤이 길을 막았다.", choices:[
    {t:"go", label:"통행료를 낸다", cost:20, to:"bridge_pay"},
    {t:"check", label:"그룸의 근육을 칭찬하며 구슬린다", stat:"cha", dc:13, pass:"bridge_charm", fail:"bridge_angry"},
    {t:"check", label:"무기를 휘두르며 겁을 준다", stat:"str", dc:14, pass:"bridge_scare", fail:"bridge_angry"},
    {t:"battle", label:"다짜고짜 싸운다", foe:"troll", win:"troll_win"}
  ]},
  bridge_pay:{bg:"bridge", show:["troll"], lines:[["troll","크헤헤, 착한 손님! 그룸은 착한 손님 좋아!"], "그룸이 금화를 깨물어 보더니 길을 비켜준다."], next:"swamp", nextLabel:"다리를 건넌다"},
  bridge_charm:{bg:"bridge", show:["troll"], fx:{potion:1, xp:40}, lines:[["troll","...그룸 팔뚝... 멋지냐?"], "그룸은 귀까지 시퍼렇게 붉히더니, 다리 밑 둥지에서 뭔가를 꺼내 건넨다.", ["troll","친구한테 주는 선물. 썩은 생선 아니다. 진짜다."]], next:"swamp", nextLabel:"다리를 건넌다"},
  bridge_scare:{bg:"bridge", fx:{xp:40}, lines:["그룸이 움찔하더니 「그룸 오늘 쉬는 날!」 하고 강물 속으로 첨벙 숨어버렸다."], next:"swamp", nextLabel:"다리를 건넌다"},
  bridge_angry:{bg:"bridge", show:["troll"], lines:[["troll","말 많은 것들은 맛있지! 크허어!"]], choices:[{t:"battle", label:"싸운다", foe:"troll", win:"troll_win"}]},
  troll_win:{bg:"bridge", fx:{gold:25}, art:{bg:"bridge", u:P2, o:"coins", c:[40,50,200,112], cap:"트롤의 둥지에 쌓인 금화"}, lines:["그룸이 비틀거리다 강물로 굴러떨어졌다. 다리 밑 둥지에 반짝이는 금화가 쌓여 있다."], next:"swamp", nextLabel:"다리를 건넌다"},
  swamp:{bg:"swamp", art:{bg:"swamp", u:P2, o:"plank", c:[40,50,200,112], cap:"꺼지는 널빤지"}, lines:[
    "다리를 건너자 길은 안개 낀 늪으로 이어진다. 썩은 나무 냄새가 코를 찌른다.",
    "삐걱거리는 널빤지 길 너머, 장대 위에 지은 오두막에서 등불이 깜빡인다.",
    "그때 발밑의 널빤지가 우지끈 소리를 내며 꺼진다!"
  ], prompt:"어떻게 할까?", choices:[
    {t:"check", label:"재빨리 옆 널빤지로 뛴다", stat:"dex", dc:12, pass:"swamp_safe", fail:"swamp_mud"},
    {t:"check", label:"무너지는 널빤지를 붙잡고 버틴다", stat:"str", dc:13, pass:"swamp_safe", fail:"swamp_mud"}
  ]},
  swamp_safe:{bg:"swamp", fx:{xp:20}, lines:["아슬아슬하게 균형을 잡았다. 시커먼 물 아래로 무언가 꿈틀거리며 지나간다."], next:"swamp_leech", nextLabel:"조심스럽게 나아간다"},
  swamp_mud:{bg:"swamp", fx:{dmg:"1d6", who:"roller"}, art:{bg:"swamp", u:[["wizard",118]], o:"mud", c:[40,50,200,112], cap:"늪에 빠졌다!"}, lines:["진흙탕에 허리까지 빠졌다! 겨우 기어 나왔지만, 다리에 무언가 달라붙어 있다..."], next:"swamp_leech", nextLabel:"서둘러 나아간다"},
  swamp_leech:{bg:"swamp", show:["leech","leech","leech"], lines:["물속에서 손바닥만 한 거머리들이 줄지어 기어 올라온다. 피 냄새를 맡은 모양이다."], prompt:"거머리 떼가 다가온다!", choices:[
    {t:"battle", label:"쳐낸다", foe:"leeches", win:"leech_win"},
    {t:"check", label:"등불 기름을 뿌려 불을 붙인다", stat:"int", dc:12, pass:"leech_burn", fail:"leech_fight"}
  ]},
  leech_burn:{bg:"swamp", fx:{xp:50}, art:{bg:"swamp", u:[["leech",190],["leech",210]], o:"fire", c:[100,50,200,112], cap:"물 위로 번지는 불길"}, lines:["화르륵! 불길이 물 위로 번지자 거머리들이 쉭쉭 소리를 내며 물러난다."], next:"witch", nextLabel:"오두막으로"},
  leech_fight:{bg:"swamp", show:["leech","leech","leech"], lines:["기름이 젖어서 불이 붙지 않는다! 거머리들이 달려든다."], choices:[{t:"battle", label:"싸운다", foe:"leeches", win:"leech_win"}]},
  leech_win:{bg:"swamp", fx:{gold:6}, lines:["마지막 거머리를 떼어내고 숨을 고른다. 오두막의 등불이 일행을 부르는 것 같다."], next:"witch", nextLabel:"오두막으로"},
  witch:{bg:"swamp", show:["witch"], noVote:true, art:{bg:"swamp", u:[["witch",250]], o:"cauldron", c:[150,50,200,112], cap:"늪의 마녀 그레타"}, lines:[
    "오두막 문이 끼익 열리고, 녹색 두건을 쓴 노파가 지팡이를 짚고 나온다.",
    ["witch","오호호, 오르나가 보낸 아이들이로구나. 그 노친네랑은 오래된 사이지."],
    ["witch","바르쿠스를 잡으러 간다고? 이 늪의 마녀 그레타가 도와줄 수도 있지. 물론... 공짜는 없단다."]
  ], again:[["witch","또 왔느냐? 거래가 남았나 보지?"]], prompt:"마녀와 거래할까?", choices:[
    {t:"go", label:"금화로 물약 두 병을 산다", cost:15, to:"witch_potion", hide:"witchPotion"},
    {t:"go", label:"피를 조금 내주고 축복을 받는다 (모두 HP −4)", to:"witch_blood", hide:"witchBlood"},
    {t:"check", label:"용에 대해 묻는다", stat:"cha", dc:13, pass:"witch_lore", fail:"witch_cackle", hide:"witchAsked"},
    {t:"go", label:"오두막을 떠나 북쪽으로", to:"cave"}
  ]},
  witch_potion:{bg:"swamp", show:["witch"], fx:{potion:2, flag:"witchPotion"}, lines:[["witch","잘 흔들어 마시렴. 맛은... 묻지 마라."]], next:"witch", nextLabel:"계속"},
  witch_blood:{bg:"swamp", show:["witch"], fx:{hpcost:4, luck:2, item:"witch_charm", flag:"witchBlood"}, art:{bg:"swamp", u:[["witch",250]], o:"greenfire", c:[150,50,200,112], cap:"녹색 불꽃으로 타오르는 핏방울"}, lines:["마녀가 은바늘로 일행의 손끝을 찌르자, 핏방울이 공중에서 녹색 불꽃으로 타오른다.", ["witch","좋아, 좋아. 운명이 너희 편으로 조금 기울었구나. 이 부적도 가져가렴."]], next:"witch", nextLabel:"계속"},
  witch_lore:{bg:"swamp", show:["witch"], fx:{flag:"weakness", xp:30}, lines:[["witch","바르쿠스는 백 년 전 은빛 창에 왼쪽 가슴을 찔렸지. 그 상처엔 아직도 비늘이 안 났단다."], ["witch","그리고 탑으로 가는 지름길은 저 북쪽 폐광이야. 해골들이 우글거리지만."]], next:"witch", nextLabel:"계속"},
  witch_cackle:{bg:"swamp", show:["witch"], lines:[["witch","오호호! 공짜로는 안 알려주지! 북쪽 폐광으로나 가 보렴!"]], next:"witch", nextLabel:"계속"},

  // ---------------- 3장 버려진 광산 ----------------
  cave:{bg:"cave", art:{bg:"cave", u:P2, o:"dust", c:[50,40,200,112], cap:"무너져 가는 갱도"}, lines:[
    "늪을 지나 북쪽으로 오르자, 산허리에 버려진 광산 입구가 입을 벌리고 있다.",
    "녹슨 수레 레일이 어둠 속으로 이어지고, 갱도 벽의 수정이 희미하게 빛난다.",
    "갱도 안쪽에서 돌 떨어지는 소리가 우르르 울린다."
  ], prompt:"어떻게 들어갈까?", choices:[
    {t:"check", label:"천장을 살피며 안전한 길을 찾는다", stat:"wis", dc:12, pass:"cave_safe", fail:"cave_collapse"},
    {t:"check", label:"버팀목을 받치며 빠르게 지나간다", stat:"str", dc:13, pass:"cave_safe", fail:"cave_collapse"}
  ]},
  cave_safe:{bg:"cave", fx:{xp:30}, lines:["흔들리는 구간을 피해 무사히 갱도 깊숙이 들어섰다."], next:"mine_skel", nextLabel:"더 깊이"},
  cave_collapse:{bg:"cave", fx:{dmg:"1d6", who:"all"}, art:{bg:"cave", u:P2, o:"rocks", c:[50,40,200,112], cap:"천장이 무너진다!"}, lines:["우르릉! 천장에서 돌덩이가 쏟아진다! 먼지 속에서 겨우 빠져나왔다."], next:"mine_skel", nextLabel:"더 깊이"},
  mine_skel:{bg:"cave", show:["skeleton","skeleton"], art:{bg:"cave", u:[["skeleton",200],["skeleton",230]], o:"eyes2", c:[110,40,200,112], cap:"아직 일하는 해골 광부들"}, lines:[
    "갱도 깊은 곳, 녹슨 곡괭이를 든 해골들이 덜그럭거리며 레일 위를 오간다.",
    "눈구멍에서 푸른 불빛이 깜빡인다. 아직 일이 끝나지 않았다고 믿는 모양이다."
  ], prompt:"해골 광부들이 길을 막고 있다.", choices:[
    {t:"battle", label:"싸운다", foe:"skeletons", win:"skel_win"},
    {t:"check", label:"광차를 굴려 해골들을 쓸어버린다", stat:"str", dc:14, pass:"skel_cart", fail:"skel_fight"},
    {t:"check", label:"그림자를 따라 몰래 지나간다", stat:"dex", dc:14, pass:"skel_sneak", fail:"skel_fight"}
  ]},
  skel_cart:{bg:"cave", fx:{xp:70}, art:{bg:"cave", u:[["skeleton",220]], o:"cart", c:[100,40,200,112], cap:"광차 돌진!"}, lines:["광차가 레일을 타고 굉음을 내며 내달린다! 해골들이 볼링 핀처럼 흩어졌다."], next:"dwarf", nextLabel:"갱도 끝으로"},
  skel_sneak:{bg:"cave", fx:{xp:60}, lines:["해골들이 곡괭이질에 열중한 사이 그 뒤를 살금살금 지나쳤다."], next:"dwarf", nextLabel:"갱도 끝으로"},
  skel_fight:{bg:"cave", show:["skeleton","skeleton"], lines:["덜그럭! 해골들이 일제히 고개를 돌린다."], choices:[{t:"battle", label:"싸운다", foe:"skeletons", win:"skel_win"}]},
  skel_win:{bg:"cave", fx:{gold:10}, lines:["해골들이 뼈 무더기로 무너져 내렸다. 갱도 끝에서 누군가 끙끙대는 소리가 들린다."], next:"dwarf", nextLabel:"갱도 끝으로"},
  dwarf:{bg:"cave", show:["dwarf"], art:{bg:"cave", u:[["dwarf",262]], o:"rubble", c:[150,40,200,112], cap:"바위에 깔린 드워프"}, lines:[
    "갱도 끝 무너진 바위 더미 아래에서 굵은 목소리가 들린다.",
    ["dwarf","거기 누구 있소?! 드워프 광부 브론이오! 바위에 다리가 끼었소, 좀 꺼내주시오!"]
  ], prompt:"브론을 구할까?", choices:[
    {t:"check", label:"바위를 들어 올린다", stat:"str", dc:13, pass:"dwarf_free", fail:"dwarf_hurt"},
    {t:"check", label:"지렛대를 만들어 바위를 움직인다", stat:"int", dc:12, pass:"dwarf_free", fail:"dwarf_hurt"}
  ]},
  dwarf_free:{bg:"cave", show:["dwarf"], fx:{item:"dwarf_plate", flag:"secret", xp:50}, art:{bg:"cave", u:[["dwarf",250]], o:"chest", c:[150,40,200,112], cap:"브론의 보답"}, lines:[
    ["dwarf","크하하! 살았다! 은혜를 갚아야지. 내가 직접 두드린 판금 갑옷이오."],
    ["dwarf","그리고 탑에 간다고? 탑 아래층에 우리 광부들이 뚫은 비밀 통로가 있소. 함정 복도를 건너뛸 수 있을 거요."]
  ], next:"camp", nextLabel:"광산을 빠져나간다"},
  dwarf_hurt:{bg:"cave", show:["dwarf"], fx:{dmg:"1d4", who:"roller", item:"copper_ring", flag:"secret"}, lines:["바위가 미끄러지며 손을 짓찧었지만, 결국 브론을 끌어냈다.", ["dwarf","끙, 고맙소. 가진 게 이것뿐이라... 그리고 탑 아래층의 비밀 통로를 기억하시오."]], next:"camp", nextLabel:"광산을 빠져나간다"},

  // ---------------- 4장 잿빛 탑 아래 ----------------
  camp:{bg:"camp", fx:{heal:"full"}, art:{bg:"camp", u:P2, c:[80,40,200,112], cap:"마지막 밤의 모닥불"}, lines:[
    "광산을 빠져나오자 저 멀리 잿빛 탑이 보인다. 꼭대기 창문이 핏빛으로 깜빡인다.",
    "일행은 탑 아래 언덕에 모닥불을 피우고 마지막 밤을 보내기로 했다."
  ], prompt:"밤이 깊었다.", choices:[
    {t:"check", label:"교대로 보초를 선다", stat:"wis", dc:12, pass:"camp_quiet", fail:"camp_ambush"},
    {t:"go", label:"다 같이 푹 잔다", to:"camp_ambush"}
  ]},
  camp_quiet:{bg:"camp", fx:{luck:1, xp:40}, lines:["별이 쏟아지는 고요한 밤. 보초를 서던 동료가 수풀 너머 붉은 눈들을 보고 불붙은 장작을 던지자, 그림자들이 물러났다.", "새벽, 바람에 실려 오르나의 목소리가 들린다. 「잘 왔구나. 행운을 빈다.」"], next:"gate", nextLabel:"탑으로"},
  camp_ambush:{bg:"camp", show:["hound","hound"], art:{bg:"camp", u:[["hound",226],["hound",256]], o:"eyes", c:[120,40,200,112], cap:"어둠 속의 잿불 눈"}, lines:["모닥불이 사그라질 무렵, 어둠 속에서 잿불처럼 이글거리는 눈들이 다가온다!", "탑에서 내려온 잿불 사냥개들이다!"], choices:[{t:"battle", label:"무기를 든다", foe:"hounds", win:"camp_win"}]},
  camp_win:{bg:"camp", fx:{gold:8}, lines:["사냥개들이 깨갱거리며 탑 쪽으로 달아났다. 남은 밤은 조용했다."], next:"gate", nextLabel:"탑으로"},
  gate:{bg:"gate", art:{bg:"gate", c:[60,30,200,112], o:"riddle", cap:"불타는 수수께끼"}, lines:[
    "잿빛 탑의 발치. 양옆 화로에서 불길이 넘실거리고, 꼭대기 창에서 붉은 빛이 심장처럼 뛴다.",
    "거대한 청동 문에 불타는 글귀가 새겨져 있다.",
    "「나는 먹을수록 커지고, 물을 마시면 죽는다. 나는 무엇인가?」"
  ], prompt:"문을 어떻게 열까? (수수께끼는 다 같이 맞혀 보세요)", choices:[
    {t:"go", label:"「불」이라고 답한다", to:"gate_riddle"},
    {t:"go", label:"「그림자」라고 답한다", to:"gate_wrong"},
    {t:"check", label:"자물쇠를 딴다", stat:"dex", dc:13, pass:"gate_open", fail:"gate_fail"},
    {t:"check", label:"어깨로 문을 밀어젖힌다", stat:"str", dc:15, pass:"gate_open", fail:"gate_fail"}
  ]},
  gate_retry:{bg:"gate", lines:["다시 청동 문 앞에 섰다. 「먹을수록 커지고, 물을 마시면 죽는 것」..."], prompt:"이번엔 어떻게?", choices:null},
  gate_wrong:{bg:"gate", fx:{dmg:"1d4", who:"all", fire:1}, art:{bg:"gate", u:P2, o:"fire", c:[60,40,200,112], cap:"문틈에서 터져 나온 불꽃"}, lines:["글자들이 붉게 달아오르더니 문틈에서 불꽃이 터져 나온다!"], next:"gate_retry", nextLabel:"다시 생각한다"},
  gate_fail:{bg:"gate", fx:{dmg:"1d4", who:"roller"}, lines:["문은 꿈쩍도 하지 않는다. 오히려 뜨겁게 달아오른 청동에 손을 데었다."], next:"gate_retry", nextLabel:"다시 생각한다"},
  gate_riddle:{bg:"gate", fx:{xp:30, door:1}, lines:["「불」이라고 외치자 글자가 하나씩 꺼지고, 청동 문이 무겁게 열린다."], next:"hall", nextLabel:"탑 안으로"},
  gate_open:{bg:"gate", fx:{door:1}, lines:["철컥. 문이 삐걱거리며 안쪽으로 밀려난다. 뜨거운 바람이 얼굴을 덮친다."], next:"hall", nextLabel:"탑 안으로"},

  // ---------------- 5장 탑의 심장 ----------------
  hall:{bg:"hall", show:["goblin","goblin","goblin"], art:{bg:"hall", u:[["goblin",170],["goblin",200],["goblin",230]], c:[100,40,200,112], cap:"용을 찬양하는 고블린들"}, lines:[
    "탑 안은 숨이 막힐 만큼 덥다. 횃불 사이로 붉은 두건의 고블린들이 끓는 솥을 둘러싸고 용을 찬양하는 노래를 부른다.",
    ["goblin","잿날개님 일어나셨다~ 세상을 굽는다~ 키킥!"]
  ], prompt:"아직 들키지 않았다.", choices:[
    {t:"check", label:"그림자를 따라 몰래 지나간다", stat:"dex", dc:14, pass:"hall_sneak", fail:"hall_spotted"},
    {t:"battle", label:"기습한다", foe:"goblins", win:"goblins_win"}
  ]},
  hall_spotted:{bg:"hall", show:["goblin","goblin","goblin"], fx:{dmg:"1d6", who:"roller"}, lines:["발밑의 뼈다귀를 밟고 말았다. 와직!", ["goblin","침입자다! 잿날개님께 바쳐라!"], "날아온 단검이 몸을 스친다."], choices:[{t:"battle", label:"싸운다", foe:"goblins", win:"goblins_win"}]},
  hall_sneak:{bg:"hall", fx:{xp:60}, lines:["노랫소리에 발소리를 숨기며 홀을 가로질렀다. 고블린들은 끝까지 눈치채지 못했다."], next:"mirror", nextLabel:"계단을 오른다"},
  goblins_win:{bg:"hall", fx:{gold:12, potion:1}, lines:["마지막 고블린이 비명을 지르며 달아났다. 녀석들의 짐 꾸러미에서 물약 한 병을 찾았다."], next:"mirror", nextLabel:"계단을 오른다"},
  mirror:{bg:"mirror", art:{bg:"mirror", u:[["shadow",160]], c:[60,36,200,112], o:"glint", cap:"한 박자 늦게 움직이는 거울 속 일행"}, lines:[
    "계단을 오르자 사방이 거울로 둘러싸인 방이 나온다. 촛불이 거울 속에서 끝없이 늘어선다.",
    "거울 속 일행의 모습이... 한 박자 늦게 움직인다. 그리고 그중 하나가 씩 웃는다."
  ], prompt:"어떻게 할까?", choices:[
    {t:"check", label:"진짜 출구가 비치는 거울을 찾는다", stat:"int", dc:13, pass:"mirror_pass", fail:"mirror_shadow"},
    {t:"check", label:"눈을 감고 촛불 냄새를 따라간다", stat:"wis", dc:14, pass:"mirror_pass", fail:"mirror_shadow"},
    {t:"go", label:"웃는 거울을 깨부순다", to:"mirror_shadow"}
  ]},
  mirror_pass:{bg:"mirror", fx:{xp:50}, lines:["다른 거울들과 달리 촛불이 비치지 않는 거울 하나. 손을 대자 물결처럼 갈라지며 통로가 열린다."], next:"corridor", nextLabel:"통로로"},
  mirror_shadow:{bg:"mirror", show:["shadow"], art:{bg:"mirror", u:[["shadow",160]], c:[60,36,200,112], o:"shatter", cap:"거울에서 걸어 나온 그림자"}, lines:["거울 하나가 쩍 갈라지며, 일행을 닮은 그림자가 걸어 나온다!", ["shadow","...너희가... 되고... 싶어..."]], choices:[{t:"battle", label:"싸운다", foe:"shadow", win:"shadow_win"}]},
  shadow_win:{bg:"mirror", lines:["그림자가 연기처럼 흩어지자, 깨진 거울 뒤로 통로가 드러났다."], next:"corridor", nextLabel:"통로로"},
  corridor:{bg:"hall", art:{bg:"hall", u:P2, c:[40,40,200,112], o:"spikes0", cap:"구멍이 숭숭 뚫린 복도"}, lines:["좁고 긴 복도. 바닥 돌판마다 미세한 틈이 나 있고, 벽에는 작은 구멍들이 줄지어 뚫려 있다."], prompt:"함정이 가득한 복도다.", choices:[
    {t:"go", label:"브론이 알려준 비밀 통로를 찾는다", to:"corridor_secret", need:"secret"},
    {t:"check", label:"함정을 찾아내며 천천히 간다", stat:"wis", dc:13, pass:"corridor_safe", fail:"corridor_hit"},
    {t:"check", label:"단숨에 달려서 지나간다", stat:"dex", dc:14, pass:"corridor_safe", fail:"corridor_hit"}
  ]},
  corridor_secret:{bg:"hall", fx:{xp:30}, lines:["벽돌 하나를 누르자 벽이 돌아가며 좁은 통로가 나타났다. 드워프 솜씨답게 튼튼하다."], next:"cross", nextLabel:"계단으로"},
  corridor_safe:{bg:"hall", fx:{xp:40}, lines:["딸깍 소리가 날 때마다 몸을 비틀어 피했다. 무사히 복도 끝에 닿았다."], next:"cross", nextLabel:"계단으로"},
  corridor_hit:{bg:"hall", fx:{dmg:"1d8", who:"roller"}, art:{bg:"hall", u:P2, c:[40,40,200,112], o:"spikes", cap:"솟구친 가시!"}, lines:["발밑 돌판이 꺼지며 바닥에서 가시가 솟구쳤다!"], next:"cross", nextLabel:"계단으로"},
  cross:{bg:"hall", cardView:true, lines:["나선 계단이 세 갈래로 갈라진다.", "왼쪽에선 오래된 종이 냄새가, 오른쪽에선 가느다란 신음 소리가 들린다. 위쪽에선 무언가 거대한 것이 숨 쉬는 소리."],
    again:["다시 갈림길이다. 위쪽에서 거대한 숨소리가 점점 커진다."], prompt:"어디로 갈까?", choices:[
    {t:"go", label:"왼쪽: 서고", to:"library", hide:"seenLibrary", desc:"용의 글자로 쓰인 책. 약점이 적혀 있을지도 모른다.", img:{bg:"library", c:[180,40,132,99], o:"book"}},
    {t:"go", label:"오른쪽: 신음 소리", to:"shrine", hide:"seenShrine", desc:"달빛이 드는 예배실. 누군가 쓰러져 있다. 쉬어 갈 수 있을지도.", img:{bg:"shrine", u:[["knight",250]], c:[150,40,132,99]}},
    {t:"go", label:"위: 꼭대기로 오른다", to:"guardian", desc:"용의 둥지로 가는 마지막 계단. 문지기가 지키고 있다.", img:{bg:"lair", u:[["drake",232]], c:[150,50,132,99]}}
  ]},
  library:{bg:"library", fx:{flag:"seenLibrary"}, art:{bg:"library", c:[150,40,200,112], o:"book", cap:"빛나는 용의 글자"}, lines:["천장까지 닿는 서가. 독서대 위에 용의 언어로 쓰인 두꺼운 책이 펼쳐져 있고, 글자가 청록빛으로 떠오른다."], prompt:"책을 읽어볼까?", choices:[
    {t:"check", label:"용의 글자를 해독한다", stat:"int", dc:13, pass:"lib_pass", fail:"lib_fail"},
    {t:"go", label:"건드리지 않고 돌아간다", to:"cross"}
  ]},
  lib_pass:{bg:"library", fx:{flag:"weakness", xp:40, item:"archmage_staff"}, lines:["「...은빛 상처는 아물지 않으니, 왼쪽 가슴의 맨살을 찌를 것...」", S => S.flags.weakness ? "들었던 그대로다. 잿날개의 약점이 확실해졌다." : "잿날개의 약점이 적혀 있다!", "책장 뒤에 낡은 지팡이 하나가 기대어 있다."], next:"cross", nextLabel:"갈림길로"},
  lib_fail:{bg:"library", fx:{dmg:"1d6", who:"roller", fire:1}, art:{bg:"library", c:[150,40,200,112], o:"fire", cap:"책장에서 튀어 오른 검은 불꽃"}, lines:["글자가 눈을 파고드는 듯하더니, 책장에서 검은 불꽃이 튀어 오른다!"], next:"cross", nextLabel:"갈림길로"},
  shrine:{bg:"shrine", show:["knight"], fx:{flag:"seenShrine"}, art:{bg:"shrine", u:[["knight",250]], c:[150,40,200,112], cap:"사슬에 묶인 기사"}, lines:["달빛이 쏟아지는 작은 예배실. 제단 앞에 사슬에 묶인 기사가 쓰러져 있다. 숨이 가늘다.", ["knight","...물... 아니, 그보다... 용을... 막아야..."]], prompt:"기사를 어떻게 할까?", choices:[
    {t:"check", label:"상처를 살피고 응급 처치한다", stat:"wis", dc:11, pass:"shrine_pass", fail:"shrine_fail"},
    {t:"check", label:"사슬부터 끊어낸다", stat:"str", dc:12, pass:"shrine_pass", fail:"shrine_fail"}
  ]},
  shrine_pass:{bg:"shrine", show:["knight"], fx:{flag:"spear", heal:"full", xp:40}, lines:["기사의 눈에 다시 빛이 돈다.", ["knight","나는 엘다인. 고맙소. 이걸 가져가시오. 내 증조부가 잿날개를 찔렀던 은빛 창이오."], "일행은 제단 곁에서 잠시 숨을 고르며 상처를 돌보았다."], next:"cross", nextLabel:"갈림길로"},
  shrine_fail:{bg:"shrine", fx:{heal:"half"}, lines:["손을 쓰기엔 너무 늦었다. 기사는 희미하게 웃으며 눈을 감았다.", "일행은 그의 곁에서 잠시 쉬며 마음을 추슬렀다."], next:"cross", nextLabel:"갈림길로"},
  guardian:{bg:"hall", show:["gargoyle"], art:{bg:"hall", u:[["gargoyle",240]], c:[140,30,200,112], o:"eyes3", cap:"마지막 계단의 문지기"}, lines:[
    "꼭대기로 이어지는 마지막 계단 앞, 거대한 돌 가고일이 받침대 위에 웅크리고 있다.",
    "다가가자 돌 눈꺼풀이 열리고, 주황빛 눈이 일행을 내려다본다.",
    ["gargoyle","멈춰라. 주인님의 잠을 방해하려는 자는 이 계단을 오를 수 없다."]
  ], prompt:"문지기가 길을 막았다.", choices:[
    {t:"check", label:"피피의 조언대로 날개 곡선을 칭찬한다", stat:"cha", dc:11, pass:"guardian_praise", fail:"guardian_angry", need:"fairyHint"},
    {t:"check", label:"말로 설득해 본다", stat:"cha", dc:16, pass:"guardian_praise", fail:"guardian_angry", hide:"fairyHint"},
    {t:"battle", label:"부수고 지나간다", foe:"gargoyle", win:"guardian_win"}
  ]},
  guardian_praise:{bg:"hall", show:["gargoyle"], fx:{xp:100, item:"ember_scale"}, art:{bg:"hall", u:[["gargoyle",240]], c:[140,30,200,112], o:"chest", cap:"감동한 문지기의 선물"}, lines:[["gargoyle","...칠백 년 동안... 아무도 내 날개 곡선을 알아봐 주지 않았다..."], "가고일이 감동한 듯 몸을 떨더니, 받침대 아래 숨겨둔 상자를 내밀고 다시 돌처럼 굳었다.", "상자 안에는 용의 비늘로 만든 목걸이가 들어 있다."], next:"lair", nextLabel:"꼭대기로"},
  guardian_angry:{bg:"hall", show:["gargoyle"], lines:[["gargoyle","아첨은 통하지 않는다! 부서져라!"]], choices:[{t:"battle", label:"싸운다", foe:"gargoyle", win:"guardian_win"}]},
  guardian_win:{bg:"hall", lines:["가고일이 산산조각 나며 무너져 내렸다. 계단 위에서 뜨거운 바람이 불어온다."], next:"lair", nextLabel:"꼭대기로"},

  // ---------------- 6장 잿날개 ----------------
  lair:{bg:"lair", show:["drake"], art:{bg:"lair", u:[["drake",232]], c:[110,30,200,112], cap:"금화 더미 위의 잿날개"}, lines:[
    "꼭대기 방. 바닥의 균열마다 용암이 흐르고, 금화와 뼈가 뒤섞인 산이 쌓여 있다.",
    "금화 더미 위에서 거대한 붉은 용이 천천히 눈을 뜬다.",
    ["drake","작은 것들이... 감히 내 잠을 깨웠구나."],
    S => S.flags.weakness ? "왼쪽 가슴, 비늘 없는 맨살이 보인다. 그동안 들었던 바로 그 자리다." : null
  ], prompt:"잿날개가 고개를 든다.", choices:[
    {t:"check", label:"말을 걸어 시간을 번다", stat:"cha", dc:15, pass:"lair_talk", fail:"lair_burn"},
    {t:"battle", label:"먼저 덤빈다", foe:"drake", win:"victory"}
  ]},
  lair_talk:{bg:"lair", show:["drake"], fx:{flag:"ambush"}, lines:[["drake","흥, 내 보물 이야기를 듣고 싶다고? 좋다, 이건 삼백 년 전에..."], "용이 자랑을 늘어놓는 사이, 일행은 살금살금 좋은 자리를 잡고 첫 일격을 꽂았다!"], choices:[{t:"battle", label:"전투 시작", foe:"drake", win:"victory"}]},
  lair_burn:{bg:"lair", show:["drake"], fx:{dmg:"1d6", who:"all", fire:1}, art:{bg:"lair", u:[["drake",232]], c:[110,30,200,112], o:"fire", cap:"쏟아지는 불길"}, lines:[["drake","하찮은 수작이로군!"], "용의 콧구멍에서 뜨거운 불길이 쏟아진다!"], choices:[{t:"battle", label:"전투 시작", foe:"drake", win:"victory"}]},
  victory:{bg:"lair", lines:["바르쿠스가 마지막 포효를 내지르며 금화 더미 위로 무너진다.", "탑 꼭대기의 불씨가 「푸시식」 소리를 내며 꺼졌다. 창밖으로 차가운 바람이 들어온다."], next:"epilogue", nextLabel:"마을로 돌아간다"},
  epilogue:{bg:"dawn", show:["orna"], fx:{gold:100}, art:{bg:"dawn", u:[["orna",250]], c:[60,40,200,112], cap:"재 대신 이슬이 내린 아침"}, lines:["새벽. 불씨골에 처음으로 맑은 바람이 분다. 지붕마다 재 대신 이슬이 맺혔다.", ["orna","해냈구먼. 이 마을은 너희 이름을 오래오래 기억할 거야."], S => `— ${S.party.map(h=>h.name).join(", ")}의 모험, 끝 —`], choices:[{t:"restart", label:"새 모험 시작"}]},
  gameover:{lines:["일행이 모두 쓰러졌다.", "눈앞이 재처럼 흐려진다..."], choices:[{t:"retry", label:"이 전투 다시 하기"}, {t:"restart", label:"처음부터"}]}
};
NODES.gate_retry.choices = NODES.gate.choices.filter(c => c.to !== "gate_wrong").concat([{t:"go", label:"「그림자」라고 다시 답한다", to:"gate_wrong"}]);
const SPEAKERS = {narr:{name:"DM", spr:"book"}, sys:{name:"알림", spr:"coin"}, orna:{name:"오르나", spr:"orna"}, troll:{name:"그룸", spr:"troll"},
  goblin:{name:"고블린 사제", spr:"goblin"}, drake:{name:"잿날개 바르쿠스", spr:"drake"}, knight:{name:"기사 엘다인", spr:"knight"},
  fairy:{name:"요정 피피", spr:"fairy"}, merchant:{name:"떠돌이 상인 모로", spr:"merchant"}, witch:{name:"늪의 마녀 그레타", spr:"witch"},
  dwarf:{name:"드워프 광부 브론", spr:"dwarf"}, gargoyle:{name:"돌 가고일", spr:"gargoyle"}, shadow:{name:"그림자 분신", spr:"shadow"}};

/* ================= STATE ================= */
const DEF_NAMES = ["아린","도윤","세라","한결"], DEF_CLS = ["fighter","wizard","rogue","cleric"];
const blankSetup = () => ({count:2, heroes:DEF_NAMES.map((n,i) => ({name:n, cls:DEF_CLS[i], stats:null, dice:null, raw:null, rerolls:1, sel:null}))});
let S = {screen:"title", setup:blankSetup(), party:[], gold:0, potions:0, flags:{}, seenNodes:{}, nodeId:null, bg:"tavern", lines:[], li:0, mode:"story", pick:null, roller:0, battle:null, preBattle:null, xp:0, level:1};
let busy = false;
const KEY = "ashwing-tower-save-v2";
function save(){ netDirty(); if (isGuest()) return; try { if (S.screen === "game") localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function loadSave(){ try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearSave(){ try { localStorage.removeItem(KEY); } catch (e) {} }

/* ================= SCENE ================= */
const scene = new PixelScene($("#scene"));
const titleScene = new PixelScene($("#titleCv")); titleScene.bgKey = "gate";
const ANIM = {hero:{}, foe:{}};
const LAST = {heroes:[], foe:null};
function now(){ return performance.now(); }
function animOff(a, t, dir){
  let dx = 0, dy = 0, flash = null;
  if (a && a.lunge){ const p = (t - a.lunge)/440; if (p >= 0 && p < 1){ const amp = a.lungeAmp || 16; dx += (p < 0.35 ? EASE(p/0.35) : 1 - (p - 0.35)/0.65) * amp * dir; } }
  if (a && a.cast){ const p = (t - a.cast)/520; if (p >= 0 && p < 1){ dy -= Math.round(Math.sin(p*Math.PI)*4); if (p < 0.6) flash = Math.floor(t/60) % 2 ? null : (a.castC || "#fbb954"); } }
  if (a && a.hurt){ const p = (t - a.hurt)/420; if (p >= 0 && p < 1){ dx -= (a.hurtBig ? 12 : 4)*dir*(1-p); flash = p < 0.3 ? "#f4f2ea" : p < 0.6 ? "#e04a3c" : null; } }
  return {dx, dy, flash};
}
function buildUnits(t){
  if (VW.world) return worldUnits(t);
  const bg = BGS[scene.bgKey], G = bg.ground, units = [], b = S.battle;
  { const pl = scene.dyn.find(l => l.party); if (pl) pl.x = 22 + S.party.length*15; }
  // foes / npcs (right side, facing left)
  let list = [];
  if (b){ const fo = FOES[b.key]; if (b.hp > 0){ const cnt = Math.max(1, Math.ceil(fo.count * b.hp / b.maxHp)); list = Array(cnt).fill(fo.sprite); } }
  else { const n = NODES[S.nodeId]; if (n && n.show && S.nodeId !== "gameover") list = n.show; }
  let x = SW - 8; LAST.foe = null;
  list.forEach((k, i) => { const sp = spr(k); x -= sp.w + 2; const o = animOff(ANIM.foe, t, -1);
    const bob = REDUCED ? 0 : Math.floor(t/520 + i*0.7) % 2;
    const u = {sp, x:x + o.dx + (i%2)*3, y:G - sp.h - bob + (i%2) + o.dy, flash:o.flash, alpha:k === "knight" && S.nodeId === "shrine" ? 0.8 : 1};
    if (k === "drake") u.glow = [14, 30, 50, [1.0,0.5,0.2]];
    if (k === "shadow") u.glow = [12, 12, 34, [0.5,0.4,0.9]];
    if (k === "fairy") u.glow = [6, 4, 24, [0.6,1.0,0.8]];
    units.push(u); if (!LAST.foe || u.x < LAST.foe.x) LAST.foe = {x:u.x, y:u.y, w:sp.w, h:sp.h}; });
  // party (left side, facing right)
  LAST.heroes = [];
  S.party.forEach((h, i) => {
    const hk = heroKey(h), down = h.hp <= 0, sp = down ? sprLying(hk) : spr(hk);
    const o = animOff(ANIM.hero[i], t, 1);
    const active = b && b.phase === "hero" && b.cur === i;
    const bob = down || REDUCED ? 0 : Math.floor(t/460 + i*0.5) % 2;
    const px = 14 + i*30 + (active ? 6 : 0) + o.dx, py = G - sp.h - bob + o.dy;
    const u = {sp, x:px, y:py, flash:o.flash, alpha:down ? 0.65 : 1};
    if (h.cls === "wizard" && !down) u.glow = [20, 2, 26, [0.3,0.6,0.6]];
    if (h.cls === "cleric" && !down) u.glow = [11, 9, 18, [0.6,0.5,0.25]];
    const aura = !down && heroAura(h); if (aura) u.glow = aura;
    units.push(u); LAST.heroes[i] = {x:px, y:py, w:sp.w, h:sp.h};
    if (active){ const ay = py - 7 - (REDUCED ? 0 : Math.floor(t/300) % 2); units.push({sp:ARROW, x:px + sp.w/2 - 2, y:ay, noShadow:true}); }
  });
  return units;
}
const ARROW = (() => { const d = {p:{y:"#fbb954"}, em:["y"], g:["yyyyy",".yyy.","..y.."]}; return compileSprite(d); })();
// party lantern light for readability
function partyLight(){ if (!S.party.length || scene.bgKey === "dawn") return; const n = S.party.length; scene.dyn = scene.dyn.filter(l => !l.party); scene.dyn.push({x:22 + n*15, y:BGS[scene.bgKey].ground - 14, r:58 + n*8, c:[0.42,0.34,0.22], t:0, life:1e9, party:1}); }

let lastT = 0;
let freezeUntil = 0;
const hitstop = ms => { if (!REDUCED) freezeUntil = Math.max(freezeUntil, performance.now() + ms); };
function loop(t){
  requestAnimationFrame(loop);
  if (t < freezeUntil) return; // hit-stop: hold the impact frame
  const dt = Math.min(0.1, (t - lastT)/1000); if (t - lastT < 33) return; lastT = t;
  if (S.screen === "game"){ worldTick(dt, t); scene.update(dt, t); scene.render(t, buildUnits(t), VW.world ? worldOverlay : artOverlay()); }
  else if (S.screen === "setup"){ scene.update(dt, t); scene.render(t, []); }
  else if (S.screen === "title"){ titleScene.update(dt, t); titleScene.render(t, titleUnits(t)); }
}
function titleUnits(t){ const G = 156, u = [];
  ["fighter","wizard","rogue","cleric"].forEach((k,i) => { const sp = spr(k); u.push({sp, x:150 + i*27, y:G - sp.h - (REDUCED ? 0 : Math.floor(t/460 + i*0.5) % 2)}); });
  const d = spr("drake"); u.push({sp:d, x:222, y:22 + Math.round(Math.sin(t/700)*4), noShadow:true, alpha:0.85, glow:[14,30,40,[1,0.45,0.2]]}); return u; }

// effects
const HERO_STYLE = {fighter:["slash","heavy"], rogue:["stab","backstab"], cleric:["smash","smash"], wizard:["firebolt","missiles"]};
const FOE_STYLE = {wolves:"bite", spider:"bite", hounds:"bite", troll:"smash", leeches:"drain", skeletons:"smash", goblins:"slash", shadow:"slash", gargoyle:"claw", drake:"claw"};
const FX = {
  foeCenter(){ const f = LAST.foe; return f ? [f.x + f.w/2, f.y + f.h*0.45] : [SW - 60, 120]; },
  heroCenter(i){ const h = LAST.heroes[i]; return h ? [h.x + h.w/2, h.y + h.h*0.4] : [40, 130]; },
  strike(i, style, dmg, crit, miss){
    const [hx, hy] = FX.heroCenter(i), [fx, fy] = FX.foeCenter(), G = BGS[scene.bgKey].ground, hb = LAST.heroes[i] || {x:hx, y:hy};
    const a = ANIM.hero[i] = {...(ANIM.hero[i]||{})}, big = style === "heavy" || style === "backstab";
    const hit = () => miss ? FX.missFoe() : FX.hitFoe(dmg, crit, big);
    if (style === "firebolt"){ a.cast = now(); a.castC = "#fbb954"; sfx("fire");
      scene.addFx("bolt", {x0:hx + 10, y0:hy - 6, x1:fx, y1:fy, dur:420, light:34, lc:[1.4,0.7,0.3], onEnd:M(() => { if (!miss) scene.addFx("boom", {x:fx, y:fy, r:crit ? 30 : 20, dur:420, light:80, lx:fx, ly:fy, lc:[1.6,0.8,0.3]}); sfx("hit"); hit(); })}); return; }
    if (style === "missiles"){ a.cast = now(); a.castC = "#b6cbc0"; sfx("magic");
      for (let k=0;k<3;k++) scene.addFx("missile", {x0:hx + 10, y0:hy - 6, x1:fx + (k-1)*4, y1:fy + (k-1)*6, arc:[-22, 28, 6][k], dur:460 + k*110, light:26, lc:[0.6,1.1,1.2],
        onEnd:M(() => { scene.addFx("spark", {x:fx + (k-1)*4, y:fy + (k-1)*6, dur:260}); sfx("blip"); if (k === 2) hit(); })}); return; }
    a.lunge = now(); a.lungeAmp = style === "backstab" ? 64 : style === "heavy" ? 38 : 26; sfx("swing");
    setTimeout(M(() => {
      if (style === "backstab") scene.addFx("backstab", {x:fx, y:fy, sx:hb.x, sy:hb.y, who:S.party[i] ? S.party[i].cls : "rogue", dur:560});
      else scene.addFx(style, {x:fx, y:fy, g:G - 2, dur:style === "heavy" ? 480 : 320, light:style === "heavy" ? 70 : 36, lx:fx, ly:fy, lc:style === "heavy" ? [1.5,0.8,0.3] : [1.1,1.1,1.2]});
      if (style === "heavy" && !miss) scene.flash(110, "#fbb954");
      setTimeout(M(hit), style === "backstab" ? 300 : style === "heavy" ? 140 : 80);
    }), 160);
  },
  foeStrike(hi, style, dmg, crit, miss){
    const [x, y] = FX.heroCenter(hi), [fx, fy] = FX.foeCenter(), G = BGS[scene.bgKey].ground;
    ANIM.foe.lunge = now(); ANIM.foe.lungeAmp = 22;
    setTimeout(M(() => {
      if (style === "drain") scene.addFx("drain", {x, y, x1:fx, y1:fy, dur:620});
      else if (style === "smash") scene.addFx("smash", {x, y, g:G - 2, dur:360, light:40, lx:x, ly:y});
      else scene.addFx(style, {x, y, dur:340, light:30, lx:x, ly:y, lc:[1.2,0.6,0.5]});
      setTimeout(M(() => miss ? FX.missHero(hi) : FX.hitHero(hi, dmg, crit)), 90);
    }), 200);
  },
  hitFoe(d, crit, big){ ANIM.foe.hurt = now(); ANIM.foe.hurtBig = !!(big || crit); hitstop(crit || big ? 130 : 60); if (crit) scene.flash(120, "#f4f2ea"); const [x,y] = FX.foeCenter(); scene.float("-" + d, x, y - 10, crit ? "#ffd678" : "#f4f2ea", crit); scene.burst(x, y, crit ? 26 : 14, ["#ffd678","#e2762d","#f4f2ea"], crit ? 70 : 50); scene.light(x, y, 50, [1.2,0.8,0.4], 0.3); scene.shake(crit ? 380 : 220); sfx("hit"); },
  missFoe(){ const [x,y] = FX.foeCenter(); scene.float("MISS", x, y - 10, "#8fadaa"); sfx("swing"); },
  hitHero(i, d, crit){ ANIM.hero[i] = {...(ANIM.hero[i]||{}), hurt:now(), hurtBig:!!crit}; hitstop(crit ? 110 : 50); if (crit) scene.flash(120, "#e04a3c"); const [x,y] = FX.heroCenter(i); scene.float("-" + d, x, y - 8, "#e04a3c"); scene.burst(x, y, 10, ["#e04a3c","#f4f2ea"], 40); scene.shake(200); sfx("hit"); },
  missHero(i){ const [x,y] = FX.heroCenter(i); scene.float("MISS", x, y - 8, "#8fadaa"); sfx("swing"); },
  heal(i, a){ const [x,y] = FX.heroCenter(i); scene.addFx("pillar", {x:Math.round(x), g:BGS[scene.bgKey].ground - 1, dur:900, light:50, lx:x, ly:y, lc:[0.7,1.2,0.8]}); scene.float("+" + a, x, y - 8, "#7aa35a"); for (let k=0;k<14;k++) scene.spawn({x:x + (Math.random()-0.5)*16, y:y + 10, vx:0, vy:-18 - Math.random()*14, life:1, c:k%2 ? "#7aa35a" : "#dfe6d6", em:1}); scene.light(x, y, 40, [0.4,0.9,0.5], 0.6); sfx("heal"); },
  lunge(i){ ANIM.hero[i] = {...(ANIM.hero[i]||{}), lunge:now()}; sfx("swing"); },
  foeLunge(){ ANIM.foe.lunge = now(); },
  magic(i){ const [hx,hy] = FX.heroCenter(i), [fx,fy] = FX.foeCenter(); for (let k=0;k<3;k++) setTimeout(M(() => { for (let j=0;j<10;j++) scene.spawn({x:hx + 10, y:hy - 4 + k*3, vx:(fx-hx)*1.6 + (Math.random()-0.5)*20, vy:(fy-hy)*1.6 + (Math.random()-0.5)*20 - 12, life:0.62, c:j%2 ? "#b6cbc0" : "#f4f2ea", em:1, s:j%3 ? 1 : 2}); scene.light(hx + 10, hy, 30, [0.4,0.8,0.9], 0.4); sfx("magic"); }), k*110); },
  breath(){ const [fx,fy] = FX.foeCenter(); scene.addFx("cone", {x:fx - 22, y:fy - 14, dur:1200, light:140, lx:110, ly:130, lc:[1.6,0.7,0.2]}); scene.flash(160, "#fbb954"); hitstop(90); for (let k=0;k<90;k++) scene.spawn({x:fx - 20, y:fy - 18 + (Math.random()-0.5)*10, vx:-150 - Math.random()*90, vy:20 + (Math.random()-0.5)*40, life:1.2, c:["#fbb954","#e2762d","#c95a24","#ffd678"][k%4], em:1, s:k%3 ? 1 : 2});
    scene.light(110, 130, 140, [1.4,0.6,0.2], 1.0); scene.shake(700); sfx("fire"); },
  fireAll(){ S.party.forEach((h,i) => { const [x,y] = FX.heroCenter(i); scene.burst(x, y, 12, ["#fbb954","#e2762d"], 40, {up:20}); }); scene.light(60, 140, 100, [1.3,0.6,0.2], 0.6); scene.shake(300); sfx("fire"); },
  levelUp(){ S.party.forEach((h,i) => { const [x,y] = FX.heroCenter(i); for (let k=0;k<16;k++) scene.spawn({x:x + (Math.random()-0.5)*20, y:y + 12, vx:0, vy:-26 - Math.random()*20, life:1.2, c:k%2 ? "#ffd678" : "#fbb954", em:1}); }); banner("LEVEL UP!", "gold"); sfx("levelup"); }
};

let fxHold = false; const fxQ = [];
Object.keys(FX).forEach(k => { if (k === "foeCenter" || k === "heroCenter") return; const f = FX[k]; FX[k] = (...a) => fxHold ? fxQ.push(() => f(...a)) : f(...a); });
function flushFx(){ fxHold = false; fxQ.splice(0).forEach((fn, i) => setTimeout(M(fn), 120 + i*200)); }

/* ================= SCREENS ================= */
function show(scr){
  S.screen = scr; $("#stage").dataset.scr = scr; if (isHost()) netDirty();
  $("#sTitle").hidden = scr !== "title"; $("#sSetup").hidden = scr !== "setup"; $("#sGame").hidden = scr !== "game";
  $("#titleCv").hidden = scr !== "title"; $("#scene").hidden = scr === "title"; $("#pause").hidden = true;
  if (scr === "title"){ $("#btnCont").hidden = !loadSave(); Audio8.music("ashen"); setTimeout(() => { const b = document.querySelector(".menu button:not([hidden])"); b && b.focus({preventScroll:true}); }, 60); }
  if (scr === "setup"){ scene.bgKey = "tavern"; scene.parts = []; scene.dyn = []; scene.fade = scene.fadeTo = 0; renderSetup(); Audio8.music("tavern"); }
}
function togglePause(force){ if (S.screen !== "game") return; const p = $("#pause"), open = force ?? p.hidden; p.hidden = !open; if (open){ $("#optVote").textContent = "파티 투표: " + (S.opts && S.opts.vote === false ? "끔 (P1이 결정)" : "켬"); $("#optVote").hidden = S.party.length < 2 || isGuest(); $("#optQuit").disabled = busy && !isGuest(); $("#optQuit").textContent = isGuest() ? "방 나가기" : "타이틀로 (자동 저장)"; $("#pause .btn").focus({preventScroll:true}); sfx("select"); } }
function bannerRaw(text, kind){ const el = $("#banner"); el.textContent = text; el.className = "banner " + (kind || ""); el.hidden = false; void el.offsetWidth; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; el.classList.remove("on"); }, 1500); }
function chapterCard(bg){ const c = CHAPTERS[bg]; if (!c) return; const el = $("#chapter"); el.innerHTML = `<span>${c[0]}</span><b>${c[1]}</b>`; el.hidden = false; void el.offsetWidth; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => { el.classList.remove("on"); setTimeout(() => el.hidden = true, 400); }, 2200); refreshStatus(); }

/* ---------- dice tray UI ---------- */
const trayEl = $("#trayWrap"), trayCv = $("#trayCv"), trayLabels = $("#trayLabels");
const HINT = "누른 채 흔들어 섞고, 트레이 쪽으로 휙 던지세요";
const pwKnob = $("#pwKnob"), pwLabel = $("#pwLabel"), pwBox = $("#power");
function showPower(s, z, overBowl, thrown){
  pwBox.hidden = false; pwKnob.style.bottom = Math.min(100, s / POWER.max * 100) + "%";
  pwBox.dataset.zone = z.key; pwLabel.textContent = thrown ? z.label : overBowl === false && s < 2.5 ? "트레이 위로 가져가세요" : z.label;
}
const tray = window.__tray = new DiceTray(trayCv, {
  onImpact:s => sfx("clack", s),
  onShake:e => sfx("clack", 0.15 + e*0.35),
  onGrab:() => { $("#trayHint").hidden = true; sfx("shake"); },
  onCancel:() => { const h = $("#trayHint"); h.textContent = "트레이 위에서 놓아야 던져져요"; h.hidden = false; },
  onPower:(s, z, over) => showPower(s, z, over),
  onThrow:(s, z) => { $("#trayHint").hidden = true; trayLabels.innerHTML = ""; document.querySelectorAll(".tray-throw").forEach(b => b.disabled = true); showPower(s, z, true, true); sfx(z.key === "over" ? "fire" : "swing"); },
  onOut:(i, xy) => { sfx("bad"); const el = document.createElement("span"); el.className = "dlabel fumble"; el.textContent = "장외!";
    const [W, H] = traySize(); el.style.left = Math.max(40, Math.min(W - 40, xy[0])) + "px"; el.style.top = Math.max(50, Math.min(H - 20, xy[1])) + "px"; trayLabels.appendChild(el); }
});
const traySize = () => [tray.cv.width*(tray.scale||4), tray.cv.height*(tray.scale||4)];
function mountTray(slot, w, h){ slot.appendChild(trayEl); tray.resize(w, h, 4); }
async function throwLocal(list, {auto=false, hint=HINT, outPolicy="reroll"} = {}){
  for (;;){
    trayLabels.innerHTML = ""; $("#trayHint").textContent = hint; $("#trayHint").hidden = auto;
    document.querySelectorAll(".tray-throw").forEach(b => { b.disabled = auto; b.hidden = false; });
    showPower(0, powerZone(0), true);
    const vals = await tray.roll(list, {auto});
    document.querySelectorAll(".tray-throw").forEach(b => b.hidden = true);
    if (!tray.lastOut.some(Boolean)) return vals;
    if (outPolicy === "fail"){ vals.out = true; return vals; }
    const prev = $("#trayRes").innerHTML;
    $("#trayRes").innerHTML = `<div class="verdict bad">장외! 다시 던지세요</div><div class="calc"><em>주사위가 트레이를 넘어갔어요. 조금 더 살살.</em></div>`;
    await sleep(auto ? 700 : 1300); $("#trayRes").innerHTML = prev;
  }
}
function showLabels(vals, marks=[]){
  trayLabels.innerHTML = vals.map((v, i) => { const b = tray.dice[i]; if (!b) return ""; const p = b.out ? b.outPos : b.pos; let [x,y] = tray.project([p[0], p[1] + b.s.R + 0.5, p[2]]);
    const [W, H] = traySize(); x = Math.max(40, Math.min(W - 40, x)); y = Math.max(50, Math.min(H - 20, y));
    return `<span class="dlabel ${b.out ? "fumble" : marks[i] || ""}" style="left:${x}px;top:${y}px">${b.out ? "장외" : v}</span>`; }).join("");
  marks.forEach((m, i) => tray.setMark(i, m));
}
// success strip: which raw d20 results succeed
function needFor(target, m){ return Math.max(2, Math.min(20, target - m)); }
function chanceOf(need, adv){ const p = (21 - need)/20; return adv ? 1 - (1 - p)*(1 - p) : p; }
function setTarget(o){
  const el = $("#target"); if (!o){ el.hidden = true; return; }
  const need = needFor(o.target, o.mod), pct = Math.round(chanceOf(need, o.adv)*100);
  el.hidden = false;
  el.innerHTML = `<div class="tg-text">${o.lead} <b>${need}</b> 이상${o.word ? " " + o.word : ""}<small>${o.foe ? `${o.subject} 확률` : "확률"} ${pct}%${o.adv ? " · 두 개 중 높은 눈" : ""}</small></div>
    <div class="strip">${Array.from({length:20}, (_, k) => { const n = k + 1, ok = n === 20 || (n !== 1 && n >= need);
      return `<span class="${ok ? (o.foe ? "bad" : "ok") : (o.foe ? "ok" : "no")}${n === 1 || n === 20 ? " nat" : ""}" data-n="${n}">${n}</span>`; }).join("")}</div>`;
}
function markTarget(vals){ document.querySelectorAll("#target .strip span").forEach(s => s.classList.toggle("hit", vals.includes(+s.dataset.n))); }
let trayActor = null;
function trayOpen({who, title, sub, foe, seat}){
  trayActor = seat ?? null; NET.W = null; NET.puppet = null; hideWaiter();
  fxHold = true; $("#trayLayer").hidden = false; $("#trayBox").classList.toggle("red", !!foe); setTarget(null); $("#power").hidden = true;
  paintSpriteCanvas($("#trayPortrait"), who); $("#trayTitle").textContent = title; $("#traySub").innerHTML = sub || ""; $("#trayRes").innerHTML = ""; $("#trayNext").hidden = true;
  mountTray($("#traySlot"), 1520, 680);
}
function trayResult(html){ $("#trayRes").innerHTML = html; paintAll($("#trayRes")); }
function trayHead(who, title, sub){ paintSpriteCanvas($("#trayPortrait"), who); $("#trayTitle").textContent = title; $("#traySub").innerHTML = sub || ""; }
/* buttons that wait for one player: "계속" or "use a luck token?" — only the seat's owner may answer online */
function hideWaiter(){ const b = $("#trayLuck"), n = $("#trayNext"); b.hidden = n.hidden = true; b.onclick = n.onclick = null; n.disabled = b.disabled = false; }
function paintWaiter(W){
  const b = $("#trayLuck"), n = $("#trayNext"), ok = mine(W.seat), who = W.seat == null ? "" : seatNick(W.seat);
  const click = v => () => { if (NET.W !== W) return; if (isGuest()){ n.disabled = b.disabled = true; sendInput("w", {id:W.id, v}); sfx("select"); } else W.fin && W.fin(v); };
  if (W.kind === "luck"){ b.innerHTML = `행운 토큰 쓰고 다시 던지기 <small>${W.n}개</small><span class="key">L</span>`; b.hidden = false; b.disabled = !ok; b.onclick = click("luck");
    n.textContent = ok ? "결과 받아들이기" : `${who}님의 결정을 기다리는 중…`; }
  else { b.hidden = true; n.textContent = ok ? W.label : `${who}님 확인 대기…`; }
  n.hidden = false; n.disabled = !ok; n.onclick = click("next"); if (ok) n.focus({preventScroll:true});
}
const pubW = W => ({kind:W.kind, id:W.id, label:W.label, seat:W.seat, n:W.n});
function trayWait(label="계속", autoMs){
  return new Promise(res => { const W = {kind:"next", id:++NET.wid, label, seat:trayActor}; let done = false;
    const fin = () => { if (done) return; done = true; if (NET.W === W){ NET.W = null; hideWaiter(); } netView("waitHide", [W.id]); res(); };
    W.fin = () => { sfx("select"); fin(); }; NET.W = W; paintWaiter(W); netView("waitShow", [pubW(W)]);
    if (autoMs) setTimeout(fin, autoMs); });
}
function trayClose(){ tray.stop(); $("#trayLayer").hidden = true; flushFx(); }
const verdictHTML = (calc, txt, tone) => `<div class="calc">${calc}</div><div class="verdict ${tone}">${txt}</div>`;

/* ---------- setup ---------- */
// each roll is made for a named ability (the class's important ones first) and lands there directly
function assignRolled(h){ if (!h.raw) return; const ok = h.raw.length === 6 && h.raw.every(r => STATS.includes(r.st)) && new Set(h.raw.map(r => r.st)).size === 6;
  if (!ok) return assignByClass(h); h.stats = {}; h.dice = {}; h.raw.forEach(r => { h.stats[r.st] = r.v; h.dice[r.st] = r.d; }); h.sel = null; }
function assignByClass(h){ if (!h.raw) return; const sorted = [...h.raw].sort((a,b) => b.v - a.v); h.stats = {}; h.dice = {}; CLASSES[h.cls].prio.forEach((st,i) => { h.stats[st] = sorted[i].v; h.dice[st] = sorted[i].d; }); h.sel = null; }
function diceStr(d){ if (!d) return ""; const low = Math.min(...d); let struck = false; return d.map(x => { if (x === low && !struck){ struck = true; return `<s>${x}</s>`; } return x; }).join(" "); }
function statGridHTML(h, i){ const C = CLASSES[h.cls];
  return STATS.map(st => { const v = h.stats ? h.stats[st] : null, prof = C.prof.includes(st);
    return `<button class="stat ${v == null ? "empty" : ""} ${h.sel === st ? "sel" : ""}" data-act="swap" data-i="${i}" data-s="${st}" aria-label="${STAT_KO[st]} ${v ?? "미정"}">
      <span class="lab">${prof ? '<span class="star">★</span>' : ""}${STAT_KO[st]}</span><b>${v ?? "??"}</b><small>${v == null ? "&nbsp;" : sgn(mod(v))}</small><i>${h.dice ? diceStr(h.dice[st]) : "&nbsp;"}</i></button>`; }).join(""); }
function cardHTML(h, i){ const C = CLASSES[h.cls], lock = online() && !mine(i);
  const derived = h.stats ? `HP ${calcHp(h)} · AC ${calcAc(h)}` : "HP ? · AC ?";
  const rollLabel = !h.stats ? "능력치 굴리기" : h.rerolls > 0 ? "다시 굴리기 (1회)" : "확정됨";
  return `<article class="hcard win ${lock ? "locked" : ""}" data-card="${i}">
    <div class="hc-pl">PLAYER ${i+1}${online() ? `<em class="own ${lock ? "" : "me"}">${esc(seatNick(i))}${lock ? "" : " (나)"}</em>` : ""}<span>${C.ko}</span></div>
    <div class="hc-portrait"><canvas class="px" data-spr="${h.cls}"></canvas></div>
    <label class="sr" for="nm${i}">플레이어 ${i+1} 이름</label><input id="nm${i}" class="name" maxlength="8" value="${esc(h.name)}" data-i="${i}" autocomplete="off" ${lock ? "readonly" : ""}>
    <div class="cls-row" role="group" aria-label="클래스">${Object.entries(CLASSES).map(([k,c]) => `<button data-act="cls" data-i="${i}" data-c="${k}" aria-pressed="${h.cls === k}"><canvas class="px" data-spr="${k}"></canvas>${c.ko}</button>`).join("")}</div>
    <p class="blurb">${C.blurb} <b>${C.special.name}</b>: ${C.special.desc}</p>
    <div class="stat-grid">${statGridHTML(h, i)}</div>
    <div class="hc-foot"><span class="derived">${derived}</span><button class="btn small ${h.stats ? "" : "primary"}" data-act="roll" data-i="${i}" ${h.stats && h.rerolls <= 0 ? "disabled" : ""}>${rollLabel}</button></div></article>`; }
function paintAll(root){ root.querySelectorAll("canvas[data-spr]").forEach(cv => paintSpriteCanvas(cv, cv.dataset.spr)); }
function renderSetup(){ const st = S.setup;
  document.querySelectorAll('[data-act="count"]').forEach(b => b.setAttribute("aria-pressed", +b.dataset.n === st.count));
  $("#setupCards").innerHTML = st.heroes.slice(0, st.count).map(cardHTML).join(""); paintAll($("#setupCards")); updateStartBtn(); }
function rerenderCard(i){ const el = document.querySelector(`[data-card="${i}"]`); if (!el) return; el.outerHTML = cardHTML(S.setup.heroes[i], i); paintAll(document.querySelector(`[data-card="${i}"]`)); updateStartBtn(); }
function updateStartBtn(){ const st = S.setup, ready = st.heroes.slice(0, st.count).every(h => h.stats); $("#btnStart").disabled = !ready || isGuest();
  $("#setupNote").textContent = isGuest() ? (ready ? "준비 완료! 방장이 출발을 누르면 시작해요." : "자기 카드에서 클래스를 고르고 능력치를 굴리세요.") : ready ? "준비 완료! 출발하세요." : "모두 능력치를 굴려야 출발할 수 있어요.";
  document.querySelectorAll('[data-act="count"]').forEach(b => b.disabled = isGuest()); netDirty(); }
let statAuto = false;
async function statRollModal(i){
  const h = S.setup.heroes[i]; if (busy) return;
  if (h.stats){ if (h.rerolls <= 0) return; h.rerolls--; }
  busy = true; statAuto = false; NET.lb = true;
  const m = $("#modal"); m.hidden = false; $("#modalTitle").textContent = `${h.name || DEF_NAMES[i]}의 능력치 굴림`;
  $("#modalSub").textContent = "직업에 중요한 능력치부터 하나씩 4d6을 굴려요. 가장 낮은 눈 하나는 버려요. 굴린 뒤 카드에서 두 능력치를 차례로 누르면 서로 바꿀 수 있어요.";
  paintSpriteCanvas($("#modalPortrait"), h.cls);
  mountTray($("#modalSlot"), 1520, 640);
  const rolls = [], slots = $("#statSlots"), order = CLASSES[h.cls].prio, prof = CLASSES[h.cls].prof;
  const drawSlots = (cur) => { slots.innerHTML = Array.from({length:6}, (_, k) => { const r = rolls[k], st = order[k];
    return `<li class="${k === cur ? "cur" : ""} ${r ? "done" : ""}"><span>#${k+1}</span><em class="st">${prof.includes(st) ? '<small>★</small>' : ""}${STAT_KO[st]}</em><b>${r ? r.v : "–"}</b><i>${r ? diceStr(r.d) : ""}</i></li>`; }).join(""); };
  $("#modalDone").hidden = true; $("#modalAuto").hidden = false; $("#modalAuto").disabled = false;
  for (let k=0;k<6;k++){
    drawSlots(k);
    $("#modalTitle").textContent = `${h.name || DEF_NAMES[i]}의 능력치 굴림 — ${STAT_KO[order[k]]}`;
    const vals = await throwLocal(dice(6, 4, h.cls), {auto:statAuto, hint:`${STAT_KO[order[k]]} 굴림 (#${k+1}) — 끌어서 던지거나 버튼을 누르세요`});
    const low = vals.indexOf(Math.min(...vals));
    showLabels(vals, vals.map((v, j) => j === low ? "drop" : "keep"));
    const v = vals.reduce((a,b) => a+b, 0) - vals[low]; rolls.push({v, d:vals, st:order[k]});
    sfx(v >= 15 ? "good" : "select"); drawSlots(k+1);
    await sleep(statAuto ? 650 : 900);
  }
  $("#modalAuto").hidden = true; $("#modalDone").hidden = false; $("#modalDone").focus();
  await new Promise(res => $("#modalDone").onclick = res);
  h.raw = rolls; assignRolled(h); tray.stop(); m.hidden = true; busy = false; NET.lb = false; sfx("good");
  if (isGuest()) sendInput("stats", {i, raw:rolls}); rerenderCard(i);
}
function startGame(){
  const st = S.setup, n = st.count;
  S.items = {}; S.inv = []; S.itemSeq = 0; S.newItems = 0; S.luck = 1; S.chapSeen = {}; S.objective = "";
  S.party = st.heroes.slice(0, n).map((h, i) => { const hp = calcHp(h); const hero = {name:(h.name || "").trim() || DEF_NAMES[i], cls:h.cls, stats:{...h.stats}, maxHp:hp, hpBase:hp, hp, eq:{}};
    STARTER[h.cls].forEach(k => { hero.eq[ITEMS[k].slot] = newItem(k); }); hero.ac = calcAc(hero); return hero; });
  S.party.forEach(h => { h.skills = []; }); S.world = newWorld(); S.walk = null; S.loot = genLoot(); S.stageGo = null; S.quests = {}; S.chat = S.chat || []; S.freeBooks = 0;
  S.gold = 15; S.potions = 1 + Math.floor(n / 2); S.flags = {}; S.seenNodes = {}; S.battle = null; S.preBattle = null; S.roller = 0; S.xp = 0; S.level = 1; S.bg = null;
  show("game"); enterNode("start");
}

/* ---------- story flow ---------- */
function normLine(l){ return typeof l === "string" ? {who:"narr", text:l} : {who:l[0], text:l[1]}; }
function gainXp(n, out){
  S.xp += n; out.push(["sys", `경험치 +${n}`]);
  while (S.level < XP_T.length && S.xp >= XP_T[S.level]){
    S.level++; S.party.forEach(h => { const inc = Math.max(2, CLASSES[h.cls].hd/2 + 1 + mod(h.stats.con)); h.hpBase = (h.hpBase ?? h.maxHp) + inc; refreshHero(h); h.hp = h.maxHp; });
    out.push(["sys", `레벨 업! 파티가 Lv ${S.level}이 되었다. 최대 HP 증가, HP 모두 회복${S.level % 2 === 0 ? ", 명중 +1" : ""}.`]);
    setTimeout(FX.levelUp, 500);
  }
}
function applyFx(fx){
  const out = [];
  if (fx.flag){ const had = S.flags[fx.flag]; S.flags[fx.flag] = true; if (!had && FLAG_TXT[fx.flag]) out.push(["sys", FLAG_TXT[fx.flag]]); }
  if (fx.gold){ S.gold = Math.max(0, S.gold + fx.gold); out.push(["sys", fx.gold > 0 ? `금화 ${fx.gold}닢을 얻었다.` : `금화 ${-fx.gold}닢을 썼다.`]); }
  if (fx.potion){ S.potions += fx.potion; out.push(["sys", `회복 물약 ${fx.potion}개를 얻었다.`]); }
  if (fx.luck){ S.luck += fx.luck; out.push(["sys", `행운 토큰 +${fx.luck} — 실패한 굴림을 한 번 다시 던질 수 있다. (보유 ${S.luck}개)`]); }
  if (fx.item){ giveItem(fx.item); out.push(["sys", `획득: ${itemName(fx.item)} — 가방(I)에서 장착하세요.`]); setTimeout(() => itemToast(fx.item), 400); }
  if (fx.hpcost){ S.party.forEach((h, i) => { h.hp = Math.max(1, h.hp - fx.hpcost); setTimeout(() => FX.hitHero(i, fx.hpcost), 300 + i*120); }); out.push(["sys", `모두 HP −${fx.hpcost}`]); }
  if (fx.dmg){
    const targets = fx.who === "all" ? S.party : [S.party[S.roller] || S.party[0]];
    const parts = targets.map(h => { const p = /(\d+)d(\d+)/.exec(fx.dmg); let d = 0; for (let k=0;k<+p[1];k++) d += rnd(+p[2]); h.hp = Math.max(1, h.hp - d); const i = S.party.indexOf(h); setTimeout(() => FX.hitHero(i, d), 350); return `${h.name} −${d}`; });
    if (fx.fire) setTimeout(FX.fireAll, 250);
    out.push(["sys", `피해! ${parts.join(", ")}`]);
  }
  if (fx.heal){ S.party.forEach((h,i) => { const was = h.hp; h.hp = fx.heal === "full" ? h.maxHp : Math.min(h.maxHp, h.hp + Math.ceil(h.maxHp / 2)); if (h.hp > was) setTimeout(() => FX.heal(i, h.hp - was), 300 + i*120); }); out.push(["sys", fx.heal === "full" ? "일행의 HP가 모두 회복되었다." : "일행의 HP가 절반만큼 회복되었다."]); }
  if (fx.door) sfx("door");
  if (fx.loot){ const got = rollLoot(fx.loot.filter(k => !ITEMS[k].cls || ITEMS[k].cls.some(c => S.party.some(h => h.cls === c))), 2); got.forEach(k => giveItem(k)); if (got.length){ out.push(["sys", `획득: ${got.map(itemName).join(", ")} — 가방(I)에서 장착하세요.`]); setTimeout(() => itemToast(got[0]), 400); } }
  if (fx.take){ Object.values(S.loot || {}).forEach(L => L.forEach(o => { if (o.k === fx.take) o.taken = true; })); }
  if (fx.qdone && S.quests && S.quests[fx.qdone] === "active"){ S.quests[fx.qdone] = "done"; out.push(["sys", `현상금 달성: ${QUESTS[fx.qdone].name} — 마을 게시판에서 보상을 받으세요.`]); }
  if (fx.xp) gainXp(fx.xp, out);
  return out;
}
function setBg(bg){
  if (!bg || bg === scene.bgKey && S.bg === bg) { S.bg = bg || S.bg; return; }
  const first = !S.bg; S.bg = bg;
  const newChap = CHAPTERS[bg] && !(S.chapSeen || (S.chapSeen = {}))[bg]; if (newChap){ S.chapSeen[bg] = 1; S.chapter = bg; S.objective = OBJECTIVES[bg] || ""; }
  if (first){ scene.bgKey = bg; partyLight(); if (newChap) chapterCard(bg); Audio8.music(MUSIC[bg]); return; }
  scene.fadeTo = 1;
  setTimeout(() => { scene.bgKey = bg; scene.parts = []; partyLight(); scene.fadeTo = 0; if (newChap) chapterCard(bg); }, 340);
  Audio8.music(MUSIC[bg]);
}
function enterNode(id, extra=[]){
  const ai = AREA_BY_ENTRY[id];
  // the story walked into another area's first scene: either a new road opens, or (already open) the party is just back on the road
  if (ai != null && S.world && ai !== S.world.at){ if (ai > S.world.unlocked) return arriveFrontier(ai, extra); return enterNode("hub", extra); }
  if (stageBreak(id, extra)) return;
  const n = NODES[id];
  const again = S.seenNodes[id] && n.again; S.seenNodes[id] = true;
  S.mode = "story"; S.nodeId = id; S.pick = null; S.enterSeq = (S.enterSeq || 0) + 1;
  setBg(n.bg || S.bg);
  if (!S.battle) Audio8.music(MUSIC[S.bg]);
  let lines = (again ? n.again : n.lines).map(l => typeof l === "function" ? l(S) : l).filter(Boolean);
  if (n.fx) lines = lines.concat(applyFx(n.fx));
  lines = lines.concat(extra);
  S.lines = lines.map(normLine); S.li = 0;
  showArt(n.art); hideCards(); vote = null;
  save(); refreshStatus(); typeLine();
  if (n.walk && !S.lines.length) startWalk();
}
const tw = {t:null, done:true};
function setSpeaker(who){ const sp = SPEAKERS[who] || SPEAKERS.narr; $("#speaker").textContent = sp.name; paintSpriteCanvas($("#portrait"), sp.spr); }
function typeLine(){
  clearInterval(tw.t); const L = S.lines[S.li]; if (!L) return;
  setSpeaker(L.who); $("#choices").innerHTML = ""; $("#dlgMore").hidden = true;
  $("#dlgPos").textContent = S.lines.length > 1 ? `${S.li + 1}/${S.lines.length}` : "";
  const el = $("#dlgText"); el.className = "dlg-text" + (L.who === "sys" ? " sysl" : "");
  if (REDUCED){ el.textContent = L.text; tw.done = true; afterLine(); return; }
  let i = 0; tw.done = false; el.textContent = "";
  tw.t = setInterval(() => { i++; el.textContent = L.text.slice(0, i); if (i % 3 === 0 && L.text[i-1] !== " ") sfx("blip"); if (i >= L.text.length){ clearInterval(tw.t); tw.done = true; afterLine(); } }, 22);
}
function afterLine(){ const last = S.li >= S.lines.length - 1; $("#dlgMore").hidden = last; if (last) renderChoices(); }
function advanceDialog(){
  if (S.mode !== "story" || busy) return; const L = S.lines[S.li];
  if (!tw.done){ clearInterval(tw.t); $("#dlgText").textContent = L.text; tw.done = true; afterLine(); return; }
  if (S.li < S.lines.length - 1){ if (isGuest()) return sendInput("adv", {li:S.li}); S.li++; save(); typeLine(); }
  else if (NODES[S.nodeId].walk){ if (isGuest()) return sendInput("walkGo", {}); startWalk(); }
}
const nodeChoices = n => n.next ? [{t:"go", label:n.nextLabel || "계속", to:n.next}] : (n.choices || []);
const costOf = c => c.cost ? (S.flags.discount ? Math.ceil(c.cost*0.7) : c.cost) : 0;
const visibleChoices = n => nodeChoices(n).map((c, i) => [c, i]).filter(([c]) => !(c.hide && S.flags[c.hide]) && !(c.need && !S.flags[c.need]));
function choiceTag(c){ let tag = "", dis = !!c.dis;
  if (c.t === "check") tag = `<span class="tag">${STAT_KO[c.stat]} DC ${c.dc}</span>`;
  if (c.t === "battle") tag = `<span class="tag fight">전투</span>`;
  if (c.need) tag += `<span class="tag best">단서</span>`;
  const cost = costOf(c); if (cost){ tag = `<span class="tag">금화 ${cost}${cost !== c.cost ? ` <s>${c.cost}</s>` : ""}</span>`; if (S.gold < cost){ dis = true; tag += `<span class="tag fight">금화 부족</span>`; } }
  return {tag, dis}; }
/* ---------- party vote: everyone picks; if the party disagrees, a d20 duel decides ---------- */
let vote = null;
const voteOn = () => S.party.length > 1 && !(S.opts && S.opts.vote === false);
function needVote(n){ if (!voteOn() || S.mode !== "story" || n.next || n.noVote) return false;
  return visibleChoices(n).filter(([c]) => !choiceTag(c).dis && c.t !== "restart" && c.t !== "retry").length >= 2; }
const nextVoter = () => S.party.findIndex((_, k) => vote.votes[k] == null);
const seatToVote = peer => S.party.findIndex((_, k) => vote.votes[k] == null && ownerPeer(k) === peer);
const curVoter = () => !vote || vote.resolving ? -1 : online() ? seatToVote(NET.me) : vote.turn;
function voteHead(){ const k = curVoter(), h = S.party[k];
  if (h) return `<span class="vtag">P${k + 1}</span>${esc(h.name)}의 선택${online() ? " <small>(나)</small>" : ` <small>${k + 1}/${S.party.length}</small>`}`;
  const left = S.party.map((p, j) => vote.votes[j] == null ? esc(seatNick(j)) : null).filter(Boolean);
  return left.length ? `<small>${left.join(", ")}님의 선택을 기다리는 중…</small>` : ""; }
const voterChips = i => vote ? vote.votes.map((v, k) => v === i ? `<canvas class="px vchip" data-spr="${S.party[k].cls}" title="${esc(S.party[k].name)}"></canvas>` : "").join("") : "";
function renderChoices(){
  const n = NODES[S.nodeId];
  if (n.walk){ $("#choices").innerHTML = `<button class="choice" data-act="walkGo"><span>둘러본다</span></button>`; $("#choices").classList.remove("dense", "dense2"); netDirty(); return; }
  if (needVote(n)){ if (!vote || vote.node !== S.nodeId) vote = {node:S.nodeId, votes:[], turn:0}; } else vote = null;
  const vk = curVoter(), voter = vote && S.party[vk], wait = vote && !voter;
  let html = vote ? `<p class="prompt vote">${voter ? `<canvas class="px" data-spr="${voter.cls}"></canvas>` : ""}${voteHead()}</p>` : n.prompt ? `<p class="prompt">${esc(n.prompt)}</p>` : "";
  const vis = visibleChoices(n);
  vis.forEach(([c, i]) => { const {tag, dis} = choiceTag(c);
    html += `<button class="choice" data-act="choice" data-i="${i}" ${dis || wait ? "disabled" : ""}><span>${esc(c.label)}</span>${tag}<span class="voters">${voterChips(i)}</span></button>`; });
  $("#choices").innerHTML = html; $("#choices").classList.toggle("dense", vis.length > 4); $("#choices").classList.toggle("dense2", vis.length > 6); paintAll($("#choices"));
  if (n.cardView) showCards(n, vis);
  netDirty();
}
function choose(i, peer = NET.me){
  const c = nodeChoices(NODES[S.nodeId])[i]; if (!c) return;
  if (needVote(NODES[S.nodeId]) && (!vote || vote.node !== S.nodeId)) vote = {node:S.nodeId, votes:[], turn:0};
  if (vote && vote.node === S.nodeId && !vote.resolving){
    if (choiceTag(c).dis) return;
    const k = online() ? seatToVote(peer) : vote.turn; if (k < 0) return;
    vote.votes[k] = i; vote.turn = nextVoter(); sfx("select");
    if (vote.turn >= 0) return renderChoices();
    return resolveVote();
  }
  if (online() && S.party.length > 1 && !voteOn() && ownerPeer(0) !== peer) return;
  doChoice(i);
}
function resolveVote(){
  const picks = [...new Set(vote.votes)];
  renderChoices();
  if (picks.length === 1){ const i = picks[0]; vote = null; banner("만장일치!", "gold"); sfx("good"); return setTimeout(() => doChoice(i), 500); }
  vote.resolving = true; banner("의견 대립!", "red"); sfx("hit");
  setTimeout(diceDuel, 700);
}
async function diceDuel(){
  busy = true; hideCards();
  const votes = vote.votes.slice(), labelOf = i => nodeChoices(NODES[S.nodeId])[i].label;
  let contenders = S.party.map((_, k) => k), round = 0, winner = null;
  const rows = {};
  const table = () => `<div class="duel">${S.party.map((h, k) => `<div class="duel-row ${contenders.includes(k) ? "" : "out"} ${winner === k ? "win" : ""}"><canvas class="px" data-spr="${h.cls}"></canvas><b>${esc(h.name)}</b><span>「${esc(labelOf(votes[k]))}」</span><strong>${rows[k] ?? "–"}</strong></div>`).join("")}</div>`;
  trayOpen({who:S.party[0].cls, title:"의견 대립! 주사위 대결", sub:"각자 d20을 던져서 가장 높은 사람의 선택으로 진행해요", seat:0});
  while (winner == null){
    contenders.forEach(k => { delete rows[k]; });
    for (const k of contenders){
      const h = S.party[k]; trayActor = k;
      trayHead(h.cls, `${round ? "재대결! " : "주사위 대결 — "}${h.name}의 차례`, `「${esc(labelOf(votes[k]))}」을 원해요 · 가장 높은 눈이 이겨요${online() ? ` · <b>${esc(seatNick(k))}</b>님이 던져요` : ""}`);
      trayResult(table());
      const [v] = await throwDice(dice(20, 1, h.cls), {hint:`${h.name} — 주사위를 던지세요`});
      showLabels([v], [v === 20 ? "crit" : "keep"]); rows[k] = v; sfx(v >= 15 ? "good" : "select");
      trayResult(table()); bark(k, v >= 15 ? "이건 내가 이겼다!" : v <= 5 ? "아..." : "음...");
      await sleep(650);
    }
    const max = Math.max(...contenders.map(k => rows[k])), top = contenders.filter(k => rows[k] === max);
    if (new Set(top.map(k => votes[k])).size === 1) winner = top[0];
    else { contenders = top; round++; banner("동점! 재대결", "gold"); await sleep(700); }
  }
  const h = S.party[winner], i = votes[winner];
  trayHead(h.cls, `${h.name}의 승리!`, `가장 높은 눈 <b>${rows[winner]}</b>이 나왔어요`);
  trayResult(table() + `<div class="verdict crit">「${esc(labelOf(i))}」 쪽으로 간다!</div>`); sfx("crit");
  trayActor = null; await trayWait("진행");
  trayClose(); busy = false; vote = null; doChoice(i);
}
function doChoice(i){
  const c = nodeChoices(NODES[S.nodeId])[i]; if (!c) return; sfx("select");
  hideCards();
  if (c.t === "go"){ const cost = costOf(c); if (cost && S.gold < cost) return;
    if (cost){ S.gold -= cost; sfx("good"); return enterNode(c.to, [["sys", `금화 ${cost}닢을 썼다. (남은 금화 ${S.gold})`]]); }
    enterNode(c.to); }
  else if (c.t === "check"){ S.mode = "pick"; S.pick = i; renderPick(); }
  else if (c.t === "battle") startBattle(c.foe, c.win);
  else if (c.t === "restart"){ clearSave(); S.setup = blankSetup(); show("title"); }
  else if (c.t === "retry") retryBattle();
  else if (c.t === "travel") travel(c.to);
  else if (c.t === "shop") openShop(c.shop);
  else if (c.t === "quest") acceptQuest(c.q);
  else if (c.t === "claim") claimQuest(c.q);
}
function renderPick(){
  const c = nodeChoices(NODES[S.nodeId])[S.pick];
  setSpeaker("narr"); $("#dlgPos").textContent = ""; $("#dlgMore").hidden = true; $("#dlgText").className = "dlg-text";
  $("#dlgText").textContent = `「${c.label}」 — 누가 도전할까요? (${STAT_KO[c.stat]} 판정, 목표 DC ${c.dc})`;
  const mods = S.party.map(h => checkMod(h, c.stat)), best = Math.max(...mods);
  let html = S.party.map((h, i) => { const prof = CLASSES[h.cls].prof.includes(c.stat);
    return `<button class="choice" data-act="pickHero" data-i="${i}"><span>${esc(h.name)} <small>(${CLASSES[h.cls].ko})</small></span><span class="tag">${STAT_KO[c.stat]} ${sgn(mods[i])}</span>${prof ? '<span class="tag ok">숙련</span>' : ""}<span class="tag need">${needFor(c.dc, mods[i])} 이상 · ${Math.round(chanceOf(needFor(c.dc, mods[i]))*100)}%</span>${mods[i] === best && S.party.length > 1 ? '<span class="tag best">최고</span>' : ""}</button>`; }).join("");
  html += `<button class="choice" data-act="cancelPick"><span>다른 방법을 고른다</span></button>`;
  $("#choices").innerHTML = html;
}
async function doCheck(hi){
  if (busy) return; busy = true;
  const c = nodeChoices(NODES[S.nodeId])[S.pick], h = S.party[hi], m = checkMod(h, c.stat);
  trayOpen({who:h.cls, seat:hi, title:`${h.name}의 ${STAT_KO[c.stat]} 판정`, sub:`${esc(c.label)} · 목표 <b>DC ${c.dc}</b> · 보정 <b>${sgn(m)}</b>`});
  setTarget({lead:"d20에서", target:c.dc, mod:m, word:"나오면 성공"});
  let ok = false, skipWait = false;
  for (;;){
    const rv = await throwDice(dice(20, 1, h.cls), {outPolicy:"fail"});
    if (rv.out){ showLabels(rv); trayResult(verdictHTML("주사위가 트레이를 넘어갔다", "장외 — 실패!", "bad")); sfx("bad"); bark(hi, "아차...!"); }
    else {
      const [raw] = rv; markTarget([raw]);
      const total = raw + m; ok = raw === 20 || (raw !== 1 && total >= c.dc);
      const tone = raw === 20 ? "crit" : raw === 1 ? "bad" : ok ? "good" : "bad";
      showLabels([raw], [raw === 20 ? "crit" : raw === 1 ? "fumble" : "keep"]);
      trayResult(verdictHTML(`${raw} ${sgn(m)} = <strong>${total}</strong> <em>vs DC ${c.dc}</em>`, raw === 20 ? "대성공!" : raw === 1 ? "대실패..." : ok ? "성공!" : "실패...", tone));
      sfx(raw === 20 ? "crit" : ok ? "good" : "bad"); if (raw === 20){ banner("CRITICAL!", "gold"); bark(hi, "완벽해!"); } else if (ok) bark(hi, pickLine(BARK.ok)); else bark(hi, pickLine(BARK.fail));
    }
    if (ok) break; const a = await askLuck(); if (a === "luck"){ trayResult(""); continue; } skipWait = a === "skip"; break;
  }
  if (!skipWait) await trayWait("계속");
  trayClose(); busy = false; S.roller = hi; enterNode(ok ? c.pass : c.fail);
}

/* ---------- battle ---------- */
function startBattle(key, win){
  const f = FOES[key], n = S.party.length;
  S.preBattle = {snap:JSON.parse(JSON.stringify({party:S.party, gold:S.gold, potions:S.potions, flags:S.flags, nodeId:S.nodeId, bg:S.bg, xp:S.xp, level:S.level, items:S.items, inv:S.inv, itemSeq:S.itemSeq, luck:S.luck})), key, win};
  let hp = Math.round(f.hp * HP_SCALE[n - 1]); const msg = [f.intro];
  if (f.regen) msg.push(`재생 능력! 매 턴 주사위로 상처를 아물게 한다 — 파티가 주사위로 막을 수 있고, 불 공격(화염 화살 · 화염구 · 불꽃 무기)에 그을린 상처는 막기 쉽다.`);
  if (key === "drake" && S.flags.weakness) msg.push("약점을 알고 있다! 용의 방어도 −2.");
  if (key === "drake" && S.flags.spear) msg.push("은빛 창이 용을 향해 떨린다. 명중 +2.");
  if (key === "drake" && S.flags.ambush){ hp -= 10; msg.push("선제 공격으로 이미 피해 10!"); }
  S.battle = {suses:S.party.map(h => Object.fromEntries((h.skills || []).map(k => [k, SKILLS[k].uses]))), key, name:f.name, hp, maxHp:hp, ac:f.ac - (key === "drake" && S.flags.weakness ? 2 : 0), cur:-1, phase:"hero", round:1, uses:S.party.map(h => CLASSES[h.cls].uses), win, msg, picking:null};
  S.mode = "battle"; Audio8.music(key === "drake" ? "boss" : "battle"); banner(key === "drake" ? "BOSS BATTLE" : "BATTLE!", "red"); sfx("hit");
  showArt(null); hideCards(); setTimeout(() => bark(0, pickLine(key === "drake" ? BARK.boss : BARK.battle)), 600);
  advanceTurn();
}
function retryBattle(){ const pb = S.preBattle; if (!pb) return; Object.assign(S, JSON.parse(JSON.stringify(pb.snap))); S.party.forEach(h => { h.hp = Math.max(h.hp, Math.ceil(h.maxHp / 2)); }); scene.bgKey = S.bg; partyLight(); startBattle(pb.key, pb.win); }
function bmsg(t){ S.battle.msg.push(t); if (S.battle.msg.length > 12) S.battle.msg.shift(); }
function advanceTurn(){
  const b = S.battle; if (!b) return;
  if (b.hp <= 0) return winBattle();
  if (S.party.every(h => h.hp <= 0)) return loseBattle();
  for (let j = b.cur + 1; j < S.party.length; j++) if (S.party[j].hp > 0){ b.cur = j; b.phase = "hero"; b.picking = null; save(); renderBattle(); return; }
  b.phase = "foe"; b.cur = S.party.length; save(); renderBattle(); setTimeout(foeTurn, REDUCED ? 400 : 1400);
}
function dmgFoe(d){ S.battle.hp = Math.max(0, S.battle.hp - d); }
function sumRoll(vals, bonus){ const t = vals.reduce((a,b) => a+b, 0) + bonus; return {t:Math.max(1, t), calc:`${vals.join(" + ")}${bonus ? ` ${sgn(bonus)}` : ""} = <strong>${Math.max(1, t)}</strong>`}; }
async function heroAct(kind){
  if (busy) return;
  const b = S.battle, i = b.cur, h = S.party[i], C = CLASSES[h.cls], f = FOES[b.key];
  if (kind === "potion"){ if (S.potions <= 0) return; b.picking = "potion"; renderBattle(); return; }
  const special = kind === "special"; if (special){ if (b.uses[i] <= 0) return; b.uses[i]--; }
  busy = true; S.mode = "battle";
  const title = special ? C.special.name : C.atkName;
  if (special && h.cls === "wizard"){
    trayOpen({who:h.cls, seat:i, title:`${h.name} — 마법 화살`, sub:`${esc(f.name)}에게 · 반드시 명중 · 3d4${sgn(3 + bonus(h, "dmg"))}`});
    const vals = await throwDice(dice(4, 3, h.cls)); showLabels(vals, vals.map(() => "keep"));
    const r = sumRoll(vals, 3 + bonus(h, "dmg")); dmgFoe(r.t); if (fireHit(h, "missiles")) S.battle.burn = true; FX.strike(i, "missiles", r.t, false, false); bmsg(`${h.name}의 마법 화살! 빛나는 화살 세 발이 꽂힌다. 피해 ${r.t}.`);
    trayResult(verdictHTML(r.calc, `피해 ${r.t}!`, "good")); refreshStatus();
    await trayWait("계속", 0); trayClose(); busy = false; return endHeroTurn();
  }
  if (special && h.cls === "cleric"){
    const tgtI = S.party.map((p, k) => [p.hp / p.maxHp, k]).sort((a,z) => a[0]-z[0])[0][1], tgt = S.party[tgtI], w = mod(statOf(h, "wis")) + 3 + bonus(h, "heal");
    trayOpen({who:h.cls, seat:i, title:`${h.name} — 치유의 빛`, sub:`대상: ${esc(tgt.name)} (HP ${tgt.hp}/${tgt.maxHp}) · 1d8${sgn(w)}`});
    const vals = await throwDice(dice(8, 1, h.cls)); showLabels(vals, ["keep"]);
    const r = sumRoll(vals, w), was = tgt.hp; tgt.hp = Math.min(tgt.maxHp, tgt.hp + r.t); FX.heal(tgtI, tgt.hp - was);
    bmsg(`${h.name}의 치유의 빛! ${tgt.name} HP +${tgt.hp - was}.${was === 0 ? ` ${iga(tgt.name)} 다시 일어선다!` : ""}`);
    trayResult(verdictHTML(r.calc, `${tgt.name} HP +${tgt.hp - was}${was === 0 ? " · 다시 일어섰다!" : ""}`, "good")); refreshStatus();
    await trayWait("계속"); trayClose(); busy = false; return endHeroTurn();
  }
  const am = atkMod(h), adv = special && h.cls === "rogue";
  trayOpen({who:h.cls, seat:i, title:`${h.name} — ${title}`, sub:`${esc(f.name)} · 방어도 <b>${b.ac}</b> · 명중 <b>${sgn(am)}</b>${adv ? " · d20 두 개 중 높은 눈" : ""}`});
  setTarget({lead:"d20에서", target:b.ac, mod:am, word:"나오면 명중", adv});
  let vals, raw, crit, miss, calc, skipWait = false;
  for (;;){
    vals = await throwDice(dice(20, adv ? 2 : 1, h.cls), {outPolicy:"fail"});
    if (vals.out){ showLabels(vals); trayResult(verdictHTML("주사위가 트레이를 넘어갔다", "장외 — 빗나감!", "bad")); sfx("bad"); miss = true; raw = 0; }
    else {
      markTarget(vals);
      raw = Math.max(...vals); const keepI = vals.indexOf(raw); crit = raw === 20; miss = raw === 1 || (!crit && raw + am < b.ac);
      showLabels(vals, vals.map((v, k) => k !== keepI ? "drop" : crit ? "crit" : raw === 1 ? "fumble" : "keep"));
      calc = `${raw} ${sgn(am)} = <strong>${raw + am}</strong> <em>vs AC ${b.ac}</em>`;
      if (miss){ trayResult(verdictHTML(calc, raw === 1 ? "대실패! 손이 미끄러졌다." : "빗나갔다!", "bad")); sfx("bad"); }
    }
    if (!miss) break; const a = await askLuck(); if (a === "luck"){ trayResult(""); continue; } skipWait = a === "skip"; break;
  }
  const style = HERO_STYLE[h.cls][special ? 1 : 0];
  if (miss){ FX.strike(i, style, 0, false, true); bmsg(`${h.name}의 ${title}! ${vals.out ? "주사위가 트레이를 넘어가 허공을 갈랐다." : raw === 1 ? "대실패, 무기가 손에서 미끄러졌다." : "빗나갔다."}`); bark(i, pickLine(BARK.miss));
    if (!skipWait) await trayWait("계속"); trayClose(); busy = false; return endHeroTurn(); }
  if (crit){ banner("CRITICAL!", "gold"); sfx("crit"); bark(i, pickLine(BARK.crit)); } else sfx("good");
  trayResult(verdictHTML(calc, crit ? "치명타! 피해 주사위가 두 배" : "명중!", crit ? "crit" : "good"));
  const dl = [...C.dmg]; if (special && h.cls === "fighter") dl.push(8); if (special && h.cls === "rogue") dl.push(6, 6);
  const all = crit ? dl.concat(dl) : dl, dbonus = dmgMod(h);
  await trayWait("피해 굴리기"); setTarget(null);
  const dv = await throwDice(all.map(s => ({sides:s, scheme:h.cls})), {hint:"피해 주사위를 던지세요"}); showLabels(dv, dv.map(() => "keep"));
  const r = sumRoll(dv, dbonus); dmgFoe(r.t); if (fireHit(h, style)) S.battle.burn = true; FX.strike(i, style, r.t, crit, false);
  bmsg(`${h.name}의 ${title}! ${crit ? "치명타! " : ""}피해 ${r.t}.`);
  trayResult(verdictHTML(r.calc, `피해 ${r.t}!`, crit ? "crit" : "good")); refreshStatus();
  await trayWait("계속"); trayClose(); busy = false; endHeroTurn();
}
async function usePotion(ti, inBattle){
  if (S.potions <= 0 || busy) return; busy = true;
  const tgt = S.party[ti]; S.potions--; const drinker = inBattle ? S.party[S.battle.cur] : tgt;
  trayOpen({who:drinker.cls, seat:S.party.indexOf(drinker), title:"회복 물약", sub:`대상: ${esc(tgt.name)} (HP ${tgt.hp}/${tgt.maxHp}) · 2d4+2`});
  const vals = await throwDice(dice(4, 2, drinker.cls)); showLabels(vals, vals.map(() => "keep"));
  const r = sumRoll(vals, 2), was = tgt.hp; tgt.hp = Math.min(tgt.maxHp, tgt.hp + r.t); FX.heal(ti, tgt.hp - was);
  if (inBattle) bmsg(`${drinker === tgt ? `${eun(tgt.name)} 물약을 마셨다` : `${eun(drinker.name)} ${tgt.name}에게 물약을 먹였다`}. HP +${tgt.hp - was}.`);
  trayResult(verdictHTML(r.calc, `${tgt.name} HP +${tgt.hp - was}${was === 0 ? " · 다시 일어섰다!" : ""}`, "good")); refreshStatus();
  await trayWait("계속"); trayClose(); busy = false;
  if (inBattle){ S.battle.picking = null; endHeroTurn(); } else { save(); refreshStatus(); if (S.mode === "walk") renderWalkUI(true); else if (S.mode === "story" && tw.done) renderChoices(); }
}
function endHeroTurn(){ refreshStatus(); if (S.battle.hp <= 0) return winBattle(); advanceTurn(); }
/* regeneration, all on dice: the foe rolls to knit its wounds; if it does, the sturdiest hero rolls to tear them open;
   if that fails, the foe rolls how much it heals. A fire hit since its last turn makes stopping it easier (advantage). */
const REGEN_DC = 10, STOP_DC = 12;
async function regenPhase(f, b){
  const adv = !!b.burn; b.burn = false;
  trayOpen({who:f.sprite, title:`${f.name} — 재생 시도`, sub:`적이 d20에서 <b>${REGEN_DC}</b> 이상이면 상처가 아물기 시작해요`, foe:true});
  setTarget({lead:"적이 d20에서", target:REGEN_DC, mod:0, word:"나오면 재생 시작", foe:true, subject:"재생할"});
  const [r1] = await throwDice(dice(20, 1, "foe"), {auto:true}); markTarget([r1]); showLabels([r1], [r1 === 20 ? "crit" : r1 === 1 ? "fumble" : "keep"]);
  if (r1 !== 20 && (r1 === 1 || r1 < REGEN_DC)){
    trayResult(verdictHTML(`${r1} <em>vs ${REGEN_DC}</em>`, "재생 실패! 상처가 아물지 않았다", "good")); sfx("good");
    bmsg(`${f.name}의 상처가 꿈틀거렸지만 아물지 않았다.`); renderBattle(); await trayWait("계속", 2200); trayClose(); return;
  }
  trayResult(verdictHTML(`${r1} <em>vs ${REGEN_DC}</em>`, "상처가 아물기 시작한다!", "bad")); sfx("bad"); await sleep(900);
  // the hero best at it (strength or dexterity) tries to stop it — their owner throws
  const alive = S.party.map((h, i) => [h, i]).filter(([h]) => h.hp > 0), stOf = h => checkMod(h, "str") >= checkMod(h, "dex") ? "str" : "dex";
  const [h, hi] = alive.sort((a, z) => checkMod(z[0], stOf(z[0])) - checkMod(a[0], stOf(a[0])))[0], st = stOf(h), m = checkMod(h, st);
  trayActor = hi; trayResult("");
  trayHead(h.cls, `${h.name} — 재생 방해`, `벌어진 상처를 다시 벌려 재생을 막아요 · ${STAT_KO[st]} 판정 · 목표 <b>${STOP_DC}</b> · 보정 <b>${sgn(m)}</b>${adv ? " · <b>불에 그을린 상처</b>: d20 두 개 중 높은 눈" : ""}${online() ? ` · <b>${esc(seatNick(hi))}</b>님이 던져요` : ""}`);
  setTarget({lead:"d20에서", target:STOP_DC, mod:m, word:"나오면 재생을 막아요", adv});
  const vals = await throwDice(dice(20, adv ? 2 : 1, h.cls), {hint:`${h.name} — 주사위를 던져 재생을 막으세요`, outPolicy:"fail"});
  let ok = false;
  if (vals.out){ showLabels(vals); trayResult(verdictHTML("주사위가 트레이를 넘어갔다", "장외 — 막지 못했다!", "bad")); }
  else { markTarget(vals); const raw = Math.max(...vals), keep = vals.indexOf(raw); ok = raw === 20 || (raw !== 1 && raw + m >= STOP_DC);
    showLabels(vals, vals.map((v, k) => k !== keep ? "drop" : raw === 20 ? "crit" : raw === 1 ? "fumble" : "keep"));
    trayResult(verdictHTML(`${raw} ${sgn(m)} = <strong>${raw + m}</strong> <em>vs ${STOP_DC}</em>`, ok ? "재생을 막았다!" : "막지 못했다...", ok ? "good" : "bad")); }
  if (ok){ sfx("good"); bark(hi, "어딜 아물어!"); bmsg(`${iga(h.name)} ${f.name}의 상처를 다시 벌려 재생을 막았다!`); renderBattle(); await trayWait("계속"); trayClose(); return; }
  sfx("bad"); await trayWait("재생량 굴리기", 2600);
  // how much it heals
  trayActor = null; setTarget(null); trayResult("");
  trayHead(f.sprite, `${f.name} — 재생`, `재생량 ${f.regen.map(d => "d" + d).join("+")}`);
  const dv = await throwDice(f.regen.map(s => ({sides:s, scheme:"foe"})), {auto:true}); showLabels(dv, dv.map(() => "keep"));
  const amt = Math.min(dv.reduce((a, c) => a + c, 0), b.maxHp - b.hp); b.hp += amt;
  floatFoe("+" + amt, "#7aa35a"); bmsg(`${f.name}의 상처가 꿈틀거리며 아문다. HP +${amt}.`);
  trayResult(verdictHTML(`${dv.join(" + ")} = <strong>${amt}</strong>`, `${f.name} HP +${amt}`, "bad")); refreshStatus(); renderBattle();
  await trayWait("계속", 2600); trayClose();
}
async function foeTurn(){
  const b = S.battle; if (!b || S.mode !== "battle" || busy) return; busy = true;
  const f = FOES[b.key];
  if (await foeStatus()) return;
  if (f.regen && b.hp > 0 && b.hp < b.maxHp) await regenPhase(f, b);
  const alive = S.party.map((h, i) => [h, i]).filter(([h]) => h.hp > 0);
  if (f.breath && b.round % 3 === 0){
    trayOpen({who:f.sprite, title:"화염 숨결!", sub:"모두 민첩 내성 DC 13 · 성공하면 피해 절반", foe:true});
    FX.foeLunge(); setTimeout(FX.breath, 200);
    const vals = await throwDice(dice(6, 3, "foe"), {auto:true}); showLabels(vals, vals.map(() => "keep"));
    const tot = vals.reduce((a,c) => a+c, 0);
    const lines = alive.map(([h, i]) => { const roll = rnd(20), sv = roll + checkMod(h, "dex"), ok = roll !== 1 && (roll === 20 || sv >= 13), d0 = ok ? Math.floor(tot/2) : tot, d = bonus(h, "fireRes") ? Math.floor(d0/2) : d0;
      h.hp = Math.max(0, h.hp - d); setTimeout(() => FX.hitHero(i, d), 300 + i*120); return `${esc(h.name)}: 내성 ${sv} ${ok ? "성공" : "실패"}${d !== d0 ? " · 잿비늘 목걸이" : ""} → −${d}${h.hp === 0 ? " (쓰러짐)" : ""}`; });
    bmsg(`바르쿠스의 화염 숨결! 모두 ${tot} 피해(내성 성공 시 절반).`);
    trayResult(`<div class="calc">${vals.join(" + ")} = <strong>${tot}</strong></div><div class="verdict bad small">${lines.join("<br>")}</div>`); refreshStatus();
    await trayWait("계속", 4200); trayClose(); busy = false; return endFoeTurn();
  }
  const [h, hi] = alive[Math.floor(Math.random() * alive.length)];
  const hac = acOf(h);
  trayOpen({who:f.sprite, title:`${f.name} — ${f.verb}`, sub:`대상: <b>${esc(h.name)}</b> · 방어도 ${hac}${hac !== h.ac ? " (진형)" : ""} · 명중 ${sgn(f.atk)}`, foe:true});
  setTarget({lead:"적이 d20에서", target:hac, mod:f.atk, word:"나오면 맞아요", foe:true, subject:"맞을"});
  const [raw] = await throwDice(dice(20, 1, "foe"), {auto:true}); markTarget([raw]);
  const crit = raw === 20, hit = crit || (raw !== 1 && raw + f.atk >= hac);
  showLabels([raw], [crit ? "crit" : raw === 1 ? "fumble" : "keep"]);
  const calc = `${raw} ${sgn(f.atk)} = <strong>${raw + f.atk}</strong> <em>vs AC ${hac}</em>`;
  const fstyle = FOE_STYLE[b.key] || "claw";
  if (!hit){ FX.foeStrike(hi, fstyle, 0, false, true); bmsg(`${f.name}의 ${f.verb}! ${eun(h.name)} 가볍게 피했다.`); trayResult(verdictHTML(calc, `${eun(h.name)} 피했다!`, "good")); sfx("good");
    await trayWait("계속", 2600); trayClose(); busy = false; return endFoeTurn(); }
  trayResult(verdictHTML(calc, crit ? "치명타!" : "명중!", "bad")); if (crit) banner("CRITICAL!", "red");
  await sleep(700); setTarget(null);
  const dl = crit ? f.dmg.concat(f.dmg) : f.dmg;
  const dv = await throwDice(dl.map(s => ({sides:s, scheme:"foe"})), {auto:true}); showLabels(dv, dv.map(() => "keep"));
  let r = sumRoll(dv, f.dmgB), d = r.t; if (S.party.length === 1) d = Math.max(1, Math.round(d * 0.7));
  h.hp = Math.max(0, h.hp - d); FX.foeStrike(hi, fstyle, d, crit, false); bark(hi, h.hp === 0 ? "더는... 못 버텨..." : pickLine(BARK.hurt));
  bmsg(`${f.name}의 ${f.verb}! ${h.name} −${d}.${h.hp === 0 ? ` ${iga(h.name)} 쓰러졌다!` : ""}`);
  trayResult(verdictHTML(r.calc + (d !== r.t ? ` <em>(혼자라서 ×0.7 → ${d})</em>` : ""), `${h.name} 피해 ${d}${h.hp === 0 ? " · 쓰러졌다!" : ""}`, "bad")); refreshStatus();
  await trayWait("계속", 3000); trayClose(); busy = false; endFoeTurn();
}
function endFoeTurn(){ const b = S.battle; tickBuffs(); refreshStatus(); if (S.party.every(h => h.hp <= 0)) return loseBattle(); b.round++; b.cur = -1; advanceTurn(); }
function winBattle(){
  const b = S.battle, f = FOES[b.key], win = b.win;
  S.party.forEach(h => { if (h.hp <= 0) h.hp = 1; });
  S.battle = null; banner(b.key === "drake" ? "VICTORY!" : "WIN!", "gold"); sfx("crit");
  busy = true; S.mode = "busy"; $("#choices").innerHTML = ""; refreshStatus();
  bark(Math.floor(Math.random()*S.party.length), pickLine(BARK.win));
  const drops = f.loot ? rollLoot(f.loot, (f.drops || 1) + (Math.random() < 0.35 ? 1 : 0)) : [];
  setTimeout(async () => { const out = []; if (f.xp) gainXp(f.xp, out);
    if (drops.length){ drops.forEach(k => giveItem(k)); out.push(["sys", `전리품: ${drops.map(itemName).join(", ")}`]); await showLoot(drops); }
    busy = false; enterNode(win, out); }, 900);
}
function loseBattle(){ S.battle = null; busy = true; S.mode = "busy"; $("#choices").innerHTML = ""; scene.fadeTo = 0.5; refreshStatus(); setTimeout(() => { busy = false; scene.fadeTo = 0; enterNode("gameover"); }, 900); }
function renderBattle(){
  const b = S.battle, f = FOES[b.key]; refreshStatus();
  $("#speaker").textContent = b.name; paintSpriteCanvas($("#portrait"), f.sprite);
  $("#dlgPos").textContent = `ROUND ${b.round}`; $("#dlgMore").hidden = true;
  const el = $("#dlgText"); el.className = "dlg-text"; el.innerHTML = b.msg.slice(-3).map(m => `<span class="log">${esc(m)}</span>`).join("");
  let html = "";
  if (b.phase === "hero"){
    const h = S.party[b.cur], C = CLASSES[h.cls];
    if (b.picking === "potion"){
      html = `<p class="prompt">누구에게 물약을 쓸까? (남은 물약 ${S.potions})</p>` + S.party.map((p, i) => `<button class="choice" data-act="potionTo" data-i="${i}" ${p.hp >= p.maxHp ? "disabled" : ""}><span>${esc(p.name)}</span><span class="tag ${p.hp === 0 ? "fight" : ""}">HP ${p.hp}/${p.maxHp}</span></button>`).join("") + `<button class="choice" data-act="cancelPotion"><span>돌아가기</span></button>`;
    } else {
      html = `<p class="prompt">${esc(h.name)}의 차례 — 무엇을 할까?</p>
        <button class="choice" data-act="atk"><span>${C.atkName}</span><span class="tag">명중 ${sgn(atkMod(h))}</span><span class="tag">${C.dmg.map(d => "d" + d).join("+")}${sgn(dmgMod(h))}</span></button>
        <button class="choice" data-act="special" ${b.uses[b.cur] <= 0 ? "disabled" : ""}><span>${C.special.name}</span><span class="tag ok">${C.special.desc}</span><span class="tag">남은 ${b.uses[b.cur]}회</span></button>
        ${(h.skills || []).map(k => { const sk = SKILLS[k], u = b.suses && b.suses[b.cur] ? b.suses[b.cur][k] || 0 : 0;
          return `<button class="choice" data-act="skill" data-k="${k}" ${u <= 0 ? "disabled" : ""}><span>${sk.name}</span><span class="tag ok">${esc(sk.desc)}</span><span class="tag">남은 ${u}회</span></button>`; }).join("")}
        <button class="choice" data-act="potion" ${S.potions <= 0 ? "disabled" : ""}><span>회복 물약</span><span class="tag ok">2d4+2</span><span class="tag">${S.potions}개</span></button>`;
    }
  } else html = `<p class="prompt">${esc(b.name)}의 차례...</p>`;
  if (b.phase === "hero" && !mine(b.cur)) html = `<p class="prompt">${esc(S.party[b.cur].name)}의 차례 — <b>${esc(seatNick(b.cur))}</b>님이 행동을 고르는 중…</p>`;
  const bf = [b.guard ? `방어도 +${b.guard.v} (${b.guard.t})` : "", b.bless ? `명중 +${b.bless.v} (${b.bless.t})` : "", b.poison && b.poison.t > 0 ? `적 중독 (${b.poison.t})` : "", b.stun ? "적 기절" : ""].filter(Boolean);
  if (bf.length) html = `<p class="prompt buffs">${bf.map(x => `<span class="tag ok">${x}</span>`).join("")}</p>` + html;
  $("#choices").innerHTML = html; $("#choices").classList.toggle("dense", $("#choices").querySelectorAll(".choice").length > 3); netDirty();
}

/* ---------- event pictures, branch cards, luck, loot, barks ---------- */
let artTimer = null;
// event effects (a trap snapping, coins, fire…) are painted straight onto the game scene instead of a picture window
let ART_FX = null;
function showArt(spec){ $("#artWin").hidden = true; clearInterval(artTimer); ART_FX = spec && spec.o && OVER[spec.o] ? spec : null; }
const artOverlay = () => ART_FX && !S.battle && scene.bgKey === ART_FX.bg ? (fb, t) => OVER[ART_FX.o](fb, t) : null;
function showCards(n, vis){
  const L = $("#cards");
  const wait = vote && curVoter() < 0;
  L.innerHTML = `<p class="cards-title">${vote ? voteHead() + " — " : ""}${esc(n.prompt || "어디로 갈까?")}</p><div class="cards-row">` + vis.map(([c, i], k) => { const {tag, dis} = choiceTag(c);
    return `<button class="card win" data-act="choice" data-i="${i}" ${dis || wait ? "disabled" : ""}><span class="card-key">${k + 1}</span><span class="card-voters">${voterChips(i)}</span><canvas class="px card-img" data-ci="${i}"></canvas><span class="card-title">${esc(c.label)}</span><span class="card-tags">${tag}</span><span class="card-desc">${esc(c.desc || "")}</span></button>`; }).join("") + `</div>`;
  vis.forEach(([c, i]) => { const cv = L.querySelector(`[data-ci="${i}"]`); if (c.img) VIG.draw(cv, c.img); }); paintAll(L);
  showArt(null); L.hidden = false; $("#sGame").classList.add("cardsopen"); }
function hideCards(){ $("#cards").hidden = true; $("#sGame").classList.remove("cardsopen"); }
// a failed roll can be thrown again with a party luck token
function askLuck(){
  if (S.luck <= 0) return Promise.resolve("none");
  return new Promise(res => { const W = {kind:"luck", id:++NET.wid, seat:trayActor, n:S.luck};
    W.fin = v => { if (NET.W !== W) return; NET.W = null; hideWaiter(); netView("waitHide", [W.id]);
      if (v === "luck"){ S.luck--; sfx("magic"); banner("LUCK!", "gold"); refreshStatus(); res("luck"); } else { sfx("select"); res("skip"); } };
    NET.W = W; paintWaiter(W); netView("waitShow", [pubW(W)]); }); }
function renderLoot(keys){
  const L = $("#loot");
  $("#lootList").innerHTML = keys.map((k, n) => { const it = ITEMS[k];
    return `<div class="loot-card" style="--rc:${RARITY[it.r].c}; animation-delay:${n*0.3}s"><canvas class="px" data-spr="it_${k}"></canvas><b style="color:${RARITY[it.r].c}">${esc(it.name)}</b><span>${RARITY[it.r].ko} · ${SLOT_KO[it.slot]}${it.cls ? " · " + it.cls.map(c => CLASSES[c].ko).join("/") : ""}</span><em>${fxLines(it.fx).join(" · ") || "&nbsp;"}</em></div>`; }).join("");
  paintAll($("#lootList")); L.hidden = false; Audio8.sfx("levelup"); setTimeout(() => $("#lootOk").focus({preventScroll:true}), 50);
  const btn = open => () => { if (!NET.LW) return; if (isGuest()){ sendInput("loot", {id:NET.LW.id}); NET.LW = null; L.hidden = true; if (open) setTimeout(openInv, 50); } else NET.LW.fin && NET.LW.fin(open); };
  $("#lootOk").onclick = btn(false); $("#lootBag").onclick = btn(true); }
function showLoot(keys){ return new Promise(res => {
  const W = {kind:"loot", id:++NET.wid}; NET.LW = W; renderLoot(keys);
  W.fin = open => { if (NET.LW !== W) return; NET.LW = null; $("#loot").hidden = true; netView("lootHide", [W.id]); res(); if (open) setTimeout(openInv, 50); };
  netView("lootShow", [W.id, keys]); }); }
function itemToast(key){ const it = ITEMS[key], el = $("#toast");
  el.innerHTML = `<canvas class="px" data-spr="it_${key}"></canvas><div><small>새 아이템</small><b style="color:${RARITY[it.r].c}">${esc(it.name)}</b></div>`; paintAll(el);
  el.hidden = false; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); sfx("heal"); clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, 2800); }
const BARK = {ok:["좋았어!","식은 죽 먹기지","봤지?"], fail:["으윽...","이럴 수가","다음엔 꼭!"], miss:["칫, 빗나갔다","이런!","손이 미끄러졌어"], crit:["받아라!","끝이다!","제대로 들어갔어!"],
  win:["이겼다!","별거 아니었네","휴, 살았다"], battle:["온다, 준비해!","덤벼라!","뒤는 맡길게"], boss:["이게... 잿날개...","모두 힘을 모아!"], hurt:["크윽!","아파!","제법인데..."]};
const pickLine = a => a[Math.floor(Math.random()*a.length)];
function barkRaw(i, text){
  if (fxHold) return fxQ.push(() => barkRaw(i, text));
  const h = LAST.heroes[i]; if (!h || S.screen !== "game") return;
  const el = document.createElement("div"); el.className = "bark"; el.textContent = text;
  el.style.left = Math.round((h.x + h.w/2) * 6) + "px"; el.style.top = Math.round(h.y * 6 - 192 - 14) + "px";
  $("#barks").appendChild(el); setTimeout(() => el.remove(), 2300); }

/* ---------- inventory ---------- */
let invSel = {m:0, uid:null};
const invOpen = () => !$("#inv").hidden;
function openInv(){ if (S.screen !== "game") return; $("#inv").hidden = false; S.newItems = 0; invSel.m = Math.min(invSel.m, S.party.length - 1); renderInv(); refreshStatus(); sfx("select"); }
function closeInv(){ $("#inv").hidden = true; refreshStatus(); if (S.mode === "story" && !busy && tw.done && S.lines[S.li]) renderChoices(); }
function renderInv(){
  const m = invSel.m, h = S.party[m]; if (!h) return;
  $("#invTabs").innerHTML = S.party.map((p, i) => `<button class="inv-tab ${i === m ? "on" : ""}" data-act="invTab" data-i="${i}"><canvas class="px" data-spr="${heroKey(p)}"></canvas><span>${esc(p.name)}<small>${CLASSES[p.cls].ko}</small></span></button>`).join("");
  paintSpriteCanvas($("#invPortrait"), heroKey(h));
  $("#eqSlots").innerHTML = SLOTS.map(sl => { const uid = h.eq[sl], key = uid && S.items[uid] && S.items[uid].key, it = key && ITEMS[key];
    return `<button class="slot slot-${sl} ${uid && invSel.uid === uid ? "sel" : ""}" data-act="invSlot" data-s="${sl}" style="--rc:${it ? RARITY[it.r].c : "#283d55"}"><span class="slot-lab">${SLOT_KO[sl]}</span>${it ? `<canvas class="px" data-spr="it_${key}"></canvas><b style="color:${RARITY[it.r].c}">${esc(it.name)}</b>` : `<i>비어 있음</i>`}</button>`; }).join("");
  $("#invStats").innerHTML = `<div class="kv"><span>HP</span><b>${h.hp}/${h.maxHp}</b></div><div class="kv"><span>방어도</span><b>${h.ac}</b></div><div class="kv"><span>명중</span><b>${sgn(atkMod(h))}</b></div><div class="kv"><span>피해</span><b>${sgn(dmgMod(h))}</b></div><div class="kv"><span>판정</span><b>${sgn(bonus(h, "check"))}</b></div>
    <div class="abil">${STATS.map(k => { const b = bonus(h, k); return `<span>${STAT_KO[k]}<b>${statOf(h, k)}</b>${b ? `<em>+${b}</em>` : ""}</span>`; }).join("")}</div>`;
  // bag first, then everything the party is wearing (marked with the wearer)
  const worn = wornList(), cells = S.inv.filter(u => S.items[u]).map(u => ({uid:u, m:-1})).concat(worn), n = Math.max(32, Math.ceil(cells.length/8)*8);
  $("#bag").innerHTML = Array.from({length:n}, (_, k) => { const c = cells[k]; if (!c) return `<div class="cell"></div>`; const uid = c.uid;
    const key = S.items[uid].key, it = ITEMS[key], can = !it.cls || it.cls.includes(h.cls), w = c.m >= 0 ? S.party[c.m] : null;
    return `<button class="cell item ${invSel.uid === uid ? "sel" : ""} ${can || w ? "" : "no"} ${w ? "worn" : ""}" data-act="invItem" data-u="${uid}" ${w ? `data-w="${c.m}"` : ""} style="--rc:${RARITY[it.r].c}" aria-label="${esc(it.name)}${w ? ` (${esc(w.name)} 착용 중)` : ""}"><canvas class="px" data-spr="it_${key}"></canvas>${w ? `<canvas class="px wearer" data-spr="${heroKey(w)}" title="${esc(w.name)} 착용 중"></canvas><i class="eq-mark">E</i>` : ""}</button>`; }).join("");
  $("#invMeta").innerHTML = `<span><canvas class="px" data-spr="coin"></canvas>${S.gold}</span><span><canvas class="px" data-spr="potion"></canvas>${S.potions}</span><span class="luck-ic">♣</span><span>${S.luck}</span>`;
  paintAll($("#inv")); renderDetail(h);
}
function renderDetail(h){
  const d = $("#itemDetail"), uid = invSel.uid;
  if (!uid || !S.items[uid]){ d.innerHTML = `<p class="det-hint">아이템을 누르면 정보가 보여요. 두 번 누르거나 E를 누르면 바로 장착해요.<br>파티원 탭을 바꿔 다른 동료에게 입힐 수 있어요.</p>`; return; }
  const key = S.items[uid].key, it = ITEMS[key], equipped = SLOTS.some(sl => h.eq[sl] === uid);
  const curUid = !equipped && h.eq[it.slot], cur = curUid ? ITEMS[S.items[curUid].key] : null;
  const can = !it.cls || it.cls.includes(h.cls), other = !mine(invSel.m), lock = !!S.battle || busy || other;
  const keys = [...new Set([...Object.keys(it.fx), ...Object.keys(cur ? cur.fx : {})])];
  const lines = keys.map(k => { const v = it.fx[k] || 0, c0 = cur ? (cur.fx[k] || 0) : 0, diff = equipped ? 0 : v - c0;
    if (k === "fireRes") return `<li class="${diff > 0 ? "up" : diff < 0 ? "down" : ""}">${v ? "용의 숨결 피해 절반" : "<s>용의 숨결 피해 절반</s>"}</li>`;
    return `<li class="${diff > 0 ? "up" : diff < 0 ? "down" : ""}">${v ? `${FX_KO[k]} ${sgn(v)}` : `<s>${FX_KO[k]} ${sgn(c0)}</s>`}${diff ? ` <em>${diff > 0 ? "▲" : "▼"}${Math.abs(diff)}</em>` : ""}</li>`; }).join("");
  d.innerHTML = `<div class="det-head"><canvas class="px" data-spr="it_${key}"></canvas><div><h3 style="color:${RARITY[it.r].c}">${esc(it.name)}</h3><p>${RARITY[it.r].ko} · ${SLOT_KO[it.slot]} · ${it.cls ? it.cls.map(c => CLASSES[c].ko).join("/") + " 전용" : "누구나"}</p></div></div>
    <ul class="det-fx">${lines || "<li>특별한 효과 없음</li>"}</ul><p class="det-desc">${esc(it.desc)}</p>
    ${cur ? `<p class="det-cmp">${esc(h.name)}의 현재 ${SLOT_KO[it.slot]}: <b style="color:${RARITY[cur.r].c}">${esc(cur.name)}</b></p>` : ""}
    <div class="det-btns">${equipped ? `<button class="btn ghost" data-act="unequip" ${lock ? "disabled" : ""}>해제</button>` : `<button class="btn primary" data-act="equip" ${!can || lock ? "disabled" : ""}>${esc(h.name)}에게 장착<span class="key">E</span></button>`}
    ${!can ? `<span class="det-warn">${it.cls.map(c => CLASSES[c].ko).join("/")}만 쓸 수 있어요</span>` : other ? `<span class="det-warn">${esc(seatNick(invSel.m))}님의 캐릭터예요 — 장비는 본인이 바꿔요</span>` : lock ? `<span class="det-warn">전투나 굴림 중에는 장비를 바꿀 수 없어요</span>` : ""}</div>`;
  paintAll(d);
}
function equipU(m, uid){ const h = S.party[m]; if (!h || !uid || S.battle || busy || !S.inv.includes(uid) || !S.items[uid]) return; const it = ITEMS[S.items[uid].key]; if (it.cls && !it.cls.includes(h.cls)) return;
  const old = h.eq[it.slot]; S.inv = S.inv.filter(u => u !== uid); if (old) S.inv.push(old); h.eq[it.slot] = uid; refreshHero(h); sfx("good"); save(); if (invOpen()) renderInv(); refreshStatus(); }
function unequipU(m, uid){ const h = S.party[m]; if (!h || !uid || S.battle || busy) return; const sl = SLOTS.find(x => h.eq[x] === uid); if (!sl) return;
  h.eq[sl] = null; S.inv.push(uid); refreshHero(h); sfx("select"); save(); if (invOpen()) renderInv(); refreshStatus(); }
function equip(){ if (!mine(invSel.m)) return; if (isGuest()) return sendInput("equip", {m:invSel.m, u:invSel.uid}); equipU(invSel.m, invSel.uid); }
function unequip(){ if (!mine(invSel.m)) return; if (isGuest()) return sendInput("unequip", {m:invSel.m, u:invSel.uid}); unequipU(invSel.m, invSel.uid); }
// older saves: give everyone their starter kit and the new resources
function migrate(){ S.quests = S.quests || {}; if (S.world){ S.world.stage = S.world.stage || {}; } if (!S.loot) S.loot = genLoot(); S.chat = S.chat || []; S.freeBooks = S.freeBooks || 0;
  if (!S.world){ const BG_AREA = {tavern:0, forest:1, glade:1, bridge:2, swamp:3, cave:4, camp:5, gate:6, hall:6, mirror:6, library:6, shrine:6, lair:7, dawn:7}, k = BG_AREA[S.bg] ?? 0;
    S.world = {at:k, unlocked:k, entered:{}, cleared:{}, stage:{}}; for (let j=0;j<=k;j++){ S.world.entered[j] = true; if (j < k) S.world.cleared[j] = true; } }
  S.items = S.items || {}; S.inv = S.inv || []; S.luck = S.luck ?? 1; S.chapSeen = S.chapSeen || {}; S.itemSeq = S.itemSeq || 0;
  S.party.forEach(h => { h.skills = h.skills || []; if (!h.eq){ h.eq = {}; STARTER[h.cls].forEach(k => { h.eq[ITEMS[k].slot] = newItem(k); }); } if (h.hpBase == null) h.hpBase = h.maxHp; refreshHero(h); }); }

/* ---------- status ---------- */
function refreshStatus(){
  $("#gold").textContent = S.gold; $("#pots").textContent = S.potions; $("#luck").textContent = S.luck ?? 0;
  const nb = $("#bagBadge"); nb.hidden = !S.newItems; nb.textContent = S.newItems || "";
  const ch = CHAPTERS[S.chapter]; $("#chapName").textContent = ch ? `${ch[0]} · ${ch[1]}` : "";
  $("#objective").innerHTML = S.objective ? `<span>목표</span>${esc(S.objective)}` : "";
  $("#clues").innerHTML = CLUES.filter(k => S.flags && S.flags[k]).map(k => `<span title="${esc(FLAG_TXT[k])}">${esc(FLAG_TXT[k].split(" — ")[0].replace(/^(단서|획득): /, ""))}</span>`).join("");
  $("#lvl").textContent = `LV ${S.level}`; const lo = XP_T[S.level-1] || 0, hi = XP_T[S.level]; $("#xpFill").style.width = hi ? Math.min(100, (S.xp - lo) / (hi - lo) * 100) + "%" : "100%"; $("#xpBox").title = hi ? `경험치 ${S.xp}/${hi}` : `경험치 ${S.xp} (최고 레벨)`;
  const b = S.battle; $("#sGame").classList.toggle("battle", !!b);
  $("#foeBar").hidden = !b; $("#turnStrip").hidden = !b;
  if (b){ $("#foeName").textContent = b.name; $("#foeHp").style.width = (100 * b.hp / b.maxHp) + "%"; $("#foeHpn").textContent = `HP ${b.hp}/${b.maxHp} · AC ${b.ac}${FOES[b.key].regen ? (b.burn ? " · 불에 그을림" : ` · 재생 ${FOES[b.key].regen.map(d => "d" + d).join("+")}`) : ""}`;
    $("#turnStrip").innerHTML = `<span class="rnd">R${b.round}</span>` + S.party.map((h, i) => `<canvas class="px ${b.phase === "hero" && b.cur === i ? "cur" : ""} ${h.hp <= 0 ? "down" : ""}" data-spr="${h.cls}" title="${esc(h.name)}"></canvas>`).join("") + `<canvas class="px foe ${b.phase === "foe" ? "cur" : ""}" data-spr="${FOES[b.key].sprite}"></canvas>`;
    paintAll($("#turnStrip")); }
  $("#party").innerHTML = S.party.map((h, i) => {
    const active = b && b.phase === "hero" && b.cur === i, pct = 100 * h.hp / h.maxHp;
    const canDrink = !b && (S.mode === "story" || S.mode === "walk") && S.potions > 0 && h.hp < h.maxHp && !busy && mine(i);
    return `<div class="hero win ${active ? "active" : ""} ${h.hp <= 0 ? "down" : ""}">${online() ? `<span class="owntag ${mine(i) ? "me" : ""}">${esc(seatNick(i))}</span>` : ""}<div class="por"><canvas class="px" data-spr="${heroKey(h)}"></canvas></div>
      <div class="nm"><span>${esc(h.name)}</span><small>${CLASSES[h.cls].ko}</small>${h.hp <= 0 ? '<span class="downtag">DOWN</span>' : ""}</div>
      <div class="bar"><i class="${pct <= 30 ? "low" : ""}" style="width:${pct}%"></i></div>
      <div class="sub"><span>HP <b>${h.hp}/${h.maxHp}</b></span><span>AC <b>${h.ac}</b></span></div>
      ${canDrink ? `<button class="btn small drink" data-act="drink" data-i="${i}" title="회복 물약 마시기"><canvas class="px" data-spr="potion"></canvas>마시기</button>` : ""}</div>`; }).join("");
  paintAll($("#party")); renderWorldBar(); renderChat(); if (SHOP.id) renderShop(); netDirty();
}
function renderGame(){
  refreshStatus(); scene.bgKey = S.bg || "tavern"; partyLight(); $("#chapName").textContent = CHAPTERS[S.bg] ? CHAPTERS[S.bg].join(" · ") : "";
  if (S.mode === "battle" && S.battle){ Audio8.music(S.battle.key === "drake" ? "boss" : "battle"); renderBattle(); if (S.battle.phase === "foe") setTimeout(foeTurn, 600); return; }
  Audio8.music(MUSIC[S.bg]);
  if (S.mode === "pick"){ renderPick(); return; }
  if (S.nodeId === "hub" && (S.mode === "walk" || S.mode === "busy" || !S.lines.length)){ if (S.walk && S.walk.auto){ const [lo, hi] = S.world ? walkBounds() : [2, 2]; S.walk.auto = 0; S.walk.tx = null; S.walk.x = Math.max(lo, Math.min(hi, S.walk.x)); } startWalk(); return; }
  const L = S.lines[S.li]; if (!L) return;
  setSpeaker(L.who); $("#dlgText").className = "dlg-text" + (L.who === "sys" ? " sysl" : ""); $("#dlgText").textContent = L.text; tw.done = true;
  $("#dlgPos").textContent = S.lines.length > 1 ? `${S.li + 1}/${S.lines.length}` : ""; afterLine();
}

/* ================= EVENTS ================= */
document.addEventListener("click", e => {
  Audio8.unlock(); $("#soundHint").hidden = true;
  const a = e.target.closest("[data-act]");
  if (!a){ if (e.target.closest("#dlgBox") && !e.target.closest("#choices")) advanceDialog(); return; }
  if (a.disabled) return;
  const act = a.dataset.act, i = +a.dataset.i;
  if (act.startsWith("net") || act === "online") return netAct(act);
  if (online()){
    const d = {i, n:+a.dataset.n || 0, c:a.dataset.c, st:a.dataset.s, k:a.dataset.k};
    if (act === "choice" || act === "poi"){ const c0 = nodeChoices(NODES[S.nodeId])[i]; if (c0 && c0.t === "shop"){ if (!busy) openShop(c0.shop); return; } }
    if (isGuest()){
      if (act === "quit"){ togglePause(false); netLeave(); return; }
      if (["new","continue","toTitle","count","start","vote"].includes(act)){ netMsg("진행은 방장이 해요"); return; }
      if (GUEST_SEND.has(act)){ if (busy) return; if (!actAllowed(NET.me, act, d)) return; if (act === "choice") d.e = S.enterSeq; sendInput(act, d); sfx("select"); return; }
      if (act === "roll" && !mine(i)) return;
    } else if (!LOCAL_ACTS.has(act) && !actAllowed(NET.me, act, d)) return;
  }
  if (busy && !["sound","music","throw","autoRoll","pause","resume","vote","fullscreen","howto","closeHowto","dismissRotate","invOpen","closeInv","invTab","invItem","invSlot","closeArt","shopTab","closeShop","chatSend","chatToggle"].includes(act)) return;
  switch (act){
    case "new": S.setup = blankSetup(); sfx("select"); show("setup"); break;
    case "continue": { const s = loadSave(); if (s){ S = Object.assign(S, s); migrate(); show("game"); renderGame(); } break; }
    case "toTitle": show("title"); break;
    case "count": S.setup.count = +a.dataset.n; sfx("select"); renderSetup(); break;
    case "cls": { setCls(i, a.dataset.c); sfx("select"); const nb = document.querySelector(`[data-card="${i}"] [data-c="${a.dataset.c}"]`); if (nb) nb.focus(); break; }
    case "roll": statRollModal(i); break;
    case "swap": { const st = a.dataset.s; if (!doSwap(i, st)) break; sfx("select"); const nb = document.querySelector(`[data-card="${i}"] [data-s="${st}"]`); if (nb) nb.focus(); break; }
    case "start": sfx("good"); startGame(); break;
    case "choice": choose(i); break;
    case "pickHero": doCheck(i); break;
    case "cancelPick": cancelPick(); break;
    case "atk": heroAct("attack"); break;
    case "special": heroAct("special"); break;
    case "potion": heroAct("potion"); break;
    case "potionTo": usePotion(i, true); break;
    case "cancelPotion": S.battle.picking = null; renderBattle(); break;
    case "drink": usePotion(i, false); break;
    case "throw": tray.throwAuto(); break;
    case "autoRoll": statAuto = true; a.disabled = true; tray.throwAuto(); break;
    case "sound": Audio8.setSfx(!Audio8.sfxOn); $("#optSound").textContent = "효과음: " + (Audio8.sfxOn ? "켬" : "끔"); sfx("select"); break;
    case "music": Audio8.setMusic(!Audio8.musicOn); $("#optMusic").textContent = "음악: " + (Audio8.musicOn ? "켬" : "끔"); break;
    case "quit": save(); show("title"); break;
    case "pause": togglePause(true); break;
    case "vote": S.opts = S.opts || {}; S.opts.vote = S.opts.vote === false; $("#optVote").textContent = "파티 투표: " + (S.opts.vote === false ? "끔 (P1이 결정)" : "켬"); vote = null; if (S.mode === "story" && tw.done && !busy) renderChoices(); break;
    case "invOpen": openInv(); break;
    case "closeInv": closeInv(); break;
    case "invTab": invSel = {m:i, uid:null}; sfx("blip"); renderInv(); break;
    case "invItem": if (invSel.uid === a.dataset.u && a.dataset.w == null && performance.now() - (invSel.t || 0) < 450){ invSel.t = 0; equip(); break; } invSel.t = performance.now(); invSel.uid = a.dataset.u; if (a.dataset.w != null) invSel.m = +a.dataset.w; sfx("blip"); renderInv(); break;
    case "travel": travel(i); break;
    case "poi": poiAct(i, NET.me); break;
    case "walkGo": startWalk(); break;
    case "skill": useSkill(a.dataset.k); break;
    case "shopTab": SHOP.tab = a.dataset.t; sfx("blip"); renderShop(); break;
    case "closeShop": closeShop(); break;
    case "shopBuy": case "shopSell": case "shopLearn": case "shopSupply": { const d2 = {s:SHOP.id, k:a.dataset.k, u:a.dataset.u, m:i}; if (isGuest()) { sendInput(act, {sh:SHOP.id, k:d2.k, u:d2.u, i}); sfx("select"); } else shopAct(NET.me, act, d2); break; }
    case "chatSend": sendChat(); break;
    case "chatToggle": { const w = $("#chatWin"); w.classList.toggle("min"); renderChat(true); break; }
    case "invSlot": { const h = S.party[invSel.m]; invSel.uid = h.eq[a.dataset.s] || null; sfx("blip"); renderInv(); break; }
    case "equip": equip(); break;
    case "unequip": unequip(); break;
    case "closeArt": $("#artWin").hidden = true; break;
    case "resume": togglePause(false); break;
    case "fullscreen": toggleFull(); break;
    case "howto": $("#howto").hidden = false; sfx("select"); $("#howto .btn").focus({preventScroll:true}); break;
    case "closeHowto": $("#howto").hidden = true; sfx("select"); break;
    case "dismissRotate": $("#rotate").classList.add("off"); break;
  }
});
document.addEventListener("dblclick", e => { const a = e.target.closest(".cell.item"); if (a){ invSel.uid = a.dataset.u; equip(); } });
document.addEventListener("input", e => { if (!e.target.classList.contains("name")) return; const i = +e.target.dataset.i; if (!mine(i)) return; S.setup.heroes[i].name = e.target.value;
  if (isGuest()){ clearTimeout(NET.nmT); NET.nmT = setTimeout(() => sendInput("name", {i, v:e.target.value.slice(0, 8)}), 250); } else netDirty(); });
document.addEventListener("keydown", e => {
  const k = e.key, tag = e.target.tagName; Audio8.unlock(); $("#soundHint").hidden = true;
  if (tag === "INPUT"){ if (e.target.id === "chatIn"){ if (k === "Enter"){ e.preventDefault(); sendChat(); } else if (k === "Escape") e.target.blur(); return; }
    if (k === "Enter"){ if (e.target.id === "netCode") netAct("netJoin"); else if (e.target.id === "netNick" && !online()) netAct("netHost"); else e.target.blur(); } return; }
  if (!$("#netLayer").hidden){ if (k === "Escape") netAct("netClose"); return; }
  if (k === "f" || k === "F"){ toggleFull(); return; }
  if (k === "/" && !$("#chatWin").hidden){ e.preventDefault(); $("#chatWin").classList.remove("min"); renderChat(true); $("#chatIn").focus(); return; }
  if (k === "Escape"){ if (!$("#howto").hidden) $("#howto").hidden = true; else if (!$("#shop").hidden) closeShop(); else if (invOpen()) closeInv(); else togglePause(); return; }
  if (!$("#shop").hidden) return;
  if ((k === "i" || k === "I") && S.screen === "game" && $("#pause").hidden && $("#loot").hidden){ invOpen() ? closeInv() : openInv(); return; }
  if (invOpen()){ if (k === "e" || k === "E"){ const b = $('#itemDetail [data-act="equip"]'); if (b && !b.disabled) equip(); } return; }
  if (!$("#loot").hidden){ if (k === " " || k === "Enter"){ e.preventDefault(); $("#lootOk").click(); } return; }
  if ((k === "l" || k === "L") && !$("#trayLuck").hidden){ $("#trayLuck").click(); return; }
  if (!$("#pause").hidden || !$("#howto").hidden) return;
  if (!$("#trayLayer").hidden || !$("#modal").hidden){
    if (k === " " || k === "Enter"){ e.preventDefault();
      const nx = [$("#trayNext"), $("#modalDone")].find(b => !b.hidden && b.offsetParent);
      if (nx) nx.click(); else if ([...document.querySelectorAll(".tray-throw")].some(b => !b.hidden && !b.disabled && b.offsetParent)) tray.throwAuto(); }
    return;
  }
  if (S.screen === "title" && (k === "ArrowDown" || k === "ArrowUp")){ e.preventDefault();
    const items = [...document.querySelectorAll(".menu button:not([hidden])")], cur = items.indexOf(document.activeElement);
    const n = items[(cur + (k === "ArrowDown" ? 1 : -1) + items.length) % items.length]; n.focus(); sfx("blip"); return; }
  if (S.screen !== "game" || busy) return;
  if (walkKey(e)) return;
  if (/^[1-9]$/.test(k)){ const b = document.querySelectorAll("#choices .choice")[+k - 1]; if (b && !b.disabled) b.click(); return; }
  if ((k === " " || k === "Enter") && S.mode === "story" && !(tag === "BUTTON" && e.target.closest("#choices"))){ e.preventDefault(); advanceDialog(); }
});

window.__dbg = {get WV(){ return WV; }, get VW(){ return VW; }, travel:ai => travel(ai), get vote(){ return vote; }, get busy(){ return busy; }, get NET(){ return NET; }, NODES, FOES, ITEMS, get S(){ return S; }, enterNode:(id) => enterNode(id), giveItem:k => giveItem(k), showLoot:k => showLoot(k), openInv:() => openInv(), FX, scene};
/* ================= BOOT ================= */
try { window.claude?.hot?.snapshot?.(() => JSON.parse(JSON.stringify(S))); } catch (e) {}
function start(data){
  paintAll(document);
  if (data && data.screen){ S = Object.assign(S, data); if (S.screen === "game"){ show("game"); renderGame(); } else show(S.screen); } else show("title");
  requestAnimationFrame(loop);
}
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
