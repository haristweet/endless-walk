// 時刻のひとことの試験：0 秒のコマでまとめて出ないこと・一日で順に一度ずつ出ること
//   python3 -m http.server 8801 &  node test/msgs.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => { console.error('pageerror', e.message); process.exitCode = 1; });
await p.goto('http://localhost:8801/');
const r = await p.evaluate(() => {
  playing = false;
  const a = newSim(); a.update(0); a.update(0);
  const zero = a.log.filter(m => TIME_MSGS.some(q => q[1] === m.text)).length;
  // 一日ぶん（cfg.cycle 分）を 1/30 秒ずつ進め、言った時刻のひとことを数える（log は 8 件までなので say を横取りする）
  const s = newSim(), said = [], say = s.say.bind(s);
  s.say = t => { if (TIME_MSGS.some(q => q[1] === t)) said.push(t); say(t); };
  for (let k = 0; k < s.cycle * 30; k++) s.update(1 / 30);
  return { zero, said, all: TIME_MSGS.length };
});
const ok = r.zero === 0 && r.said.length === r.all && new Set(r.said).size === r.all;
console.log(ok ? 'ok' : 'NG', JSON.stringify(r));
if (!ok) process.exitCode = 1;
await b.close();
