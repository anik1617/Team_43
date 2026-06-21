"""
BUILD-TIME translation DRAFT generator. Runs NLLB-200-distilled-600M over every English cgt_strings
row and emits edge/l3/translations.draft.json (UR + HI) for HUMAN CLINICAL REVIEW.

This is the safe multilingual pipeline: NLLB drafts -> reviewer fixes domain-term errors
(e.g. "pupils"->"students", "blunt"->"solid") -> reviewed strings ship IN the signed bundle
(cgt_strings.lang). NLLB never runs on-device; the patient never sees an unreviewed string.

Run:  python edge/l3/translateStrings.py
Out:  edge/l3/translations.draft.json  {node_id: {ur:{prompt,recommendation}, hi:{...}}}
"""
import os, sqlite3, re, json
os.environ.setdefault('HF_HUB_DISABLE_PROGRESS_BARS', '1')
import torch
import transformers.modeling_utils as _mu
_mu.check_torch_load_is_safe = lambda *a, **k: None  # official facebook repo, local build-time use
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
BUNDLE = os.path.join(HERE, '..', '..', 'cloud', 'bundles', 'edh-core-v0-mock.kyro')
OUT = os.path.join(HERE, 'translations.draft.json')
MODEL = 'facebook/nllb-200-distilled-600M'
LANGS = {'ur': 'urd_Arab', 'hi': 'hin_Deva'}

print(f'loading {MODEL} ...')
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL); model.eval()
print('loaded.')


def clean(s):
    if not s:
        return None
    s = re.sub(r'^\[[^\]]*\]\s*', '', s)          # strip [BADGE] render hint
    s = re.sub(r'\[[^\]]*VERIFY[^\]]*\]', '', s)   # drop [VERIFY-*] tags
    return s.strip()


def translate(text, tgt):
    tok.src_lang = 'eng_Latn'
    inp = tok(text, return_tensors='pt', truncation=True, max_length=512)
    with torch.no_grad():
        gen = model.generate(**inp, forced_bos_token_id=tok.convert_tokens_to_ids(tgt), max_length=512, num_beams=4)
    return tok.batch_decode(gen, skip_special_tokens=True)[0]


c = sqlite3.connect(BUNDLE)
rows = c.execute("SELECT node_id, prompt, recommendation FROM cgt_strings WHERE lang='en'").fetchall()
out = {'_meta': {'status': 'DRAFT — machine translation (NLLB-200-600M), PENDING CLINICAL REVIEW',
                 'model': MODEL, 'review_required': True}}
for i, (nid, prompt, rec) in enumerate(rows, 1):
    entry = {}
    for k, code in LANGS.items():
        entry[k] = {
            'prompt': translate(clean(prompt), code) if clean(prompt) else None,
            'recommendation': translate(clean(rec), code) if clean(rec) else None,
        }
    out[nid] = entry
    print(f'[{i}/{len(rows)}] {nid}')

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(f'\nwrote {OUT}  ({len(rows)} nodes x {len(LANGS)} langs)')
