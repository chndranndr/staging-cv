(() => {
'use strict';
const D = JSON.parse(document.getElementById('cv-data').textContent);
const $ = s => document.querySelector(s);
const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - Math.pow(1 - clamp(t), 3);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ym = s => { const [y, m] = s.split('-'); return MON[+m - 1] + ' ' + y; };
const mIdx = s => { const [y, m] = s.split('-').map(Number); return y * 12 + m - 1; };
const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
let reduce = RMQ.matches || /[?&]still\b/.test(location.search);
RMQ.addEventListener('change', e => { reduce = e.matches; });

const roles = [...D.experience].reverse();
const AX0 = mIdx('2017-02'), AXN = mIdx('2026-07') - AX0 + 1;
const roleIdx = id => roles.findIndex(r => r.id === id);
const MAIL = $('#book').getAttribute('href');
const live = $('#live');
const say = t => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); };

/* ---------- layout: where each role's bullets hang ---------- */
// Role i lives in scene i + OFF (scene 0 is the workshop). Every bullet is a 320-wide sign on a 380 pitch, so a scene is as long as its role has bullets.
const OFF = 1, SPACE = 380, SIGN = 320;
const BX = roles.map((r, i) => Array.from({ length: r.bullets.length }, (_, j) => [900, 900, 640, 620, 620, 700, 720][i] + j * SPACE));
const lastEnd = i => BX[i][BX[i].length - 1] + SIGN;
const WSK = 640;                               // the workshop's skill signs start here, 300 apart
const MX = lastEnd(3) + 120;                   // the wall map, at the far end of the map room
const towerX = lastEnd(4) + 300;               // the control tower at the end of the airfield
const cats = [...new Set(D.projects.map(p => p.category))];
const CRX0 = 1960;                             // the craft hang over the club's crowd, right of the public screen, in two altitudes
const CR = []; { let x = CRX0; D.projects.forEach((p, j) => { const L = p.featured ? 215 : 150; CR.push({ p, x, L, cat: cats.indexOf(p.category), j, dy: j % 2 ? -228 : -378 }); x += Math.round(L * .62 + 50); }); }
const craftEnd = CR[CR.length - 1].x + CR[CR.length - 1].L;
const HX = lastEnd(6) + 200;                   // the house at the end of the road

/* ---------- the ten scenes ---------- */
const G = 670;
const SC = [
  { id: 'specs', place: 'The Workshop', w: WSK + (Object.keys(D.skills).length - 1) * 300 + 236 + 360, to: 'the lawn', narr: 'Before the lawn there was a bench. Everything ANI can do was labelled here first.' },
  { id: 'boot', place: 'The Lawn', w: lastEnd(0) + 360, to: 'the hallway', narr: 'ANI has always lived in the tidy town. Tonight there is something in the grass.' },
  { id: 'key', place: 'The Hallway', w: lastEnd(1) + 360, to: 'the alley', narr: 'The key fits. The corridor is long, and nobody said it would hum.' },
  { id: 'signs', place: 'The Alley', w: lastEnd(2) + 360, to: 'the map room', narr: 'The walls out here have names on them. ANI reads every one.' },
  { id: 'map', place: 'The Map Room', w: MX + 760, to: 'the airfield', narr: 'There is a map on the wall. ANI has never seen the town from above.' },
  { id: 'cargo', place: 'The Airfield', w: towerX + 90 + 380, to: 'the vault', narr: 'Lights sweep an empty field. The craft have gone, and the tower is still lit.' },
  { id: 'vault', place: 'The Vault', w: lastEnd(5) + 360, to: 'the road', narr: 'Past the airfield the drawers hum in rows. Everything in here has to arrive intact.' },
  { id: 'drive', place: 'The Road', w: HX + 420, to: 'the club', narr: 'The lights behind get smaller. ANI watches the signs go by until its eyes close.' },
  { id: 'crowd', place: 'The Club', w: craftEnd + 420, to: 'what comes next', narr: 'Another planet, and the music is still going. Nine small craft hang over the crowd, and the crowd is cheering them.' },
  { id: 'untitled', place: 'Not written yet', w: 2300, to: '', narr: 'Morning. Nobody has drawn this part.' }
];
const WORK = 0, LAWN = 1, HALL = 2, ALLEY = 3, MAPR = 4, AIR = 5, VAULT = 6, ROAD = 7, CLUB = 8, LAST = SC.length - 1, DOORS = LAST;
let TOTAL = 0; SC.forEach(sc => { sc.x0 = TOTAL; TOTAL += sc.w; });
const doorX = i => SC[i + 1].x0;
const trackNo = i => String(i + 1).padStart(2, '0');

/* ---------- state ---------- */
const cam = { x: 0, cx: 720 };
const ani = { x: 330, dir: 1, ph: 0, blink: 0, nextBlink: 2, nod: 0, wave: 0, dance: 0, target: null, fast: false, moving: false };
const keys = { l: false, r: false };
let hold = 0, mouseWX = 0, mouseIn = false;
let cur = -1, hasKey = false, camClicks = 0, camAwake = false, revealed = false, castSeen = false, sync = 0;
const approved = Array(DOORS).fill(false), doorOpen = Array(DOORS).fill(0);
let askDoor = -1, declined = -1, cardProject = null, lit = null, hintGone = false;
let T = 0, intro = 0, introAt = null;
const E = [0, 0, 0, 0];
const flags = { triOnly: false, alarm: false };

/* ---------- world DOM ---------- */
const world = $('#world'), els = [], stops = [];
function put(el, sc, lx, y, kind, w = 0, h = 0) { world.appendChild(el); const o = { el, sc, x: SC[sc].x0 + lx, y, kind, w, h }; els.push(o); return o; }
function sign(sc, lx, y, head, text, cls) {
  const b = mk('button', 'sign' + (cls ? ' ' + cls : ''), `<b>${esc(head)}</b>${esc(text)}`); b.type = 'button';
  const o = put(b, sc, lx, y, 'sign'); o.head = head; o.text = text; o.mid = cls === 'skill' ? 118 : 160;
  b.addEventListener('click', () => walkTo(o.x + o.mid, true));
  b.addEventListener('focus', () => walkTo(o.x + o.mid, true));
  stops.push(o.x + o.mid); return o;
}
function hot(sc, lx, y, w, h, label, aria, cls, tag = 'button') {
  const b = mk(tag, 'hot' + (cls ? ' ' + cls : ''), label ? `<span>${label}</span>` : ''); if (tag === 'button') b.type = 'button';
  if (aria) b.setAttribute('aria-label', aria);
  return put(b, sc, lx, y, 'hot', w, h);
}
roles.forEach((r, i) => {
  const si = i + OFF, m = D.headlineMetrics.filter(x => x.source === r.id);
  const t = mk('div', 'title', `<p class="no">track ${trackNo(si)} · ${esc(SC[si].place)}</p><h2>${SC[si].id}</h2><p class="co">${esc(r.company)}</p><p>${esc(r.context)} · ${esc(r.title)}</p><p>${ym(r.start)} – ${ym(r.end)}</p>` +
    (m.length ? `<p class="res">Measured here: ${m.map(x => esc(x.value + ' ' + x.label)).join('; ')}.</p>` : ''));
  const o = put(t, si, 120, 118, 'title'); o.head = `Track ${trackNo(si)} · ${SC[si].id} · ${r.company}`; o.text = `${r.title} · ${r.context} · ${ym(r.start)} – ${ym(r.end)}` + (m.length ? ` · Measured here: ${m.map(x => x.value + ' ' + x.label).join('; ')}.` : ''); o.mid = 200;
  r.bullets.forEach((b, j) => sign(si, BX[i][j], i === 6 ? 150 : 232, `${r.company} · sign ${j + 1} of ${r.bullets.length}`, b));
  put(mk('div', 'stencil', esc(r.stack.join('  ·  '))), si, 560, G + 20, 'stencil');
  stops.push(SC[si].x0 + 330);
});
// the workshop: the technical skills, one sign per group
{
  const t = mk('div', 'title', `<p class="no">track ${trackNo(WORK)} · ${esc(SC[WORK].place)}</p><h2>${SC[WORK].id}</h2><p class="co">Technical Skills</p><p>Seven toolkits, labelled on the wall</p>`);
  const o = put(t, WORK, 120, 118, 'title'); o.head = `Track ${trackNo(WORK)} · ${SC[WORK].id} · Technical Skills`; o.text = Object.keys(D.skills).join(', ') + '.'; o.mid = 200;
  Object.entries(D.skills).forEach(([kk, v], j) => sign(WORK, WSK + j * 300, j % 2 ? 268 : 226, kk, v.join(' · '), 'skill'));
  stops.push(SC[WORK].x0 + 330);
}
// the lawn
const camBtn = hot(LAWN, 566, 380, 80, 50, '', 'Surveillance camera, dark for the night');
const keyTag = put(mk('span', 'tag', 'API_KEY'), LAWN, 1336, G - 46, 'tag');
// the map room
const mapHot = hot(MAPR, MX, 200, 360, 270, '', 'The map on the wall');
// the airfield keeps its control tower (the GitHub profile)
{ const o = hot(AIR, towerX - 20, G - 350, 90, 350, 'Control tower · GitHub profile', '', 'link', 'a'); o.el.href = D.githubProfile; stops.push(o.x + 40); }
// the club: its own place, after the road, with no role of its own. The departures board hangs by the gate; the craft hover over the crowd.
const screenHot = hot(CLUB, 1500, 170, 380, 230, 'Public screen · the broadcast', 'Public screen: play the broadcast');
const av = D.placeholder.availability;
sign(CLUB, 880, 300, 'Departures', `Next departure: ${av.nextStart}. ${av.status}, ${av.capacity}. ${av.responseTime}. ${av.timezone}.`, 'board');
CR.forEach(c => {
  const o = hot(CLUB, c.x, G - 82 + c.dy, c.L, 78, esc(c.p.name) + (c.p.featured ? `<i>${esc(c.p.tagline)}</i>` : ''), `${c.p.name}: ${c.p.tagline}`, 'craft' + (c.p.featured ? ' feat' : ''));
  if (!c.p.featured && c.j % 2) o.el.firstChild.style.paddingBottom = '24px';
  o.el.addEventListener('click', () => openProject(c, o.el)); c.o = o; o.mid = c.L / 2; o.head = `${c.p.name} · ${c.p.category}`; o.text = `${c.p.tagline}. Select the craft to open it.`; stops.push(o.x + c.L / 2);
});
// untitled
D.placeholder.process.forEach((p, j) => put(mk('div', 'frame-cap', `<b>frame ${p.step} · ${esc(p.name)}</b>${esc(p.detail.replace('scope, milestones and a fixed quote', 'scope and milestones'))}`), LAST, 260 + j * 330, 446, 'cap'));
{
  const e = mk('div', 'ending', `<h2>What happens next is yours to decide.</h2><p>${esc(D.relocation)}. ${esc(D.languages.map(l => l.language + ' (' + l.level + ')').join(', '))}.</p><p>${esc(D.workAuthorization)}</p>` +
    `<div class="acts"><button type="button" class="lit-btn" data-copy>Copy email</button><a class="lit-btn" href="${esc(MAIL)}">${esc(D.offer.cta.label)}</a></div><p>${esc(D.offer.cta.note)}</p><p><a href="${esc(D.contact.linkedin)}">LinkedIn</a> · <a href="${esc(D.contact.github)}">GitHub</a></p>`);
  const o = put(e, LAST, 1640, 190, 'ending'); o.head = 'What happens next is yours to decide.'; o.text = D.relocation + '. ' + D.offer.cta.note; o.mid = 200; stops.push(o.x + 100); stops.push(SC[LAST].x0 + 330);
}
for (let i = 0; i < DOORS; i++) { stops.push(doorX(i) - 98); stops.push(doorX(i) + 34); }
stops.sort((a, b) => a - b);

/* ---------- seeded scenery ---------- */
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const S = {};
{
  let r = rng(11);
  S.stars0 = Array.from({ length: 58 }, () => [r() * (SC[LAWN].w - 250), 30 + r() * 300]);
  const rx = SC[LAWN].w + 160; S.ridge = [0, G]; for (let x = 0; x <= rx; x += 140) S.ridge.push(x, G - 90 - r() * 130); S.ridge.push(rx, G);
  S.houses = [[330, 150, 150, 70], [640, 190, 190, 90], [1010, 140, 130, 64], [1250, 210, 170, 96], [1560, 150, 140, 70], [1830, 170, 150, 72], [2060, 190, 180, 88]];
  S.trees = [270, 560, 900, 1190, 1480, 1730, 1990, 2180].map(x => [x, 70 + r() * 60]);
  S.grass = Array.from({ length: 110 }, () => [r() * (SC[LAWN].w - 250), 4 + r() * 9]);
  r = rng(22); S.cables1 = Array.from({ length: 18 }, () => { const x = 100 + r() * (SC[HALL].w - 500); return [x, x + 120 + r() * 260, 60 + r() * 180]; });
  S.boxes1 = [420, 1280, 1560, 2120, 2520, 2840];
  r = rng(33); S.streaks = Array.from({ length: 100 }, () => [r() * SC[ALLEY].w, r() * 380, 40 + r() * 200]);
  S.mach = []; for (let x = 420; x < SC[ALLEY].w - 200; x += 330 + r() * 260) S.mach.push([x, 90 + r() * 110, 70 + r() * 80, r()]);
  S.snakes = Array.from({ length: 24 }, () => [r() * SC[ALLEY].w, 90 + r() * 240, (r() - .5) * 120]);
  r = rng(44); S.racks = [1900, 2480]; S.crates = Array.from({ length: 9 }, (_, j) => [470 + j * 150 + r() * 40, 40 + r() * 50, 50 + r() * 60]);
  r = rng(55); S.stars = Array.from({ length: 150 }, () => [r(), r() * 520, 1 + r() * 4, r() * 6]);
  S.towers = [700, 1500, 2300, 3100, 3800, 4600].map(x => [x, 260 + r() * 200]);
  r = rng(66); S.bld = []; for (let x = -200; x < SC[CLUB].w + 350; x += 110 + r() * 150) S.bld.push([x, 90 + r() * 110, 120 + r() * 330, r()]);
  S.crowd = []; for (let x = 1420; x < SC[CLUB].w - 300; x += 34 + r() * 26) S.crowd.push([x, 78 + r() * 34, r() * 6.3, r() < .4 ? 1 : 0, r()]);
  r = rng(77); S.bld2 = []; for (let x = -200; x < SC[ROAD].w + 200; x += 90 + r() * 120) S.bld2.push([x, 70 + r() * 100, 60 + r() * 260, r()]);
  S.neon = [[420, 0], [960, 1], [1420, 2], [1880, 0], [2260, 1]]; for (let x = 2700, j = 2; x < HX - 200; x += 440, j++) S.neon.push([x, j % 3]);
}
const smoke = [];

/* ---------- drawing ---------- */
const cv = $('#world-canvas'), mainCtx = cv.getContext('2d');
let g = mainCtx, ds = 1, Wpx = 0, Hpx = 0, s = 1, dpr = 1, VW = 1440, compact = false, kS = 1;
const C = { night: '#05070F', near: '#1B2440', far: '#0E1428', ice: '#BFE3FF', rust: '#C2562E', mag: '#FF3FA4', mint: '#5CFFD1', dark: '#0B1022' };
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
const lw = u => Math.max(u, 1.1 / ds);
function P_(p, close) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); if (close) g.closePath(); }
function line(p, col = C.ice, a = 1, w = 1.5, close = false) { P_(p, close); g.strokeStyle = col; g.lineJoin = 'round'; g.globalAlpha = a * .13; g.lineWidth = lw(w * 4.5); g.stroke(); g.globalAlpha = a; g.lineWidth = lw(w); g.stroke(); g.globalAlpha = 1; }
function thin(p, col = C.ice, a = 1, w = 1.1, close = false) { P_(p, close); g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = lw(w); g.stroke(); g.globalAlpha = 1; }
function poly(p, fill, a = 1) { P_(p, true); g.globalAlpha = a; g.fillStyle = fill; g.fill(); g.globalAlpha = 1; }
function box(x, y, w, h, fill, col, a = 1) { if (fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); } if (col) thin([x, y, x + w, y, x + w, y + h, x, y + h], col, a, 1.2, true); }
function circ(x, y, r, col, a = 1, fill) { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, 6.3); g.globalAlpha = a; if (fill) { g.fillStyle = fill; g.fill(); } if (col) { g.strokeStyle = col; g.lineWidth = lw(1.3); g.stroke(); } g.globalAlpha = 1; }
function halo(x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
function cone(x, y, ht, hb, h, col, a, dx = 0) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; P_([x - ht, y, x + ht, y, x + dx + hb, y + h, x + dx - hb, y + h], true); g.fill(); }
function vgrad(y0, y1, c0, c1, x, w) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x, y0, w, y1 - y0); }
function lamp(x, y, a = 1) { box(x - 16, y - 7, 32, 7, C.ice); cone(x, y, 12, 170, G - y, C.ice, .15 * a); halo(x, G + 4, 150, C.ice, .07 * a); halo(x, y + 4, 34, C.ice, .5 * a); }
function floor(w, tint) { vgrad(G, 900, '#0D1428', '#04060C', 0, w); if (tint) { vgrad(G, 900, rgba(tint, .10), rgba(tint, 0), 0, w); } thin([0, G, w, G], C.ice, .6, 1.4); }
function posts(lx, wU, top) { thin([lx + 18, top, lx + 18, G], C.ice, .3); thin([lx + wU - 18, top, lx + wU - 18, G], C.ice, .3); }
const fx = (sc, lx, p) => lx + (1 - p) * (cam.x + cam.cx - sc.x0 - lx);
const signW = () => 320 * kS / s;

const P = [];
// 1 · specs · The Workshop (technical skills): the bench where ANI was assembled
P[WORK] = sc => {
  const w = sc.w;
  vgrad(0, G, '#0C1226', '#18213F', 0, w);
  for (let x = 0; x < w; x += 190) thin([x, 0, x, G], C.ice, .07 + .05 * E[0]);
  thin([0, 100, w, 100], C.ice, .25); thin([0, 560, w, 560], C.ice, .12);
  // cables sagging from the ceiling rail, and a monitor now and then whose lines follow the pulse
  for (let x = 260; x < w - 200; x += 330) { g.beginPath(); g.moveTo(x, 100); g.quadraticCurveTo(x + 120, 100 + 80 + (x % 5) * 8, x + 240, 100); g.strokeStyle = C.ice; g.globalAlpha = .32; g.lineWidth = lw(1.3); g.stroke(); g.globalAlpha = 1; }
  for (let x = 560, q = 0; x < w - 300; x += 700, q++) { box(x, 126, 150, 84, '#0A1024', C.ice, .8); for (let r = 0; r < 4; r++) { const len = 30 + ((q * 37 + r * 53) % 80) * (.6 + .4 * (r % 2 ? E[1] : E[2])); thin([x + 14, 144 + r * 16, x + 14 + len, 144 + r * 16], C.ice, .45); } circ(x + 136, 138, 3, null, .3 + .7 * E[1], C.rust); }
  for (let x = 380; x < w; x += 700) lamp(x, 108, .6 + .2 * E[1]);
  // pegboard along the wall, with tool outlines on pegs
  for (let x = 330, j = 0; x < w - 250; x += 150, j++) {
    const y = 410 + (j % 3) * 20, t = j % 4;
    thin([x, y - 16, x, y], C.ice, .5);
    if (t === 0) { circ(x, y + 12, 10, C.ice, .7); thin([x, y + 22, x, y + 76], C.ice, .7, 2); }
    else if (t === 1) { thin([x, y, x, y + 62], C.ice, .8, 2.4); box(x - 6, y + 62, 12, 18, null, C.ice, .7); }
    else if (t === 2) thin([x - 22, y + 10, x + 22, y + 10, x + 22, y + 60], C.ice, .7, 1.4, true);
    else { thin([x - 12, y, x - 12, y + 70, x + 12, y + 70], C.ice, .7, 1.8); thin([x - 12, y + 20, x + 12, y + 20], C.ice, .5); }
  }
  // benches with a test rig each
  for (let x = 300, q = 0; x < w - 700; x += 900, q++) {
    box(x, G - 96, 380, 96, '#0C1226', C.ice, .7); thin([x - 10, G - 96, x + 390, G - 96], C.ice, .8, 1.6);
    for (let d = 0; d < 3; d++) thin([x + 20 + d * 120, G - 78, x + 110 + d * 120, G - 78, x + 110 + d * 120, G - 12, x + 20 + d * 120, G - 12], C.ice, .3, 1, true);
    box(x + 40, G - 150, 110, 54, '#0A1024', C.ice, .8); circ(x + 60, G - 124, 4, null, .3 + .7 * (q % 2 ? E[1] : E[2]), C.rust); circ(x + 80, G - 124, 4, null, .3 + .7 * E[1], C.ice); thin([x + 100, G - 124, x + 136, G - 124], C.ice, .5);
    thin([x + 150, G - 120, x + 230, G - 120, x + 250, G - 96], C.ice, .6);
  }
  // an empty raincoat on a hook by the door: ANI's, before ANI
  const hx = w - 330; thin([hx, 330, hx, 366], C.ice, .6); circ(hx, 392, 22, C.ice, .45, '#0A1024'); poly([hx - 26, 408, hx - 52, 560, hx + 52, 560, hx + 26, 408], '#0E1634'); line([hx - 26, 408, hx - 52, 560, hx + 52, 560, hx + 26, 408], C.ice, .7, 1.4, true); thin([hx, 414, hx, 556], C.ice, .25);
  floor(w, C.rust); for (let x = 220; x < w; x += 190) thin([x, G + 54, x + 80, G + 54], C.ice, .14, 2);
};
// 2 · boot · The Lawn
P[LAWN] = sc => {
  const w = sc.w;
  vgrad(0, G, '#0A1026', '#18245A', 0, w);
  for (let x = 0; x < w; x += 260) thin([x, 0, x, G], C.ice, .09);
  thin([0, 340, w, 340], C.ice, .06);
  S.stars0.forEach(([x, y]) => { thin([x - 5, y, x + 5, y], C.ice, .55); thin([x, y - 5, x, y + 5], C.ice, .55); });
  halo(1090, 150, 200, C.ice, .14); circ(1090, 150, 58, C.ice, .9, '#22306A'); circ(1072, 136, 10, C.ice, .25); circ(1108, 170, 6, C.ice, .25);
  thin([1054, 104, 1010, 0], C.ice, .35); thin([1126, 104, 1170, 0], C.ice, .35);
  [[500, 330, 190], [640, 120, 150], [1380, 230, 210], [1660, 110, 140], [2000, 260, 190]].forEach(([cx, cy, cw], j) => { const x = cx + (reduce ? 0 : Math.sin(T * .35 + j * 1.7) * 5), a = clamp(intro * 5 - j * .6); if (!a) return;
    thin([x + cw * .25, cy - 26, x + cw * .25, 0], C.ice, .3 * a); thin([x + cw * .75, cy - 24, x + cw * .75, 0], C.ice, .3 * a);
    const cl = [x, cy, x + cw * .12, cy - 18, x + cw * .3, cy - 30, x + cw * .5, cy - 20, x + cw * .68, cy - 34, x + cw * .9, cy - 14, x + cw, cy]; poly(cl, '#1C2A66', a); line(cl, C.ice, .8 * a, 1.3, true); thin([x + cw * .3, cy - 30, x + cw * .4, cy], C.ice, .2 * a); thin([x + cw * .68, cy - 34, x + cw * .6, cy], C.ice, .2 * a); });
  for (let j = 0; j < 12; j++) { const x = fx(sc, 80 + j * 230, .75), h = 60 + (j * 37 % 50), bw = 90 + (j * 53 % 40); poly([x, G, x, G - h, x + bw / 2, G - h - 34, x + bw, G - h, x + bw, G], '#111C46'); thin([x, G, x, G - h, x + bw / 2, G - h - 34, x + bw, G - h, x + bw, G], C.ice, .22); box(x + bw * .4, G - h + 14, 12, 14, rgba(C.ice, .22)); }
  const rd = []; for (let i = 0; i < S.ridge.length; i += 2) rd.push(fx(sc, S.ridge[i], .6), S.ridge[i + 1]);
  poly(rd, '#111B42'); thin(rd.slice(2, -2), C.ice, .3);
  S.trees.forEach(([x, h], j) => { const a = clamp(intro * 8 - j * .7); if (!a) return; poly([x - 26, G, x, G - h, x + 26, G], '#0F1A3E', a); line([x - 26, G, x, G - h, x + 26, G], C.ice, .55 * a, 1.2); thin([x, G - h, x - 6, G], C.ice, .2 * a); });
  S.houses.forEach(([x, bw, hh, rh], j) => {
    const a = clamp(intro * 7 - j); if (!a) return;
    poly([x, G, x, G - hh, x + bw, G - hh, x + bw, G], '#111B40', a); poly([x - 14, G - hh, x + bw / 2, G - hh - rh, x + bw + 14, G - hh], '#16224E', a);
    line([x, G, x, G - hh, x + bw, G - hh, x + bw, G], C.ice, a, 1.4); line([x - 14, G - hh, x + bw / 2, G - hh - rh, x + bw + 14, G - hh], C.ice, a, 1.4, true);
    thin([x + bw / 2, G - hh - rh, x + bw * .32, G - hh, x + bw * .32, G], C.ice, .2 * a); thin([x + bw / 2, G - hh - rh, x + bw * .7, G - hh], C.ice, .2 * a);
    box(x + bw * .56, G - hh * .68, bw * .26, hh * .3, rgba(C.ice, (.35 + .45 * E[1]) * a), C.ice, a); halo(x + bw * .69, G - hh * .53, 60, C.ice, .12 * a);
    box(x + bw * .14, G - hh * .52, bw * .2, hh * .52, '#0A1230', C.ice, .8 * a);
  });
  for (let x = 20; x < w - 260; x += 24) thin([x, G, x, G - 30, x + 6, G - 36, x + 12, G - 30, x + 12, G], C.ice, .22 * intro);
  thin([0, G - 20, w - 250, G - 20], C.ice, .2 * intro);
  thin([1130, G, 1130, 420, 1170, 404], C.ice, .7, 1.6); lamp(1170, 410, .8 * intro);
  floor(w); S.grass.forEach(([x, h]) => thin([x, G, x + 3, G - h], C.ice, .3));
  BX[0].forEach(x => posts(x, signW(), 232));
  thin([600, G, 600, 412], C.ice, .8, 2); box(576, 390, 58, 24, C.dark, C.ice); thin([634, 396, 646, 392, 646, 412, 634, 408], C.ice, .9);
  circ(640, 402, 5, null, 1, camAwake ? '#FF5A3C' : '#02030A'); if (camAwake) halo(640, 402, 46, '#FF5A3C', .6);
  if (!hasKey) { const kx = 1350, ky = G - 9; halo(kx + 10, ky, 46, C.ice, .22 + .14 * Math.sin(T * 3)); circ(kx - 6, ky, 6, C.ice); line([kx, ky, kx + 26, ky], C.ice, 1, 1.6); thin([kx + 18, ky, kx + 18, ky + 6]); thin([kx + 24, ky, kx + 24, ky + 5]); thin([kx - 6, ky - 6, kx + 2, ky - 34], C.ice, .5); }
  box(w - 250, 0, 250, G, '#0A0F22'); thin([w - 250, 0, w - 250, G], C.ice, .7, 1.5);
  for (let y = 90; y < G; y += 120) thin([w - 250, y, w, y], C.ice, .14);
};
// 2 · key · The Hallway
P[HALL] = sc => {
  const w = sc.w;
  vgrad(0, G, '#131B36', '#1B2440', 0, w); box(0, 0, w, 128, '#070A14'); thin([0, 128, w, 128], C.ice, .65, 1.4);
  for (let x = 90; x < w; x += 170) { thin([x, 128, x, G], C.ice, .16 + .16 * E[0]); thin([x, 176, x + 30, 128], C.ice, .28); thin([x, 176, x - 30, 128], C.ice, .28); }
  thin([0, 188, w, 188], C.ice, .32); thin([0, 200, w, 200], C.ice, .16);
  [640, 1420, 1720, 2300, 2640, 2900].forEach((x, j) => { const y = 338; halo(x, y, 110, C.ice, .08); circ(x, y, 50, null, 1, '#03040A'); for (let q = 0; q < 14; q++) { const a = q * 2.4 + j, rr = 8 + (q * 17 % 36); circ(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1.2, null, reduce ? .7 : .4 + .5 * Math.abs(Math.sin(T * .8 + q)), C.ice); }
    circ(x, y, 50, C.ice, .9); circ(x, y, 58, C.ice, .35); for (let q = 0; q < 8; q++) circ(x + Math.cos(q * .785) * 54, y + Math.sin(q * .785) * 54, 1.6, null, .6, C.ice); });
  [290, 630, 970, 1700, 2040, 2400].forEach(x => { const hp =[x, G, x, G - 180, x + 16, G - 204, x + 96, G - 204, x + 112, G - 180, x + 112, G]; poly(hp, '#0E1530'); thin(hp, C.ice, .55, 1.3); circ(x + 56, G - 110, 18, C.ice, .6); thin([x + 38, G - 110, x + 74, G - 110], C.ice, .5); thin([x + 56, G - 128, x + 56, G - 92], C.ice, .5); box(x + 38, G - 176, 36, 12, rgba(C.rust, .7)); });
  thin([0, 600, w, 600], C.rust, .85, 4); for (let x = 60; x < w; x += 290) box(x, 592, 18, 16, C.rust);
  S.boxes1.forEach((x, j) => { box(x, 330, 66, 96, C.dark, C.ice, .7); circ(x + 16, 348, 4, null, .3 + .7 * (j % 2 ? E[1] : 1 - E[1]), C.ice); thin([x + 12, 372, x + 54, 372], C.ice, .4); thin([x + 12, 384, x + 54, 384], C.ice, .4); thin([x + 33, 330, x + 33, 270], C.ice, .6); g.beginPath(); g.arc(x + 33, 262, 16, .4, 2.74); g.strokeStyle = C.ice; g.globalAlpha = .6; g.lineWidth = lw(1.2); g.stroke(); g.globalAlpha = 1; });
  S.cables1.forEach(([a, b, sag]) => { g.beginPath(); g.moveTo(a, 128); g.quadraticCurveTo((a + b) / 2, 128 + sag * 2, b, 128); g.strokeStyle = C.ice; g.globalAlpha = .38; g.lineWidth = lw(1.3); g.stroke(); g.globalAlpha = 1; });
  for (let x = 300; x < w - 200; x += 520) lamp(x, 136, .75 + .25 * E[1]);
  for (let x = 170; x < w - 300; x += 340) { box(x, 478, 84, 44, '#0C1226', C.ice, .5); for (let y = 486; y < 520; y += 8) thin([x + 8, y, x + 76, y], C.ice, .3); thin([x + 42, 522, x + 42, 600], C.ice, .2); }
  floor(w); for (let x = 0; x < w; x += 64) thin([x, G, x - 50, 900], C.ice, .07);
  thin([w - 250, G, w - 250, 220, w - 30, 220], C.ice, .35); thin([w - 230, G, w - 230, 240, w - 30, 240], C.ice, .2);
};
// 3 · signs · The Alley
P[ALLEY] = sc => {
  const w = sc.w;
  vgrad(0, G, '#0B1022', '#1B2440', 0, w);
  for (let x = 0; x < w; x += 212) thin([x, 0, x, G], C.ice, .15); thin([0, 96, w, 96], C.ice, .12); thin([0, 520, w, 520], C.ice, .12);
  S.streaks.forEach(([x, y, l]) => thin([x, y, x, y + l], C.rust, .32, 2.2));
  thin([0, 556, w, 556], C.rust, .8, 5); thin([0, 574, w, 574], C.ice, .4, 1.5); for (let x = 130; x < w; x += 420) box(x, 546, 22, 34, C.rust);
  S.snakes.forEach(([x, l, sw]) => { g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + sw, l * .4, x - sw, l * .7, x + sw * .4, l); g.strokeStyle = C.ice; g.globalAlpha = .34; g.lineWidth = lw(1.6); g.stroke(); g.globalAlpha = 1; });
  S.mach.forEach(([x, mw, mh, q]) => {
    box(x, G - mh, mw, mh, '#0A0F20', C.ice, .75); box(x, G - mh, mw, 9, C.rust);
    circ(x + 24, G - mh + 36, 12, C.ice, .8); const an = -2.3 + (q + E[0] * .8) * 2.2; thin([x + 24, G - mh + 36, x + 24 + Math.cos(an) * 10, G - mh + 36 + Math.sin(an) * 10], C.ice, 1);
    for (let y = G - 34; y < G - 8; y += 8) thin([x + 12, y, x + mw - 12, y], C.ice, .3);
    circ(x + mw - 16, G - mh + 26, 3.5, null, .25 + .75 * (q > .5 ? E[1] : E[2]), C.ice);
  });
  smoke.forEach(p => halo(p.x, p.y, p.r * 2.6, C.ice, p.a * .1));
  for (let x = 380; x < w; x += 900) lamp(x, 150, .55 + .3 * Math.sin(T * 1.7 + x) * (reduce ? 0 : 1));
  floor(w, C.rust); for (let x = 500; x < w; x += 700) { g.save(); g.translate(x, G + 46); g.scale(1, .22); halo(0, 0, 170, C.ice, .12); g.restore(); }
};
// 4 · map · The Map Room
P[MAPR] = sc => {
  const w = sc.w;
  vgrad(0, G, '#101830', '#1B2440', 0, w); thin([0, 108, w, 108], C.ice, .5);
  for (let x = 110; x < w; x += 230) { thin([x, 108, x, G], C.ice, .14 + .12 * E[0]); }
  thin([0, 588, w, 588], C.rust, .7, 3);
  S.crates.forEach(([x, cw, ch]) => { const xx = x + 1500 > 2000 ? x + 1960 : x + 1500; });
  [[440, 150, 96], [596, 96, 150], [MX + 420, 130, 110], [MX + 556, 90, 170], [MX + 420, 86, 60]].forEach(([x, cw, ch], j) => { const y = j === 4 ? G - 110 - ch : G - ch; box(x, y, cw, ch, '#0C1226', C.ice, .7); thin([x, y, x + cw, y + ch], C.ice, .16); thin([x + cw, y, x, y + ch], C.ice, .16); });
  for (let x = 620; x < MX - 150; x += 440) lamp(x + 160, 116, .8);
  const mx = MX, my = 200; const near = clamp(1 - Math.abs(ani.x - sc.x0 - (MX + 180)) / 600);
  halo(mx + 180, my + 135, 330, C.ice, .08 + .14 * near); box(mx, my, 360, 270, '#0A1230', C.ice, 1); box(mx - 8, my - 8, 376, 286, null, C.ice, .4);
  roles.forEach((r, i) => { const a = (mIdx(r.start) - AX0) / AXN, b = (mIdx(r.end) - mIdx(r.start) + 1) / AXN; box(mx + 22 + a * 316, my + 104, b * 316 - 3, 62, rgba(C.ice, .08 + .1 * near), C.ice, .9); });
  thin([mx + 22, my + 190, mx + 338, my + 190], C.ice, .4); for (let i = 0; i < 10; i++) thin([mx + 22 + i * 35.1, my + 186, mx + 22 + i * 35.1, my + 196], C.ice, .5);
  thin([mx + 22, my + 40, mx + 150, my + 40], C.ice, .6); thin([mx + 22, my + 54, mx + 110, my + 54], C.ice, .3);
  box(mx + 164, 140, 32, 22, C.dark, C.ice, .8);
  if (revealed || flags.triOnly) { const a = T * 3.2; halo(mx + 180, 152, 120, C.rust, .5 + .2 * Math.sin(a)); circ(mx + 180, 152, 9, null, 1, '#FF6A40'); if (!reduce) { cone(mx + 180, 160, 8, 220 * Math.abs(Math.cos(a)) + 20, 500, C.rust, .22, Math.sin(a) * 320); } }
  else circ(mx + 180, 152, 8, C.ice, .6, '#141C36');
  floor(w);
  thin([0, G + 40, w, G + 40], C.ice, .08);
  const c0 = 430, c1 = MX - 90; thin([c0, G - 62, c1, G - 62], C.ice, .8, 1.5); thin([c0, G - 50, c1, G - 50], C.ice, .5); for (let x = c0 + 40; x < c1; x += 190) thin([x, G - 50, x, G], C.ice, .4);
  for (let x = c0 + 8; x < c1; x += 34) circ(x, G - 56, 4, C.ice, .5);
  for (let j = 0; j < 11; j++) { const px = c0 + ((reduce ? 0 : T * 46) + j * 222) % (c1 - c0 - 60), ph = 30 + (j * 37 % 26), pw = 42 + (j * 53 % 24); box(px, G - 62 - ph, pw, ph, '#0F1834', C.ice, .9); thin([px + pw / 2, G - 62 - ph, px + pw / 2, G - 62], C.rust, .8, 2); }
};
// 5 · cargo · The Airfield
function craft(c) {
  const x = c.x, L = c.L, y = G - 12, sel = cardProject === c, k = L / 150;
  thin([x + L * .2, y + 10, x + L * .78, y + 10], C.ice, .8, 1.6); thin([x + L * .3, y, x + L * .26, y + 10], C.ice, .7); thin([x + L * .68, y, x + L * .72, y + 10], C.ice, .7);
  const f = [x, y - 20 * k, x + L * .16, y - 38 * k, x + L * .6, y - 42 * k, x + L * .88, y - 30 * k, x + L, y - 18 * k, x + L * .86, y - 4, x + L * .1, y - 4];
  poly(f, '#0F1834'); line(f, C.ice, 1, 1.4, true);
  const fin = [x + 6, y - 24 * k, x - 10, y - 74 * k, x + L * .17, y - 38 * k]; poly(fin, '#131E44'); line(fin, C.ice, 1, 1.3, true);
  const can = [x + L * .56, y - 42 * k, x + L * .66, y - 58 * k, x + L * .8, y - 54 * k, x + L * .87, y - 31 * k]; poly(can, sel ? '#0A1A2A' : '#1A2A5E'); thin(can, C.ice, .9);
  box(x + L * .28, y - 22 * k, L * .26, 7 * k, '#0A1024', C.ice, .7);
  for (let j = 0; j <= c.cat; j++) thin([x + L * .22 + j * 7, y - 36 * k, x + L * .2 + j * 7, y - 8], C.ice, .75, 1.6);
  if (c.p.featured) { const b = .35 + .65 * E[1]; circ(x + L, y - 18 * k, 3, null, b, C.ice); halo(x + L, y - 18 * k, 40, C.ice, .35 * b); circ(x - 10, y - 74 * k, 3, null, 1 - b * .6, C.ice); halo(x - 10, y - 74 * k, 30, C.ice, .25); cone(x + L * .5, y + 10, 30, 60, 14, C.ice, .12); }
  if (sel) { const ex = x + L * .71, ey = y - 46 * k; halo(ex, ey, 30, C.mint, .5); g.fillStyle = C.mint; g.beginPath(); g.ellipse(ex - 6, ey, 3, 4.4, 0, 0, 6.3); g.ellipse(ex + 6, ey, 3, 4.4, 0, 0, 6.3); g.fill(); }
}
P[AIR] = sc => {
  const w = sc.w;
  vgrad(0, G, '#05070F', '#0C1434', 0, w);
  S.stars.forEach(([u, y, f, ph]) => { const x = fx(sc, u * w, .15); circ(x, y, 1.3, null, reduce ? .6 : .35 + .5 * Math.abs(Math.sin(T * f * .4 + ph)), C.ice); });
  const pxx = fx(sc, 2700, .3); g.beginPath(); g.arc(pxx, G + 760, 1050, 0, 6.3); g.fillStyle = '#0B1330'; g.fill(); g.strokeStyle = C.ice; g.globalAlpha = .6; g.lineWidth = lw(1.5); g.stroke(); g.globalAlpha = 1;
  for (let j = 1; j < 4; j++) { g.beginPath(); g.ellipse(pxx, G + 760, 1050, 1050 - j * 34, 0, 3.6, 5.8); g.strokeStyle = C.ice; g.globalAlpha = .12; g.stroke(); g.globalAlpha = 1; }
  S.towers.forEach(([lx, h]) => { const x = fx(sc, lx, .5); thin([x, G, x, G - h], C.ice, .28); thin([x + 46, G, x + 46, G - h], C.ice, .28); for (let y = G; y > G - h; y -= 46) { thin([x, y, x + 46, y - 46], C.ice, .16); thin([x + 46, y, x, y - 46], C.ice, .16); } circ(x + 23, G - h - 8, 3, null, .3 + .6 * E[1], C.rust); });
  box(0, 0, 430, G, '#0A0F22'); poly([430, 0, 800, 0, 430, 190], '#0A0F22'); thin([430, G, 430, 190, 800, 0], C.ice, .7, 1.5); for (let y = 100; y < G; y += 130) thin([0, y, 430, y], C.ice, .13);
  BX[4].forEach(x => posts(x, signW(), 232));
  floor(w); for (let x = 460; x < w; x += 150) thin([x, G + 54, x + 70, G + 54], C.ice, .16, 2);
  for (let x = 520; x < w - 200; x += 300) { circ(x, G + 2, 3, null, .3 + .6 * (x / 300 % 2 ? E[1] : 1 - E[1]), C.rust); halo(x, G + 2, 26, C.rust, .25); }
  const tx = towerX; box(tx, G - 300, 44, 300, '#0C1226', C.ice, .8); for (let y = G - 280; y < G; y += 46) thin([tx, y, tx + 44, y + 23, tx, y + 46], C.ice, .16);
  const cab = [tx - 30, G - 300, tx - 44, G - 352, tx + 88, G - 352, tx + 74, G - 300]; poly(cab, '#122050'); line(cab, C.ice, 1, 1.4, true); box(tx - 30, G - 342, 104, 26, rgba(C.ice, .32 + .2 * E[1])); halo(tx + 22, G - 330, 120, C.ice, .12);
  thin([tx + 22, G - 352, tx + 22, G - 420], C.ice, .8); circ(tx + 22, G - 424, 4, null, .4 + .6 * E[1], C.rust); halo(tx + 22, G - 424, 34, C.rust, .4 * E[1]);
  for (let j = 0; j < 3; j++) {
    const ph = j * 2.1, dx = 900 + j * 1050 + (reduce ? 0 : Math.sin(T * .42 + ph) * 430), dy = 190 + j * 26 + (reduce ? 0 : Math.sin(T * 1.3 + ph) * 16 + E[3] * 6), sw = reduce ? 0 : Math.sin(T * .9 + ph) * 150;
    cone(dx, dy + 12, 6, 110, G - dy - 12, C.ice, .13, sw); g.save(); g.translate(dx + sw, G + 4); g.scale(1, .2); halo(0, 0, 130, C.ice, .16); g.restore();
    poly([dx - 30, dy, dx, dy - 12, dx + 30, dy, dx, dy + 12], '#0A0F22'); line([dx - 30, dy, dx, dy - 12, dx + 30, dy, dx, dy + 12], C.ice, 1, 1.3, true);
    thin([dx - 46, dy - 14, dx - 14, dy - 14], C.ice, .7); thin([dx + 14, dy - 14, dx + 46, dy - 14], C.ice, .7); thin([dx - 30, dy, dx - 30, dy - 14]); thin([dx + 30, dy, dx + 30, dy - 14]);
    circ(dx, dy, 3.5, null, 1, C.rust); halo(dx, dy, 22, C.rust, .5);
  }
};
// 8 · crowd · The Club (its own place after the road, no role)
function city(sc, list, p, tint) { list.forEach(([lx, bw, bh, q]) => { const x = fx(sc, lx, p); box(x, G - bh, bw, bh, '#090E20', C.ice, .22); for (let y = G - bh + 14; y < G - 12; y += 22) for (let xx = x + 10; xx < x + bw - 8; xx += 18) if (((xx * 7 + y * 13 + q * 97) | 0) % 5 < 2) box(xx, y, 5, 8, rgba(tint, .34)); }); }
function sky2(sc, w) {
  vgrad(0, G, '#05070F', '#101636', 0, w);
  S.stars.forEach(([u, y, f, ph], j) => { if (j % 2) return; circ(fx(sc, u * w, .12), y * .8, 1.2, null, reduce ? .5 : .3 + .4 * Math.abs(Math.sin(T * f * .4 + ph)), C.ice); });
  const mxx = fx(sc, 700, .1) + (sc === SC[ROAD] ? 500 : 0); halo(mxx, 150, 170, C.ice, .1); circ(mxx, 150, 50, C.ice, .8, '#16204A'); circ(mxx - 16, 138, 9, C.ice, .25); circ(mxx + 150, 214, 17, C.ice, .7, '#16204A');
}
P[CLUB] = sc => {
  const w = sc.w, tk = tickNow(), spd = TRK[CLUB].spd, beat = tk / (spd * 4);
  sky2(sc, w); halo(w * .62, G, 1100, C.mag, .12 + .05 * E[0]);
  city(sc, S.bld, .4, C.mag);
  // landing pad and gate
  thin([0, G - 2, 460, G - 2], C.ice, .3, 3); line([500, G, 500, 250, 760, 250, 760, G], C.ice, .8, 1.5); thin([500, 290, 760, 290], C.ice, .4);
  for (let j = 0; j < 9; j++) { const bx = 516 + j * 29; circ(bx, 270, 4, null, .35 + .65 * (((beat | 0) + j) % 2), C.mag); }
  // truss and beams
  const x0 = 1380, x1 = w - 250; thin([x0, 110, x1, 110], C.ice, .8, 1.5); thin([x0, 140, x1, 140], C.ice, .8, 1.5); for (let x = x0; x < x1; x += 60) thin([x, 110, x + 30, 140, x + 60, 110], C.ice, .3);
  thin([x0, 110, x0, G], C.ice, .6, 2); thin([x1, 110, x1, G], C.ice, .6, 2);
  for (let x = x0 + 130, j = 0; x < x1; x += 250, j++) { const an = reduce ? (j % 2 ? .25 : -.25) : Math.sin(T * .7 + j * 1.3) * .5; cone(x, 142, 8, 150, G - 142, j % 2 ? C.mag : C.ice, (j % 2 ? .16 : .08) + .08 * E[0], Math.tan(an) * (G - 142)); box(x - 12, 140, 24, 12, C.dark, C.ice, .8); }
  for (const sx of [x0 + 14, x1 - 96]) for (let j = 0; j < 3; j++) { const y = G - 96 - j * 96; box(sx, y, 82, 92, '#0A0F22', C.ice, .75); circ(sx + 41, y + 46, 24 + 6 * E[0], C.ice, .8); circ(sx + 41, y + 46, 8, C.ice, .6); }
  // public screen
  const on = !card.hidden && card.classList.contains('cast'); box(1500, 170, 380, 230, '#0A1024', on ? C.mag : C.ice, 1); halo(1690, 285, 300, on ? C.mag : C.ice, on ? .16 : .07);
  thin([1500, 400, 1560, G], C.ice, .3); thin([1880, 400, 1820, G], C.ice, .3);
  for (let y = 182; y < 396; y += 9) thin([1508, y, 1872, y], C.ice, .05);
  circ(1690, 262, 40, C.ice, .8); g.beginPath(); g.arc(1690, 258, 46, 3.5, 5.92); g.strokeStyle = C.ice; g.globalAlpha = .7; g.lineWidth = lw(1.3); g.stroke(); g.globalAlpha = 1;
  poly([1664, 304, 1642, 384, 1738, 384, 1716, 304], C.dark); thin([1664, 304, 1642, 384, 1738, 384, 1716, 304], C.ice, .7);
  halo(1690, 266, 44, C.mint, .35); g.fillStyle = C.mint; g.beginPath(); g.ellipse(1677, 266, 6, 8, 0, 0, 6.3); g.ellipse(1703, 266, 6, 8, 0, 0, 6.3); g.fill();
  thin([1760, 210, 1850, 210], C.ice, .6); thin([1760, 224, 1830, 224], C.ice, .3); thin([1760, 238, 1840, 238], C.ice, .3);
  // crowd
  S.crowd.forEach(([x, h, ph, back, q]) => {
    const under = CR.some(c => x > c.x - 40 && x < c.x + c.L + 40);
    const bob = reduce ? 0 : -Math.abs(Math.sin(beat * Math.PI + (sync > 0 ? 0 : ph))) * (9 + 9 * E[3]);
    const yy = G + bob - (back ? 16 : 0), hh = h * (back ? .86 : 1), col = back ? '#070A16' : '#0B1126';
    poly([x - 15, yy, x - 11, yy - hh + 26, x + 11, yy - hh + 26, x + 15, yy], col); circ(x, yy - hh + 13, 12, C.ice, back ? .16 : .34, col);
    thin([x - 15, yy, x - 11, yy - hh + 26, x + 11, yy - hh + 26, x + 15, yy], C.ice, back ? .12 : .28);
    if (q > .45 || under) { const up = reduce ? 20 : 16 + 14 * Math.abs(Math.sin(beat * Math.PI + ph)) + (under ? 10 : 0); thin([x + 10, yy - hh + 30, x + 20, yy - hh + 4 - up], C.ice, under ? .55 : .3); }
  });
  // the craft hang over the crowd like UFOs, each in a faint beam; the crowd cheers them
  CR.forEach(c => {
    const bob = reduce ? 0 : Math.sin(T * 1.2 + c.j * 1.7) * 7 + E[1] * 3, top = G - 2 + c.dy + bob;
    cone(c.x + c.L * .5, top + 6, 22, 70, G - top - 30, c.j % 2 ? C.mag : C.ice, .08 + .05 * E[0]);
    g.save(); g.translate(0, c.dy + bob); craft(c); g.restore();
  });
  floor(w, C.mag);
};
// 6 · vault · The Vault (PT Infosys, Antam gold): drawers that hum, ingots on crates, a parcel belt, a round door
P[VAULT] = sc => {
  const w = sc.w;
  vgrad(0, G, '#0A0F20', '#161F3E', 0, w);
  for (let x = 0; x < w; x += 190) thin([x, 0, x, G], C.ice, .07 + .06 * E[0]);
  thin([0, 100, w, 100], C.ice, .3); thin([0, 126, w, 126], C.ice, .12);
  for (let x = 40, q = 0; x < w - 260; x += 74, q++) for (let r = 0; r < 3; r++) {
    const y = 160 + r * 74, v = (q * 7 + r * 3) % 5 === 0 ? E[1] : (q + r) % 4 === 0 ? E[2] : .12;
    box(x, y, 62, 64, '#0A0F20', C.ice, .3); thin([x + 14, y + 42, x + 48, y + 42], C.ice, .22); circ(x + 31, y + 22, 3.5, null, .2 + .8 * v, (q + r) % 6 === 0 ? C.rust : C.ice);
  }
  BX[5].forEach(x => posts(x, signW(), 232));
  for (let x = 380; x < w; x += 760) lamp(x, 150, .55 + .25 * E[1]);
  // parcel belt: the deliveries that have to arrive
  const c0 = 300, c1 = w - 1500; thin([c0, G - 62, c1, G - 62], C.ice, .6, 1.5); for (let x = c0 + 40; x < c1; x += 190) thin([x, G - 62, x, G], C.ice, .3);
  for (let j = 0, n = Math.floor((c1 - c0) / 240); j < n; j++) { const px = c0 + ((reduce ? 0 : T * 40) + j * 240) % (c1 - c0 - 60), ph = 26 + (j * 37 % 22), pw = 40 + (j * 53 % 22); box(px, G - 62 - ph, pw, ph, '#0F1834', C.ice, .85); thin([px + pw / 2, G - 62 - ph, px + pw / 2, G - 62], C.rust, .8, 2); }
  // ingots stacked on crates
  const ingot = (x, y) => { const p = [x, y, x + 40, y, x + 33, y - 18, x + 7, y - 18]; poly(p, '#121B3C'); thin(p, C.ice, .85, 1.3, true); thin([x + 10, y - 9, x + 30, y - 9], C.ice, .3); };
  for (let x = c1 + 80; x < w - 800; x += 300) { box(x - 14, G - 46, 186, 46, '#0C1226', C.ice, .7); for (let a = 0; a < 3; a++) ingot(x + a * 46, G - 46); for (let a = 0; a < 2; a++) ingot(x + 23 + a * 46, G - 64); ingot(x + 46, G - 82); }
  // the round door at the far end
  const vx = w - 520, vy = G - 200, rot = reduce ? .3 : T * .12;
  halo(vx, vy, 260, C.rust, .08 + .06 * E[0]); circ(vx, vy, 150, C.ice, .9, '#0A0F20'); circ(vx, vy, 128, C.ice, .5); circ(vx, vy, 40, C.ice, .8, '#121B3C');
  for (let q = 0; q < 12; q++) { const a = q * Math.PI / 6; circ(vx + Math.cos(a) * 139, vy + Math.sin(a) * 139, 3, null, .7, C.ice); }
  for (let q = 0; q < 4; q++) { const a = rot + q * Math.PI / 2; thin([vx + Math.cos(a) * 40, vy + Math.sin(a) * 40, vx + Math.cos(a) * 118, vy + Math.sin(a) * 118], C.ice, .7, 2.2); circ(vx + Math.cos(a) * 124, vy + Math.sin(a) * 124, 6, C.ice, .8, '#0A0F20'); }
  circ(vx, vy - 176, 5, null, .4 + .6 * E[1], C.rust); halo(vx, vy - 176, 36, C.rust, .4 * E[1]);
  floor(w, C.rust); for (let x = 260; x < w; x += 190) thin([x, G + 54, x + 80, G + 54], C.ice, .16, 2);
};
// 7 · drive · The Road
P[ROAD] = sc => {
  const w = sc.w;
  sky2(sc, w); halo(fx(sc, 300, .3), G, 700, C.mag, .08);
  city(sc, S.bld2, .3, C.ice);
  for (let x = 240; x < w - 300; x += 420) { thin([x, G, x, 330, x + 54, 310], C.ice, .55, 1.6); lamp(x + 54, 316, .7); }
  const sw = signW(); BX[6].forEach(x => { line([x - 16, G, x - 16, 128, x + sw + 16, 128, x + sw + 16, G], C.ice, .7, 1.6); thin([x - 16, 150, x + sw + 16, 150], C.ice, .2); });
  S.neon.forEach(([x, t], j) => { const a = reduce ? .8 : .55 + .35 * Math.sin(T * 2 + j * 2); const y = 430; if (t === 0) line([x, y, x + 40, y - 60, x + 80, y], C.mag, a, 1.6, true); else if (t === 1) { g.beginPath(); g.arc(x + 40, y - 30, 32, 0, 6.3); g.strokeStyle = C.mag; g.globalAlpha = a; g.lineWidth = lw(1.8); g.stroke(); g.globalAlpha = 1; } else line([x, y, x, y - 56, x + 70, y - 56, x + 70, y], C.mag, a, 1.6); thin([x + 40, y, x + 40, G], C.ice, .22); halo(x + 40, y - 30, 90, C.mag, .1 * a); });
  // the house at the end
  const hx = HX; poly([hx, G, hx, G - 150, hx + 220, G - 150, hx + 220, G], '#0E1634'); line([hx, G, hx, G - 150, hx + 220, G - 150, hx + 220, G], C.ice, 1, 1.4); line([hx - 16, G - 150, hx + 110, G - 226, hx + 236, G - 150], C.ice, 1, 1.4, true);
  box(hx + 130, G - 112, 56, 50, rgba(C.ice, .5), C.ice); halo(hx + 158, G - 88, 110, C.ice, .16); box(hx + 34, G - 92, 46, 92, '#0A1028', C.ice, .8);
  floor(w); for (let x = 20; x < w; x += 130) thin([x, G + 72, x + 60, G + 72], C.ice, .3, 2.5);
  const prog = clamp((ani.x - sc.x0) / (HX - 180)), lx = cam.x - sc.x0 + 30 + prog * 60, sz = (1 - prog) * (cur === ROAD ? 1 : 0);
  if (sz > .02) { const bl = reduce ? 1 : (Math.sin(T * 9) > 0 ? 1 : .2); halo(lx, G - 34, 90 * sz + 10, C.rust, .7 * bl * sz); halo(lx + 34 * sz, G - 34, 90 * sz + 10, C.ice, .6 * (1.2 - bl) * sz); circ(lx, G - 34, 5 * sz, null, 1, C.rust); circ(lx + 34 * sz, G - 34, 5 * sz, null, 1, C.ice); }
};
// 9 · untitled
P[LAST] = sc => {
  const w = sc.w;
  vgrad(0, G, '#05070F', '#0B1130', 0, w); vgrad(G - 200, G, rgba(C.ice, 0), rgba(C.ice, .12), 0, w); floor(w);
  for (let j = 0; j < 4; j++) { const x = 260 + j * 330, y = 230; box(x, y, 290, 200, rgba(C.dark, .5), C.ice, .9); g.setLineDash([6, 8]); thin([x + 16, y + 16, x + 274, y + 16, x + 274, y + 184, x + 16, y + 184], C.ice, .2, 1, true); g.setLineDash([]);
    [[x, y], [x + 290, y], [x, y + 200], [x + 290, y + 200]].forEach(([a, b]) => { thin([a - 12, b, a + 12, b], C.ice, .6); thin([a, b - 12, a, b + 12], C.ice, .6); }); }
  g.setLineDash([3, 14]); thin([200, G + 50, w - 100, G + 50], C.ice, .3, 2); g.setLineDash([]);
  const sx = fx(sc, 1380, .5), rise = reduce ? 70 : 60 + Math.sin(T * .3) * 10; halo(sx, G, 520, C.ice, .13); g.save(); g.beginPath(); g.rect(0, 0, w, G); g.clip(); circ(sx, G + 40 - rise, 120, C.ice, .7, '#101A44'); for (let q = 0; q < 9; q++) { const a = Math.PI + q * Math.PI / 8; thin([sx + Math.cos(a) * 150, G + 40 - rise + Math.sin(a) * 150, sx + Math.cos(a) * 200, G + 40 - rise + Math.sin(a) * 200], C.ice, .25); } g.restore();
  g.setLineDash([2, 7]);
  for (let j = 0; j < 4; j++) { const x = 260 + j * 330, y = 230; thin([x, y, x + 290, y + 200], C.ice, .12); thin([x + 290, y, x, y + 200], C.ice, .12); thin([x, y + 150, x + 290, y + 150], C.ice, .22); }
  { const x = 260 + 110, y = 380; circ(x, y - 70, 15, C.ice, .5); thin([x - 10, y - 54, x - 22, y - 10, x + 22, y - 10, x + 10, y - 54], C.ice, .5, 1.1, true); thin([x - 6, y - 10, x - 6, y], C.ice, .5); thin([x + 6, y - 10, x + 6, y], C.ice, .5); }
  thin([590 + 180, 380, 590 + 180, 300, 590 + 230, 300, 590 + 230, 380], C.ice, .4); thin([920 + 60, 380, 920 + 110, 330, 920 + 170, 360, 920 + 230, 310], C.ice, .4); thin([1250 + 120, 330, 1250 + 145, 355, 1250 + 190, 300], C.ice, .5, 1.4);
  g.setLineDash([]);
};

function drawDoor(i) {
  const bx = doorX(i) - cam.x, tall = i === HALL ? 410 : 270, o = ease(doorOpen[i]);
  box(bx - 84, 0, 104, 900, '#060912'); thin([bx - 84, 0, bx - 84, G], C.ice, .6, 1.4); thin([bx + 20, 0, bx + 20, G], C.ice, .6, 1.4);
  box(bx - 66, G - tall, 68, tall, '#010206', C.ice, .7);
  const h = tall * (1 - o); if (h > 2) { box(bx - 64, G - tall, 64, h, '#151E3C', C.ice, .9); thin([bx - 32, G - tall, bx - 32, G - tall + h], C.ice, .3); g.save(); g.beginPath(); g.rect(bx - 64, G - tall + h - 26, 64, 24); g.clip(); for (let x = -90; x < 20; x += 16) poly([bx + x, G - tall + h - 2, bx + x + 8, G - tall + h - 2, bx + x + 30, G - tall + h - 26, bx + x + 22, G - tall + h - 26], C.rust, .9); g.restore(); }
  const col = approved[i] ? C.mint : C.rust; circ(bx - 32, G - tall - 24, 7, null, 1, col); halo(bx - 32, G - tall - 24, 46, col, .5);
}
function drawAni() {
  if (cardProject && cur === CLUB) return;
  const x = ani.x - cam.x, asleep = cur === ROAD && ani.x > SC[ROAD].x0 + HX - 150, face = askDoor >= 0 || ani.nod > 0 || ani.wave > 0;
  let y = G, d = face ? 0 : ani.dir;
  if (cur === ROAD) { // the car
    // nose to the right (the way ANI walks): long low hood and headlights at x = 268, short stubby tail with the rust light at x = 0
    const cx = x - 120, by = G - 16, roll = ani.moving ? T * 14 * (ani.dir || 1) : 0;
    g.save(); g.translate(cx, 0); g.scale(1, 1);
    const body = [268, by - 26, 242, by - 46, 184, by - 52, 144, by - 86, 72, by - 86, 36, by - 50, 6, by - 40, 0, by - 14, 268, by - 14];
    poly(body, '#0E1634'); line(body, C.ice, 1, 1.5, true); thin([140, by - 80, 172, by - 52, 44, by - 52, 74, by - 80], C.ice, .7, 1.1, true); thin([108, by - 82, 108, by - 52], C.ice, .5);
    [54, 210].forEach(wx => { circ(wx, by - 6, 20, C.ice, 1, '#05070F'); thin([wx + Math.cos(roll) * 18, by - 6 + Math.sin(roll) * 18, wx - Math.cos(roll) * 18, by - 6 - Math.sin(roll) * 18], C.ice, .5); });
    halo(270, by - 30, 80, C.ice, .35); cone(268, by - 34, 4, 60, 1, C.ice, 0); circ(2, by - 30, 4, null, 1, C.rust); halo(2, by - 30, 30, C.rust, .5);
    const ex = 128, ey = by - 66; circ(ex - 2, ey, 15, C.ice, .9, C.dark);
    if (asleep) { thin([ex - 9, ey + 1, ex - 3, ey + 3], C.mint, 1, 1.6); thin([ex + 3, ey + 3, ex + 9, ey + 1], C.mint, 1, 1.6); if (!reduce) for (let j = 0; j < 3; j++) { const t = (T * .4 + j / 3) % 1, zx = ex + 14 + t * 30, zy = ey - 20 - t * 50, sz = 5 + t * 5; thin([zx, zy, zx + sz, zy, zx, zy + sz, zx + sz, zy + sz], C.ice, .8 * (1 - t)); } }
    else { halo(ex + 2, ey, 26, C.mint, .5); g.fillStyle = C.mint; g.beginPath(); g.ellipse(ex - 2, ey, 3, 4.6 * (ani.blink > 0 ? .15 : 1), 0, 0, 6.3); g.ellipse(ex + 7, ey, 3, 4.6 * (ani.blink > 0 ? .15 : 1), 0, 0, 6.3); g.fill(); }
    g.restore(); return;
  }
  const sw = ani.moving ? Math.sin(ani.ph) : 0, dn = ani.dance > 0 ? Math.sin(T * 14) : 0;
  y += (ani.moving ? -Math.abs(Math.cos(ani.ph)) * 4 : Math.sin(T * 1.6) * 1.2) - Math.abs(dn) * 12 - E[2] * 1.5;
  const nodY = ani.nod > 0 ? Math.sin(ani.nod * 12) * 4 : 0, hy = y - 96 + nodY;
  g.save(); g.translate(x, G + 6); g.scale(1, .2); halo(0, 0, 80, C.mint, .22); g.restore();
  thin([x - 9, y - 24, x - 9 + sw * 10, G], C.ice, 1, 2); thin([x + 9, y - 24, x + 9 - sw * 10, G], C.ice, 1, 2);
  thin([x - 9 + sw * 10, G, x - 3 + sw * 10 + d * 4, G], C.ice, 1, 2); thin([x + 9 - sw * 10, G, x + 15 - sw * 10 + d * 4, G], C.ice, 1, 2);
  const coat = [x - 15, y - 76, x - 33 - dn * 4, y - 22, x + 33 + dn * 4, y - 22, x + 15, y - 76]; poly(coat, C.dark); line(coat, C.ice, 1, 1.5, true);
  thin([x, y - 74, x, y - 24], C.ice, .3); thin([x - 26, y - 34, x + 26, y - 34], C.ice, .25);
  const up = ani.wave > 0 ? 1 : ani.dance > 0 ? .5 + .5 * dn : 0;
  thin([x - 15, y - 68, x - 26, y - 44 + sw * 6], C.ice, 1, 1.8);
  if (up) thin([x + 15, y - 68, x + 30, y - 92 - up * 14, x + 34 + Math.sin(T * 12) * 6, y - 110 - up * 14], C.ice, 1, 1.8); else thin([x + 15, y - 68, x + 26, y - 44 - sw * 6], C.ice, 1, 1.8);
  if (cur === CLUB && mouseIn && !compact && !reduce && ani.dance <= 0) thin([x + 26, y - 44 - sw * 6, mouseWX - cam.x, Math.min(G - 30, mouseWY)], C.ice, .35);
  circ(x, hy, 24, null, 1, C.dark); line([x - 24, hy + 6, x - 26, hy - 6, x - 14, hy - 24, x, hy - 28, x + 14, hy - 24, x + 26, hy - 6, x + 24, hy + 6], C.ice, 1, 1.5); thin([x - 22, hy + 10, x, hy + 24, x + 22, hy + 10], C.ice, .9, 1.4);
  const ex = x + d * 6, ry = (face ? 8 : 6.5) * (ani.blink > 0 ? .12 : 1), rx = face ? 5.6 : 4.6;
  halo(ex, hy + 2, 38, C.mint, .5); g.fillStyle = C.mint; g.beginPath(); g.ellipse(ex - 9, hy + 2, rx, ry, 0, 0, 6.3); g.ellipse(ex + 9, hy + 2, rx, ry, 0, 0, 6.3); g.fill();
  if (hasKey && (cur === LAWN || cur === HALL)) { thin([x - 26, y - 44 + sw * 6, x - 26, y - 30 + sw * 6], C.ice, .9); circ(x - 26, y - 26 + sw * 6, 4, C.ice); }
}
function drawFg() {
  for (let i = HALL; i <= MAPR; i++) { const sc = SC[i]; for (let lx = 760; lx < sc.w - 300; lx += 980) { const x = cam.cx + (sc.x0 + lx - cam.x - cam.cx) * 1.4; if (x < -80 || x > VW + 80) continue; box(x, 0, 30, 900, '#020308'); thin([x, 0, x, 900], C.ice, .25); thin([x + 30, 0, x + 30, 900], C.ice, .12); box(x - 7, 520, 44, 12, '#020308', C.ice, .22); } }
}
function drawWorld() {
  g = mainCtx; ds = s * dpr; g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0); g.fillStyle = C.night; g.fillRect(0, 0, VW, 900);
  for (let i = 0; i < SC.length; i++) { const sc = SC[i]; if (sc.x0 > cam.x + VW || sc.x0 + sc.w < cam.x) continue; g.save(); g.translate(sc.x0 - cam.x, 0); g.beginPath(); g.rect(0, 0, sc.w, 900); g.clip(); P[i](sc); g.restore(); }
  for (let i = 0; i < DOORS; i++) { const bx = doorX(i) - cam.x; if (bx > -150 && bx < VW + 150) drawDoor(i); }
  drawAni(); drawFg();
  const vg = g.createRadialGradient(VW / 2, 420, 300, VW / 2, 420, Math.max(VW, 900) * .78); vg.addColorStop(0, 'rgba(2,3,8,0)'); vg.addColorStop(1, 'rgba(2,3,8,.62)'); g.fillStyle = vg; g.fillRect(0, 0, VW, 900);
  if (rev.active) drawReveal();
}

/* ---------- the map ---------- */
const rev = { active: false, t: 0, thumbs: null };
const TS = .3;
function makeThumbs() {
  const keep = { x: cam.x, cx: cam.cx, ds, intro }; intro = 1; rev.thumbs = SC.map((sc, i) => { const c = document.createElement('canvas'); c.width = Math.ceil(sc.w * TS); c.height = 900 * TS; g = c.getContext('2d'); ds = TS; g.setTransform(TS, 0, 0, TS, 0, 0); cam.x = sc.x0; cam.cx = sc.w / 2; P[i](sc); return c; });
  cam.x = keep.x; cam.cx = keep.cx; ds = keep.ds; intro = keep.intro; g = mainCtx;
}
// The seven roles share one time axis (PW of the plan, starting at TL0). The workshop sits before it and the club and the unwritten part after it, all off the axis.
const TL0 = .10, PW = .70;
function planRect(i) {
  const L = Wpx * .06, W = Wpx * .88, top = Hpx * .42 - 55;
  if (i === WORK) return [L, top, W * .08, 110];
  if (i === CLUB) return [L + W * .82, top, W * .09, 110];
  if (i === LAST) return [L + W * .92, top, W * .08, 110];
  const r = roles[i - OFF]; return [L + W * (TL0 + PW * (mIdx(r.start) - AX0) / AXN), top, W * PW * (mIdx(r.end) - mIdx(r.start) + 1) / AXN, 110];
}
function drawReveal() {
  const a = ease(rev.t / .9), b = compact ? 0 : ease((rev.t - .9) / .7);
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = rgba(C.night, a * .94); g.fillRect(0, 0, Wpx, Hpx);
  const rs = Wpx * .92 / TOTAL;
  SC.forEach((sc, i) => {
    const A = [(sc.x0 - cam.x) * s, 0, sc.w * s, Hpx], R = [Wpx * .04 + sc.x0 * rs, Hpx * .42 - 450 * rs, sc.w * rs, 900 * rs], Pl = planRect(i);
    const q = A.map((v, j) => lerp(lerp(v, R[j], a), Pl[j], b));
    g.globalAlpha = 1 - b * .45; g.drawImage(rev.thumbs[i], q[0], q[1], q[2], q[3]); g.globalAlpha = Math.max(a * .5, b); g.strokeStyle = C.ice; g.lineWidth = 1.5; if ((i === WORK || i >= CLUB) && b > 0) g.setLineDash([6, 6]); g.strokeRect(q[0], q[1], q[2], q[3]); g.setLineDash([]); g.globalAlpha = 1;
  });
}
function startReveal() {
  if (revealed || rev.active) return; hold = 0; keys.l = keys.r = false; ani.target = null;
  if (reduce) { revealed = true; flags.alarm = true; openMap(true); return; }
  makeThumbs(); rev.active = true; rev.t = 0; flags.triOnly = true; say('ANI touches the map. The camera pulls back.');
}
const map = $('#map'), plan = $('#plan'), mapSum = $('#map-summary');
{ const b = mk('button', 'room apart dn', `${WORK + 1}<span class="lab">the workshop<small>technical skills</small></span>`); b.type = 'button'; b.style.left = '0%'; b.style.width = '8%';
  b.setAttribute('aria-label', `Room ${WORK + 1}, ${SC[WORK].place}: before the timeline, the technical skills`); b.addEventListener('click', () => { closeMap(); goScene(WORK); }); plan.appendChild(b); }
roles.forEach((r, i) => {
  const si = i + OFF, b = mk('button', 'room ' + (i % 2 ? 'dn' : 'up'), `${si + 1}<span class="lab">${esc(r.company)}<small>${ym(r.start)} – ${ym(r.end)}</small></span>`); b.type = 'button';
  const st = (mIdx(r.start) - AX0) / AXN, wd = (mIdx(r.end) - mIdx(r.start) + 1) / AXN;
  b.style.left = ((TL0 + st * PW) * 100) + '%'; b.style.width = (wd * PW * 100) + '%'; b.dataset.w = wd; if (wd * PW > .14) b.classList.add('wide');
  b.setAttribute('aria-label', `Room ${si + 1}, ${SC[si].place}: ${r.company}, ${r.title}, ${ym(r.start)} to ${ym(r.end)}`);
  b.addEventListener('click', () => { closeMap(); goScene(si); }); plan.appendChild(b);
});
{ const b = mk('button', 'room apart dn', `${CLUB + 1}<span class="lab">the club<small>another planet</small></span>`); b.type = 'button'; b.style.left = '82%'; b.style.width = '9%';
  b.setAttribute('aria-label', `Room ${CLUB + 1}, ${SC[CLUB].place}: outside the building, the public broadcast and the dance floor`); b.addEventListener('click', () => { closeMap(); goScene(CLUB); }); plan.appendChild(b); }
{ const b = mk('button', 'room open up', `${LAST + 1}<span class="lab">untitled<small>yours to decide</small></span>`); b.type = 'button'; b.style.left = '92%'; b.style.width = '8%'; b.addEventListener('click', () => { closeMap(); goScene(LAST); }); plan.appendChild(b); }
let typing = 0, mapOpener = null;
function layoutPlan() { [...plan.children].forEach((b, i) => { const role = i >= OFF && i < OFF + roles.length; if (compact) b.style.width = role ? Math.max(12, b.dataset.w * 330) + '%' : '12%'; else b.style.width = role ? (b.dataset.w * PW * 100) + '%' : i === WORK ? '8%' : i === CLUB ? '9%' : '8%'; }); }
function openMap(first) {
  mapOpener = document.activeElement; map.hidden = false; layoutPlan(); clearInterval(typing);
  if (!rev.thumbs) makeThumbs();
  if (!plan.dataset.art) { plan.dataset.art = 1; [...plan.children].forEach((b, i) => { try { b.style.backgroundImage = `linear-gradient(rgba(5,7,15,.5),rgba(5,7,15,.5)),url(${rev.thumbs[i].toDataURL('image/jpeg', .7)})`; } catch (e) { } }); }
  if (first && !reduce) { let n = 0; mapSum.textContent = ''; typing = setInterval(() => { n += 3; mapSum.textContent = D.summary.slice(0, n); if (n >= D.summary.length) clearInterval(typing); }, 22); }
  else mapSum.textContent = D.summary;
  $('#map-close').focus({ preventScroll: true });
  say(first ? 'The workshop, the town, the hallway, the alley, the map room, the airfield, the vault and the road were rooms in one building. Beyond it lay another planet, the club. ' + D.summary : 'Map open. Choose a room.');
}
function closeMap() { if (map.hidden) return; map.hidden = true; clearInterval(typing); if (mapOpener && mapOpener.focus && mapOpener !== document.body) mapOpener.focus({ preventScroll: true }); else document.activeElement.blur(); }
function mapCmd() { if (!map.hidden) return closeMap(); if (revealed) return openMap(false); closeCard(); goScene(MAPR, MX - 90); startReveal(); }

/* ---------- cards ---------- */
const card = $('#card'), cardBody = $('#card-body');
let cardOpener = null;
let cardAuto = false;
function openCard(html, cls, takeFocus = true) { cardAuto = !takeFocus; cardBody.innerHTML = html; card.className = cls || ''; card.hidden = false; card.scrollTop = 0; if (takeFocus) { cardOpener = document.activeElement; $('#card-close').focus({ preventScroll: true }); } else cardOpener = null; duck(cls === 'cast'); }
function closeCard() { if (card.hidden) return; card.hidden = true; cardProject = null; duck(false); if (cardOpener && cardOpener.isConnected && cardOpener !== document.body) cardOpener.focus({ preventScroll: true }); cardOpener = null; }
function openProject(c, opener) {
  const p = c.p; ani.x = c.o.x + c.L * .6; ani.target = null; cardProject = c;
  openCard(`<p class="kick">${esc(p.category)} · craft ${c.j + 1} of ${CR.length}${p.featured ? ' · featured' : ''}</p><h2>${esc(p.name)}</h2><p>${esc(p.tagline)}</p><p>${esc(p.description)}</p><p class="stack">${esc(p.stack.join(' · '))}</p><div class="links">` +
    (p.demo ? `<a class="lit-btn" href="${esc(p.demo)}">Live demo</a>` : '') + `<a class="lit-btn" href="${esc(p.url)}">View code</a></div>`, 'proj');
  say(`ANI climbs into ${p.name}. ${p.tagline}.`);
}
function evLabel(id) { const i = roleIdx(id); if (i >= 0) return `${SC[i + OFF].place} · ${roles[i].company}`; const c = CR.find(c => c.p.id === id); return c ? c.p.name : id; }
function openCast(takeFocus) {
  openCard(`<p class="kick">Public broadcast · the music cuts out</p><h2>A capable entity is at large.</h2><p>${esc(D.offer.pitch)}</p><p class="kick">Known abilities</p>` +
    D.offer.services.map(sv => `<h3>${esc(sv.name)}</h3><p>${esc(sv.description)}</p><p class="seen">Last seen at ${sv.evidence.map(id => `<button type="button" data-go="${esc(id)}">${esc(evLabel(id))}</button>`).join('')}</p>`).join('') +
    `<h3>If found, book a consultation.</h3><p>${esc(D.offer.cta.note)}</p><div class="links"><a class="lit-btn" href="${esc(MAIL)}">${esc(D.offer.cta.label)}</a><button type="button" class="lit-btn" data-copy>Copy email</button></div>`, 'cast', takeFocus);
  say('The music cuts out. A broadcast: a capable entity is at large. ' + D.offer.pitch);
}
function goEvidence(id) { const i = roleIdx(id); if (i >= 0) { closeCard(); goScene(i + OFF); return; } const c = CR.find(c => c.p.id === id); if (c) { goScene(CLUB, c.x - 300); openProject(c, null); } }
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]'); if (go) return goEvidence(go.dataset.go);
  const cp = e.target.closest('[data-copy]'); if (cp) copyEmail(cp);
});
function copyEmail(btn) {
  const done = () => { const t = btn.textContent; btn.textContent = 'Copied'; say('Email address copied: ' + D.contact.email); setTimeout(() => { btn.textContent = t; }, 1600); };
  const fallback = () => { const ta = mk('textarea'); ta.value = D.contact.email; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { } ta.remove(); done(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(D.contact.email).then(done, fallback); else fallback();
}
$('#copy').addEventListener('click', e => copyEmail(e.currentTarget));
$('#card-close').addEventListener('click', closeCard);
$('#map-close').addEventListener('click', closeMap);
$('#map-air').addEventListener('click', () => { closeMap(); goScene(CLUB, CR[0].x - 260); });
$('#map-cast').addEventListener('click', () => { closeMap(); openCast(true); });
$('#b-map').addEventListener('click', mapCmd);
$('#b-cast').addEventListener('click', () => openCast(true));
mapHot.el.addEventListener('click', () => { if (revealed) openMap(false); else { walkTo(SC[MAPR].x0 + MX - 20, true); } });
screenHot.el.addEventListener('click', () => { castSeen = true; openCast(true); });
camBtn.el.addEventListener('click', () => {
  if (camAwake) { ani.wave = 2; return; } camClicks++;
  if (camClicks >= 3) { camAwake = true; ani.wave = 2.4; camBtn.el.setAttribute('aria-label', 'Surveillance camera, awake'); say('The camera wakes. Its red light comes on, and ANI waves at it.'); } else say('The camera is dark for the night.');
});

/* ---------- the plain sheet ---------- */
const sheet = $('#cv'); let sheetOpener = null;
const sheetOpen = () => sheet.classList.contains('open') || location.hash === '#cv';
function openSheet() { if (sheet.classList.contains('open')) return; sheetOpener = document.activeElement; sheet.classList.add('open'); sheet.scrollTop = 0; $('#cv-close').focus(); }
function closeSheet() { sheet.classList.remove('open'); if (location.hash === '#cv') history.replaceState(null, '', location.pathname + location.search); if (sheetOpener && sheetOpener.focus) sheetOpener.focus(); }
$('#b-file').addEventListener('click', openSheet); $('#cv-close').addEventListener('click', closeSheet);
if (location.hash === '#cv') sheet.classList.add('open');
addEventListener('hashchange', () => { if (location.hash === '#cv') openSheet(); });

/* ---------- doors ---------- */
const doorCard = $('#doorcard');
function approve() {
  const i = askDoor; if (i < 0) return; approved[i] = true; askDoor = -1; doorCard.hidden = true;
  $('#n-approved').textContent = approved.filter(Boolean).length; blip(880, .09); setTimeout(() => blip(1320, .14), 90);
  say(`Approved. The door to ${SC[i].to} opens. Doors approved ${approved.filter(Boolean).length}, doors forced 0.`);
  if (document.activeElement && doorCard.contains(document.activeElement)) document.activeElement.blur();
}
$('#approve').addEventListener('click', approve);
$('#notyet').addEventListener('click', () => { declined = askDoor; askDoor = -1; doorCard.hidden = true; ani.nod = .7; say('Not yet. ANI nods and waits.'); });

/* ---------- moving about ---------- */
function walkTo(x, fast) { if (reduce) { jump(x); return; } ani.target = x; ani.fast = !!fast; }
function blocked(from, to) { for (let i = 0; i < DOORS; i++) { if (approved[i]) continue; const a = doorX(i) - 98, b = doorX(i) + 34; if (from <= a && to > a) return a; if (from >= b && to < b) return b; } return to; }
function jump(x) { ani.x = clamp(blocked(ani.x, x), 60, TOTAL - 120); ani.target = null; }
function goScene(i, lx = 330) { ani.x = SC[i].x0 + lx; ani.target = null; ani.dir = 1; snapCam = true; }
function step(dir) { const nx = dir > 0 ? stops.find(v => v > ani.x + 12) : [...stops].reverse().find(v => v < ani.x - 12); if (nx != null) jump(nx); }
let snapCam = true;
function enterScene(i) {
  cur = i; const sc = SC[i]; setTrack(i); if (!card.hidden && cardAuto) closeCard();
  $('#track-no').textContent = trackNo(i); $('#track-title').textContent = sc.id; $('#track-place').textContent = sc.place; $('#narr').textContent = sc.narr;
  [...strip.children].forEach((b, j) => b.classList.toggle('on', j === i));
  say(`Track ${i + 1}, ${sc.id}. ${sc.place}. ${sc.narr}` + (i >= OFF && i < OFF + roles.length ? ` ${roles[i - OFF].company}, ${roles[i - OFF].title}, ${ym(roles[i - OFF].start)} to ${ym(roles[i - OFF].end)}.` : ''));
}
function dance() { ani.dance = 1.3; const b = tickNow() / (TRK[CLUB].spd * 4), err = Math.abs(b - Math.round(b)); if (err < .2) { if (sync <= 0) say('ANI dances in time. The crowd falls into step.'); sync = 7; } }
const overlay = () => !map.hidden || sheet.classList.contains('open') || rev.active;

function update(dt) {
  T += dt; if (cur === LAWN && introAt == null) introAt = T; intro = reduce ? 1 : introAt == null ? 0 : clamp((T - introAt) / 2.6);
  if (rev.active) { rev.t += dt; if (rev.t > 1.75) { rev.active = false; flags.triOnly = false; flags.alarm = true; revealed = true; openMap(true); } }
  let dir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0) || hold; if (overlay()) dir = 0;
  let sp = cur === ROAD ? 560 : 380;
  if (dir) ani.target = null;
  else if (ani.target != null) { const d = ani.target - ani.x; if (Math.abs(d) < 8) ani.target = null; else { dir = Math.sign(d); if (ani.fast) sp = Math.max(sp, Math.min(2600, Math.abs(d) * 3.2)); } }
  else if (cur === CLUB && mouseIn && !compact && !reduce && card.hidden) { const d = mouseWX - 46 - ani.x; if (Math.abs(d) > 30) dir = Math.sign(d) * Math.min(1, Math.abs(d) / 220); }
  const nx = clamp(blocked(ani.x, ani.x + dir * sp * dt), 60, TOTAL - 120);
  ani.moving = Math.abs(nx - ani.x) > .02; if (ani.moving) { ani.dir = Math.sign(nx - ani.x); ani.ph += dt * 10; if (!hintGone && T > 1) hideHint(); if (cardProject) closeCard(); } else if (ani.target != null && dir) ani.target = null;
  ani.x = nx;
  // doors
  let near = -1; for (let i = 0; i < DOORS; i++) { if (approved[i]) { doorOpen[i] = Math.min(1, doorOpen[i] + (reduce ? 1 : dt / .4)); continue; } const a = doorX(i) - 98, b = doorX(i) + 34; if (Math.abs(ani.x - a) < 60 || Math.abs(ani.x - b) < 60) near = i; }
  if (near < 0) declined = -1;
  const want = near >= 0 && near !== declined && !overlay() ? near : -1;
  if (want !== askDoor) { askDoor = want; doorCard.hidden = want < 0; if (want >= 0) { $('#door-call').textContent = `open_door(to: "${SC[want].to}")`; $('#door-key').hidden = !(want === LAWN && hasKey); say(`ANI stops at a door and looks at you. It asks: open door to ${SC[want].to}. Press Enter to approve.`); } }
  const ci = SC.findIndex(sc => ani.x < sc.x0 + sc.w); if (ci !== cur) enterScene(ci < 0 ? LAST : ci);
  if (!hasKey && cur === LAWN && ani.x > SC[LAWN].x0 + 1330) { hasKey = true; keyTag.el.remove(); blip(1760, .1); say('ANI picks up the key. The tag reads API_KEY.'); }
  if (cur === MAPR && !revealed && !rev.active && ani.x > SC[MAPR].x0 + MX - 40) startReveal();
  if (cur === CLUB && !castSeen && ani.x > SC[CLUB].x0 + 1470) { castSeen = true; openCast(false); }
  // reading
  let best = null, bd = cur === CLUB ? 150 : 300; for (const o of els) { if (o.sc !== cur || o.mid == null) continue; const d = Math.abs(o.x + o.mid - ani.x); if (d < bd) { bd = d; best = o; } }
  if (best !== lit) { if (lit) lit.el.classList.remove('lit'); lit = best; if (lit) lit.el.classList.add('lit'); reader.innerHTML = lit ? `<b>${esc(lit.head)}</b>${esc(lit.text)}` : `<span class="dim">${esc(SC[cur].narr)}</span>`; }
  // camera
  const tx = clamp(ani.x - VW * (compact ? .42 : .36), 0, TOTAL - VW);
  if (reduce) { const sc = SC[cur], pg = VW * .62; cam.x = clamp(sc.x0 + Math.floor((ani.x - sc.x0) / pg) * pg - VW * .1, 0, TOTAL - VW); }
  else if (snapCam) cam.x = tx; else cam.x += (tx - cam.x) * Math.min(1, dt * 5);
  snapCam = false;
  // chip levels drive the picture
  if (reduce) { E[0] = .5; E[1] = .6; E[2] = 0; E[3] = 0; }
  else { const st = chip(seq.track, Math.floor(tickNow()), flags), tg = [st.tri.v * .9, st.p1.v * 1.7, st.p2.v, st.nz.v]; for (let i = 0; i < 4; i++) E[i] += (clamp(tg[i]) - E[i]) * Math.min(1, dt * (tg[i] > E[i] ? 40 : 9)); }
  ani.nextBlink -= dt; if (ani.nextBlink < 0) { ani.blink = .13; ani.nextBlink = 2.2 + Math.random() * 3; } ani.blink -= dt;
  ani.nod = Math.max(0, ani.nod - dt); ani.wave = Math.max(0, ani.wave - dt); ani.dance = Math.max(0, ani.dance - dt); sync = Math.max(0, sync - dt);
  if (cur === ALLEY && !reduce) { if (smoke.length < 70 && Math.random() < .25 + E[3]) { const m = S.mach[(Math.random() * S.mach.length) | 0]; smoke.push({ x: m[0] + m[1] / 2, y: G - m[2], r: 8, a: 1, vx: (Math.random() - .5) * 14 }); } }
  for (let i = smoke.length - 1; i >= 0; i--) { const p = smoke[i]; p.y -= dt * 34; p.x += p.vx * dt; p.r += dt * 16; p.a -= dt * .22; if (p.a <= 0) smoke.splice(i, 1); }
  if (!hintGone && T > 6.5) hideHint();
}
function hideHint() { hintGone = true; const h = $('#hint'); h.style.opacity = 0; setTimeout(() => h.remove(), 700); }
function layoutDom() {
  const hideWorld = rev.active || !map.hidden; if (world.hidden !== hideWorld) world.hidden = hideWorld;
  for (const o of els) {
    const sx = (o.x - cam.x) * s, vis = Math.abs(o.sc - cur) <= 1 && sx > -560 && sx < Wpx + 80;
    if (!vis) { if (o.vis !== false) { o.el.style.visibility = 'hidden'; o.vis = false; } continue; }
    if (o.vis !== true) { o.el.style.visibility = 'visible'; o.vis = true; }
    if (o.kind === 'hot') { o.el.style.transform = `translate(${sx.toFixed(1)}px,${(o.y * s).toFixed(1)}px)`; o.el.style.width = (o.w * s) + 'px'; o.el.style.height = (o.h * s) + 'px'; }
    else o.el.style.transform = `translate(${sx.toFixed(1)}px,${(o.y * s).toFixed(1)}px) scale(${o.kind === 'sign' && compact ? 1 : kS})`;
  }
  if (askDoor >= 0 && !compact) doorCard.style.transform = `translate(${((doorX(askDoor) - cam.x) * s - 440 * kS).toFixed(1)}px,${(236 * s).toFixed(1)}px) scale(${kS})`;
}

/* ---------- input ---------- */
const scene = $('#scene'), reader = $('#reader'), strip = $('#strip');
SC.forEach((sc, i) => { const b = mk('button', '', String(i + 1)); b.type = 'button'; b.setAttribute('aria-label', `Track ${i + 1}: ${sc.id}`); b.addEventListener('click', () => { closeCard(); goScene(i); }); strip.appendChild(b); });
const toWX = e => (e.clientX - scene.getBoundingClientRect().left) / s + cam.x;
scene.addEventListener('pointerdown', e => {
  if (e.target !== cv || overlay()) return; const wx = toWX(e);
  if (cur === CLUB && Math.abs(wx - ani.x) < 50) { dance(); return; }
  if (reduce) { step(wx > ani.x ? 1 : -1); return; }
  hold = wx > ani.x ? 1 : -1; try { scene.setPointerCapture(e.pointerId); } catch (err) { }
});
let mouseWY = 0;
scene.addEventListener('pointermove', e => { mouseWX = toWX(e); mouseWY = (e.clientY - scene.getBoundingClientRect().top) / s; mouseIn = e.pointerType === 'mouse' && e.target === cv; if (hold && e.target === cv) hold = mouseWX > ani.x ? 1 : -1; });
scene.addEventListener('pointerleave', () => { mouseIn = false; });
const release = () => { hold = 0; }; scene.addEventListener('pointerup', release); scene.addEventListener('pointercancel', release); addEventListener('blur', () => { hold = 0; keys.l = keys.r = false; });
[['#walk-l', -1], ['#walk-r', 1]].forEach(([id, d]) => { const b = $(id);
  b.addEventListener('pointerdown', e => { if (reduce) return; hold = d; try { b.setPointerCapture(e.pointerId); } catch (err) { } });
  b.addEventListener('pointerup', release); b.addEventListener('pointercancel', release);
  b.addEventListener('click', e => { if (reduce || e.detail === 0) step(d); }); });
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return; const k = e.key, ae = document.activeElement, onCtl = ae && /^(BUTTON|A)$/.test(ae.tagName);
  if (sheet.classList.contains('open')) { if (k === 'Escape') closeSheet(); return; }
  if (k === '?') { openSheet(); e.preventDefault(); return; }
  if (k === 'Escape') { if (!map.hidden) closeMap(); else if (!card.hidden) closeCard(); else if (ae) ae.blur(); return; }
  if (!map.hidden || rev.active) return;
  if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); if (reduce) { if (!e.repeat) step(k === 'ArrowRight' ? 1 : -1); } else keys[k === 'ArrowRight' ? 'r' : 'l'] = true; return; }
  if (k === 'Enter' && !onCtl) { e.preventDefault(); if (askDoor >= 0) approve(); else if (lit && lit.kind === 'hot') lit.el.click(); else if (lit && lit.kind === 'sign') lit.el.focus({ preventScroll: true }); return; }
  if (k === 'm' || k === 'M') { mapCmd(); return; }
  if (/^[0-9]$/.test(k) && (+k || 10) <= SC.length) { closeCard(); goScene((+k || 10) - 1); return; }
  if (cur === CLUB && !onCtl && (k === ' ' || k.length === 1)) { e.preventDefault(); dance(); }
});
addEventListener('keyup', e => { if (e.key === 'ArrowRight') keys.r = false; if (e.key === 'ArrowLeft') keys.l = false; });

/* ---------- the chip: two pulses, a triangle and LFSR noise on a 60 Hz tick ---------- */
const SCALE = { min: [0, 2, 3, 5, 7, 8, 10], maj: [0, 2, 4, 5, 7, 9, 11] };
const TRK = [
  { root: 55, sc: 'maj', spd: 9, prog: [0, 3, 4, 0], bass: 'x...x...x...5...', arp: 2, ap: 'x.x...x.x.x...x.', lead: '0..2..4...2.....', drum: '....h.......h...', d1: .25, d2: .125 },
  { root: 57, sc: 'maj', spd: 8, prog: [0, 5, 3, 4], bass: 'x.......x...5...', arp: 2, ap: 'x.x.x.x.x.x.x.x.', lead: '4..2..0.2.4.7...', drum: '....h.......h...', d1: .5, d2: .25 },
  { root: 50, sc: 'min', spd: 8, prog: [0, 0, 5, 6], bass: 'x..x..x.x..x..x.', arp: 1, ap: 'x...x...x...x.x.', lead: '-...........7.6.', drum: 'h.h.h.h.h.h.h.hh', d1: .125, d2: .25 },
  { root: 52, sc: 'min', spd: 9, prog: [0, 3, 0, 4], bass: 'x.......5.......', arp: 2, ap: 'x..x..x..x..x.x.', lead: '4.......5...4.2.', drum: 'k.......h.....h.', d1: .25, d2: .5, bl: 8 },
  { root: 53, sc: 'min', spd: 8, prog: [0, 5, 0, 6], bass: 'x.......5.......', arp: 2, ap: 'x...x...x...x...', lead: '7...4...2...4...', drum: '................', d1: .25, d2: .125, bl: 8 },
  { root: 50, sc: 'min', spd: 6, prog: [0, 6, 5, 6], bass: 'x.x.x.x.x.x.x.xo', arp: 1, ap: 'xxxxxxxxxxxxxxxx', lead: '0.2.4.7.6.4.2.4.', drum: 'k.h.s.h.k.k.s.hh', d1: .125, d2: .5 },
  { root: 50, sc: 'min', spd: 7, prog: [0, 3, 5, 4], bass: 'x.x.....x.x.....', arp: 1, ap: 'x.x.x.x.x.x.x.x.', lead: '4.....2.....0.2.', drum: 'k...h...k.h.h...', d1: .125, d2: .25 },
  { root: 52, sc: 'min', spd: 6, prog: [5, 6, 0, 0], bass: 'x.xox.xox.xox.xo', arp: 1, ap: 'xxxxxxxxxxxxxxxx', lead: '4...7...9...7.6.', drum: 'k.h.s.h.k.h.s.h.', d1: .25, d2: .25 },
  { root: 57, sc: 'min', spd: 7, prog: [0, 5, 2, 6], bass: '..x...x...x...x.', arp: 1, ap: 'x.xxx.xxx.xxx.xx', lead: '7..7..5.4..4..2.', drum: 'k.hhs.h.k.hhs.hk', d1: .25, d2: .5 },
  { root: 57, sc: 'maj', spd: 10, prog: [0, 3, 0, 4], bass: 'x...............', arp: 2, ap: 'x...x...x...x...', lead: '----------------', drum: '................', d1: .5, d2: .5, bl: 14 }
];
const d2f = (tr, d) => { const sc = SCALE[tr.sc], o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return 440 * Math.pow(2, (tr.root + 12 * o + sc[i] - 69) / 12); };
const lastHit = (str, r) => { for (let j = r; j >= 0; j--) if (str[j] !== '.') return [str[j], j]; return null; };
function chip(ti, tick, fl) {
  const tr = TRK[ti], spd = tr.spd, row = Math.floor(tick / spd), sub = tick - row * spd, r = row & 15, ch = tr.prog[(row >> 4) & 3];
  const o = { tri: { f: 0, v: 0 }, p1: { f: 0, v: 0 }, p2: { f: 0, v: 0 }, nz: { r: 1, v: 0 } };
  const b = lastHit(tr.bass, r); if (b && b[0] !== '-') { const age = (r - b[1]) * spd + sub; o.tri.f = d2f(tr, b[0] === 'x' ? ch - 7 : b[0] === 'o' ? ch : ch - 3); o.tri.v = age < spd * (tr.bl || 2) ? 1 : 0; }
  if (fl.triOnly) { o.tri.f = d2f(tr, -7); o.tri.v = 1; return o; }
  if (tr.ap[r] === 'x') { const tones = [ch, ch + 2, ch + 4, ch + 7]; o.p1.f = d2f(tr, tones[tr.arp === 1 ? Math.floor(tick / 2) % 3 : (r >> 1) & 3] + 7); o.p1.v = Math.max(0, 1 - sub / spd * .7) * .6; }
  const l = lastHit(tr.lead, r); if (l && l[0] !== '-') { const age = (r - l[1]) * spd + sub; let f = d2f(tr, ch + (+l[0]) + 7); if (age > 10) f *= 1 + .006 * Math.sin(age * .9); o.p2.f = f; o.p2.v = Math.max(0, .9 - age * .03); }
  const dc = tr.drum[r]; if (dc === 'k') { o.nz.v = Math.max(0, 1 - sub / 4); o.nz.r = .018 + .02 * (1 - sub / 4); } else if (dc === 's') { o.nz.v = Math.max(0, 1 - sub / 5) * .8; o.nz.r = .3; } else if (dc === 'h') { o.nz.v = sub < 2 ? .4 : 0; o.nz.r = 1; }
  if (fl.alarm && ti === MAPR) { o.p1.f = d2f(tr, Math.floor(tick / 10) % 2 ? 7 : 11); o.p1.v = .5; }
  return o;
}
let AC = null, N = null, soundOn = false, nextTick = 0, ducked = false;
const seq = { track: 0, t0: performance.now() / 1000 };
const clock = () => (soundOn && AC ? AC.currentTime : performance.now() / 1000);
const tickNow = () => Math.max(0, (clock() - seq.t0) * 60);
function pulseWave(d) { const n = 40, re = new Float32Array(n), im = new Float32Array(n); for (let i = 1; i < n; i++) re[i] = 2 / (i * Math.PI) * Math.sin(i * Math.PI * d); return AC.createPeriodicWave(re, im); }
function initAudio() {
  AC = new (window.AudioContext || window.webkitAudioContext)();
  const master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination);
  const ch = (node, lvl) => { const gn = AC.createGain(); gn.gain.value = 0; node.connect(gn); gn.connect(master); node.start(); return { node, gn, lvl }; };
  const waves = { '0.125': pulseWave(.125), '0.25': pulseWave(.25), '0.5': pulseWave(.5) };
  const p1 = AC.createOscillator(), p2 = AC.createOscillator(), tri = AC.createOscillator(); tri.type = 'triangle';
  const len = 32767, buf = AC.createBuffer(1, len, AC.sampleRate), dat = buf.getChannelData(0); let reg = 1;
  for (let i = 0; i < len; i++) { const bit = (reg ^ (reg >> 1)) & 1; reg = (reg >> 1) | (bit << 14); dat[i] = reg & 1 ? 1 : -1; }
  const nz = AC.createBufferSource(); nz.buffer = buf; nz.loop = true;
  N = { master, waves, p1: ch(p1, .1), p2: ch(p2, .11), tri: ch(tri, .3), nz: ch(nz, .1) }; setDuty();
}
function setDuty() { if (!N) return; const tr = TRK[seq.track]; N.p1.node.setPeriodicWave(N.waves[tr.d1]); N.p2.node.setPeriodicWave(N.waves[tr.d2]); }
function setTrack(i) { seq.track = i; seq.t0 = clock(); nextTick = 0; setDuty(); }
function duck(on) { ducked = on; if (N) N.master.gain.setTargetAtTime(on ? .12 : .5, AC.currentTime, .08); }
function schedule() {
  if (!soundOn || !N) return; const hz = AC.currentTime + .13;
  for (; seq.t0 + nextTick / 60 < hz; nextTick++) {
    const t = seq.t0 + nextTick / 60; if (t < AC.currentTime) continue; const st = chip(seq.track, nextTick, flags);
    for (const kk of ['p1', 'p2', 'tri']) { if (st[kk].f) N[kk].node.frequency.setValueAtTime(st[kk].f, t); N[kk].gn.gain.setValueAtTime(st[kk].v * N[kk].lvl, t); }
    N.nz.node.playbackRate.setValueAtTime(st.nz.r, t); N.nz.gn.gain.setValueAtTime(st.nz.v * N.nz.lvl, t);
  }
}
function blip(f, d) { if (!soundOn || !N) return; const o = AC.createOscillator(), gn = AC.createGain(); o.setPeriodicWave(N.waves['0.25']); o.frequency.value = f; gn.gain.setValueAtTime(.07, AC.currentTime); gn.gain.linearRampToValueAtTime(0, AC.currentTime + d); o.connect(gn); gn.connect(N.master); o.start(); o.stop(AC.currentTime + d + .02); }
const horn = $('#b-horn');
horn.addEventListener('click', () => {
  const tk = tickNow();
  if (!soundOn) { if (!AC) initAudio(); AC.resume(); soundOn = true; seq.t0 = AC.currentTime - tk / 60; nextTick = Math.ceil(tk) + 1; say('Sound on.'); }
  else { soundOn = false; seq.t0 = performance.now() / 1000 - tk / 60; ['p1', 'p2', 'tri', 'nz'].forEach(kk => { N[kk].gn.gain.cancelScheduledValues(0); N[kk].gn.gain.setValueAtTime(0, AC.currentTime); }); say('Sound off.'); }
  horn.setAttribute('aria-pressed', soundOn);
});
setInterval(schedule, 25);

/* ---------- loop ---------- */
function resize() {
  const r = scene.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); Wpx = r.width; Hpx = r.height; cv.width = Math.round(Wpx * dpr); cv.height = Math.round(Hpx * dpr);
  s = Hpx / 900; VW = Wpx / s; cam.cx = VW / 2; compact = innerWidth <= 760; kS = compact ? Math.max(.6, Math.min(1, s * 1.5)) : clamp(s, .8, 1.12); snapCam = true;
  if (!hintGone) $('#hint').textContent = reduce ? 'press → to step' : compact ? 'hold right to walk' : 'hold → to walk'; if (!map.hidden) layoutPlan();
}
addEventListener('resize', resize);
let raf = 0, prev = 0;
function frame(now) { const dt = Math.min(.05, (now - prev) / 1000 || 0); prev = now; update(dt); drawWorld(); layoutDom(); raf = requestAnimationFrame(frame); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; if (AC && soundOn) AC.suspend(); } else if (!raf) { prev = performance.now(); raf = requestAnimationFrame(frame); if (AC && soundOn) AC.resume(); } });
resize(); enterScene(0); prev = performance.now(); raf = requestAnimationFrame(frame);
window.__staging = { ani, cam, SC, MX, craftX: CR[0].x, WORK, LAWN, MAPR, CLUB, goScene, approve, state: () => ({ cur, askDoor, revealed, hasKey, approved: approved.slice(), VW, s, compact, lit: lit && lit.head, E: E.slice() }), setReduce: v => { reduce = v; } };
})();
