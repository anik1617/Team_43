/**
 * Turns a free-speech intake transcript into structured case fields.
 *
 * Deterministic rules only (no model): number words are normalised to digits, then each finding is
 * matched by pattern and range-checked. A finding that is not clearly heard is left out, never
 * guessed. The intake screen fills any missing critical field from the read-back step instead.
 */

export type Field = {
  key: string;
  label: string;
  value: string;
  icon: string;
  critical?: boolean;
  /** Character offset in the normalised transcript, so fields land in the order they were said. */
  at: number;
};

export type ReadbackItem = { key: string; label: string; value: string; detail: string; heard: boolean };

export type Parsed = {
  fields: Field[];
  gcs?: { total: number; e?: number; v?: number; m?: number };
  bp?: { sys: number; dia: number };
  hr?: number;
  spo2?: number;
  loc?: { yes: boolean; detail?: string };
  lucid?: boolean;
  mech?: { label: string; highEnergy: boolean };
  pupils?: 'equal' | 'right_sluggish' | 'right_fixed';
};

// ── Number words → digits ─────────────────────────────────────────────────────

const UNITS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const isNumWord = (w: string) => w in UNITS || w in TENS || w === 'hundred';

/** Converts one run of number words. Handles "one hundred and fifty", "one fifty", "ninety six". */
function runToNumber(words: string[]): number[] {
  // Split into "compound" groups: tens(+unit) | unit | hundred.
  type G = { kind: 'u' | 't' | 'h'; v: number };
  const g: G[] = [];
  for (const w of words) {
    if (w === 'hundred') g.push({ kind: 'h', v: 100 });
    else if (w in TENS) g.push({ kind: 't', v: TENS[w] });
    else g.push({ kind: 'u', v: UNITS[w] });
  }
  // Merge tens + following unit 1-9 ("ninety six" → 96).
  const c: { v: number; small: boolean; tensLike: boolean }[] = [];
  for (let i = 0; i < g.length; i++) {
    const x = g[i];
    if (x.kind === 't' && g[i + 1]?.kind === 'u' && g[i + 1].v > 0 && g[i + 1].v < 10) {
      c.push({ v: x.v + g[i + 1].v, small: false, tensLike: true }); i++;
    } else if (x.kind === 'h') {
      const prev = c.pop();
      c.push({ v: (prev ? prev.v : 1) * 100, small: false, tensLike: false });
      (c[c.length - 1] as any).hundred = true;
    } else {
      c.push({ v: x.v, small: x.kind === 'u' && x.v < 10, tensLike: x.kind === 't' || x.v >= 10 });
    }
  }
  // Combine: "X hundred" + compound, or colloquial "one fifty" (single digit + 10..99) → 150.
  const out: number[] = [];
  for (let i = 0; i < c.length; i++) {
    const x = c[i] as any;
    const nx = c[i + 1];
    if (x.hundred && nx && nx.v < 100) { out.push(x.v + nx.v); i++; continue; }
    if (x.small && x.v > 0 && nx && nx.tensLike && nx.v >= 10 && nx.v < 100) { out.push(x.v * 100 + nx.v); i++; continue; }
    out.push(x.v);
  }
  return out;
}

export function normalise(raw: string): string {
  let s = ' ' + raw.toLowerCase() + ' ';
  s = s.replace(/[‐-―]/g, '-');
  s = s.replace(/\[[^\]]*\]|\([^)]*\)/g, ' '); // whisper markers like [BLANK_AUDIO], (coughs)
  s = s.replace(/\bg\.?\s?c\.?\s?s\.?(?=[\s\d,.]|$)/g, 'gcs');
  s = s.replace(/\bglasgow(?: coma)?(?: scale| score)?(?: score)?\b/g, 'gcs');
  s = s.replace(/\bb\.?\s?p\.?(?=[\s\d,.])/g, 'bp');
  s = s.replace(/\bsp\s?o2\b|\bspo two\b|\bsp02\b/g, 'spo2');
  s = s.replace(/(\d),(\d{3})/g, '$1$2');
  s = s.replace(/(\d)\s*-\s*(year|month|week|day|hour|minute)/g, '$1 $2');
  s = s.replace(/-/g, ' ');
  // Number words → digits, run by run ("one fifty over eighty five" → "150 over 85").
  const toks = s.split(/(\s+|[,.;:!?%/])/);
  const res: string[] = [];
  let run: string[] = [];
  let pending: string[] = []; // separators inside a run ("one hundred and fifty")
  const flush = () => {
    if (run.length) res.push(runToNumber(run).join(' '));
    run = [];
    res.push(...pending); pending = [];
  };
  for (const t of toks) {
    if (!t) continue;
    if (isNumWord(t)) { if (pending.length) { const keep = pending; pending = []; if (keep.join('').trim() === '' || keep.join('').trim() === 'and') { /* stay in run */ } else { flush(); res.push(...keep); } } run.push(t); continue; }
    if (run.length && (/^\s+$/.test(t) || (t === 'and' && run.includes('hundred')))) { pending.push(t); continue; }
    flush();
    res.push(t);
  }
  flush();
  s = res.join('');
  s = s.replace(/\bpercent\b|\bper cent\b/g, '%');
  return s.replace(/\s+/g, ' ');
}

// ── Field extraction ──────────────────────────────────────────────────────────

const SIDE = '(right|left)';

export function parseIntake(raw: string): Parsed {
  const s = normalise(raw);
  const fields: Field[] = [];
  const p: Parsed = { fields };
  const add = (f: Omit<Field, 'at'>, at: number) => { if (at >= 0) fields.push({ ...f, at }); };
  const find = (re: RegExp) => { const m = re.exec(s); return m ? { m, at: m.index } : null; };

  // Age / sex
  const age = find(/\b(\d{1,3}) (?:years?|yrs?|year old|yo)\b(?: old)?/);
  const sexM = find(/\b(male|man|boy|gentleman|female|woman|girl|lady)\b/);
  if (age || sexM) {
    const a = age ? Number(age.m[1]) : undefined;
    const sex = sexM ? (/^(male|man|boy|gentleman)$/.test(sexM.m[1]) ? 'male' : 'female') : undefined;
    if (a === undefined || (a >= 0 && a <= 110)) {
      add({ key: 'age', label: 'Age / sex', value: [a !== undefined ? String(a) : null, sex].filter(Boolean).join(' · '), icon: 'user' },
        Math.min(age?.at ?? Infinity, sexM?.at ?? Infinity));
    }
  }

  // Mechanism
  const mech = find(/\b(motorcycle|motor cycle|motorbike|motor bike|bike|scooter|car|truck|lorry|vehicle|road traffic|rollover|roll over|fell|fall|fallen|assault|assaulted|hit by|struck)\b/);
  if (mech) {
    const w = mech.m[1];
    let label = 'Head injury';
    let highEnergy = true;
    if (/motor|bike|scooter/.test(w)) label = 'Motorcycle crash';
    else if (/car|truck|lorry|vehicle|road traffic|roll/.test(w)) label = 'Road traffic crash';
    else if (/fell|fall/.test(w)) { label = /height|roof|tree|stairs|metres|meters|feet/.test(s) ? 'Fall from height' : 'Fall'; highEnergy = label !== 'Fall'; }
    else if (/assault|hit by|struck/.test(w)) { label = 'Assault'; highEnergy = false; }
    if (/\b(no|without|not wearing|wasn't wearing|was not wearing) (a )?helmet|unhelmeted|helmetless/.test(s)) label += ', no helmet';
    else if (/\b(was )?wearing (a )?helmet|helmeted/.test(s)) label += ', helmeted';
    p.mech = { label, highEnergy };
    add({ key: 'mech', label: 'Mechanism', value: label, critical: true, icon: 'alert-triangle' }, mech.at);
  }

  // Time since injury
  const tm = find(/\b(?:about |around |roughly |approximately |nearly |almost )?(\d+(?:\.\d+)?|an?|half an?) (hours?|hrs?|minutes?|mins?) ago\b/);
  if (tm) {
    const n = tm.m[1] === 'a' || tm.m[1] === 'an' ? '1' : tm.m[1].startsWith('half') ? '½' : tm.m[1];
    const unit = /^h/.test(tm.m[2]) ? (n === '1' ? 'hour' : 'hours') : 'min';
    add({ key: 'time', label: 'Time since injury', value: `≈ ${n} ${n === '½' ? 'hour' : unit}`, icon: 'clock' }, tm.at);
  }

  // Loss of consciousness
  const noLoc = find(/\b(no loss of consciousness|did not lose consciousness|didn't lose consciousness|never lost consciousness|no loc)\b/);
  const loc = noLoc ? null : find(/\b(lost consciousness|loss of consciousness|knocked out|was unconscious|passed out|blacked out|lost conscious)\b/);
  if (noLoc) { p.loc = { yes: false }; add({ key: 'loc', label: 'Loss of consciousness', value: 'No', critical: true, icon: 'moon' }, noLoc.at); }
  else if (loc) {
    const after = s.slice(loc.at, loc.at + 80);
    const d = /for (?:about |around )?(a minute or (?:two|2)|a couple of minutes|1 or 2 minutes|a few minutes|a minute|\d+(?: (?:or|to) \d+)? (?:minutes?|mins?|seconds?|secs?))/.exec(after);
    let detail: string | undefined;
    if (d) {
      const t = d[1];
      detail = /^a minute or|couple|^1 or 2/.test(t) ? '1–2 min' : t === 'a few minutes' ? 'a few min' : t === 'a minute' ? '1 min'
        : t.replace(/ (?:or|to) /, '–').replace(/minutes?|mins?/, 'min').replace(/seconds?|secs?/, 's');
    }
    p.loc = { yes: true, detail };
    add({ key: 'loc', label: 'Loss of consciousness', value: detail ? `Yes · ${detail}` : 'Yes', critical: true, icon: 'moon' }, loc.at);
  }

  // Lucid interval
  const lucid = find(/\b(lucid interval|lucid|talking normally|talking normal|was talking|then talking|started talking|woke up|came round|came around|came to|back to normal|recovered|was fine|seemed fine|seemed okay|seemed ok)\b/);
  if (lucid && p.loc?.yes !== false) {
    p.lucid = true;
    add({ key: 'lucid', label: 'Lucid interval', value: 'Yes · talking normally after', critical: true, icon: 'sunrise' }, lucid.at);
  }

  // Symptoms
  const sx: string[] = [];
  let sxAt = Infinity;
  const ha = find(/\b(severe |bad |terrible |worsening )?head ?aches?\b/);
  if (ha) { sx.push(ha.m[1]?.trim() === 'severe' || ha.m[1]?.trim() === 'terrible' || ha.m[1]?.trim() === 'bad' ? 'Severe headache' : 'Headache'); sxAt = Math.min(sxAt, ha.at); }
  const vom = find(/\b(vomited|vomiting|vomit|threw up|thrown up|been sick)\b/);
  if (vom) {
    const near = s.slice(vom.at, vom.at + 40);
    const before = s.slice(Math.max(0, vom.at - 30), vom.at);
    const k = /\b(twice|two times|2 times|three times|3 times|(\d+) times|once|several times|repeatedly)\b/.exec(near) || /\b(\d+) times\b/.exec(before);
    const count = k ? (k[1] === 'twice' || /^2|two/.test(k[1]) ? '×2' : /three|^3/.test(k[1]) ? '×3' : k[1] === 'once' ? '×1' : k[2] ? `×${k[2]}` : 'repeated') : null;
    sx.push(count ? `vomited ${count}` : 'vomiting');
    sxAt = Math.min(sxAt, vom.at);
  }
  const sz = find(/\b(seizure|fit|fitting|convulsion|convulsed)\b/);
  if (sz && !/\bno (seizure|fit|fits|convulsion)/.test(s)) { sx.push('seizure'); sxAt = Math.min(sxAt, sz.at); }
  if (sx.length) add({ key: 'sx', label: 'Symptoms', value: sx.map((x, i) => (i ? x : x[0].toUpperCase() + x.slice(1))).join(' · '), icon: 'activity' }, sxAt);

  // GCS: explicit total and/or E/V/M from words
  let e: number | undefined, v: number | undefined, m: number | undefined;
  let gAt = Infinity;
  const comp = (re: RegExp, val: number, set: (n: number) => void) => { const x = find(re); if (x) { set(val); gAt = Math.min(gAt, x.at); return true; } return false; };
  const ex = find(/\b(?:e|eyes?) ?(\d)\b[ ,]*(?:v|verbal) ?(\d)\b[ ,]*(?:m|motor) ?(\d)\b/);
  if (ex) { e = +ex.m[1]; v = +ex.m[2]; m = +ex.m[3]; gAt = ex.at; }
  else {
    comp(/\beyes? (?:are )?(?:open(?:ing)? )?spontaneous(?:ly)?|eyes (?:are )?open\b(?! to)/, 4, (n) => (e = n)) ||
      comp(/\beyes? (?:open(?:ing)? )?(?:only )?to (?:voice|speech|command|sound|verbal)/, 3, (n) => (e = n)) ||
      comp(/\beyes? (?:open(?:ing)? )?(?:only )?to pain/, 2, (n) => (e = n)) ||
      comp(/\b(?:no eye opening|eyes (?:remain |stay )?closed)/, 1, (n) => (e = n));
    comp(/\boriented\b|\borientated\b/, 5, (n) => (v = n)) ||
      comp(/\bconfused\b|\bdisoriented\b|\bdisorientated\b/, 4, (n) => (v = n)) ||
      comp(/\binappropriate words?\b|\bwords inappropriate\b|\brandom words\b/, 3, (n) => (v = n)) ||
      comp(/\bincomprehensible|\bmoaning\b|\bgroaning\b/, 2, (n) => (v = n)) ||
      comp(/\bno (?:verbal|speech|words|sounds)\b/, 1, (n) => (v = n));
    comp(/\bobey(?:s|ing)? (?:commands?|instructions?)|\bfollow(?:s|ing)? commands?/, 6, (n) => (m = n)) ||
      comp(/\blocali[sz](?:es|ing|e)\b/, 5, (n) => (m = n)) ||
      comp(/\bwithdraw(?:s|ing)?\b/, 4, (n) => (m = n)) ||
      comp(/\b(?:abnormal )?flexi(?:on|ng)\b|\bdecorticate\b/, 3, (n) => (m = n)) ||
      comp(/\bextensi(?:on|ng)\b|\bextending\b|\bdecerebrate\b/, 2, (n) => (m = n)) ||
      comp(/\bno motor (?:response)?\b/, 1, (n) => (m = n));
  }
  const gt = find(/\bgcs (?:is |of |was |score |score of |now |currently |is now |=)?(?:about )?(\d{1,2})\b/);
  let total = gt ? Number(gt.m[1]) : undefined;
  if (gt) gAt = Math.min(gAt, gt.at);
  if (total !== undefined && (total < 3 || total > 15)) total = undefined;
  if (total === undefined && e && v && m) total = e + v + m;
  if (total !== undefined) {
    const parts = e && v && m ? `  (E${e} V${v} M${m})` : '';
    p.gcs = { total, e, v, m };
    add({ key: 'gcs', label: 'GCS', value: `${total}${parts}`, critical: true, icon: 'eye' }, gAt);
  }

  // Blood pressure
  const bp = find(/\b(?:bp|blood pressure|pressure)?(?: is| of| was|:)? ?(\d{2,3}) ?(?:over|\/|on) ?(\d{2,3})\b/);
  if (bp) {
    const sys = +bp.m[1], dia = +bp.m[2];
    if (sys >= 50 && sys <= 260 && dia >= 20 && dia <= 160 && sys > dia) {
      p.bp = { sys, dia };
      add({ key: 'bp', label: 'Blood pressure', value: `${sys} / ${dia} mmHg`, critical: true, icon: 'heart' }, bp.at);
    }
  }

  // Heart rate
  const hr = find(/\b(?:heart rate|pulse rate|pulse|hr|heart rates?)(?: is| of| was| at|:)? (?:about )?(\d{2,3})\b/);
  if (hr) {
    const n = +hr.m[1];
    if (n >= 20 && n <= 250) { p.hr = n; add({ key: 'hr', label: 'Heart rate', value: `${n} bpm`, critical: true, icon: 'activity' }, hr.at); }
  }

  // SpO2
  const sp = find(/\b(?:sats|sat|sets|sacs|sax|saturations?|saturating|spo2|oxygen saturation|o2 sats?|oxygen)(?: are| is| of| at|:)? (?:about )?(\d{2,3}) ?%?/);
  if (sp) {
    const n = +sp.m[1];
    if (n >= 50 && n <= 100) {
      p.spo2 = n;
      const air = /room air/.test(s) ? ' on room air' : /on (?:oxygen|o2)|litres|liters/.test(s.slice(sp.at, sp.at + 60)) ? ' on oxygen' : '';
      add({ key: 'spo2', label: 'SpO₂', value: `${n} %${air}`, icon: 'wind' }, sp.at);
    }
  }

  // Scalp / skull findings
  const scalp = find(new RegExp(`\\b(boggy |large |small )?(swelling|haematoma|hematoma|bruise|bruising|laceration|cut|wound|lump|depression)\\b`));
  if (scalp) {
    const win = s.slice(Math.max(0, scalp.at - 40), scalp.at + 60);
    const side = new RegExp(SIDE).exec(win)?.[1];
    const reg = /(temple|temporal|frontal|forehead|parietal|occipital|back of the head)/.exec(win)?.[1];
    const region = reg === 'temple' ? 'temporal' : reg === 'forehead' ? 'frontal' : reg === 'back of the head' ? 'occipital' : reg;
    const what = scalp.m[2] === 'hematoma' || scalp.m[2] === 'haematoma' ? 'haematoma' : scalp.m[2] === 'bruising' ? 'bruise' : scalp.m[2];
    const txt = [side, region, what].filter(Boolean).join(' ');
    add({ key: 'scalp', label: 'Scalp', value: txt[0].toUpperCase() + txt.slice(1), icon: 'crosshair' }, scalp.at);
  }

  // Pupils (only if said; the scripted case leaves these for the "missing findings" step)
  const pe = find(/\bpupils? (?:are )?(?:both )?(?:equal|equal and reactive|normal|reactive)|\bpearl\b/);
  const pr = find(/\bright pupil (?:is )?(?:\d+ (?:mm|millimet(?:re|er)s?) ?,? ?)?(fixed|blown|dilated|sluggish|larger|bigger|unreactive)/);
  if (pr) {
    p.pupils = /fixed|blown|unreactive/.test(pr.m[1]) ? 'right_fixed' : 'right_sluggish';
    add({ key: 'pupils', label: 'Pupils', value: p.pupils === 'right_fixed' ? 'R fixed, dilated' : 'R larger, sluggish', critical: true, icon: 'eye' }, pr.at);
  } else if (pe) {
    p.pupils = 'equal';
    add({ key: 'pupils', label: 'Pupils', value: 'Equal & reactive', critical: true, icon: 'eye' }, pe.at);
  }

  // Imaging and distance to definitive care
  const noCt = find(/\b(no ct|no c t|no scanner|no scan|no imaging|ct is not available|no ct scanner|don't have (?:a )?ct|do not have (?:a )?ct)\b/);
  if (noCt) add({ key: 'ct', label: 'Imaging', value: 'No CT on site', icon: 'slash' }, noCt.at);
  const dist = find(/\b(\d{1,4}) ?(km|kms|kilomet(?:re|er)s?|miles?)\b/);
  if (dist) {
    const unit = /^mile/.test(dist.m[2]) ? 'miles' : 'km';
    add({ key: 'dist', label: 'Referral centre', value: `${dist.m[1]} ${unit} away`, icon: 'navigation' }, dist.at);
  }

  fields.sort((a, b) => a.at - b.at);
  return p;
}

/** Critical read-back items, from what was heard. Anything not heard falls back to `fallback` and is flagged. */
export function buildReadback(p: Parsed, fallback: Omit<ReadbackItem, 'heard'>[]): ReadbackItem[] {
  const fb = (k: string): ReadbackItem => {
    const f = fallback.find((x) => x.key === k)!;
    return { ...f, detail: 'Not clearly heard · please confirm', heard: false };
  };
  const out: ReadbackItem[] = [];
  out.push(p.gcs
    ? { key: 'gcs', label: 'Glasgow Coma Scale', value: String(p.gcs.total), heard: true,
        detail: p.gcs.e && p.gcs.v && p.gcs.m ? `Eyes ${p.gcs.e} · Verbal ${p.gcs.v} · Motor ${p.gcs.m}` : 'Total as stated' }
    : fb('gcs'));
  out.push(p.loc
    ? { key: 'loc', label: 'Loss of consciousness', value: p.loc.yes ? 'Yes' : 'No', heard: true, detail: p.loc.detail ? `${p.loc.detail}, at the scene` : p.loc.yes ? 'Duration not stated' : 'Denied' }
    : fb('loc'));
  out.push(p.lucid
    ? { key: 'lucid', label: 'Lucid interval', value: 'Yes', heard: true, detail: 'Talking normally, then worsening' }
    : fb('lucid'));
  out.push(p.bp
    ? { key: 'bp', label: 'Blood pressure', value: `${p.bp.sys}/${p.bp.dia}`, heard: true, detail: p.bp.sys >= 110 ? 'mmHg · systolic ≥ 110 ✓' : 'mmHg · systolic below 110' }
    : fb('bp'));
  out.push(p.hr
    ? { key: 'hr', label: 'Heart rate', value: String(p.hr), heard: true, detail: p.hr < 60 ? 'bpm · relative bradycardia' : 'bpm' }
    : fb('hr'));
  out.push(p.mech
    ? { key: 'mech', label: 'Mechanism', value: p.mech.highEnergy ? 'High-energy' : 'Low-energy', heard: true, detail: p.mech.label.replace(' crash', '').replace(', no helmet', ', unhelmeted') }
    : fb('mech'));
  return out;
}
