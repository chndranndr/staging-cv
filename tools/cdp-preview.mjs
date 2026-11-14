// Drives headless Edge over CDP to screenshot and poke a study. Usage: node tools/cdp-preview.mjs <scenario.mjs>
// A scenario default-exports async (api) => {}; api has size, media, go, ev, shot, press, key, mouse, sleep.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port = 9333;
const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'cv-studies-edge')}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map(); const logs = [];
async function connect() {
  for (let i = 0; i < 40; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = l.find(x => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); return; } } catch (e) { }
    await sleep(250);
  }
  throw new Error('no edge');
}
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const api = {
  sleep, logs,
  async size(w, h, mobile = false) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile }); },
  async media(features) { await send('Emulation.setEmulatedMedia', { features }); },
  async go(url) { await send('Page.navigate', { url }); await sleep(600); },
  async ev(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; },
  async shot(name) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.resolve(name), Buffer.from(r.data, 'base64')); },
  async key(key, code, type = 'keyDown') { await send('Input.dispatchKeyEvent', { type, key, code: code || key, text: type === 'keyDown' && key.length === 1 ? key : undefined }); },
  async press(key, code) { await api.key(key, code, 'keyDown'); await api.key(key, code, 'keyUp'); },
  async mouse(type, x, y, buttons = 1) { await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : buttons, clickCount: 1 }); }
};
try {
  await connect();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } else if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text)); else if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) logs.push(d.params.type + ' ' + d.params.args.map(a => a.value ?? a.description).join(' ')); };
  await send('Runtime.enable'); await send('Page.enable');
  const sc = await import(pathToFileURL(path.resolve(process.argv[2])).href);
  await sc.default(api);
  console.log('page errors:', logs.length ? logs : 'none');
} catch (e) { console.log('FAILED', e.message, logs); }
finally { try { ws && ws.close(); } catch (e) { } proc.kill(); }
