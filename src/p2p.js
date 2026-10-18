/* Public build transport: the same calls the game uses from claude.ai's room capability,
   carried over WebRTC with PeerJS (free public signaling server). Star topology — the host's
   browser is the hub; guests connect to it by an id derived from the room code. No accounts. */
(() => {
  const PREFIX = "ashwing-tower-";
  function makeRoom(code, asHost){
    return new Promise((resolve, reject) => {
      const Peer = window.Peer; if (!Peer) return reject({code:"no_lib", message:"PeerJS not loaded"});
      const hostId = PREFIX + code.toLowerCase();
      const pres = new Map(), conns = new Map(), evL = {}, peerL = [], connL = [];
      let me = null, peer = null, hostConn = null, left = false, connected = false, resolved = false, retryT = 0, snap = Object.freeze([]);
      const entry = (id, o) => Object.freeze({peer:id, by:null, isMe:id === me, sameTab:id === me, kind:"viewer", guest:false, presence:o.presence, updatedAt:o.t});
      const rebuild = () => { snap = Object.freeze([...pres.entries()].map(([id, o]) => entry(id, o))); };
      const fire = (joined = [], gone = [], updated = []) => { rebuild(); const ch = {peers:snap, joined, left:gone, updated}; peerL.slice().forEach(f => { try { f(ch); } catch (e){ console.warn(e); } }); };
      const setConn = c => { if (connected === c) return; connected = c; connL.slice().forEach(f => { try { f(c); } catch (e){} }); };
      const put = (id, p) => { if (!p || typeof p !== "object") return; const isNew = !pres.has(id); pres.set(id, {presence:Object.freeze(p), t:Date.now()}); rebuild(); const e = snap.find(x => x.peer === id); fire(isNew ? [e] : [], [], isNew ? [] : [e]); };
      const drop = id => { const o = pres.get(id); if (!o || id === me) return; pres.delete(id); fire([], [entry(id, o)], []); };
      const deliver = (topic, data, from) => (evL[topic] || []).slice().forEach(f => { try { f({peer:from, by:null, isMe:from === me, sameTab:from === me, kind:"viewer", guest:false, topic, data}); } catch (e){ console.warn(e); } });
      const safeSend = (c, m) => { try { if (c && c.open) c.send(m); } catch (e){} };
      /* host side */
      const bcast = (m, except) => { for (const [id, c] of conns) if (id !== except) safeSend(c, m); };
      function accept(c){
        c.on("open", () => { conns.set(c.peer, c); safeSend(c, {t:"roster", list:[...pres.entries()].map(([id, o]) => [id, o.presence])}); });
        c.on("data", m => { if (!m || typeof m !== "object") return;
          if (m.t === "pres"){ put(c.peer, m.p); bcast({t:"pres", id:c.peer, p:m.p}, c.peer); }
          else if (m.t === "ev" && typeof m.topic === "string"){ deliver(m.topic, m.data, c.peer); bcast({t:"ev", from:c.peer, topic:m.topic, data:m.data}, c.peer); } });
        const gone = () => { if (conns.get(c.peer) !== c) return; conns.delete(c.peer); drop(c.peer); bcast({t:"leave", id:c.peer}); };
        c.on("close", gone); c.on("error", gone);
      }
      /* guest side */
      function retry(){ if (left || retryT) return; retryT = setTimeout(() => { retryT = 0; dial(); }, 3000); }
      function dial(){
        if (left || !peer || peer.destroyed) return;
        if (peer.disconnected){ try { peer.reconnect(); } catch (e){} retry(); return; }
        const c = peer.connect(hostId, {reliable:true, serialization:"json"}); hostConn = c; let opened = false;
        const t = setTimeout(() => { if (!opened && hostConn === c){ try { c.close(); } catch (e){} hostConn = null; retry(); } }, 9000);
        c.on("open", () => { opened = true; clearTimeout(t); setConn(true); safeSend(c, {t:"pres", p:(pres.get(me) || {}).presence || {}}); });
        c.on("data", m => { if (!m || typeof m !== "object") return;
          if (m.t === "roster" && Array.isArray(m.list)){ const ids = new Set(m.list.map(x => x[0])); [...pres.keys()].forEach(id => { if (id !== me && !ids.has(id)) drop(id); }); m.list.forEach(([id, p]) => { if (id !== me) put(id, p); }); }
          else if (m.t === "pres"){ if (m.id !== me) put(m.id, m.p); }
          else if (m.t === "leave") drop(m.id);
          else if (m.t === "ev" && typeof m.topic === "string") deliver(m.topic, m.data, m.from); });
        const lost = () => { clearTimeout(t); if (hostConn !== c) return; hostConn = null; setConn(false); [...pres.keys()].forEach(id => { if (id !== me) drop(id); }); retry(); };
        c.on("close", lost); c.on("error", lost);
      }
      try { peer = new Peer(asHost ? hostId : undefined, Object.assign({debug:0}, window.__PEER_OPTS || {})); }
      catch (e){ return reject({code:"no_lib", message:String(e)}); }
      peer.on("open", id => { me = id; pres.set(me, {presence:Object.freeze({}), t:Date.now()}); rebuild();
        if (asHost) setConn(true); else dial();
        if (!resolved){ resolved = true; resolve(room); } });
      peer.on("connection", c => { if (asHost && !left) accept(c); else try { c.close(); } catch (e){} });
      peer.on("disconnected", () => { if (!left) setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e){} }, 1500); });
      peer.on("error", err => { const type = err && err.type;
        if (!resolved){ resolved = true; try { peer.destroy(); } catch (e){} reject({code:type === "unavailable-id" ? "taken" : "upstream_error", message:String(err && err.message || type)}); return; }
        if (type === "peer-unavailable" && !asHost){ if (hostConn){ try { hostConn.close(); } catch (e){} hostConn = null; } setConn(false); retry(); } });
      setTimeout(() => { if (!resolved){ resolved = true; try { peer.destroy(); } catch (e){} reject({code:"upstream_error", message:"timeout"}); } }, 15000);
      const room = {
        name:code,
        emit(topic, data){ if (asHost){ deliver(topic, data, me); bcast({t:"ev", from:me, topic, data}); } else safeSend(hostConn, {t:"ev", topic, data}); return Promise.resolve(); },
        on(topic, f){ (evL[topic] = evL[topic] || []).push(f); return () => { evL[topic] = (evL[topic] || []).filter(x => x !== f); }; },
        presence(patch){ const cur = Object.assign({}, (pres.get(me) || {}).presence || {}); for (const k in patch){ if (patch[k] === null) delete cur[k]; else cur[k] = patch[k]; }
          const p = JSON.parse(JSON.stringify(cur)); if (me) put(me, p);
          if (asHost) bcast({t:"pres", id:me, p}); else safeSend(hostConn, {t:"pres", p}); return Promise.resolve(); },
        peers(){ return snap; },
        onPeers(f){ peerL.push(f); setTimeout(() => { if (peerL.includes(f)) f({peers:snap, joined:snap, left:[], updated:[]}); }, 0); return () => { const i = peerL.indexOf(f); if (i >= 0) peerL.splice(i, 1); }; },
        connected(){ return connected; },
        onConnection(f){ connL.push(f); return () => { const i = connL.indexOf(f); if (i >= 0) connL.splice(i, 1); }; },
        leave(){ left = true; clearTimeout(retryT); for (const c of conns.values()) try { c.close(); } catch (e){} try { peer.destroy(); } catch (e){} setConn(false); return Promise.resolve(); }
      };
    });
  }
  window.__P2P = {join:(code, o = {}) => makeRoom(code, !!o.host)};
})();
