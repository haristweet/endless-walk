// 絵で確かめる台本：決まった時刻のコマを描いて1枚の一覧にする
//   python3 -m http.server 8801 &  node test/shots.mjs [出力.png]
// 曲（無音の WAV）を入れた状態で、バッドエンドの前後を目線・後ろから・線画で並べる
// 街を見るとき：TIMES=2,30,60 VIEWS='[["eye","solid",false,"india","night"]]' のように時刻と［視点・描き方・飾り・街・歩き始め・BAD END（false で切る）］を渡す
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || 'shots.png';
const LEN = 20; // 曲の長さ（秒）。跳ねられるのは 17.4 秒
const TIMES = (process.env.TIMES || '5,14.5,16.2,17.2,17.55,17.9,18.6,19.6').split(',').map(Number);
const VIEWS = JSON.parse(process.env.VIEWS || '[["eye","solid",false],["chase","solid",true],["chase","wire",false]]');
const sr = 8000, n = sr * LEN, wav = Buffer.alloc(44 + n * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
p.on('pageerror', e => console.error('pageerror', e.message));
await p.goto('http://localhost:8801/');
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.setInputFiles('#afile', { name: 'test.wav', mimeType: 'audio/wav', buffer: wav });
await p.waitForFunction(() => typeof snd !== 'undefined' && snd);
const cells = [];
for (const [view, style, deco, scene, start, bad] of VIEWS) for (const t of TIMES) {
  cells.push(await p.evaluate(([view, style, deco, scene, start, bad, t]) => {
    playing = false; exporting = true;
    Object.assign(cfg, { view, style, deco, aspect: '16:9', seed: 1234, scenes: scene ? [scene] : [...KIND_ORDER], start: start || 'morning', badEnd: bad !== false });
    const s = newSim(), dt = 1 / 30;
    for (let k = 0; k < Math.round(t / dt); k++) s.update(dt);
    const c = document.createElement('canvas'); c.width = 480; c.height = 270;
    drawFrame(c.getContext('2d'), 480, 270, s, lookFor(s));
    return c.toDataURL();
  }, [view, style, deco, scene, start, bad, t]));
}
const html = `<body style="margin:0;background:#222;color:#ccc;font:12px sans-serif"><div style="display:grid;grid-template-columns:repeat(${TIMES.length},240px);gap:2px">`
  + TIMES.map(t => `<div>${t}s</div>`).join('') + cells.map(u => `<img src="${u}" width=240>`).join('') + '</div>';
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
await b.close();
console.log('wrote', out);
