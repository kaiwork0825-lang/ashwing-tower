/* ================= ONLINE PLAY =================
   Host-authoritative: the host's page runs the whole game. Everyone else mirrors it.
   host → guests : room topic "g" — state diffs (top-level keys of S) + view events (banners, FX, tray windows)
   guests → host : their own presence — {inp:[recent inputs]}; anyone may set presence
   dice          : whoever throws streams the tray pose in presence ({tp}); the others replay it. */
const NET = {api:null, ready:false, room:null, role:null, code:"", me:null, hostPeer:null, nick:"", hostNick:"",
  seats:[null, null, null, null], unsubs:[], conn:true,
  outq:[], flushT:0, q:0, lastKeys:{}, fullT:0,
  rq:-1, big:{}, askedFull:false, needT:0, need:0, gk:"", gv:"", gscr:null, gbg:null, gset:"", grT:0, lb:false,
  inp:[], inSeq:0, lastIn:{}, needSeen:{}, nmT:0,
  depth:0, wid:0, W:null, LW:null, rollId:0, driving:0, poseT:0, poseLast:"", puppet:null, pendRoll:null, lastLabels:null};
const online = () => !!NET.role;
const isHost = () => NET.role === "host";
const isGuest = () => NET.role === "guest";
// run a deferred effect callback without re-broadcasting what it triggers
function M(fn){ return (...a) => { NET.depth++; try { return fn(...a); } finally { NET.depth--; } }; }
function ownerPeer(k){ const s = k == null ? null : NET.seats[k]; return s && s.peer ? s.peer : NET.hostPeer; }
function mine(k){ return !online() || k == null || ownerPeer(k) === NET.me; }
const cleanNick = v => String(v ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, "").trim().slice(0, 8) || "모험가";
function seatNick(k){ const s = k == null ? null : NET.seats[k]; return s ? s.nick : (NET.hostNick || NET.nick || "방장"); }
function peerNick(peer){ if (peer === NET.hostPeer) return NET.hostNick || "방장"; const s = NET.seats.find(x => x && x.peer === peer); return s ? s.nick : "누군가"; }

/* ---------- host: mirror view calls to everyone ---------- */
const VIEW = {};
function netView(name, args){ if (!isHost() || !NET.room) return; NET.outq.push([name, args]); schedFlush(); }
function mirror(name, fn){ VIEW[name] = fn; return function(...a){ if (NET.depth === 0) netView(name, a); NET.depth++; try { return fn.apply(this, a); } finally { NET.depth--; } }; }
function floatFoe(text, color){ const [x, y] = FX.foeCenter(); scene.float(text, x, y - 14, color); }
let banner = mirror("banner", bannerRaw), bark = mirror("bark", barkRaw);
chapterCard = mirror("chapterCard", chapterCard); itemToast = mirror("itemToast", itemToast); floatFoe = mirror("floatFoe", floatFoe);
showArt = mirror("showArt", showArt); hideCards = mirror("hideCards", hideCards);
trayOpen = mirror("trayOpen", trayOpen); trayResult = mirror("trayResult", trayResult); trayHead = mirror("trayHead", trayHead);
setTarget = mirror("setTarget", setTarget); markTarget = mirror("markTarget", markTarget);
const showLabelsRaw = showLabels; showLabels = mirror("showLabels", showLabelsRaw);
const trayCloseRaw = trayClose; trayClose = mirror("trayClose", trayCloseRaw);
Object.keys(FX).forEach(k => { if (k !== "foeCenter" && k !== "heroCenter") FX[k] = mirror("FX." + k, FX[k]); });
const LOCAL_SFX = new Set(["blip", "clack", "shake", "select"]);
{ const raw = sfx; sfx = (n, a) => { if (NET.depth === 0 && isHost() && !LOCAL_SFX.has(n)) netView("sfx", [n, a]); return raw(n, a); }; VIEW.sfx = raw; }
// guest-side versions of a few views
VIEW.showLabels = (vals, marks) => { NET.lastLabels = [vals, marks]; if (tray.state === "puppet") tray.snapPuppet(); showLabelsRaw(vals, marks); };
VIEW.trayClose = () => { NET.puppet = null; NET.W = null; hideWaiter(); trayCloseRaw(); };
VIEW.waitShow = W => { if (!W) return; NET.W = W; paintWaiter(W); };
VIEW.waitHide = id => { if (NET.W && NET.W.id === id){ NET.W = null; hideWaiter(); } };
VIEW.lootShow = (id, keys) => { if (!Array.isArray(keys)) return; NET.LW = {id}; renderLoot(keys.filter(k => ITEMS[k])); };
VIEW.lootHide = id => { if (NET.LW && NET.LW.id === id) NET.LW = null; $("#loot").hidden = true; };
VIEW.roll = (id, list, opts, drv) => {
  NET.lastLabels = null; if (!Array.isArray(list)) return;
  if (drv === NET.me) driveLocal(id, list, opts || {}).then(vals => sendInput("dice", {id, v:[...vals], out:!!vals.out}));
  else spectate(list, drv, id);
};

/* ---------- host: sending ---------- */
const ENC = new TextEncoder(), bytesOf = o => ENC.encode(JSON.stringify(o)).length, LIM = 3500;
const NOSYNC = new Set(["seenNodes", "preBattle"]);
function netDirty(){ if (isHost() && NET.room) schedFlush(); }
function schedFlush(){ if (!NET.flushT) NET.flushT = setTimeout(netFlush, 50); }
function snapParts(){ const o = {};
  for (const k in S){ if (NOSYNC.has(k) || (k === "setup" && S.screen === "game")) continue; o[k] = S[k]; }
  o._vote = vote; o._busy = busy && !NET.lb; o._seats = NET.seats; o._hn = NET.nick; return o; }
function stateDiff(full){ const o = snapParts(), d = {}; let any = false;
  for (const k in o){ const j = JSON.stringify(o[k] ?? null); if (full || NET.lastKeys[k] !== j){ NET.lastKeys[k] = j; d[k] = o[k] ?? null; any = true; } }
  return any ? d : null; }
function buildMsgs(state, ev){
  const out = []; let cur = {s:{}};
  const push = () => { if (Object.keys(cur.s).length || (cur.e && cur.e.length)) out.push(cur); cur = {s:{}}; };
  for (const k in (state || {})){
    const one = {[k]:state[k]}, sz = bytesOf(one);
    if (sz > LIM){ push(); const str = JSON.stringify(state[k]), parts = []; let pos = 0;
      while (pos < str.length){ let len = 1000, piece;
        for (;;){ let end = Math.min(str.length, pos + len); const c = str.charCodeAt(end - 1); if (end < str.length && c >= 0xd800 && c <= 0xdbff) end--; piece = str.slice(pos, end); if (bytesOf({big:k, n:999, i:999, d:piece, q:9999999}) <= 3900 || len < 60) break; len = Math.floor(len*0.7); }
        parts.push(piece); pos += piece.length; }
      parts.forEach((d, i) => out.push({big:k, n:parts.length, i, d})); continue; }
    if (bytesOf(cur) + sz > LIM) push();
    cur.s[k] = state[k];
  }
  for (const e of (ev || [])){ const sz = bytesOf(e); if (sz > LIM) continue; if (bytesOf(cur) + sz > LIM) push(); (cur.e = cur.e || []).push(e); }
  push(); return out;
}
function emitG(msg){ msg.q = ++NET.q; NET.room.emit("g", msg).catch(e => { if (e && e.code === "not_permitted") netFail("방장은 이 아티팩트를 편집할 수 있는 사람만 맡을 수 있어요."); }); }
function netFlush(full){
  clearTimeout(NET.flushT); NET.flushT = 0; if (!isHost() || !NET.room) return;
  const st = stateDiff(!!full), ev = NET.outq.splice(0);
  if (full){ if (NET.W) ev.push(["waitShow", [pubW(NET.W)]]); }
  if (!st && !ev.length) return;
  const msgs = buildMsgs(st, ev); if (full && msgs[0]) msgs[0].f = 1;
  msgs.forEach(emitG);
}
function fullSoon(){ clearTimeout(NET.fullT); NET.fullT = setTimeout(() => netFlush(true), 250); }
setInterval(() => { if (isHost() && NET.room) netFlush(); }, 800);

/* ---------- guest: receiving ---------- */
function requestResync(){
  if (!NET.room) return; if (NET.needT){ NET.needPend = true; return; }
  NET.needT = setTimeout(() => { NET.needT = 0; if (NET.needPend){ NET.needPend = false; requestResync(); } }, 1200);
  NET.need++; NET.room.presence({need:NET.need}).catch(() => {}); }
setInterval(() => { if (isGuest() && NET.room && NET.rq < 0) requestResync(); }, 2500);
function guestRecv(m){
  if (!m || m.sameTab) return; const d = m.data; if (!d || typeof d !== "object" || typeof d.q !== "number") return;
  if (NET.hostPeer && m.peer !== NET.hostPeer) return;
  if (!NET.hostPeer){ const p = NET.room.peers().find(x => x.peer === m.peer); if (!p || !p.presence || p.presence.role !== "host") return; NET.hostPeer = m.peer; }
  if (d.f){ NET.rq = d.q - 1; NET.big = {}; }
  if (NET.rq < 0){ if (!NET.askedFull){ NET.askedFull = true; requestResync(); } return; }
  if (d.q !== NET.rq + 1) requestResync();
  NET.rq = d.q; NET.askedFull = false;
  if (d.big != null){ const key = String(d.big); let b = NET.big[key]; if (!b || b.n !== d.n || d.i === 0) b = NET.big[key] = {n:d.n, parts:[]};
    b.parts[d.i] = String(d.d); if (b.parts.filter(x => x != null).length === b.n){ delete NET.big[key]; try { applyState({[key]:JSON.parse(b.parts.join(""))}); } catch (e){ requestResync(); } } return; }
  if (d.s && typeof d.s === "object") applyState(d.s);
  if (Array.isArray(d.e)) d.e.forEach(ev => { if (!Array.isArray(ev)) return; const f = VIEW[ev[0]]; if (f && Array.isArray(ev[1])) try { f(...ev[1]); } catch (e){ console.warn("view", ev[0], e); } });
}
function applyState(st){
  for (const k in st){ const v = st[k];
    if (k === "_vote") vote = v && typeof v === "object" ? v : null;
    else if (k === "_busy"){ if (!NET.lb) busy = !!v; }
    else if (k === "_seats"){ if (Array.isArray(v)) NET.seats = [0,1,2,3].map(j => v[j] && typeof v[j] === "object" ? {peer:String(v[j].peer), nick:cleanNick(v[j].nick)} : null); }
    else if (k === "_hn") NET.hostNick = cleanNick(v);
    else if (/^[a-zA-Z]\w*$/.test(k)) S[k] = v;
  }
  guestSoon();
}
function guestSoon(){ if (!NET.grT) NET.grT = setTimeout(() => { NET.grT = 0; try { guestRender(); } catch (e){ console.warn(e); } }, 16); }
function guestBg(bg){
  if (!bg || bg === NET.gbg) return; const first = !NET.gbg; NET.gbg = bg;
  if (first || scene.bgKey === bg){ scene.bgKey = bg; scene.parts = []; partyLight(); return; }
  scene.fadeTo = 1; setTimeout(() => { scene.bgKey = NET.gbg; scene.parts = []; partyLight(); scene.fadeTo = 0; }, 340);
}
function renderSetupKeep(){
  const ae = document.activeElement, ni = ae && ae.classList && ae.classList.contains("name") ? +ae.dataset.i : -1, val = ni >= 0 ? ae.value : null, ss = ni >= 0 ? ae.selectionStart : 0;
  renderSetup(); if (ni >= 0){ const el = document.getElementById("nm" + ni); if (el){ el.value = val; el.focus({preventScroll:true}); try { el.setSelectionRange(ss, ss); } catch (e){} } }
}
function guestRender(){
  if (!isGuest()) return;
  if (S.screen !== NET.gscr){ NET.gscr = S.screen; NET.gk = ""; NET.gbg = null; NET.gset = "";
    if (S.screen === "game" || S.screen === "setup"){ $("#netLayer").hidden = true; show(S.screen); }
    else { show("title"); openNetPanel(); } }
  renderNetHud();
  if (S.screen === "setup"){ const j = JSON.stringify(S.setup); if (j !== NET.gset){ NET.gset = j; renderSetupKeep(); } return; }
  if (S.screen !== "game"){ renderNetPanel(); return; }
  if (!S.party || !S.party.length) return;
  guestBg(S.bg);
  Audio8.music(S.battle ? (S.battle.key === "drake" ? "boss" : "battle") : MUSIC[S.bg] || "ashen");
  refreshStatus(); if (invOpen()) renderInv();
  const k = [S.enterSeq, S.mode, S.li, S.pick].join("|"), [pe, , pl] = NET.gk.split("|"), vj = JSON.stringify(vote);
  if (S.mode === "battle" && S.battle) renderBattle();
  else if (S.mode === "busy"){ if (k !== NET.gk) $("#choices").innerHTML = ""; }
  else if (S.mode === "pick"){ if (k !== NET.gk) renderPick(); }
  else if (S.mode === "walk") renderWalkUI(k !== NET.gk);
  else if (S.lines && S.lines[S.li]){
    if (k !== NET.gk){
      if (String(S.enterSeq) !== pe){ hideCards(); typeLine(); }
      else if (String(S.li) !== pl) typeLine();
      else { const L = S.lines[S.li]; clearInterval(tw.t); setSpeaker(L.who); $("#dlgText").className = "dlg-text" + (L.who === "sys" ? " sysl" : ""); $("#dlgText").textContent = L.text; tw.done = true; afterLine(); }
    } else if (tw.done && vj !== NET.gv && S.li >= S.lines.length - 1) renderChoices();
  }
  NET.gk = k; NET.gv = vj;
}

/* ---------- guest → host: inputs in presence ---------- */
function sendInput(a, extra = {}){
  if (!NET.room) return; NET.inSeq++;
  NET.inp.push({...extra, s:NET.inSeq, h:NET.hostPeer, a});
  while (NET.inp.length > 6 || JSON.stringify(NET.inp).length > 2400) NET.inp.shift();
  NET.room.presence({inp:NET.inp}).catch(() => {});
}
const GUEST_SEND = new Set(["poi", "walkGo", "travel", "skill", "choice", "pickHero", "cancelPick", "atk", "special", "potion", "potionTo", "cancelPotion", "drink", "cls", "swap"]);
const LOCAL_ACTS = new Set(["sound", "music", "fullscreen", "howto", "closeHowto", "dismissRotate", "invOpen", "closeInv", "invTab", "invItem", "invSlot", "closeArt", "pause", "resume", "throw", "autoRoll"]);
function actAllowed(peer, act, d){
  const b = S.battle, i = d.i;
  switch (act){
    case "atk": case "special": case "potion": case "potionTo": case "cancelPotion": case "skill": return !!b && b.phase === "hero" && ownerPeer(b.cur) === peer;
    case "drink": return ownerPeer(i) === peer;
    case "cls": case "swap": case "roll": case "name": case "stats": return S.screen === "setup" && i >= 0 && i < 4 && ownerPeer(i) === peer;
    case "equip": case "unequip": return ownerPeer(d.m) === peer;
    case "choice": case "pickHero": case "cancelPick": case "adv": case "travel": case "walk": case "poi": case "walkGo": case "chat": case "shopBuy": case "shopSell": case "shopSupply": return true;
    case "shopLearn": return ownerPeer(i) === peer;
    default: return peer === NET.me;
  }
}
function setCls(i, c){ const h = S.setup.heroes[i]; if (!h || !CLASSES[c]) return; h.cls = c; assignByClass(h); rerenderCard(i); }
function doSwap(i, st){ const h = S.setup.heroes[i]; if (!h || !h.stats || !STATS.includes(st)) return false;
  if (!h.sel) h.sel = st; else if (h.sel === st) h.sel = null; else { [h.stats[h.sel], h.stats[st]] = [h.stats[st], h.stats[h.sel]]; [h.dice[h.sel], h.dice[st]] = [h.dice[st], h.dice[h.sel]]; h.sel = null; }
  rerenderCard(i); return true; }
function cancelPick(){ if (S.mode !== "pick") return; if (S.nodeId === "hub"){ S.pick = null; return startWalk(); } S.mode = "story"; S.pick = null; renderChoices(); setSpeaker(S.lines[S.li].who); $("#dlgText").textContent = S.lines[S.li].text; save(); }
function hostInput(peer, m){
  const a = String(m.a || ""), i = Number.isInteger(m.i) ? m.i : -1;
  if (a === "dice") return remoteDice(peer, m);
  if (a === "w"){ const W = NET.W; if (W && W.id === m.id && (W.seat == null || ownerPeer(W.seat) === peer)) W.fin(m.v === "luck" ? "luck" : "next"); return; }
  if (a === "loot"){ if (NET.LW && NET.LW.id === m.id) NET.LW.fin(false); return; }
  if (a === "chat"){ const k = NET.seats.findIndex(s => s && s.peer === peer); pushChat(peerNick(peer), m.v, k); return; }
  if (a.startsWith("shop")){ if (actAllowed(peer, a, {i})) shopAct(peer, a, {s:String(m.sh || ""), k:String(m.k || ""), u:String(m.u || ""), m:i}); return; }
  const d = {i, m:Number.isInteger(m.m) ? m.m : -1};
  if (!actAllowed(peer, a, d)) return;
  if (a === "name"){ const h = S.setup.heroes[i]; if (h){ h.name = String(m.v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 8); rerenderCard(i); } return; }
  if (a === "stats") return remoteStats(i, m.raw);
  if (a === "equip") return equipU(d.m, String(m.u || ""));
  if (a === "unequip") return unequipU(d.m, String(m.u || ""));
  if (a === "adv"){ if (S.mode === "story" && !busy && m.li === S.li && S.li < S.lines.length - 1){ S.li++; save(); typeLine(); } return; }
  if (S.screen === "setup"){ if (a === "cls") setCls(i, String(m.c)); else if (a === "swap") doSwap(i, String(m.st)); return; }
  if (busy) return;
  switch (a){
    case "choice": if (S.screen === "game" && S.mode === "story" && m.e === S.enterSeq) choose(i, peer); break;
    case "pickHero": if (S.mode === "pick" && S.party[i]) doCheck(i); break;
    case "travel": travel(i); break;
    case "walk": hostWalkInput(peer, m); break;
    case "poi": poiAct(i, peer); break;
    case "walkGo": if (S.nodeId === "hub" && S.mode === "story" && S.li >= S.lines.length - 1) startWalk(); break;
    case "skill": useSkill(String(m.k || "")); break;
    case "cancelPick": cancelPick(); break;
    case "atk": heroAct("attack"); break;
    case "special": heroAct("special"); break;
    case "potion": heroAct("potion"); break;
    case "potionTo": if (S.party[i]) usePotion(i, true); break;
    case "cancelPotion": S.battle.picking = null; renderBattle(); break;
    case "drink": if (S.party[i] && !S.battle && (S.mode === "story" || S.mode === "walk")) usePotion(i, false); break;
  }
}
function remoteStats(i, raw){
  const h = S.setup.heroes[i]; if (!h || !Array.isArray(raw) || raw.length !== 6) return;
  const ok = raw.every(r => r && Array.isArray(r.d) && r.d.length === 4 && r.d.every(x => Number.isInteger(x) && x >= 1 && x <= 6));
  if (!ok) return; if (h.stats){ if (h.rerolls <= 0) return; h.rerolls--; }
  h.raw = raw.map(r => { const d = r.d.slice(), low = Math.min(...d); return {v:d.reduce((a, b) => a + b, 0) - low, d, st:STATS.includes(r.st) ? r.st : undefined}; });
  assignRolled(h); rerenderCard(i);
}

/* ---------- dice over the network ---------- */
async function throwDice(list, opts = {}){
  if (!isHost() || !NET.room) return throwLocal(list, opts);
  const seat = opts.auto ? null : trayActor, drv = opts.auto ? NET.me : ownerPeer(seat), id = ++NET.rollId;
  NET.lastLabels = null; netView("roll", [id, list, opts, drv]); netFlush();
  if (drv === NET.me) return driveLocal(id, list, opts);
  spectate(list, drv, id);
  return new Promise(res => { NET.pendRoll = {id, drv, list, opts, res}; });
}
async function driveLocal(id, list, opts){
  if (!NET.room) return throwLocal(list, opts);
  NET.driving = id; clearInterval(NET.poseT); NET.poseLast = "";
  const put = fin => { const p = {id, ...tray.pose()}; if (fin) p.fin = 1; const j = JSON.stringify(p); if (j === NET.poseLast) return; NET.poseLast = j; NET.room && NET.room.presence({tp:p}).catch(() => {}); };
  NET.poseT = setInterval(() => put(false), 70);
  try { return await throwLocal(list, opts); }
  finally { clearInterval(NET.poseT); NET.poseT = 0; NET.driving = 0; put(true); }
}
function spectate(list, drv, id){
  trayLabels.innerHTML = ""; $("#power").hidden = true;
  document.querySelectorAll(".tray-throw").forEach(b => b.hidden = true);
  const h = $("#trayHint"); h.textContent = trayActor == null && drv === NET.hostPeer ? "주사위가 굴러갑니다…" : `${peerNick(drv)}님이 주사위를 흔드는 중…`; h.hidden = false;
  tray.puppet(list); NET.puppet = {peer:drv, id};
  const p = peerPose(drv, id); if (p) tray.setPose(p, true);
}
function peerPose(peer, id){ if (!NET.room) return null; const p = NET.room.peers().find(x => x.peer === peer), tp = p && p.presence && p.presence.tp; return tp && tp.id === id ? tp : null; }
function followPose(peers){
  const P = NET.puppet; if (!P) return; const p = peers.find(x => x.peer === P.peer), tp = p && p.presence && p.presence.tp;
  if (!tp || tp.id !== P.id) return;
  tray.setPose(tp, !!tp.fin); if (tp.st === "rolling" || tp.st === "done") $("#trayHint").hidden = true;
  if (tp.fin && NET.lastLabels && isGuest()) showLabelsRaw(...NET.lastLabels);
}
function remoteDice(peer, m){
  const pr = NET.pendRoll; if (!pr || pr.id !== m.id || pr.drv !== peer) return;
  const v = Array.isArray(m.v) ? m.v : null; if (!v || v.length !== pr.list.length) return;
  const vals = pr.list.map((sp, k) => v[k] == null ? null : Math.max(1, Math.min(sp.sides, Math.round(+v[k]) || 1)));
  NET.pendRoll = null; const p = peerPose(peer, m.id); if (p) tray.setPose(p, true); NET.puppet = null;
  tray.dice.forEach((b, k) => { if (vals[k] == null){ b.out = true; b.outPos = b.outPos || b.pos || [0, 0, 0]; } if (!b.pos) b.pos = [0, 1, 0]; });
  tray.lastOut = vals.map(x => x == null); tray.state = "done";
  if (m.out) vals.out = true;
  pr.res(vals);
}

/* ---------- room wiring ---------- */
function hostPeers(ch){
  const peers = ch.peers; let changed = false;
  NET.seats.forEach((s, k) => { if (s && !peers.some(p => p.peer === s.peer)){ NET.seats[k] = null; changed = true; } });
  const list = peers.filter(p => !p.sameTab && p.kind === "viewer" && p.presence && p.presence.role === "guest");
  followPose(peers);
  for (const p of list){ const pr = p.presence, nick = cleanNick(pr.nick);
    let k = NET.seats.findIndex(s => s && s.peer === p.peer);
    if (k < 0){ k = [1, 2, 3].find(j => !NET.seats[j]); if (k != null){ NET.seats[k] = {peer:p.peer, nick}; changed = true; netMsg(`${nick}님이 들어왔어요 (P${k + 1})`); } }
    else if (NET.seats[k].nick !== nick){ NET.seats[k].nick = nick; changed = true; }
    if (pr.need && pr.need !== NET.needSeen[p.peer]){ NET.needSeen[p.peer] = pr.need; fullSoon(); }
    const inp = Array.isArray(pr.inp) ? pr.inp.filter(x => x && typeof x === "object" && x.h === NET.me && typeof x.s === "number").sort((a, b) => a.s - b.s) : [];
    for (const m of inp){ if (m.s <= (NET.lastIn[p.peer] || 0)) continue; NET.lastIn[p.peer] = m.s; try { hostInput(p.peer, m); } catch (e){ console.warn("input", e); } }
  }
  ch.left.forEach(p => { if (p.presence && p.presence.role === "guest") netMsg(`${cleanNick(p.presence.nick)}님이 나갔어요`); });
  if (NET.pendRoll && !peers.some(p => p.peer === NET.pendRoll.drv)){
    const pr = NET.pendRoll, o = {...pr.opts, auto:true}, id = ++NET.rollId; NET.pendRoll = null; NET.puppet = null;
    netView("roll", [id, pr.list, o, NET.me]); driveLocal(id, pr.list, o).then(pr.res); }
  if (ch.joined.some(p => !p.sameTab)) fullSoon();
  if (changed) seatsChanged();
}
function seatsChanged(){
  if (S.screen === "setup"){
    // while building the party: one card per player — the host plus everyone who joined, no gaps
    const g = NET.seats.filter(Boolean); NET.seats = [null, ...g, null, null, null].slice(0, 4);
    S.setup.count = Math.min(4, 1 + g.length); renderSetupKeep(); }
  if (S.screen === "game" && S.party.length){ refreshStatus(); if (S.battle) renderBattle(); else if (S.mode === "story" && tw.done && S.li >= S.lines.length - 1 && !busy) renderChoices(); }
  if (NET.W) paintWaiter(NET.W);
  renderNetPanel(); renderNetHud(); netDirty();
}
function guestPeers(ch){
  const host = ch.peers.find(p => !p.sameTab && p.presence && p.presence.role === "host");
  if (host){ if (NET.hostPeer !== host.peer){ NET.hostPeer = host.peer; NET.rq = -1; NET.inp = []; requestResync(); } NET.hostNick = cleanNick(host.presence.nick); setNetStatus(""); }
  if (NET.hostPeer && ch.left.some(p => p.peer === NET.hostPeer)){ NET.hostPeer = null; netMsg("방장의 연결이 끊겼어요. 방장이 돌아오면 이어서 진행돼요."); }
  followPose(ch.peers);
  if (S.screen === "game" && S.party.length) refreshStatus();
}
function onRoomErr(e){ if (!online()) return; netFail(e && e.code === "not_permitted" ? "이 화면에서는 온라인 방에 들어갈 수 없어요." : "연결이 끊겼어요. 방을 다시 만들거나 다시 참가해 주세요."); }
function bindRoom(r){
  NET.unsubs.push(r.onPeers(ch => {
    const me = ch.peers.find(p => p.sameTab); if (me && NET.me !== me.peer){ NET.me = me.peer; if (isHost()) NET.hostPeer = me.peer; }
    try { isHost() ? hostPeers(ch) : guestPeers(ch); } catch (e){ console.warn(e); }
    renderNetPanel(); renderNetHud(); }, onRoomErr));
  if (isGuest()) NET.unsubs.push(r.on("g", guestRecv, onRoomErr));
  NET.unsubs.push(r.onConnection(c => { NET.conn = c; renderNetHud(); if (c && isGuest()) requestResync(); if (c && isHost()) fullSoon(); }, onRoomErr));
}
function resetNet(){ NET.unsubs.splice(0).forEach(u => { try { u(); } catch (e){} }); clearInterval(NET.poseT);
  Object.assign(NET, {room:null, role:null, code:"", me:null, hostPeer:null, hostNick:"", seats:[null, null, null, null], outq:[], q:0, lastKeys:{}, rq:-1, big:{}, inp:[], inSeq:0, lastIn:{}, needSeen:{}, gk:"", gv:"", gscr:null, gbg:null, gset:"", puppet:null, pendRoll:null, W:null, LW:null, driving:0, lb:false}); }
const CODE_CH = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({length:4}, () => CODE_CH[Math.floor(Math.random()*CODE_CH.length)]).join("");
const roomName = code => NET.p2p ? code.toLowerCase() : "ash-" + code.toLowerCase();
async function openRoom(code, host){
  if (!NET.p2p) return NET.api.join(roomName(code));
  return NET.api.join(roomName(code), {host});
}
async function netHost(){
  if (!NET.api || online()) return; const nick = readNick();
  let code = newCode();
  // public build: keep the same code across reloads so friends reconnect on their own
  if (NET.p2p) try { const c = localStorage.getItem("ashwing-hostcode"); if (/^[A-Z0-9]{4}$/.test(c || "")) code = c; } catch (e){}
  setNetStatus("방을 여는 중…");
  try {
    let r; try { r = await openRoom(code, true); } catch (e){ if (!e || e.code !== "taken") throw e; code = newCode(); r = await openRoom(code, true); }
    if (NET.p2p) try { localStorage.setItem("ashwing-hostcode", code); } catch (e){}
    resetNet(); Object.assign(NET, {room:r, role:"host", code, nick});
    bindRoom(r); await r.presence({role:"host", nick, code});
    setNetStatus(""); renderNetPanel(); renderNetHud(); fullSoon(); sfx("good");
  } catch (e){ netFail(e && e.code === "not_permitted" ? "이 화면에서는 온라인 방을 만들 수 없어요." : "방을 열지 못했어요. 잠시 후 다시 시도해 주세요."); }
}
async function netJoin(){
  if (!NET.api || online()) return; const nick = readNick(), code = ($("#netCode").value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)){ setNetStatus("방 코드 4자리를 입력하세요.", true); return; }
  setNetStatus("방에 들어가는 중…");
  try {
    const r = await openRoom(code, false);
    resetNet(); Object.assign(NET, {room:r, role:"guest", code, nick});
    if (busy && S.screen === "setup"){ $("#modal").hidden = true; tray.stop(); } busy = false;
    bindRoom(r); await r.presence({role:"guest", nick, inp:[], need:0});
    setNetStatus("방장을 찾는 중…"); renderNetPanel(); renderNetHud(); sfx("good");
    setTimeout(() => { if (isGuest() && !NET.hostPeer) setNetStatus("이 코드의 방장이 보이지 않아요. 코드를 확인하거나 방장이 방을 열었는지 확인해 주세요.", true); }, 6000);
  } catch (e){ netFail(e && e.code === "not_permitted" ? "이 화면에서는 온라인 방에 들어갈 수 없어요." : "방에 들어가지 못했어요. 잠시 후 다시 시도해 주세요."); }
}
async function netLeave(){
  const r = NET.room, wasGuest = isGuest(); resetNet();
  if (r) try { await r.leave(); } catch (e){}
  ["#trayLayer", "#loot", "#inv", "#modal", "#cards", "#artWin"].forEach(s => $(s).hidden = true); tray.stop(); busy = false; vote = null;
  if (wasGuest){ S.setup = blankSetup(); S.party = []; S.battle = null; show("title"); }
  else if (S.screen === "setup") renderSetup(); else if (S.screen === "game") refreshStatus();
  renderNetPanel(); renderNetHud();
}
function netFail(text){ const wasOn = online(); if (wasOn) netLeave(); setNetStatus(text, true); if (wasOn){ openNetPanel(); netMsg(text); } }

/* ---------- lobby UI ---------- */
function readNick(){ const v = cleanNick($("#netNick").value); $("#netNick").value = v; try { localStorage.setItem("ashwing-nick", v); } catch (e){} return v; }
function setNetStatus(t, err){ const el = $("#netStatus"); el.textContent = t || ""; el.classList.toggle("err", !!err); }
function netMsg(t){ const el = $("#netMsg"); el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, 2600); }
function openNetPanel(){ $("#netLayer").hidden = false; renderNetPanel(); setTimeout(() => { const f = online() ? $("#netLayer .btn") : $("#netNick"); f && f.focus({preventScroll:true}); }, 30); }
function renderNetPanel(){
  if ($("#netLayer").hidden) return;
  const on = online(), api = !!NET.api;
  $("#netStart").hidden = on; $("#netRoom").hidden = !on;
  document.querySelectorAll("#netStart .btn, #netStart input").forEach(el => el.disabled = !api);
  if (!api && NET.ready) setNetStatus(NET.p2p ? "연결 모듈을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요." : "온라인 기능은 claude.ai에 로그인한 상태로 이 아티팩트를 열었을 때만 쓸 수 있어요.", true);
  if (!on) return;
  $("#netCodeShow").textContent = NET.code;
  const inv = NET.p2p && isHost() && !FRAMED; $("#netInvite").hidden = !inv; if (inv) $("#netLink").value = inviteLink();
  const peers = NET.room ? NET.room.peers().filter(p => p.kind === "viewer" && p.presence && (p.presence.role === "host" || p.presence.role === "guest")) : [];
  $("#netPeers").innerHTML = peers.map(p => { const pr = p.presence, host = pr.role === "host", k = NET.seats.findIndex(s => s && s.peer === p.peer);
    const tag = host ? `<small class="host">방장 · P1</small>` : k >= 0 ? `<small>P${k + 1}</small>` : `<small class="spec">관전</small>`;
    return `<li>${tag}<span>${esc(cleanNick(pr.nick))}</span>${p.sameTab ? "<em>나</em>" : p.guest ? "<em>게스트</em>" : ""}</li>`; }).join("") || `<li><span>연결 중…</span></li>`;
  const save = isHost() && loadSave();
  $("#netGo").hidden = !isHost(); $("#netCont").hidden = !save;
  $("#netNote").textContent = isHost() && NET.p2p && FRAMED ? "친구에게 이 페이지 링크와 위의 방 코드를 보내세요. 친구는 링크를 열고 '함께하기'에서 코드만 넣으면 로그인 없이 들어와요." : isHost() && NET.p2p ? "위 초대 링크를 친구에게 보내세요. 누르면 바로 이 방으로 들어와요. 모두 모이면 파티를 만드세요." : isHost() ? "친구가 이 링크를 열고 '함께하기 → 참가'에서 코드를 입력하면 들어와요. 모두 모이면 파티를 만드세요. 각자 자기 캐릭터의 주사위를 직접 던지고 투표해요."
    : NET.hostPeer ? `${NET.hostNick || "방장"}님이 모험을 준비하고 있어요. 시작하면 자동으로 화면이 넘어가요.` : "방장을 찾는 중…";
}
function renderNetHud(){
  const el = $("#netHud"); if (!online()){ el.hidden = true; return; }
  const n = NET.room ? NET.room.peers().filter(p => p.kind === "viewer" && p.presence && p.presence.role).length : 1;
  el.hidden = false; el.classList.toggle("off", !NET.conn || (isGuest() && !NET.hostPeer));
  el.innerHTML = `<i class="dot"></i>ONLINE <b>${esc(NET.code)}</b> · ${Math.max(1, n)}명${isGuest() ? "" : " · 방장"}`;
}
function netAct(act){
  switch (act){
    case "online": sfx("select"); openNetPanel(); break;
    case "netClose": $("#netLayer").hidden = true; sfx("select"); break;
    case "netHost": netHost(); break;
    case "netJoin": netJoin(); break;
    case "netLeave": netLeave(); sfx("select"); break;
    case "netGo": if (!isHost()) break; $("#netLayer").hidden = true; S.setup = blankSetup(); sfx("select"); show("setup"); seatsChanged(); break;
    case "netCopy": { const v = inviteLink(), el = $("#netLink"); const ok = () => netMsg("초대 링크를 복사했어요");
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(ok, () => { el.select(); document.execCommand && document.execCommand("copy"); ok(); });
      else { el.select(); try { document.execCommand("copy"); ok(); } catch (e){} } sfx("select"); break; }
    case "netCont": { if (!isHost()) break; const s = loadSave(); if (!s) break; $("#netLayer").hidden = true; S = Object.assign(S, s); migrate(); show("game"); renderGame(); fullSoon(); break; }
  }
}
const FRAMED = (() => { try { return window.top !== window; } catch (e){ return true; } })();
function inviteLink(){ return location.href.split("#")[0] + "#" + NET.code; }
try { $("#netNick").value = localStorage.getItem("ashwing-nick") || ""; } catch (e){}
// renaming yourself while in a room updates everyone's labels
$("#netNick").addEventListener("input", () => { if (!online()) return; clearTimeout(NET.nkT); NET.nkT = setTimeout(() => { const v = readNick(); NET.nick = v; NET.room && NET.room.presence({nick:v}).catch(() => {}); if (isHost()){ netDirty(); seatsChanged(); } }, 400); });
(async () => {
  if (window.__P2P){ NET.p2p = true; NET.api = window.Peer ? window.__P2P : null;  $("#netIntro").textContent = FRAMED ? "방을 만들면 4자리 코드가 생겨요. 친구는 같은 페이지를 열고 코드만 넣으면 로그인 없이 들어와요. 자기 캐릭터의 주사위는 직접 흔들어 던지고, 갈림길에서는 각자 투표해요." : "방을 만들면 초대 링크가 생겨요. 친구는 링크만 누르면 로그인 없이 바로 들어와요. 자기 캐릭터의 주사위는 직접 흔들어 던지고, 갈림길에서는 각자 투표해요."; }
  else try { NET.api = window.claude && typeof window.claude.use === "function" ? await window.claude.use("room") : null; } catch (e){ NET.api = null; }
  NET.ready = true; renderNetPanel();
  // public build: an invite link (…#CODE) drops the friend straight into the room
  const m = NET.p2p && /^#([A-Za-z0-9]{4})$/.exec(location.hash || "");
  if (m && NET.api && !online()){
    $("#netCode").value = m[1].toUpperCase();
    if (!cleanNick($("#netNick").value) || !$("#netNick").value.trim()) $("#netNick").value = "모험가" + (10 + Math.floor(Math.random()*90));
    openNetPanel(); netJoin();
  }
})();
