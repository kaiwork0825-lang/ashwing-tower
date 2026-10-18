/* ===================== 3D DICE: shapes, physics, WebGL pixel renderer ===================== */
const V3 = {
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s], dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]), norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];}
};
const Q = {
  mul:(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1], a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0], a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3], a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]],
  rot:(q,v)=>{const [x,y,z,w]=q; const ix=w*v[0]+y*v[2]-z*v[1], iy=w*v[1]+z*v[0]-x*v[2], iz=w*v[2]+x*v[1]-y*v[0], iw=-x*v[0]-y*v[1]-z*v[2];
    return [ix*w+iw*-x+iy*-z-iz*-y, iy*w+iw*-y+iz*-x-ix*-z, iz*w+iw*-z+ix*-y-iy*-x];},
  norm:q=>{const l=Math.hypot(q[0],q[1],q[2],q[3])||1;return [q[0]/l,q[1]/l,q[2]/l,q[3]/l];},
  axisAngle:(ax,an)=>{const s=Math.sin(an/2);const a=V3.norm(ax);return [a[0]*s,a[1]*s,a[2]*s,Math.cos(an/2)];},
  random:()=>{const u=Math.random(),v=Math.random(),w=Math.random();return [Math.sqrt(1-u)*Math.sin(2*Math.PI*v),Math.sqrt(1-u)*Math.cos(2*Math.PI*v),Math.sqrt(u)*Math.sin(2*Math.PI*w),Math.sqrt(u)*Math.cos(2*Math.PI*w)];}
};

/* ---------- convex hull faces from a vertex cloud ---------- */
function hullFaces(verts){
  const eps = 1e-4, faces = [], seen = new Set(), n = verts.length;
  for (let i=0;i<n;i++) for (let j=i+1;j<n;j++) for (let k=j+1;k<n;k++){
    let nn = V3.cross(V3.sub(verts[j],verts[i]), V3.sub(verts[k],verts[i]));
    if (V3.len(nn) < 1e-6) continue; nn = V3.norm(nn);
    let d = V3.dot(nn, verts[i]), pos=0, neg=0;
    for (const v of verts){ const s = V3.dot(nn,v)-d; if (s > eps) pos++; else if (s < -eps) neg++; }
    if (pos && neg) continue;
    if (pos){ nn = V3.mul(nn,-1); d = -d; }
    const key = nn.map(x=>Math.round(x*1000)).join(",");
    if (seen.has(key)) continue; seen.add(key);
    const idx = []; verts.forEach((v,m)=>{ if (Math.abs(V3.dot(nn,v)-d) < eps) idx.push(m); });
    const c = V3.mul(idx.reduce((a,m)=>V3.add(a,verts[m]),[0,0,0]), 1/idx.length);
    const u = V3.norm(V3.sub(verts[idx[0]], c)), w = V3.cross(nn, u);
    idx.sort((a,b)=>{ const pa=V3.sub(verts[a],c), pb=V3.sub(verts[b],c); return Math.atan2(V3.dot(pa,w),V3.dot(pa,u)) - Math.atan2(V3.dot(pb,w),V3.dot(pb,u)); });
    faces.push({idx, n:nn, c});
  }
  return faces;
}
const PHI = (1+Math.sqrt(5))/2;
function dieVerts(sides){
  if (sides===4) return [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(v=>V3.mul(V3.norm(v),1.3));
  if (sides===6) return [-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>V3.mul(V3.norm([x,y,z]),1.05))));
  if (sides===8) return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(v=>V3.mul(v,1.12));
  if (sides===10){ const h=0.1056*0.92, v=[]; for(let i=0;i<10;i++){const b=i*Math.PI/5; v.push([Math.cos(b),h*(i%2?1:-1),Math.sin(b)]);} v.push([0,0.92,0],[0,-0.92,0]);
    // scale so ring radius 1 and poles at 0.92 keeps kites planar: poles = h*(1+c)/(1-c)
    const c=Math.cos(Math.PI/5), H=h*(1+c)/(1-c); v[10]=[0,H,0]; v[11]=[0,-H,0]; const s=1.08/Math.max(1,H); return v.map(p=>V3.mul(p,s)); }
  // d20
  const v=[]; for (const a of [-1,1]) for (const b of [-1,1]){ v.push([0,a,b*PHI],[a,b*PHI,0],[b*PHI,0,a]); }
  return v.map(p=>V3.mul(V3.norm(p),1.1));
}
const SHAPES = {};
const DIE_SCALE = 1.22;
function shape(sides){
  if (SHAPES[sides]) return SHAPES[sides];
  const verts = dieVerts(sides).map(v=>V3.mul(v, DIE_SCALE)); const faces = hullFaces(verts);
  const R = Math.max(...verts.map(V3.len));
  // values: opposite faces sum to N+1 when the solid is centrally symmetric
  const N = sides===4 ? 4 : faces.length; let next = 1;
  if (sides===4){ faces.forEach(f=>f.value=0); }
  else {
    const used = new Set();
    faces.forEach((f,i)=>{ if (used.has(i)) return; let opp=-1; faces.forEach((g,j)=>{ if(j!==i && !used.has(j) && V3.dot(f.n,g.n)<-0.999) opp=j; });
      f.value = next; used.add(i); if (opp>=0){ faces[opp].value = N+1-next; used.add(opp); } next++; });
    // fix values beyond range if any face lacked an opposite
    const vals = faces.map(f=>f.value); if (new Set(vals).size !== faces.length) faces.forEach((f,i)=>f.value=i+1);
  }
  // d4: vertex values
  const vertVal = sides===4 ? [1,2,3,4] : null;
  // label "up" direction inside each face
  faces.forEach(f=>{
    const ds = f.idx.map(m=>V3.len(V3.sub(verts[m],f.c))); const mx=Math.max(...ds), mn=Math.min(...ds);
    let dir;
    if (mx/mn > 1.05) dir = V3.sub(verts[f.idx[ds.indexOf(mx)]], f.c);
    else dir = V3.sub(V3.mul(V3.add(verts[f.idx[0]],verts[f.idx[1]]),0.5), f.c);
    f.up = V3.norm(V3.sub(dir, V3.mul(f.n, V3.dot(dir,f.n))));
    f.right = V3.cross(f.up, f.n);
    f.ext = Math.max(...f.idx.map(m=>{const p=V3.sub(verts[m],f.c); return Math.max(Math.abs(V3.dot(p,f.up)),Math.abs(V3.dot(p,f.right)));}));
  });
  return SHAPES[sides] = {sides, verts, faces, R, vertVal};
}


/* ---------- physics: octagonal concave bowl on a table ---------- */
const PHYS = {g:-46, dt:1/240};
// bowl: flat felt floor (octagon apothem r0), curved wall rising to H at apothem R, flat lip out to R+LIP, table at y=0 beyond
const BOWL = {r0:2.9, R:6.8, H:3.0, LIP:0.95, e:0.2, mu:0.6};
BOWL.a = BOWL.H / ((BOWL.R - BOWL.r0) ** 2);
BOWL.OUT = BOWL.R + BOWL.LIP;
BOWL.HOLD_Y = BOWL.H + 3.2;
const OCT_DIRS = Array.from({length:8}, (_, k) => [Math.cos(k*Math.PI/4), Math.sin(k*Math.PI/4)]);
function octR(x, z){ let best = -1e9, bk = 0; for (let k=0;k<8;k++){ const d = x*OCT_DIRS[k][0] + z*OCT_DIRS[k][1]; if (d > best){ best = d; bk = k; } } return [best, bk]; }
function surfaceAt(x, z){
  const [r, k] = octR(x, z);
  if (r < BOWL.r0) return {h:0, n:[0,1,0], r};
  if (r < BOWL.R){ const t = r - BOWL.r0, s = 2*BOWL.a*t, d = OCT_DIRS[k]; return {h:BOWL.a*t*t, n:V3.norm([-s*d[0], 1, -s*d[1]]), r}; }
  if (r < BOWL.OUT) return {h:BOWL.H, n:[0,1,0], r, lip:true};
  return {h:0, n:[0,1,0], r, table:true};
}
function makeBody(sides){
  const s = shape(sides);
  return {s, pos:[0,3,0], q:Q.random(), vel:[0,0,0], w:[0,0,0], m:1, I:0.24*s.R*s.R, rest:0, onFloor:false, out:false};
}
function integrateQ(b, w, dt){ const dq = Q.mul([w[0],w[1],w[2],0], b.q); b.q = Q.norm([b.q[0]+0.5*dt*dq[0], b.q[1]+0.5*dt*dq[1], b.q[2]+0.5*dt*dq[2], b.q[3]+0.5*dt*dq[3]]); }
function stepBodies(bodies, dt, onImpact, onOut){
  for (const b of bodies){
    if (b.held || b.frozen) continue;
    b.vel[1] += PHYS.g*dt;
    b.pos = V3.add(b.pos, V3.mul(b.vel, dt));
    integrateQ(b, b.w, dt);
  }
  // die vs die (sphere proxy)
  for (let i=0;i<bodies.length;i++) for (let j=i+1;j<bodies.length;j++){
    const a=bodies[i], c=bodies[j]; if (a.held||c.held||a.frozen||c.frozen) continue;
    const ra=a.s.R*0.82, rc=c.s.R*0.82; const d=V3.sub(c.pos,a.pos); const dist=V3.len(d);
    if (dist < ra+rc && dist > 1e-5){
      const n = V3.mul(d,1/dist), pen = ra+rc-dist;
      a.pos = V3.sub(a.pos, V3.mul(n,pen/2)); c.pos = V3.add(c.pos, V3.mul(n,pen/2));
      const rv = V3.sub(c.vel,a.vel); const vn = V3.dot(rv,n);
      if (vn < 0){ const j = -(1 + (vn < -3 ? 0.35 : 0))*vn/2; a.vel = V3.sub(a.vel,V3.mul(n,j)); c.vel = V3.add(c.vel,V3.mul(n,j));
        const t = V3.sub(rv, V3.mul(n,vn)); a.w = V3.add(a.w, V3.mul(V3.cross(n,t),0.25)); c.w = V3.sub(c.w, V3.mul(V3.cross(n,t),0.25));
        if (onImpact && -vn > 3) onImpact(Math.min(1,-vn/25)); }
    }
  }
  for (const b of bodies){
    if (b.held || b.frozen) continue;
    const cs = []; let deep = null, onTable = false;
    for (const v of b.s.verts){
      const p = V3.add(b.pos, Q.rot(b.q, v)); const S = surfaceAt(p[0], p[2]); const d = p[1] - S.h;
      if (d < 0){ const c = {p, n:S.n, pen:-d*S.n[1]}; cs.push(c); if (!deep || c.pen > deep.pen) deep = c; if (S.table) onTable = true; }
    }
    b.onFloor = cs.length > 0;
    if (cs.length){
      b.pos = V3.add(b.pos, V3.mul(deep.n, deep.pen*0.9));
      let hit = 0;
      for (let it=0; it<4; it++) for (const c of cs){
        const r = V3.sub(c.p, b.pos), n = c.n;
        let vr = V3.add(b.vel, V3.cross(b.w, r)); const vn = V3.dot(vr, n);
        if (vn >= 0) continue;
        const rn = V3.cross(r, n); const kN = 1/b.m + V3.dot(rn,rn)/b.I;
        const e = vn < -4 ? BOWL.e : 0;
        const j = -(1+(it===0?e:0))*vn/kN;
        if (it===0) hit = Math.max(hit, -vn);
        b.vel = V3.add(b.vel, V3.mul(n, j/b.m)); b.w = V3.add(b.w, V3.mul(rn, j/b.I));
        vr = V3.add(b.vel, V3.cross(b.w, r));
        const vt = V3.sub(vr, V3.mul(n, V3.dot(vr,n))); const vtl = V3.len(vt);
        if (vtl > 1e-6){ const t = V3.mul(vt, 1/vtl); const rt = V3.cross(r,t); const kT = 1/b.m + V3.dot(rt,rt)/b.I;
          let jt = -vtl/kT; const lim = BOWL.mu*Math.abs(j); if (jt < -lim) jt = -lim;
          b.vel = V3.add(b.vel, V3.mul(t, jt/b.m)); b.w = V3.add(b.w, V3.mul(rt, jt/b.I)); }
      }
      if (onImpact && hit > 4) onImpact(Math.min(1, hit/28));
    }
    if (b.onFloor){ const slow = V3.len(b.vel) < 0.6 && V3.len(b.w) < 1.2; b.vel = V3.mul(b.vel, slow ? 0.985 : 0.997); b.w = V3.mul(b.w, slow ? 0.98 : 0.994); }
    const [rc] = octR(b.pos[0], b.pos[2]);
    // out of the tray only when it actually lands on the table (or sails far away) — flying over the rim on the way in is fine
    if (!b.out && (onTable || rc > BOWL.OUT + 4)){ b.out = true; b.outPos = b.pos.slice(); onOut && onOut(b); }
    if (b.out && (rc > BOWL.OUT + 9 || (rc > BOWL.OUT && b.onFloor && V3.len(b.vel) < 2))) { b.frozen = true; b.rest = 9; continue; }
    if (b.onFloor && V3.len(b.vel) < 0.35 && V3.len(b.w) < 0.6) b.rest += dt; else b.rest = 0;
  }
}
function readBody(b){
  const s = b.s;
  // in the bowl a resting die can sit on the slope: read the face (or d4 vertex) closest to the surface normal under it
  const up = b.out ? [0,1,0] : surfaceAt(b.pos[0], b.pos[2]).n;
  if (s.sides === 4){ let best=-9, bi=0; s.verts.forEach((v,i)=>{ const y = V3.dot(Q.rot(b.q,v), up); if (y>best){best=y;bi=i;} }); return {value:s.vertVal[bi], tilt:best/V3.len(s.verts[bi])}; }
  let best=-9, bf=null; s.faces.forEach(f=>{ const y = V3.dot(Q.rot(b.q,f.n), up); if (y>best){best=y;bf=f;} });
  return {value:bf.value, tilt:best};
}
// a die resting on an edge gets a small shove, like bumping the table
function nudgeCocked(bodies){
  let any=false;
  for (const b of bodies){ if (b.out || (readBody(b).tilt > 0.97 && !surfaceAt(b.pos[0], b.pos[2]).lip)) continue; any=true; b.rest=0;
    const toC = V3.norm([-b.pos[0]+1e-3,0,-b.pos[2]]); b.vel = V3.add(b.vel, [toC[0]*2.5, 5, toC[2]*2.5]); b.w = V3.add(b.w,[Math.random()*10-5,Math.random()*10-5,Math.random()*10-5]); }
  return any;
}
// release dice from a hand position with a throw velocity
function releaseBodies(bodies, from, v){
  const s = Math.hypot(v[0], v[2]);
  bodies.forEach((b, i) => { b.held = false; b.rest = 0; b.out = false; b.frozen = false;
    if (!b.pos) b.pos = from.slice();
    const k = 0.92 + Math.random()*0.16;
    b.vel = [v[0]*k + (Math.random()-0.5)*s*0.12, 1.2 + s*0.1 + Math.random()*1.5, v[2]*k + (Math.random()-0.5)*s*0.12];
    const spin = 8 + s*0.9; b.w = V3.mul(V3.norm([Math.random()-0.5, Math.random()-0.5, Math.random()-0.5]), spin*(0.7+Math.random()*0.6)); });
}
function settle(bodies, maxT, onImpact, onOut){
  let t = 0, nudges = 0, poke = 0;
  while (t < maxT){
    stepBodies(bodies, PHYS.dt, onImpact, onOut); t += PHYS.dt;
    if (bodies.every(b => b.rest > 0.35)){ if (nudges < 4 && nudgeCocked(bodies)) nudges++; else break; }
    else if (t > 5 && t - poke > 1.5){ poke = t; bodies.forEach(b => { if (b.rest < 0.35 && !b.out){ b.vel = V3.add(b.vel,[0,4,0]); b.w = V3.add(b.w,[3,-3,3]); } }); }
  }
  return t;
}
// headless throw used by tests
function simulateThrow(sidesList, from, v){
  const bodies = sidesList.map((s, i) => { const b = makeBody(s); const a = i/sidesList.length*Math.PI*2; b.pos = [from[0]+Math.cos(a)*0.8, from[1]+(i%2)*0.4, from[2]+Math.sin(a)*0.8]; return b; });
  releaseBodies(bodies, from, v);
  const t = settle(bodies, 10);
  return {t, out:bodies.map(b => b.out), results:bodies.map(b => b.out ? null : readBody(b)), bodies};
}
if (typeof module !== "undefined" && typeof window === "undefined") module.exports = {shape, simulateThrow, makeBody, stepBodies, readBody, BOWL, surfaceAt, octR, releaseBodies, settle};

/* ---------- matrices (column-major) ---------- */
const M4 = {
  persp(fy, a, n, f){ const t = 1/Math.tan(fy/2); return [t/a,0,0,0, 0,t,0,0, 0,0,(f+n)/(n-f),-1, 0,0,2*f*n/(n-f),0]; },
  lookAt(e, c, up){ const z = V3.norm(V3.sub(e,c)), x = V3.norm(V3.cross(up,z)), y = V3.cross(z,x);
    return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -V3.dot(x,e),-V3.dot(y,e),-V3.dot(z,e),1]; },
  mul(a, b){ const o = new Array(16); for (let i=0;i<4;i++) for (let j=0;j<4;j++){ let s=0; for (let k=0;k<4;k++) s += a[k*4+j]*b[i*4+k]; o[i*4+j]=s; } return o; },
  fromQT(q, t, s=1){ const [x,y,z,w] = q; return [(1-2*(y*y+z*z))*s, 2*(x*y+z*w)*s, 2*(x*z-y*w)*s, 0, 2*(x*y-z*w)*s, (1-2*(x*x+z*z))*s, 2*(y*z+x*w)*s, 0, 2*(x*z+y*w)*s, 2*(y*z-x*w)*s, (1-2*(x*x+y*y))*s, 0, t[0],t[1],t[2],1]; },
  xf(m, v){ return [0,1,2,3].map(r=>m[r]*v[0]+m[4+r]*v[1]+m[8+r]*v[2]+m[12+r]*v[3]); },
  inv(m){ const [a00,a01,a02,a03,a10,a11,a12,a13,a20,a21,a22,a23,a30,a31,a32,a33] = m;
    const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10, b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12,
      b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30, b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
    const d = 1/(b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06);
    return [(a11*b11-a12*b10+a13*b09)*d,(a02*b10-a01*b11-a03*b09)*d,(a31*b05-a32*b04+a33*b03)*d,(a22*b04-a21*b05-a23*b03)*d,
      (a12*b08-a10*b11-a13*b07)*d,(a00*b11-a02*b08+a03*b07)*d,(a32*b02-a30*b05-a33*b01)*d,(a20*b05-a22*b02+a23*b01)*d,
      (a10*b10-a11*b08+a13*b06)*d,(a01*b08-a00*b10-a03*b06)*d,(a30*b04-a31*b02+a33*b00)*d,(a21*b02-a20*b04-a23*b00)*d,
      (a11*b07-a10*b09-a12*b06)*d,(a00*b09-a01*b07+a02*b06)*d,(a31*b01-a30*b03-a32*b00)*d,(a20*b03-a21*b01+a22*b00)*d]; }
};

const DICE_SCHEMES = {
  fighter:{body:"#b02e33", num:"#ffd678"}, wizard:{body:"#344e66", num:"#dfe6d6"}, rogue:{body:"#2f5e3e", num:"#f0c9a0"},
  cleric:{body:"#dfe6d6", num:"#82341c"}, foe:{body:"#1f2f45", num:"#e04a3c"}, bone:{body:"#b6cbc0", num:"#121a29"}, gold:{body:"#fbb954", num:"#452017"}
};

const VS = `attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUV;
uniform mat4 uVP; uniform mat4 uM; uniform float uGrow; uniform float uShadow; uniform float uShadowY; uniform vec3 uLdir;
varying vec3 vN; varying vec2 vUV;
void main(){ vec4 w = uM*vec4(aPos*uGrow,1.0);
  if (uShadow > 0.5){ w.xyz -= uLdir*((w.y-uShadowY-0.03)/uLdir.y); }
  vN = (uM*vec4(aNrm,0.0)).xyz; vUV = aUV; gl_Position = uVP*w; }`;
const FS = `precision mediump float;
uniform sampler2D uTex; uniform sampler2D uPal; uniform int uMode; uniform vec3 uColor; uniform vec3 uTint; uniform float uEmis; uniform vec3 uL; uniform float uSpread;
varying vec3 vN; varying vec2 vUV;
float b2(vec2 a){ a = floor(a); return fract(a.x/2.0 + a.y*a.y*0.75); }
float bayer(vec2 a){ return b2(0.5*a)*0.25 + b2(a); }
vec3 quant(vec3 c){ c += (bayer(gl_FragCoord.xy)-0.5)*uSpread; vec3 best = vec3(0.0); float bd = 1e9;
  for (int i=0;i<${PALETTE.length};i++){ vec3 p = texture2D(uPal, vec2((float(i)+0.5)/64.0, 0.5)).rgb; vec3 d = (c-p)*vec3(0.85,1.0,0.75); float dd = dot(d,d); if (dd < bd){ bd = dd; best = p; } }
  return best; }
void main(){
  if (uMode == 2){ if (bayer(gl_FragCoord.xy) > 0.56) discard; gl_FragColor = vec4(uColor,1.0); return; }
  if (uMode == 1){ gl_FragColor = vec4(uColor,1.0); return; }
  vec3 base = texture2D(uTex, vUV).rgb*uTint;
  float d = max(dot(normalize(vN), uL), 0.0);
  float bnd = d*0.8 + 0.2 + (bayer(gl_FragCoord.xy)-0.5)*0.14;
  float lv = bnd > 0.86 ? 1.12 : bnd > 0.6 ? 0.92 : bnd > 0.38 ? 0.7 : 0.5;
  vec3 lc = mix(vec3(0.62,0.78,0.95), vec3(1.12,0.98,0.84), step(0.6, bnd));
  gl_FragColor = vec4(quant(base*lv*lc + base*uEmis), 1.0); }`;

// throw-power zones, in throw speed (world units/s). Measured by simulation: <13 stays in the bowl, 13–18 sometimes spills, >18 usually flies out.
const POWER = {gain:0.3, max:28, zones:[{to:4, key:"soft", label:"살살"}, {to:13, key:"good", label:"딱 좋음"}, {to:18, key:"risky", label:"셈 — 넘칠 수도"}, {to:1e9, key:"over", label:"너무 셈!"}]};
const powerZone = s => POWER.zones.find(z => s < z.to);

class DiceTray {
  constructor(canvas, opts={}){
    this.cv = canvas; this.opts = opts; this.dice = []; this.state = "idle"; this.lastOut = [];
    this.gl = null; this.hand = [BOWL.OUT + 2.2, BOWL.HOLD_Y - 1.5, 3.2]; this.shakeE = 0; this.t = 0;
    try { this.gl = canvas.getContext("webgl", {antialias:false, preserveDrawingBuffer:false, alpha:false}); } catch (e) {}
    if (this.gl) this._initGL();
    this._bindPointer();
    this._loop = this._loop.bind(this); this.running = false; this.last = 0; this.acc = 0;
  }
  /* ----- GL setup ----- */
  _initGL(){
    const gl = this.gl;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    gl.useProgram(p); this.prog = p;
    this.a = {pos:gl.getAttribLocation(p,"aPos"), nrm:gl.getAttribLocation(p,"aNrm"), uv:gl.getAttribLocation(p,"aUV")};
    this.u = {}; ["uVP","uM","uGrow","uShadow","uShadowY","uLdir","uTex","uPal","uMode","uColor","uTint","uEmis","uL","uSpread"].forEach(n => this.u[n] = gl.getUniformLocation(p, n));
    const pc = document.createElement("canvas"); pc.width = 64; pc.height = 1; const px = pc.getContext("2d");
    PALETTE.forEach((h,i) => { px.fillStyle = h; px.fillRect(i,0,1,1); });
    this.palTex = this._tex(pc);
    gl.enable(gl.DEPTH_TEST);
    this.L = V3.norm([-0.45, 1, 0.55]);
    this.Ldir = V3.norm([0.5, -1, -0.3]);
    this.meshes = {};
    this._buildScene();
  }
  _tex(canvas){
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  _buf(arr){ const gl = this.gl, b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); return {b, n:arr.length/8}; }
  _dieMesh(sides, scheme){
    const key = sides + ":" + scheme; if (this.meshes[key]) return this.meshes[key];
    const s = shape(sides), sc = DICE_SCHEMES[scheme] || DICE_SCHEMES.bone;
    const CELL = 32, cols = 8, W = cols*CELL, H = 128;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d");
    c.fillStyle = sc.body; c.fillRect(0,0,W,H);
    const arr = [];
    s.faces.forEach((f, fi) => {
      const cx = (fi % cols)*CELL + CELL/2, cy = Math.floor(fi/cols)*CELL + CELL/2;
      const uvOf = p => { const d = V3.sub(p, f.c); const du = V3.dot(d, f.right)/f.ext, dv = V3.dot(d, f.up)/f.ext; return [(cx + du*CELL*0.46)/W, 1 - (cy - dv*CELL*0.46)/H, du, dv]; };
      if (sides === 4){
        f.idx.forEach(m => { const [, , du, dv] = uvOf(s.verts[m]); ctxText(c, String(s.vertVal[m]), cx + du*CELL*0.46*0.58, cy - dv*CELL*0.46*0.58, 2, sc.num, Math.atan2(du, dv)); });
      } else {
        const val = String(f.value), sz = s.faces.length >= 20 || val.length > 1 ? 2 : 3;
        ctxText(c, val, cx, cy + (sides===10 ? sz*1.5 : 0), sz, sc.num);
        if (val === "6" || val === "9") { c.fillStyle = sc.num; c.fillRect(cx - 3*sz/2, cy + 3.5*sz, 3*sz, sz); }
      }
      const pts = f.idx.map(m => s.verts[m]);
      for (let i=1;i<pts.length-1;i++) for (const p of [pts[0], pts[i], pts[i+1]]){ const uv = uvOf(p); arr.push(p[0],p[1],p[2], f.n[0],f.n[1],f.n[2], uv[0],uv[1]); }
    });
    return this.meshes[key] = {...this._buf(arr), tex:this._tex(cv)};
  }
  /* ----- the fantasy dice bowl, table and candles ----- */
  _buildScene(){
    const B = BOWL, E = B.OUT + 0.25;
    const rng = (() => { let s = 1234567; return () => (s = (s*16807) % 2147483647) / 2147483647; })();
    const C = h => h;
    // --- bowl texture (planar, covers [-E,E]) ---
    const N = 320, tc = document.createElement("canvas"); tc.width = N; tc.height = N; const g = tc.getContext("2d");
    const img = g.createImageData(N, N), put = (i, hex) => { const v = hex2rgb(hex); img.data[i*4]=v[0]; img.data[i*4+1]=v[1]; img.data[i*4+2]=v[2]; img.data[i*4+3]=255; };
    const vtx = Array.from({length:8}, (_, k) => { const a = (k+0.5)*Math.PI/4, rr = 1/Math.cos(Math.PI/8); return [Math.cos(a)*rr, Math.sin(a)*rr]; });
    const segDist = (px, pz, a, b) => { const dx = b[0]-a[0], dz = b[1]-a[1], t = Math.max(0, Math.min(1, ((px-a[0])*dx + (pz-a[1])*dz)/(dx*dx+dz*dz))); return Math.hypot(px - a[0] - t*dx, pz - a[1] - t*dz); };
    const glyph = (u, v, seed) => { const gx = Math.floor(u*3), gy = Math.floor(v*5); if (gx<0||gx>2||gy<0||gy>4) return false; return ((seed*31 + gx*7 + gy*13) % 5) < 2 || (gx===1 && gy%2===0); };
    for (let py=0; py<N; py++) for (let qx=0; qx<N; qx++){
      const x = (qx+0.5)/N*2*E - E, z = (py+0.5)/N*2*E - E, i = py*N+qx;
      const [r, k] = octR(x, z), ang = Math.atan2(z, x), noise = rng();
      if (r < B.r0){
        let c = noise < 0.5 ? "#241a33" : "#2a1e3a"; if (noise < 0.06) c = "#3a2850";
        const rr = r / B.r0;
        if (Math.abs(rr - 0.86) < 0.035 || Math.abs(rr - 0.74) < 0.02) c = "#82341c";
        // octagram {8/3}
        let dm = 9; for (let j=0;j<8;j++){ const a = vtx[j].map(v => v*B.r0*0.74), b = vtx[(j+3)%8].map(v => v*B.r0*0.74); dm = Math.min(dm, segDist(x, z, a, b)); }
        if (dm < 0.05 && rr < 0.75) c = "#a6441f";
        if (rr < 0.16 && rr > 0.11) c = "#c95a24";
        if (rr < 0.07) c = "#fbb954";
        put(i, c); continue;
      }
      if (r < B.R){
        const t = (r - B.r0)/(B.R - B.r0);
        let c = t < 0.25 ? (noise < 0.5 ? "#1f2f45" : "#182337") : t < 0.75 ? (noise < 0.5 ? "#283d55" : "#1f2f45") : (noise < 0.5 ? "#344e66" : "#283d55");
        const corner = Math.abs(((ang/(Math.PI/4) - 0.5) % 1 + 1) % 1 - 0.5); // 0 at octagon corners
        if (corner < 0.035) c = "#121a29";
        if (t > 0.42 && t < 0.62){ const along = (ang/(Math.PI*2) + 1) % 1 * 48, cell = Math.floor(along); if (glyph(along - cell, (t-0.42)/0.2, cell) && (along - cell) < 0.75) c = "#6e9198"; }
        if (t < 0.03) c = "#121a29";
        put(i, c); continue;
      }
      if (r < B.OUT){
        const t = (r - B.R)/B.LIP;
        let c = noise < 0.5 ? "#82341c" : "#61291a"; if (t < 0.12 || t > 0.88) c = "#fbb954"; else if (t < 0.22) c = "#c95a24";
        // gem studs at octagon corners, glowing runes mid-side
        for (let j=0;j<8;j++){ const vv = vtx[j].map(v => v*(B.R + B.LIP/2)); if (Math.hypot(x - vv[0], z - vv[1]) < 0.27) c = j % 2 ? "#e04a3c" : "#b6cbc0"; if (Math.hypot(x - vv[0], z - vv[1]) < 0.11) c = "#fff0b0"; }
        const dk = OCT_DIRS[k], tang = -x*dk[1] + z*dk[0], side = (B.R + B.LIP/2)*Math.tan(Math.PI/8);
        const u = (tang + side*0.6)/(side*1.2) * 7; const cell = Math.floor(u);
        if (t > 0.3 && t < 0.7 && cell >= 0 && cell < 7 && glyph(u - cell, (t-0.3)/0.4, cell + k*7) && (u - cell) < 0.72) c = "#ffd678";
        put(i, c); continue;
      }
      put(i, noise < 0.5 ? "#452017" : "#3a1c14");
    }
    g.putImageData(img, 0, 0);
    this.bowlTex = this._tex(tc);
    // --- bowl mesh: concentric octagon rings ---
    const ringPt = (r, k, y) => { const a = (k+0.5)*Math.PI/4, rr = r/Math.cos(Math.PI/8); return [Math.cos(a)*rr, y, Math.sin(a)*rr]; };
    const uv = p => [(p[0] + E)/(2*E), 1 - (p[2] + E)/(2*E)];
    const quad = (arr, a, b, c, d) => { const n = V3.norm(V3.cross(V3.sub(c, a), V3.sub(b, a))); const nn = n[1] < 0 ? V3.mul(n, -1) : n;
      for (const p of [a, b, c, a, c, d]) arr.push(p[0], p[1], p[2], nn[0], nn[1], nn[2], ...uv(p)); };
    const rings = [[0.001, 0.02]]; rings.push([B.r0, 0.02]);
    for (let s=1; s<=7; s++){ const r = B.r0 + (B.R - B.r0)*s/7, t = r - B.r0; rings.push([r, B.a*t*t + 0.02]); }
    const inner = [];
    for (let j=0; j<rings.length-1; j++) for (let k=0;k<8;k++){ const [r1,y1] = rings[j], [r2,y2] = rings[j+1];
      quad(inner, ringPt(r1,k,y1), ringPt(r1,(k+1)%8,y1), ringPt(r2,(k+1)%8,y2), ringPt(r2,k,y2)); }
    this.bowl = {...this._buf(inner)};
    const lip = [];
    for (let k=0;k<8;k++){
      quad(lip, ringPt(B.R,k,B.H), ringPt(B.R,(k+1)%8,B.H), ringPt(B.OUT,(k+1)%8,B.H), ringPt(B.OUT,k,B.H));
      const a = ringPt(B.OUT,k,B.H), b = ringPt(B.OUT,(k+1)%8,B.H), c = ringPt(B.OUT+0.12,(k+1)%8,0), d = ringPt(B.OUT+0.12,k,0);
      const n = V3.norm(V3.cross(V3.sub(b, a), V3.sub(d, a)));
      for (const p of [a, b, c, a, c, d]) lip.push(p[0], p[1], p[2], -n[0], -n[1], -n[2], ...uv(V3.mul(p, (B.OUT - 0.3)/B.OUT)));
    }
    this.lip = {...this._buf(lip)};
    // --- table ---
    const TW = 34, TD = 20, ts = 256, tt = document.createElement("canvas"); tt.width = ts; tt.height = Math.round(ts*TD/TW); const tg = tt.getContext("2d");
    const th = tt.height; tg.fillStyle = "#2e1712"; tg.fillRect(0,0,ts,th);
    for (let y=0;y<th;y+=11){ tg.fillStyle = "#1c0f0c"; tg.fillRect(0,y,ts,1); tg.fillStyle = "#452017"; tg.fillRect(0,y+1,ts,1);
      for (let x=(y*7)%60; x<ts; x+=60+((y*3)%20)){ tg.fillStyle = "#1c0f0c"; tg.fillRect(x,y,1,11); } }
    for (let i=0;i<500;i++){ tg.fillStyle = rng() < 0.5 ? "#3a1c14" : "#26130e"; tg.fillRect(Math.floor(rng()*ts), Math.floor(rng()*th), 2+Math.floor(rng()*5), 1); }
    const T = (x, z) => [(x + TW/2)/TW*ts, (z + TD/2)/TD*th];
    // parchment map peeking out from under the bowl
    { const [mx, my] = T(-12.5, -6.5); tg.fillStyle = "#b8775a"; tg.fillRect(mx, my, 44, 30); tg.fillStyle = "#dba07a"; tg.fillRect(mx+2, my+2, 40, 26);
      tg.fillStyle = "#82341c"; for (let i=0;i<9;i++) tg.fillRect(mx+5+i*4, my+8+Math.round(Math.sin(i)*4), 3, 1); tg.fillRect(mx+30, my+16, 4, 4); tg.fillStyle = "#7a1f2a"; tg.fillRect(mx+31, my+17, 2, 2); }
    // spilled coins
    [[10.5,5.8],[11.3,6.3],[12.2,5.6],[-11.6,6.4],[9.8,-6.6],[12.8,-5.6]].forEach(([x,z]) => { const [cx, cy] = T(x, z); tg.fillStyle = "#c95a24"; tg.fillRect(cx-2, cy-1, 5, 3); tg.fillStyle = "#fbb954"; tg.fillRect(cx-2, cy-2, 5, 3); tg.fillStyle = "#fff0b0"; tg.fillRect(cx-1, cy-2, 1, 1); });
    // burnt ring marks
    [[-13,3],[13.6,-1.5]].forEach(([x,z]) => { const [cx, cy] = T(x, z); tg.fillStyle = "#1c0f0c"; for (let a=0;a<24;a++) tg.fillRect(Math.round(cx + Math.cos(a/24*6.28)*6), Math.round(cy + Math.sin(a/24*6.28)*4), 2, 1); });
    const q = [[-TW/2,0,-TD/2,0,1],[-TW/2,0,TD/2,0,0],[TW/2,0,TD/2,1,0],[-TW/2,0,-TD/2,0,1],[TW/2,0,TD/2,1,0],[TW/2,0,-TD/2,1,1]];
    this.table = {...this._buf(q.flatMap(v => [v[0],v[1],v[2],0,1,0,v[3],v[4]])), tex:this._tex(tt)};
    // --- candles (wax column + flame) ---
    const box = (cx, cz, sx, sy, sz, y0=0) => { const v = [], a = [cx-sx, y0, cz-sz], b = [cx+sx, y0+sy, cz+sz];
      const F = (p0,p1,p2,p3,n) => { for (const [p,u] of [[p0,[0,0]],[p1,[1,0]],[p2,[1,1]],[p0,[0,0]],[p2,[1,1]],[p3,[0,1]]]) v.push(...p, ...n, ...u); };
      F([a[0],b[1],b[2]],[b[0],b[1],b[2]],[b[0],b[1],a[2]],[a[0],b[1],a[2]],[0,1,0]);
      F([a[0],a[1],b[2]],[b[0],a[1],b[2]],[b[0],b[1],b[2]],[a[0],b[1],b[2]],[0,0,1]);
      F([b[0],a[1],a[2]],[a[0],a[1],a[2]],[a[0],b[1],a[2]],[b[0],b[1],a[2]],[0,0,-1]);
      F([b[0],a[1],b[2]],[b[0],a[1],a[2]],[b[0],b[1],a[2]],[b[0],b[1],b[2]],[1,0,0]);
      F([a[0],a[1],a[2]],[a[0],a[1],b[2]],[a[0],b[1],b[2]],[a[0],b[1],a[2]],[-1,0,0]); return v; };
    const solid = hex => { const c = document.createElement("canvas"); c.width = c.height = 4; const x = c.getContext("2d"); x.fillStyle = hex; x.fillRect(0,0,4,4); return this._tex(c); };
    this.candleSpots = [[-12.2, -3.4, 2.6], [12.6, -4.2, 2.0], [-11.4, 4.6, 1.5], [13.4, 3.4, 3.0]];
    this.wax = {...this._buf(this.candleSpots.flatMap(([x,z,h]) => [...box(x, z, 0.42, h, 0.42), ...box(x, z, 0.75, 0.18, 0.75)])), tex:solid("#f0c9a0")};
    this.flameBox = (x, z, h, f) => box(x, z, 0.16 + f*0.04, 0.5 + f*0.25, 0.16, h);
    this.flameTex = solid("#fbb954"); this.flameCore = solid("#fff0b0");
  }
  /* ----- size & camera ----- */
  resize(cssW, cssH, scale = 4){
    const w = Math.floor(cssW/scale), h = Math.floor((cssH || cssW*0.5)/scale);
    this.cv.width = w; this.cv.height = h; this.cv.style.width = (w*scale) + "px"; this.cv.style.height = (h*scale) + "px";
    this.scale = scale;
    const aspect = w/h;
    this.P = M4.persp(36*Math.PI/180, aspect, 1, 90);
    this.Vw = M4.lookAt([0, 25, 14.5], [0, -0.2, 0.9], [0,1,0]);
    this.VP = M4.mul(this.P, this.Vw); this.iVP = M4.inv(this.VP);
    if (this.gl) this.gl.viewport(0, 0, w, h);
    this._draw();
  }
  project(p){ const v = M4.xf(this.VP, [p[0],p[1],p[2],1]); return [(v[0]/v[3]*0.5+0.5)*this.cv.width*this.scale, (0.5-v[1]/v[3]*0.5)*this.cv.height*this.scale]; }
  _ray(cx, cy){ const r = this.cv.getBoundingClientRect(); const nx = (cx - r.left)/r.width*2-1, ny = 1-(cy - r.top)/r.height*2;
    const a = M4.xf(this.iVP, [nx,ny,-1,1]), b = M4.xf(this.iVP, [nx,ny,1,1]);
    const A = [a[0]/a[3],a[1]/a[3],a[2]/a[3]], B = [b[0]/b[3],b[1]/b[3],b[2]/b[3]]; return [A, V3.sub(B,A)]; }
  _pointOnPlane(cx, cy, y){ const [o, d] = this._ray(cx, cy); const t = (y - o[1])/d[1]; const p = V3.add(o, V3.mul(d, t));
    p[0] = Math.max(-15, Math.min(15, p[0])); p[2] = Math.max(-9, Math.min(10, p[2])); return p; }
  /* ----- rolling ----- */
  roll(specs, {auto=false} = {}){
    this.dice = specs.map((sp, i) => { const b = makeBody(sp.sides); b.scheme = sp.scheme || "bone"; b.held = true; b.i = i; b.ph = i/specs.length*Math.PI*2; b.pos = null; return b; });
    this.hand = [BOWL.OUT + 2.3, BOWL.HOLD_Y - 1.6, 3.4]; this.state = "ready"; this.t = 0; this.nudges = 0; this.shakeE = 0; this.lastOut = [];
    this._arrange(0, true);
    this._start();
    return new Promise(res => { this._resolve = res; if (auto) setTimeout(() => this.throwAuto(), 420); if (!this.gl) this._fallback(); });
  }
  _arrange(dt, snap){
    const n = this.dice.length, E = this.shakeE, t = this.t;
    this.dice.forEach((b, i) => {
      const a = b.ph + t*(1.4 + 10*E), r = (n > 1 ? 0.55 + n*0.1 : 0) + 0.45*E*Math.sin(t*9 + i*2.1);
      const jit = this.state === "holding" ? E*0.7 : 0;
      const tgt = [this.hand[0] + Math.cos(a)*r + (Math.random()-0.5)*jit, this.hand[1] + (i%2)*0.45 + Math.sin(t*3 + i)*0.15 + (Math.random()-0.5)*jit, this.hand[2] + Math.sin(a)*r*0.8 + (Math.random()-0.5)*jit];
      if (snap || !b.pos) b.pos = tgt; else b.pos = V3.add(b.pos, V3.mul(V3.sub(tgt, b.pos), Math.min(1, dt*16)));
      const spin = 1.6 + 26*E; if (!b.spinAx || Math.random() < E*0.25) b.spinAx = V3.norm([Math.random()-0.5, Math.random()-0.5, Math.random()-0.5]);
      b.w = V3.mul(b.spinAx, spin);
    });
  }
  throwAuto(){ // a clean, medium-strength throw from the near rim toward the middle
    if (this.state !== "ready" && this.state !== "holding") return;
    const a = -0.35 + Math.random()*0.7, from = [Math.cos(a)*BOWL.R*0.8, BOWL.HOLD_Y, Math.sin(a)*BOWL.R*0.55 + 1.2];
    this.hand = from; this._arrange(0, true);
    const s = 6.5 + Math.random()*4, dir = V3.norm([-from[0] + (Math.random()-0.5)*3, 0, -from[2] + (Math.random()-0.5)*3]);
    this._release(V3.mul(dir, s));
  }
  _release(v){
    const s = Math.hypot(v[0], v[2]);
    this._arrange(0, true); // dice leave from the hand, even on a very quick grab-and-flick
    releaseBodies(this.dice, this.hand, v);
    this.state = "rolling"; this.t = 0; this.lastPower = s;
    this.opts.onThrow && this.opts.onThrow(s, powerZone(s));
  }
  _bindPointer(){
    const cv = this.cv; this.hist = [];
    cv.addEventListener("pointerdown", e => { if (this.state !== "ready" || !this.gl) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      this.state = "holding"; this.hist = []; this.vPrev = null; this.shakeE = 0.25; this._hold(e); this.opts.onGrab && this.opts.onGrab(); });
    cv.addEventListener("pointermove", e => { if (this.state === "holding") this._hold(e); });
    const up = e => { if (this.state !== "holding") return;
      // use the input events' own timestamps so a busy frame can't flatten the flick
      const now = e.timeStamp || performance.now(), h = this.hist, last = h[h.length-1];
      // flick velocity = motion over the final ~60–160 ms of movement; fades if the player paused before letting go
      let hv = [0,0,0];
      if (last && h.length > 1){ let ref = h[0]; for (let k = h.length-2; k >= 0; k--){ if (last.t - h[k].t > 160) break; ref = h[k]; if (last.t - h[k].t >= 60) break; }
        const dt = Math.max(0.016, (last.t - ref.t)/1000); hv = [(last.p[0]-ref.p[0])/dt, 0, (last.p[2]-ref.p[2])/dt];
        const gap = (now - last.t)/1000; if (gap > 0.06) hv = V3.mul(hv, Math.exp(-(gap - 0.06)/0.1)); }
      const v = V3.mul(hv, POWER.gain), s = Math.hypot(v[0], v[2]);
      // let go gently over the table: put the dice back instead of dropping them outside the bowl
      if (s < 2.5 && octR(this.hand[0], this.hand[2])[0] > BOWL.R){ this.state = "ready"; this.opts.onCancel && this.opts.onCancel(); return; }
      this._release(v); };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  }
  _hold(e){
    const now = e.timeStamp || performance.now(), p = this._pointOnPlane(e.clientX, e.clientY, BOWL.HOLD_Y);
    const prev = this.hist[this.hist.length-1];
    if (prev){ const dt = Math.max(0.008, (now - prev.t)/1000), v = [(p[0]-prev.p[0])/dt, 0, (p[2]-prev.p[2])/dt];
      if (this.vPrev){ const acc = V3.len(V3.sub(v, this.vPrev)); this.shakeE = Math.min(1.4, this.shakeE + acc*0.0011); }
      this.vPrev = v; const s = V3.len(v)*POWER.gain; this.liveSpeed = this.liveSpeed == null ? s : this.liveSpeed*0.5 + s*0.5;
      this.opts.onPower && this.opts.onPower(this.liveSpeed, powerZone(this.liveSpeed), octR(p[0], p[2])[0] < BOWL.R); }
    this.hand = p; this.hist.push({p, t:now}); if (this.hist.length > 16) this.hist.shift();
  }
  setMark(i, m){ const b = this.dice[i]; if (b) b.mark = m; }
  /* ----- online: stream this tray's pose, or replay someone else's ----- */
  pose(){ const r = v => Math.round(v*100)/100, rq = v => Math.round(v*1000)/1000;
    return {st:this.state, h:this.hand.map(r), d:this.dice.map(b => b.pos ? [r(b.pos[0]), r(b.pos[1]), r(b.pos[2]), rq(b.q[0]), rq(b.q[1]), rq(b.q[2]), rq(b.q[3]), b.out ? 1 : 0] : 0)}; }
  puppet(specs){
    this.dice = specs.map((sp, i) => { const b = makeBody(sp.sides); b.scheme = sp.scheme || "bone"; b.i = i; b.pos = null; return b; });
    this.state = "puppet"; this.pst = "ready"; this.phand = [BOWL.OUT + 2.3, BOWL.HOLD_Y - 1.6, 3.4]; this.hand = this.phand.slice(); this.lastOut = []; this._resolve = null; this._start(); }
  setPose(p, snap){
    if (this.state !== "puppet" || !p || !Array.isArray(p.d)) return;
    this.pst = p.st; if (Array.isArray(p.h) && p.h.length === 3) this.phand = p.h.map(Number);
    const tn = performance.now();
    p.d.forEach((d, i) => { const b = this.dice[i]; if (!b || !Array.isArray(d) || d.length < 7) return;
      const tp = d.slice(0, 3).map(Number), tq = d.slice(3, 7).map(Number); if (![...tp, ...tq].every(Number.isFinite)) return;
      if (b.tp && b.tt){ const dt = Math.max(0.03, (tn - b.tt)/1000), sp = V3.len(V3.sub(tp, b.tp))/dt;
        if (p.st === "rolling" && b.psp > 4 && sp < b.psp*0.45) this.opts.onImpact && this.opts.onImpact(Math.min(1, b.psp/14)); b.psp = sp; }
      b.tp = tp; b.tq = Q.norm(tq); b.tt = tn; b.out = !!d[7]; if (b.out) b.outPos = tp;
      if (!b.pos || snap){ b.pos = tp.slice(); b.q = b.tq.slice(); } });
    this.lastOut = this.dice.map(b => !!b.out);
    if (snap) this._draw(); }
  snapPuppet(){ this.dice.forEach(b => { if (b.tp){ b.pos = b.tp.slice(); b.q = b.tq.slice(); } }); }
  _finish(){
    this.state = "done"; this.lastOut = this.dice.map(b => b.out);
    const res = this.dice.map(b => b.out ? null : readBody(b).value);
    const r = this._resolve; this._resolve = null; r && r(res);
  }
  _fallback(){
    this.state = "rolling"; setTimeout(() => { this.dice.forEach(b => { b.fv = 1 + Math.floor(Math.random()*b.s.sides); }); this.state = "done"; this.lastOut = this.dice.map(() => false);
      const r = this._resolve; this._resolve = null; r && r(this.dice.map(b => b.fv)); this._draw(); }, 650);
  }
  /* ----- loop ----- */
  _start(){ if (this.running) return; this.running = true; this.last = performance.now(); requestAnimationFrame(this._loop); }
  stop(){ this.running = false; }
  _loop(now){
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last)/1000); this.last = now; this.t += dt;
    if (this.state === "ready" || this.state === "holding"){
      this.shakeE *= Math.exp(-dt*(this.state === "holding" ? 2.2 : 6));
      if (this.state === "ready"){ this.hand = V3.add(this.hand, V3.mul(V3.sub([BOWL.OUT + 2.3, BOWL.HOLD_Y - 1.6, 3.4], this.hand), Math.min(1, dt*5))); this.liveSpeed = 0; }
      else { const last = this.hist[this.hist.length-1]; if (last && now - last.t > 60){ this.liveSpeed = (this.liveSpeed||0)*Math.exp(-dt*10); this.opts.onPower && this.opts.onPower(this.liveSpeed, powerZone(this.liveSpeed), octR(this.hand[0], this.hand[2])[0] < BOWL.R); } }
      this._arrange(dt);
      for (const b of this.dice) integrateQ(b, b.w, dt);
      if (this.state === "holding"){ this.rattle = (this.rattle || 0) - dt; if (this.shakeE > 0.06 && this.rattle < 0){ this.rattle = 0.17 - 0.12*Math.min(1, this.shakeE); this.opts.onShake && this.opts.onShake(Math.min(1, this.shakeE)); } }
    }
    if (this.state === "puppet"){
      const k = 1 - Math.exp(-dt*16); this.hand = V3.add(this.hand, V3.mul(V3.sub(this.phand, this.hand), k));
      for (const b of this.dice){ if (!b.tp || !b.pos) continue; b.pos = V3.add(b.pos, V3.mul(V3.sub(b.tp, b.pos), k));
        const q = b.tq, sg = q[0]*b.q[0] + q[1]*b.q[1] + q[2]*b.q[2] + q[3]*b.q[3] < 0 ? -1 : 1;
        b.q = Q.norm(b.q.map((v, j) => v + (sg*q[j] - v)*k)); }
    }
    if (this.state === "rolling" && this.gl){
      this.acc += dt; let lastImp = 0;
      while (this.acc >= PHYS.dt){
        stepBodies(this.dice, PHYS.dt, s => { if (now - lastImp > 30){ lastImp = now; this.opts.onImpact && this.opts.onImpact(s); } }, b => this.opts.onOut && this.opts.onOut(b.i, this.project(b.outPos)));
        this.acc -= PHYS.dt; this.rt = (this.rt||0) + PHYS.dt; }
      if (this.dice.every(b => b.rest > 0.35)){ if (this.nudges < 4 && nudgeCocked(this.dice)) this.nudges++; else { this.rt = 0; this._finish(); } }
      else if (this.rt > 5 && this.rt - (this._lastPoke||0) > 1.5){ this._lastPoke = this.rt; this.dice.forEach(b => { if (b.rest < 0.35 && !b.out){ b.vel = V3.add(b.vel,[0,4,0]); b.w = V3.add(b.w,[3,-3,3]); } }); }
      if (this.rt > 9){ this.rt = 0; this._finish(); }
    }
    this._draw(now);
    requestAnimationFrame(this._loop);
  }
  _draw(now = performance.now()){
    const gl = this.gl, cv = this.cv;
    if (!gl){ const c = cv.getContext("2d"); if (!c) return; c.fillStyle = "#121a29"; c.fillRect(0,0,cv.width,cv.height);
      this.dice.forEach((b,i) => ctxText(c, this.state === "done" ? String(b.fv) : "?", (i+1)*cv.width/(this.dice.length+1), cv.height/2, 4, "#ffd678")); return; }
    if (!this.VP) return;
    gl.clearColor(0.03,0.035,0.06,1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const u = this.u;
    gl.uniformMatrix4fv(u.uVP, false, this.VP); gl.uniform3fv(u.uL, this.L); gl.uniform3fv(u.uLdir, this.Ldir); gl.uniform1f(u.uSpread, 0.07);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.palTex); gl.uniform1i(u.uPal, 1);
    gl.activeTexture(gl.TEXTURE0); gl.uniform1i(u.uTex, 0);
    const bind = m => { gl.bindBuffer(gl.ARRAY_BUFFER, m.b);
      gl.enableVertexAttribArray(this.a.pos); gl.vertexAttribPointer(this.a.pos, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(this.a.nrm); gl.vertexAttribPointer(this.a.nrm, 3, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(this.a.uv); gl.vertexAttribPointer(this.a.uv, 2, gl.FLOAT, false, 32, 24); };
    const I = M4.fromQT([0,0,0,1],[0,0,0]);
    const set = (mode, M, o={}) => { gl.uniform1i(u.uMode, mode); gl.uniformMatrix4fv(u.uM, false, M); gl.uniform1f(u.uGrow, o.grow || 1); gl.uniform1f(u.uShadow, o.shadow ? 1 : 0); gl.uniform1f(u.uShadowY, o.sy || 0);
      gl.uniform3fv(u.uTint, o.tint || [1,1,1]); gl.uniform1f(u.uEmis, o.emis || 0); gl.uniform3fv(u.uColor, o.color || [0,0,0]); };
    gl.disable(gl.CULL_FACE);
    bind(this.table); gl.bindTexture(gl.TEXTURE_2D, this.table.tex); set(0, I); gl.drawArrays(gl.TRIANGLES, 0, this.table.n);
    bind(this.bowl); gl.bindTexture(gl.TEXTURE_2D, this.bowlTex); set(0, I, {emis:0.06}); gl.drawArrays(gl.TRIANGLES, 0, this.bowl.n);
    bind(this.lip); set(0, I, {emis:0.14}); gl.drawArrays(gl.TRIANGLES, 0, this.lip.n);
    bind(this.wax); gl.bindTexture(gl.TEXTURE_2D, this.wax.tex); set(0, I); gl.drawArrays(gl.TRIANGLES, 0, this.wax.n);
    const fl = []; this.candleSpots.forEach(([x,z,h], k) => fl.push(...this.flameBox(x, z, h, 0.5 + 0.5*Math.sin(now/90 + k*1.7))));
    const flm = this._buf(fl); bind(flm); gl.bindTexture(gl.TEXTURE_2D, this.flameTex); set(0, I, {emis:1.3}); gl.drawArrays(gl.TRIANGLES, 0, flm.n); gl.deleteBuffer(flm.b);
    // drop marker under the hand: gold over the bowl, red over the table
    const hs = this.state === "puppet" ? this.pst : this.state;
    if (hs === "ready" || hs === "holding"){
      const hx = this.hand[0], hz = this.hand[2], S = surfaceAt(hx, hz), inB = S.r < BOWL.R, rr = 1.25 + 0.1*Math.sin(now/160), y = S.h + 0.06, ring = [];
      for (let k=0;k<8;k++){ const a0 = (k+0.5)*Math.PI/4, a1 = (k+1.5)*Math.PI/4, R0 = rr, R1 = rr*0.78;
        const p = (a, r) => [hx + Math.cos(a)*r, y + (inB ? surfaceAt(hx + Math.cos(a)*r, hz + Math.sin(a)*r).h - S.h : 0), hz + Math.sin(a)*r];
        for (const q of [p(a0,R0), p(a1,R0), p(a1,R1), p(a0,R0), p(a1,R1), p(a0,R1)]) ring.push(q[0], q[1], q[2], 0,1,0, 0,0); }
      const rb = this._buf(ring); bind(rb); gl.depthMask(false); set(2, I, {color: inB ? [0.98,0.73,0.33] : [0.88,0.29,0.24]}); gl.drawArrays(gl.TRIANGLES, 0, rb.n); gl.depthMask(true); gl.deleteBuffer(rb.b);
      this.overBowl = inB;
    }
    // dice: shadows (dithered, cast onto the bowl surface under each die), outline, body
    const meshes = this.dice.map(b => this._dieMesh(b.s.sides, b.scheme));
    gl.depthMask(false);
    this.dice.forEach((b,i) => { if (!b.pos || b.frozen && b.out) return; const m = meshes[i]; bind(m); const S = surfaceAt(b.pos[0], b.pos[2]);
      set(2, M4.fromQT(b.q, b.pos), {shadow:1, sy:S.h, color:[0.027,0.035,0.06]}); gl.drawArrays(gl.TRIANGLES, 0, m.n); });
    gl.depthMask(true); gl.enable(gl.CULL_FACE);
    this.dice.forEach((b,i) => { if (!b.pos) return;
      const m = meshes[i], M = M4.fromQT(b.q, b.pos); bind(m);
      gl.cullFace(gl.FRONT); set(1, M, {grow:1.09, color:b.mark === "crit" ? [1,0.84,0.47] : [0.027,0.035,0.06]}); gl.drawArrays(gl.TRIANGLES, 0, m.n);
      gl.cullFace(gl.BACK); gl.bindTexture(gl.TEXTURE_2D, m.tex);
      const pulse = 0.5 + 0.5*Math.sin(now/140);
      set(0, M, {tint:b.mark === "drop" || b.out ? [0.45,0.5,0.6] : [1,1,1], emis:b.mark === "crit" ? 0.25 + 0.35*pulse : b.mark === "keep" ? 0.12 : 0}); gl.drawArrays(gl.TRIANGLES, 0, m.n);
    });
    gl.disable(gl.CULL_FACE);
  }
}
