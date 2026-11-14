const url = 'http://127.0.0.1:8711/index.html', out = 'output/';
export default async api => {
  const size = process.env.SIZE || '1440x900', mobile = size.endsWith('m'), [w, h] = size.replace('m', '').split('x').map(Number), t = (process.env.TAG || 'f') + '-' + w;
  await api.size(w, h, mobile);
  if (process.env.STILL) await api.media([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await api.go(url); await api.sleep(3000);
  const S = '__staging';
  await api.ev(`${S}.ani.x=${S}.SC[2].x0-150`); await api.sleep(900); await api.shot(`${out}${t}-door.png`);
  await api.press('Enter'); await api.sleep(700); await api.shot(`${out}${t}-door-open.png`);
  await api.ev(`${S}.goScene(${S}.MAPR,${S}.MX-70)`); await api.sleep(300); await api.ev(`${S}.ani.x=${S}.SC[${S}.MAPR].x0+${S}.MX-30`);
  await api.sleep(450); await api.shot(`${out}${t}-rev1.png`); await api.sleep(700); await api.shot(`${out}${t}-rev2.png`);
  await api.sleep(4500); await api.shot(`${out}${t}-map.png`);
  await api.press('Escape'); await api.sleep(300);
  await api.ev(`${S}.goScene(${S}.CLUB,${S}.craftX-200)`); await api.sleep(500); await api.ev(`document.querySelectorAll('.hot.craft')[1].click()`); await api.sleep(600); await api.shot(`${out}${t}-craft.png`);
  await api.press('Escape'); await api.press('?'); await api.sleep(400); await api.shot(`${out}${t}-sheet.png`);
  console.log(JSON.stringify(await api.ev(`${S}.state()`)));
};
