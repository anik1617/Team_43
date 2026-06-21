# cloud/kyro_engine/conditions.py
"""cgt_edges condition grammar -> Python. Behavioral mirror of edge/e3/conformance.py
to_py/cond_true and edge/e3/conditions.ts. PARITY-CRITICAL: keep byte-equivalent in behavior."""
import re

def to_py(cond: str) -> str:
    s = cond
    s = re.sub(r'\btrue\b', 'True', s); s = re.sub(r'\bfalse\b', 'False', s)
    s = s.replace('<>', '!=')
    s = re.sub(r'(?<![<>=!])=(?!=)', '==', s)
    s = re.sub(r'(\w+)\s+BETWEEN\s+(\d+)\s+AND\s+(\d+)', r'(\2 <= \1 <= \3)', s)
    s = re.sub(r'NOT\s+IN\s+\[(\d+)\.\.(\d+)\]',
               lambda m: f'not in range({int(m.group(1))},{int(m.group(2))+1})', s)
    s = re.sub(r'\bIN\b', 'in', s); s = re.sub(r'\bNOT\b', 'not', s)
    s = re.sub(r'\bAND\b', 'and', s); s = re.sub(r'\bOR\b', 'or', s)
    return s

def cond_true(cond: str, env: dict) -> bool:
    if cond == 'true':
        return True
    return bool(eval(to_py(cond), {'__builtins__': {}, 'range': range}, env))
