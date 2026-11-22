#!/usr/bin/env node
/**
 * Downloads the on-device speech model (whisper.cpp ggml-base.en, 148 MB) into assets/models/,
 * where Metro bundles it into the APK. Runs on `npm install`; skips if the file is already there.
 * The model is too big for git, so it is fetched rather than committed.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const NAME = 'ggml-base.en.bin';
const SIZE = 147964211;
const SOURCES = [
  `https://github.com/anik1617/Team_43/releases/download/models-v1/${NAME}`,
  `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${NAME}`,
];
const dest = path.join(__dirname, '..', 'assets', 'models', NAME);

function get(url, file, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'kyro-demo-setup' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 8) {
        res.resume();
        return resolve(get(new URL(res.headers.location, url).toString(), file, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const total = Number(res.headers['content-length']) || SIZE;
      let got = 0, lastPct = -1;
      const out = fs.createWriteStream(file);
      res.on('data', (d) => {
        got += d.length;
        const pct = Math.floor((got / total) * 100);
        if (pct % 10 === 0 && pct !== lastPct) { lastPct = pct; process.stdout.write(`  ${pct}%\n`); }
      });
      res.pipe(out);
      out.on('finish', () => out.close(() => resolve(got)));
      out.on('error', reject);
      res.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  if (fs.existsSync(dest) && fs.statSync(dest).size === SIZE) {
    console.log(`[kyro] speech model present: assets/models/${NAME}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = dest + '.part';
  for (const url of SOURCES) {
    try {
      console.log(`[kyro] downloading speech model (148 MB) from ${new URL(url).host} ...`);
      await get(url, tmp);
      if (fs.statSync(tmp).size !== SIZE) throw new Error('size mismatch');
      fs.renameSync(tmp, dest);
      console.log(`[kyro] saved assets/models/${NAME}`);
      return;
    } catch (e) {
      console.log(`[kyro]   failed: ${e.message}`);
      try { fs.unlinkSync(tmp); } catch {}
    }
  }
  console.log(`[kyro] WARNING: could not download ${NAME}. Run "npm run fetch-model" when online; the app will not bundle without it.`);
})();
