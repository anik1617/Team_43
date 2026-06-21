/**
 * E3 — condition evaluator for the `cgt_edges.condition` grammar (SQL-like booleans).
 * Pure, deterministic, NO `eval` (safe). CODE decides traversal — the model never does.
 * Oracle: `edge/e3/conformance.py` traverses the same spine; this must reproduce its paths.
 *
 * Grammar (precedence low→high):
 *   or   := and (OR and)*
 *   and  := not (AND not)*
 *   not  := NOT not | cmp
 *   cmp  := primary [ (=|<>|<|>|<=|>=) primary
 *                   | BETWEEN num AND num
 *                   | [NOT] IN '[' (item(,item)* | num '..' num) ']' ]
 *   primary := '(' or ')' | ident | number | string | true | false
 * Operands resolve against `env`; an unresolved identifier THROWS → the executor treats a
 * faulting condition as a hard fault and routes to a safe abstain (fail-closed).
 */

export type Env = Record<string, string | number | boolean | null | undefined>;

type Tok = { t: string; v?: string };

const KW = new Set(['AND', 'OR', 'NOT', 'IN', 'BETWEEN']);

function lex(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "'") { let j = i + 1; while (j < s.length && s[j] !== "'") j++; out.push({ t: 'str', v: s.slice(i + 1, j) }); i = j + 1; continue; }
    if (/[0-9]/.test(ch)) { let j = i; while (j < s.length && /[0-9]/.test(s[j])) j++; out.push({ t: 'num', v: s.slice(i, j) }); i = j; continue; }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i; while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      const w = s.slice(i, j); i = j;
      if (KW.has(w)) out.push({ t: w });
      else if (w === 'true' || w === 'false') out.push({ t: 'bool', v: w });
      else out.push({ t: 'id', v: w });
      continue;
    }
    if (ch === '<' && s[i + 1] === '>') { out.push({ t: 'op', v: '<>' }); i += 2; continue; }
    if ((ch === '<' || ch === '>') && s[i + 1] === '=') { out.push({ t: 'op', v: ch + '=' }); i += 2; continue; }
    if (ch === '.' && s[i + 1] === '.') { out.push({ t: '..' }); i += 2; continue; }
    if ('=<>'.includes(ch)) { out.push({ t: 'op', v: ch }); i++; continue; }
    if ('()[],'.includes(ch)) { out.push({ t: ch }); i++; continue; }
    throw new Error(`condition lex: unexpected '${ch}' in: ${s}`);
  }
  return out;
}

export function evalCondition(cond: string, env: Env): boolean {
  if (cond === 'true') return true;
  if (cond === 'false') return false;
  const toks = lex(cond);
  let p = 0;
  const peek = () => toks[p];
  const take = () => toks[p++];
  const expect = (t: string) => { if (!toks[p] || toks[p].t !== t) throw new Error(`condition parse: expected ${t} in ${cond}`); return toks[p++]; };

  const val = (tok: Tok): any => {
    if (tok.t === 'id') { if (!(tok.v! in env)) throw new Error(`condition: unresolved field '${tok.v}' in ${cond}`); return env[tok.v!]; }
    if (tok.t === 'num') return parseInt(tok.v!, 10);
    if (tok.t === 'str') return tok.v!;
    if (tok.t === 'bool') return tok.v === 'true';
    throw new Error(`condition: bad operand '${tok.t}' in ${cond}`);
  };

  // NB: never short-circuit — both sides must be parsed to consume tokens.
  const orE = (): boolean => { let r = andE(); while (peek()?.t === 'OR') { take(); const b = andE(); r = r || b; } return r; };
  const andE = (): boolean => { let r = notE(); while (peek()?.t === 'AND') { take(); const b = notE(); r = r && b; } return r; };
  const notE = (): boolean => { if (peek()?.t === 'NOT') { take(); return !notE(); } return cmp(); };
  const cmp = (): boolean => {
    if (peek()?.t === '(') { take(); const r = orE(); expect(')'); return r; }
    const lv = val(take());
    const nt = peek()?.t;
    if (nt === 'op') {
      const op = take().v!; const rv = val(take());
      switch (op) { case '=': return lv === rv; case '<>': return lv !== rv; case '<': return lv < rv; case '>': return lv > rv; case '<=': return lv <= rv; case '>=': return lv >= rv; }
    }
    if (nt === 'BETWEEN') { take(); const a = val(take()); expect('AND'); const b = val(take()); return lv >= a && lv <= b; }
    if (nt === 'IN' || (nt === 'NOT' && toks[p + 1]?.t === 'IN')) {
      let neg = false; if (peek()?.t === 'NOT') { take(); neg = true; } expect('IN'); expect('[');
      const first = take(); let inside: boolean;
      if (peek()?.t === '..') { take(); const hi = parseInt(take().v!, 10); const lo = parseInt(first.v!, 10); inside = typeof lv === 'number' && lv >= lo && lv <= hi; }
      else { const items = [val(first)]; while (peek()?.t === ',') { take(); items.push(val(take())); } inside = items.includes(lv); }
      expect(']');
      return neg ? !inside : inside;
    }
    return !!lv; // bare boolean operand, e.g. `herniation_signs` / `bilateral_fixed`
  };

  const r = orE();
  if (p !== toks.length) throw new Error(`condition parse: trailing tokens in ${cond}`);
  return r;
}
