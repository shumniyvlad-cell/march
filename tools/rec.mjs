// Запись живых сайтов через CDP screencast → кадры с таймкодами → mp4.
// node rec.mjs <outDir> [id ...]
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.argv[2]);
const ONLY = process.argv.slice(3);
const PORT = 9377;
const G = 'https://shumniyvlad-cell.github.io/';

// pages = сколько экранов прокрутить, dur = секунд на прокрутку
const SITES = [
  { id: 'liks', url: G + 'liks/', mobile: true, pages: 1.6, dur: 11, tabs: '.tabbar .tab' },
  { id: 'closer', url: G + 'closer/', pages: 4.5, dur: 9 },
  { id: 'pdd', url: G + 'pdd-sdal/', pages: 2.5, dur: 8, settle: 5000 },
  { id: 'napor', url: G + 'napor/', pages: 2.2, dur: 8, settle: 4000 },
  { id: 'katka', url: G + 'katka/', pages: 4, dur: 9 },
  // focus: доехать до блока и подержать кадр, пока он играет (переписка с тающей ценой)
  { id: 'sotvori', url: G + 'sotvori-sebya/', focus: '#chat', dur: 2.6, hold: 9000 },
  { id: 'progon', url: G + 'progon/', pages: 3.5, dur: 9, settle: 4500 },
  { id: 'mvs', url: G + 'mvs-kz/', pages: 4.5, dur: 9 },
  { id: 'den', url: G + 'zapusk-za-den/', pages: 4, dur: 9 },
  { id: 'dalshe', url: G + 'nadezhda-dalshe/', pages: 4, dur: 9 },
  { id: 'prikorm', url: G + 'proprikorm-site/', pages: 4.5, dur: 9 },
  { id: 'fond', url: G + 'fond-svyatiteley/', pages: 4, dur: 9, settle: 4500 },
  { id: 'utochkin', url: G + 'utochkin/', pages: 4, dur: 9 },
  { id: 'kryuk', url: G + 'kryuk/', pages: 3.5, dur: 9 },
  { id: 'sorabi', url: G + 'sorabi/', pages: 4, dur: 9 },
  { id: 'vstroeno', url: G + 'vstroeno/', pages: 2.5, dur: 8 },
  { id: 'edits', url: 'https://marchvlv.ru/edits/', pages: 4.5, dur: 9, settle: 4000 },
  { id: 'storozh', url: 'https://marchvlv.ru/storozh/', pages: 3, dur: 8 },
  { id: 'sotka', url: G + 'sotka-expert/', pages: 4, dur: 9, settle: 5500 },
  { id: 'oksana', url: G + 'oksana-pavlova/', pages: 4, dur: 9 },
  { id: 'zhanar', url: G + 'zhanar-perehod/', pages: 4, dur: 9 },
  { id: 'dogovor', url: G + 'neglasnyi-dogovor/', pages: 4, dur: 9 },
  { id: 'katka-m', url: G + 'katka/', mobile: true, pages: 3, dur: 8 },
  { id: 'napor-m', url: G + 'napor/', mobile: true, pages: 3, dur: 8, settle: 4000 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const prof = path.join(OUT, '_prof');
fs.mkdirSync(OUT, { recursive: true });
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`,
  '--hide-scrollbars', '--mute-audio', '--no-first-run', '--window-size=1440,900',
  '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
], { stdio: 'ignore' });

let ver;
for (let i = 0; i < 50; i++) {
  try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; } catch { await sleep(200); }
}
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let mid = 0;
const pending = new Map();
const handlers = new Set();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  else for (const h of handlers) h(m);
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++mid; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId }));
});

async function record(site) {
  const dir = path.join(OUT, site.id);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const W = site.mobile ? 390 : 1440, H = site.mobile ? 844 : 900, DPR = site.mobile ? 2 : 1;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  await S('Page.enable'); await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: !!site.mobile });
  if (site.mobile) {
    await S('Emulation.setTouchEmulationEnabled', { enabled: true });
    await S('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  }
  await S('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  const loaded = new Promise((r) => { const h = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { handlers.delete(h); r(); } }; handlers.add(h); });
  await S('Page.navigate', { url: site.url });
  await Promise.race([loaded, sleep(20000)]);
  await sleep(site.settle ?? 3000);
  const frames = [];
  const fh = (m) => {
    if (m.sessionId !== sessionId || m.method !== 'Page.screencastFrame') return;
    const n = frames.length; const f = path.join(dir, `f${String(n).padStart(5, '0')}.jpg`);
    fs.writeFileSync(f, Buffer.from(m.params.data, 'base64'));
    frames.push({ f, t: m.params.metadata.timestamp });
    S('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
  };
  handlers.add(fh);
  await S('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1 });
  const js = `(async()=>{
    const sl=ms=>new Promise(r=>setTimeout(r,ms));
    const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
    const inner=()=>{let best=null,bm=60;for(const el of document.querySelectorAll('body *')){const cs=getComputedStyle(el);
      if(!/(auto|scroll)/.test(cs.overflowY))continue;const r=el.getBoundingClientRect();if(r.width<innerWidth*.5||r.height<innerHeight*.4||cs.visibility==='hidden'||r.left<-10||r.left>innerWidth-50)continue;
      const m=el.scrollHeight-el.clientHeight;if(m>bm){bm=m;best=el;}}return best;};
    const run=(set,to,D)=>new Promise(res=>{const t0=performance.now();(function step(){const p=Math.min(1,(performance.now()-t0)/D);set(to*ease(p));p<1?requestAnimationFrame(step):res();})();});
    const se=document.scrollingElement||document.documentElement;
    const max=Math.max(0,se.scrollHeight-innerHeight);
    const tabs=${JSON.stringify(site.tabs || '')};
    await sl(1300);
    if(tabs){
      const list=[...document.querySelectorAll(tabs)];
      for(let i=0;i<list.length;i++){ if(i>0){list[i].click(); await sl(900);} const el=inner(); if(el){await run(v=>{el.scrollTop=v},Math.min(el.scrollHeight-el.clientHeight,innerHeight*${site.pages}),${Math.round(site.dur * 1000)}/list.length*0.75);} await sl(500); }
      await sl(600); return ['tabs',list.length];
    }
    const focus=${JSON.stringify(site.focus || '')};
    if(focus){ const el=document.querySelector(focus); const r=el.getBoundingClientRect(); const to=Math.max(0,r.top+scrollY-(innerHeight-r.height)/2); await run(v=>window.scrollTo({top:v,behavior:'instant'}),to,${site.dur * 1000}); await sl(${site.hold || 6000}); return ['focus',to]; }
    if(max>80){ const to=Math.min(max,innerHeight*${site.pages}); await run(v=>window.scrollTo({top:v,behavior:'instant'}),to,${site.dur * 1000}); await sl(900); return [max,to]; }
    const el=inner(); if(el){ const to=Math.min(el.scrollHeight-el.clientHeight,innerHeight*${site.pages}); await run(v=>{el.scrollTop=v},to,${site.dur * 1000}); await sl(900); return ['inner',to]; }
    await sl(4000); return ['static',0];
  })()`;
  const r = await S('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true });
  await S('Page.stopScreencast'); handlers.delete(fh);
  await send('Target.closeTarget', { targetId });
  if (frames.length < 5) { console.log(site.id, 'нет кадров', frames.length); return; }
  let list = '';
  for (let i = 0; i < frames.length; i++) {
    const d = i < frames.length - 1 ? Math.max(0.005, frames[i + 1].t - frames[i].t) : 0.2;
    list += `file '${frames[i].f}'\nduration ${d.toFixed(4)}\n`;
  }
  list += `file '${frames.at(-1).f}'\n`;
  fs.writeFileSync(path.join(dir, 'list.txt'), list);
  const vf = site.mobile ? 'fps=30,scale=540:-2:flags=lanczos' : 'fps=30,scale=1200:-2:flags=lanczos';
  const mp4 = path.join(OUT, site.id + '.mp4');
  const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'),
    '-vf', vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', '-an', mp4], { encoding: 'utf8' });
  const dur = frames.at(-1).t - frames[0].t;
  console.log(site.id, 'кадров', frames.length, 'сек', dur.toFixed(1), 'scroll', JSON.stringify(r.result?.value), ff.stderr?.slice(0, 200) || '', (fs.statSync(mp4).size / 1e6).toFixed(2) + 'MB');
}

for (const s of SITES) {
  if (ONLY.length && !ONLY.includes(s.id)) continue;
  try { await record(s); } catch (e) { console.log(s.id, 'ошибка', e.message); }
}
ws.close(); chrome.kill();
process.exit(0);
