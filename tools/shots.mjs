// node tools/cdp-preview.mjs tools/shots.mjs   (serve the project on 8711 first)
// SHOTS env: comma list of "scene:lx" pairs; SIZE env: "1440x900" or "390x844m"
const url = 'http://127.0.0.1:8711/index.html';
const out = 'output/';
import fs from 'node:fs';
export default async api => {
  fs.mkdirSync(out, { recursive: true });
  const size = process.env.SIZE || '1440x900', mobile = size.endsWith('m'), [w, h] = size.replace('m', '').split('x').map(Number);
  const list = (process.env.SHOTS || '0:900,1:330,2:900,3:1500,4:1300,5:2000,6:1900,7:1300,8:2300,9:900').split(',').map(p => p.split(':').map(Number));
  await api.size(w, h, mobile);
  if (process.env.STILL) await api.media([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await api.go(url + (process.env.HASH || ''));
  await api.sleep(3200);
  if (process.env.PRE) await api.ev(process.env.PRE);
  for (const [sc, lx] of list) {
    await api.ev(`__staging.goScene(${sc},${lx})`);
    await api.sleep(700);
    if (process.env.EACH) { await api.ev(process.env.EACH); await api.sleep(+process.env.WAIT || 600); }
    await api.shot(`${out}${process.env.TAG || 'v'}-${w}-${sc}-${lx}.png`);
  }
  console.log(JSON.stringify(await api.ev('__staging.state()')));
};
